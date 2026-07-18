/**
 * Single invoice read / delete.
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import Invoice from "@/lib/models/Invoice.model";

function serializeInvoice(doc) {
  if (!doc) return null;
  const o = doc;
  return {
    id: o._id.toString(),
    invoiceNumber: o.invoiceNumber,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    customer: o.customer || {},
    billingAddress: o.billingAddress || {},
    shippingAddress: {
      name: o.customer?.name || "",
      phone: o.customer?.phone || "",
      email: o.customer?.email || "",
      street: o.billingAddress?.street || "",
      city: o.billingAddress?.city || "",
      country: o.billingAddress?.country || "Pakistan",
    },
    items: (o.items || []).map((i) => ({
      productId: i.productId ? String(i.productId) : null,
      name: i.name,
      image: i.image || "",
      variation: i.variation || "",
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      total: i.total,
    })),
    pricing: o.pricing || { subtotal: 0, discount: 0, shippingCost: 0, total: 0 },
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    currency: o.currency || "PKR",
    note: o.note || "",
    createdBy: o.createdBy || "",
    orderNumber: o.invoiceNumber,
  };
}

export async function GET(request, context) {
  try {
    if (!getRequestUser(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid invoice id." }, { status: 400 });
    }
    await dbConnect();
    const doc = await Invoice.findById(id).lean();
    if (!doc) {
      return NextResponse.json({ success: false, error: "Invoice not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true, invoice: serializeInvoice(doc) });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load invoice." },
      { status: 500 }
    );
  }
}
