/**
 * Add or remove installment payments on an invoice (shopkeeper ledger).
 * POST   — body: { amount, paidAt?, method?, note? }
 * DELETE — body: { paymentId }
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import Invoice from "@/lib/models/Invoice.model";
import {
  recomputeInvoicePaymentFields,
  serializeInvoicePayments,
} from "@/lib/invoicePayments";

const METHODS = new Set([
  "cod",
  "cash",
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

function serializeInvoice(doc) {
  const o = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  recomputeInvoicePaymentFields(o);
  return {
    id: String(o._id),
    invoiceNumber: o.invoiceNumber,
    pricing: o.pricing,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    amountPaid: o.amountPaid || 0,
    remainingBalance: o.remainingBalance ?? 0,
    payments: serializeInvoicePayments(o.payments),
  };
}

export async function POST(request, context) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessCapability(user, "canManageOrders");
    if (denied) return denied;

    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid invoice id." }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const amount = Math.round((Number(body.amount) || 0) * 100) / 100;
    if (!(amount > 0)) {
      return NextResponse.json({ success: false, error: "Payment amount must be greater than 0." }, { status: 400 });
    }

    await dbConnect();
    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return NextResponse.json({ success: false, error: "Invoice not found." }, { status: 404 });
    }

    const total = Math.max(0, Number(invoice.pricing?.total) || 0);
    const alreadyPaid = (invoice.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const remaining = Math.max(0, Math.round((total - alreadyPaid) * 100) / 100);
    if (amount > remaining + 0.009) {
      return NextResponse.json(
        {
          success: false,
          error: `Amount exceeds remaining balance (${remaining}).`,
          remainingBalance: remaining,
        },
        { status: 400 }
      );
    }

    let method = String(body.method || invoice.paymentMethod || "cash").trim();
    if (method === "card") method = "bankTransfer";
    if (!METHODS.has(method)) method = "cash";

    const paidAt = body.paidAt ? new Date(body.paidAt) : new Date();
    if (Number.isNaN(paidAt.getTime())) {
      return NextResponse.json({ success: false, error: "Invalid payment date." }, { status: 400 });
    }

    if (!Array.isArray(invoice.payments)) invoice.payments = [];
    invoice.payments.push({
      amount,
      paidAt,
      method,
      note: String(body.note || "").trim().slice(0, 300),
      recordedBy: user.name || user.email || "Admin",
    });

    recomputeInvoicePaymentFields(invoice);
    invoice.markModified("payments");
    await invoice.save();

    await logActivity({
      user: user.userId || user.id,
      userName: user.name || user.email || "Admin",
      action: `Payment ${amount} recorded on invoice ${invoice.invoiceNumber}`,
      resource: "Invoice",
      resourceId: id,
      details: { amount, remainingBalance: invoice.remainingBalance },
      type: "update",
      ip: requestIp(request),
    });

    return NextResponse.json({
      success: true,
      message: "Payment recorded.",
      invoice: serializeInvoice(invoice),
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Could not record payment." },
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
      return NextResponse.json({ success: false, error: "Invalid invoice id." }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const paymentId = String(body.paymentId || "").trim();
    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return NextResponse.json({ success: false, error: "paymentId is required." }, { status: 400 });
    }

    await dbConnect();
    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return NextResponse.json({ success: false, error: "Invoice not found." }, { status: 404 });
    }

    const before = (invoice.payments || []).length;
    invoice.payments = (invoice.payments || []).filter((p) => String(p._id) !== paymentId);
    if (invoice.payments.length === before) {
      return NextResponse.json({ success: false, error: "Payment entry not found." }, { status: 404 });
    }

    recomputeInvoicePaymentFields(invoice);
    invoice.markModified("payments");
    await invoice.save();

    await logActivity({
      user: user.userId || user.id,
      userName: user.name || user.email || "Admin",
      action: `Payment removed from invoice ${invoice.invoiceNumber}`,
      resource: "Invoice",
      resourceId: id,
      type: "update",
      ip: requestIp(request),
    });

    return NextResponse.json({
      success: true,
      message: "Payment removed.",
      invoice: serializeInvoice(invoice),
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Could not remove payment." },
      { status: 500 }
    );
  }
}
