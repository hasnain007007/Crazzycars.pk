/**
 * Single receiving (shopkeeper payments across bills).
 * GET  — list receipts (?customerId=)
 * POST — create receipt and allocate to open invoices (FIFO or explicit).
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import Customer from "@/lib/models/Customer.model";
import Receipt from "@/lib/models/Receipt.model";
import { allocateReceiptNumber } from "@/lib/receiptNumber";
import { applyReceiptToInvoices, getCustomerArSummary } from "@/lib/customerAr";

const METHODS = new Set([
  "cash",
  "cod",
  "jazzcash",
  "easypaisa",
  "bankTransfer",
  "hbl",
  "meezan",
  "ubl",
  "other",
]);

function requestIp(request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
}

function serializeReceipt(doc) {
  const o = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  return {
    id: String(o._id),
    receiptNumber: o.receiptNumber,
    customerId: o.customerId ? String(o.customerId) : null,
    customerName: o.customerName || "",
    amount: o.amount || 0,
    unallocatedAmount: o.unallocatedAmount || 0,
    paidAt: o.paidAt,
    method: o.method,
    note: o.note || "",
    particular: o.particular || "",
    allocations: (o.allocations || []).map((a) => ({
      invoiceId: a.invoiceId ? String(a.invoiceId) : null,
      invoiceNumber: a.invoiceNumber || "",
      amount: a.amount || 0,
    })),
    recordedBy: o.recordedBy || "",
    createdAt: o.createdAt,
  };
}

export async function GET(request) {
  try {
    if (!getRequestUser(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");
    const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit")) || 50));

    const filter = {};
    if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
      filter.customerId = customerId;
    }

    const rows = await Receipt.find(filter).sort({ paidAt: -1 }).limit(limit).lean();
    return NextResponse.json({
      success: true,
      receipts: rows.map(serializeReceipt),
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Could not load receipts." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessCapability(user, "canManageOrders");
    if (denied) return denied;

    const body = await request.json().catch(() => ({}));
    const customerId = String(body.customerId || "").trim();
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return NextResponse.json({ success: false, error: "Select a customer / shopkeeper." }, { status: 400 });
    }

    const amount = Math.round((Number(body.amount) || 0) * 100) / 100;
    if (!(amount > 0)) {
      return NextResponse.json({ success: false, error: "Amount must be greater than 0." }, { status: 400 });
    }

    let method = String(body.method || "cash").trim();
    if (method === "card") method = "bankTransfer";
    if (!METHODS.has(method)) method = "cash";

    const paidAt = body.paidAt ? new Date(body.paidAt) : new Date();
    if (Number.isNaN(paidAt.getTime())) {
      return NextResponse.json({ success: false, error: "Invalid payment date." }, { status: 400 });
    }

    await dbConnect();
    const customer = await Customer.findById(customerId).lean();
    if (!customer) {
      return NextResponse.json({ success: false, error: "Customer not found." }, { status: 404 });
    }

    const receiptNumber = await allocateReceiptNumber();
    const adminLabel = user.name || user.email || "Admin";
    const note = String(body.note || "").trim().slice(0, 300);

    const { allocations, unallocatedAmount } = await applyReceiptToInvoices({
      customerId,
      customer,
      amount,
      method,
      paidAt,
      note,
      recordedBy: adminLabel,
      receiptNumber,
      allocations: body.allocations,
    });

    const receipt = await Receipt.create({
      receiptNumber,
      customerId,
      customerName: customer.name || "",
      amount,
      unallocatedAmount,
      paidAt,
      method,
      note,
      particular: String(body.particular || "").trim().slice(0, 400),
      allocations,
      recordedBy: adminLabel,
    });

    const ar = await getCustomerArSummary(customerId, customer);

    await logActivity({
      user: user.userId || user.id,
      userName: adminLabel,
      action: `Receipt ${receiptNumber} — ${amount} from ${customer.name}`,
      resource: "Receipt",
      resourceId: String(receipt._id),
      details: { amount, allocations: allocations.length, outstanding: ar.outstanding },
      type: "create",
      ip: requestIp(request),
    });

    return NextResponse.json({
      success: true,
      message: "Payment received.",
      receipt: serializeReceipt(receipt),
      ar,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Could not record receipt." },
      { status: 500 }
    );
  }
}
