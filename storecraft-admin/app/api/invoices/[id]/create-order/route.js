/**
 * Create a fulfillment Order from a walk-in Invoice (no second stock deduction).
 * POST /api/invoices/:id/create-order
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessMinRole } from "@/lib/requireRole";
import Invoice from "@/lib/models/Invoice.model";
import Order from "@/lib/models/Order.model";
import { allocateOrderNumber } from "@/lib/orderNumber";

const ORDER_PAYMENT_METHODS = new Set([
  "cod",
  "stripe",
  "paypal",
  "jazzcash",
  "easypaisa",
  "bankTransfer",
  "hbl",
  "meezan",
  "ubl",
]);

function requestIp(request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
}

function mapPaymentMethod(raw) {
  const m = String(raw || "cod").trim();
  if (m === "cash" || m === "other") return "cod";
  if (m === "card") return "bankTransfer";
  if (ORDER_PAYMENT_METHODS.has(m)) return m;
  return "cod";
}

function splitName(full) {
  const parts = String(full || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return { firstName: "Customer", lastName: "", name: "Customer" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "", name: parts[0] };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
    name: parts.join(" "),
  };
}

export async function POST(request, context) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessMinRole(user, "editor");
    if (denied) return denied;

    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(String(id))) {
      return NextResponse.json({ success: false, error: "Invalid invoice id." }, { status: 400 });
    }

    await dbConnect();
    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return NextResponse.json({ success: false, error: "Invoice not found." }, { status: 404 });
    }

    if (invoice.orderId) {
      return NextResponse.json(
        {
          success: true,
          alreadyLinked: true,
          order: {
            id: String(invoice.orderId),
            orderNumber: invoice.orderNumber || "",
          },
          message: "Invoice already linked to an order.",
        },
        { status: 200 }
      );
    }

    const items = Array.isArray(invoice.items) ? invoice.items : [];
    if (!items.length) {
      return NextResponse.json(
        { success: false, error: "Invoice has no line items." },
        { status: 400 }
      );
    }

    const pricing = invoice.pricing || {};
    const subtotal = Math.max(0, Number(pricing.subtotal) || 0);
    const discount = Math.max(0, Number(pricing.discount) || 0);
    const shippingCost = Math.max(0, Number(pricing.shippingCost) || 0);
    const total = Math.max(0, Number(pricing.total) || 0);
    const amountPaid = Math.max(0, Number(invoice.amountPaid) || 0);
    const remaining = Math.max(0, Number(invoice.remainingBalance) ?? total - amountPaid);

    let paymentStatus = String(invoice.paymentStatus || "unpaid").trim();
    if (!["unpaid", "paid", "partial", "refunded", "failed"].includes(paymentStatus)) {
      paymentStatus = "unpaid";
    }

    const paymentMethod = mapPaymentMethod(invoice.paymentMethod);
    const { firstName, lastName, name } = splitName(invoice.customer?.name);
    const email = String(invoice.customer?.email || "").trim();
    const phone = String(invoice.customer?.phone || "").trim();
    const street = String(invoice.billingAddress?.street || "").trim();
    const city = String(invoice.billingAddress?.city || "").trim();
    const country = String(invoice.billingAddress?.country || "Pakistan").trim() || "Pakistan";

    const orderNumber = await allocateOrderNumber();
    const adminLabel = user.name || user.email || "Admin";
    const invNo = invoice.invoiceNumber || "";
    const note = String(invoice.note || "").trim().slice(0, 500);

    const normalizedItems = items.map((i) => ({
      productId: i.productId || null,
      name: String(i.name || "Item").trim(),
      image: String(i.image || ""),
      variation: String(i.variation || ""),
      quantity: Math.max(1, Number(i.quantity) || 1),
      unitPrice: Math.max(0, Number(i.unitPrice) || 0),
      unitCost: Math.max(0, Number(i.unitCost) || 0),
      total: Math.max(0, Number(i.total) || 0),
    }));

    const order = await Order.create({
      orderNumber,
      invoiceId: invoice._id,
      invoiceNumber: invNo,
      customer: {
        firstName,
        lastName,
        name,
        email,
        phone,
        customerId: invoice.customerId || null,
      },
      items: normalizedItems,
      subtotal,
      shippingCost,
      pricing: {
        subtotal,
        discount,
        shippingCost,
        shippingMethod: shippingCost > 0 ? "from_invoice" : "pickup",
        shippingZone: "",
        total,
      },
      orderStatus: "confirmed",
      paymentStatus,
      paymentMethod,
      currency: invoice.currency || "PKR",
      payment: {
        amount: total,
        paidAmount: amountPaid,
        remainingCod: remaining,
        paidAt: paymentStatus === "paid" ? new Date() : undefined,
      },
      shippingAddress: {
        firstName,
        lastName,
        name,
        email,
        phone,
        street,
        address: street,
        line1: street,
        city,
        country,
      },
      statusHistory: [
        {
          status: "confirmed",
          changedBy: adminLabel,
          changedAt: new Date(),
          note: `Created from invoice ${invNo}`,
        },
      ],
      timeline: [
        {
          status: "confirmed",
          title: "Created from invoice",
          description:
            note ||
            `Order created from invoice ${invNo} by ${adminLabel} · ${normalizedItems.length} item(s)`,
          timestamp: new Date(),
          by: "admin",
        },
      ],
      internalNotes: [
        {
          note: `Source invoice: ${invNo}${note ? ` — ${note}` : ""}`,
          addedBy: adminLabel,
          addedAt: new Date(),
        },
      ],
    });

    invoice.orderId = order._id;
    invoice.orderNumber = order.orderNumber;
    await invoice.save();

    await logActivity({
      user: user.userId || user.id || user._id,
      userName: adminLabel,
      action: `Order ${order.orderNumber} created from invoice ${invNo}`,
      resource: "Order",
      resourceId: order._id.toString(),
      details: { orderNumber: order.orderNumber, invoiceId: String(invoice._id), invoiceNumber: invNo },
      type: "create",
      ip: requestIp(request),
    });

    return NextResponse.json({
      success: true,
      alreadyLinked: false,
      order: {
        id: order._id.toString(),
        orderNumber: order.orderNumber,
      },
      invoice: {
        id: invoice._id.toString(),
        invoiceNumber: invNo,
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
      },
    });
  } catch (error) {
    console.error("[invoices/create-order]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Could not create order." },
      { status: 500 }
    );
  }
}
