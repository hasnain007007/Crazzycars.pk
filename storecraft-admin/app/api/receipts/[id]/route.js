/**
 * Single receipt get / update / delete (editable Account Ledger credits).
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import Customer from "@/lib/models/Customer.model";
import Receipt from "@/lib/models/Receipt.model";
import {
  getCustomerArSummary,
  reverseReceiptAllocations,
  updateReceiptRecord,
} from "@/lib/customerAr";

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

export async function GET(request, context) {
  try {
    if (!getRequestUser(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid receipt id." }, { status: 400 });
    }
    await dbConnect();
    const receipt = await Receipt.findById(id);
    if (!receipt) {
      return NextResponse.json({ success: false, error: "Receipt not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true, receipt: serializeReceipt(receipt) });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Could not load receipt." },
      { status: 500 }
    );
  }
}

export async function PUT(request, context) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessCapability(user, "canManageOrders");
    if (denied) return denied;

    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid receipt id." }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    await dbConnect();
    const receipt = await Receipt.findById(id);
    if (!receipt) {
      return NextResponse.json({ success: false, error: "Receipt not found." }, { status: 404 });
    }

    const customer = await Customer.findById(receipt.customerId).lean();
    if (!customer) {
      return NextResponse.json({ success: false, error: "Customer not found." }, { status: 404 });
    }

    if (body.method != null) {
      let method = String(body.method || "cash").trim();
      if (method === "card") method = "bankTransfer";
      if (!METHODS.has(method)) method = "cash";
      body.method = method;
    }

    const adminLabel = user.name || user.email || "Admin";
    await updateReceiptRecord(receipt, body, { customer, recordedBy: adminLabel });

    const ar = await getCustomerArSummary(receipt.customerId, customer);

    await logActivity({
      user: user.userId || user.id,
      userName: adminLabel,
      action: `Receipt ${receipt.receiptNumber} updated — ${receipt.amount}`,
      resource: "Receipt",
      resourceId: id,
      details: { amount: receipt.amount, outstanding: ar.outstanding },
      type: "update",
      ip: requestIp(request),
    });

    return NextResponse.json({
      success: true,
      message: "Receiving updated.",
      receipt: serializeReceipt(receipt),
      ar,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Could not update receipt." },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessCapability(user, "canManageOrders");
    if (denied) return denied;

    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid receipt id." }, { status: 400 });
    }

    await dbConnect();
    const receipt = await Receipt.findById(id);
    if (!receipt) {
      return NextResponse.json({ success: false, error: "Receipt not found." }, { status: 404 });
    }

    const customerId = receipt.customerId;
    const receiptNumber = receipt.receiptNumber;
    await reverseReceiptAllocations(receipt);
    await Receipt.deleteOne({ _id: receipt._id });

    const customer = await Customer.findById(customerId).lean();
    const ar = customer ? await getCustomerArSummary(customerId, customer) : null;

    const adminLabel = user.name || user.email || "Admin";
    await logActivity({
      user: user.userId || user.id,
      userName: adminLabel,
      action: `Receipt ${receiptNumber} deleted`,
      resource: "Receipt",
      resourceId: id,
      type: "delete",
      ip: requestIp(request),
    });

    return NextResponse.json({
      success: true,
      message: "Receiving deleted.",
      ar,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Could not delete receipt." },
      { status: 500 }
    );
  }
}
