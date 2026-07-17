/**
 * Single order: read and update (status, payment, internal notes).
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import Order from "@/lib/models/Order.model";
import { orderGrandTotal, orderPricing } from "@/lib/orderFormat";
import { ORDER_STATUS_TIMELINE_TITLES } from "@/lib/orderStatusTimeline";
import { postexPublicTrackingUrl } from "@/lib/postex";

function requestIp(request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
}

function serializeOrder(doc) {
  if (!doc) return null;
  const o = doc;
  const pricing = orderPricing(o);
  const pop =
    o.customer?.customerId &&
    typeof o.customer.customerId === "object" &&
    o.customer.customerId._id;
  return {
    id: o._id.toString(),
    orderNumber: o.orderNumber,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    customer: {
      firstName: o.customer?.firstName || "",
      lastName: o.customer?.lastName || "",
      name: o.customer?.name || (pop ? o.customer.customerId.name : "") || "",
      email: o.customer?.email || (pop ? o.customer.customerId.email : "") || "",
      phone: o.customer?.phone || (pop ? o.customer.customerId.phone : "") || "",
      customerId: pop
        ? o.customer.customerId._id.toString()
        : o.customer?.customerId
          ? String(o.customer.customerId)
          : null,
    },
    currency: o.currency || "PKR",
    subtotal: pricing.subtotal,
    shippingCost: pricing.shippingCost,
    items: (o.items || []).map((i) => ({
      productId: i.productId ? String(i.productId) : null,
      name: i.name,
      image: i.image || "",
      variation: i.variation || "",
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      total: i.total,
    })),
    pricing,
    orderStatus: o.orderStatus,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod || "",
    payment: o.payment && typeof o.payment === "object" ? { ...o.payment } : {},
    shippingAddress: o.shippingAddress || {},
    couponCode: o.couponCode || "",
    trackingNumber: o.trackingNumber || o.tracking?.number || "",
    courier: o.courier || o.tracking?.carrier || "Postex",
    trackingUrl: o.trackingUrl || o.tracking?.url || "",
    hasPostexLabel: Boolean(o.postexLabel),
    shippedAt: o.shippedAt || null,
    deliveredAt: o.deliveredAt || null,
    tracking: {
      number: o.trackingNumber || o.tracking?.number || "",
      carrier: o.courier || o.tracking?.carrier || "",
      url: o.trackingUrl || o.tracking?.url || "",
      notifiedAt: o.tracking?.notifiedAt || null,
    },
    statusHistory: (o.statusHistory || []).map((h) => ({
      id: h._id?.toString(),
      status: h.status,
      changedBy: h.changedBy,
      changedAt: h.changedAt,
      note: h.note || "",
    })),
    internalNotes: (o.internalNotes || []).map((n) => ({
      id: n._id?.toString(),
      note: n.note,
      addedBy: n.addedBy,
      addedAt: n.addedAt,
    })),
    timeline: (o.timeline || []).map((t) => ({
      status: t.status,
      title: t.title,
      description: t.description || "",
      timestamp: t.timestamp,
      by: t.by || "system",
    })),
    emailHistory: (o.emailHistory || []).map((em) => ({
      type: em.type,
      subject: em.subject || "",
      to: em.to || "",
      sentAt: em.sentAt,
      status: em.status || "sent",
    })),
    total: orderGrandTotal(o),
  };
}

export async function GET(request, context) {
  try {
    if (!getRequestUser(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
    }
    await dbConnect();
    const doc = await Order.findById(id).populate("customer.customerId", "name email phone").lean();
    if (!doc) {
      return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true, order: serializeOrder(doc) });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load order." },
      { status: 500 }
    );
  }
}

export async function PATCH(request, context) {
  return PUT(request, context);
}

export async function PUT(request, context) {
  try {
    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
    }
    await dbConnect();
    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const adminName = user.name || "Admin";
    const updates = [];

    if (body.orderStatus !== undefined && body.orderStatus !== order.orderStatus) {
      const allowed = [
        "pending",
        "confirmed",
        "processing",
        "packed",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
        "disputed",
      ];
      if (!allowed.includes(body.orderStatus)) {
        return NextResponse.json({ success: false, error: "Invalid order status." }, { status: 400 });
      }
      const note = typeof body.statusChangeNote === "string" ? body.statusChangeNote.trim().slice(0, 2000) : "";
      order.orderStatus = body.orderStatus;
      order.statusHistory.push({
        status: body.orderStatus,
        changedBy: adminName,
        changedAt: new Date(),
        note,
      });
      const statusInfo = ORDER_STATUS_TIMELINE_TITLES[body.orderStatus] || {
        title: body.orderStatus,
        description: "",
      };
      if (!Array.isArray(order.timeline)) order.timeline = [];
      order.timeline.push({
        status: body.orderStatus,
        title: statusInfo.title,
        description: statusInfo.description,
        timestamp: new Date(),
        by: "admin",
      });
      order.markModified("timeline");
      updates.push(`orderStatus → ${body.orderStatus}`);
    }

    if (body.paymentStatus !== undefined && body.paymentStatus !== order.paymentStatus) {
      const allowedPay = ["unpaid", "paid", "refunded", "partial"];
      if (!allowedPay.includes(body.paymentStatus)) {
        return NextResponse.json({ success: false, error: "Invalid payment status." }, { status: 400 });
      }
      order.paymentStatus = body.paymentStatus;
      updates.push(`paymentStatus → ${body.paymentStatus}`);
    }

    if (body.shippingAddress && typeof body.shippingAddress === "object") {
      const sa = body.shippingAddress;
      const name = String(
        sa.name || [sa.firstName, sa.lastName].filter(Boolean).join(" ")
      ).trim();
      const phone = String(sa.phone || "").trim();
      const city = String(sa.city || "").trim();

      if (!name || !phone || !city) {
        return NextResponse.json(
          { success: false, error: "Shipping address requires name, phone, and city." },
          { status: 400 }
        );
      }

      const province = String(sa.province || sa.state || "").trim();
      const line1 = String(sa.street || sa.line1 || "").trim();

      order.shippingAddress = {
        name,
        firstName: String(sa.firstName || "").trim(),
        lastName: String(sa.lastName || "").trim(),
        phone,
        street: line1,
        line1,
        address: String(sa.address || "").trim() || line1,
        city,
        state: province,
        province,
        zip: String(sa.zip || sa.postalCode || sa.postcode || "").trim(),
        postcode: String(sa.zip || sa.postalCode || sa.postcode || "").trim(),
        postalCode: String(sa.zip || sa.postalCode || sa.postcode || "").trim(),
        country: "Pakistan",
        email: String(order.shippingAddress?.email || sa.email || "").trim(),
        nif: String(order.shippingAddress?.nif || "").trim(),
      };
      order.markModified("shippingAddress");

      const instructions = String(body.shippingInstructions || "").trim();
      if (instructions) {
        order.internalNotes.push({
          note: `Shipping instructions: ${instructions.slice(0, 2000)}`,
          addedBy: adminName,
          addedAt: new Date(),
        });
      }

      if (!Array.isArray(order.timeline)) order.timeline = [];
      order.timeline.push({
        status: "address_updated",
        title: "Shipping address updated by admin",
        description: [city, province].filter(Boolean).join(", "),
        timestamp: new Date(),
        by: "admin",
      });
      order.markModified("timeline");
      updates.push("shipping address updated");
    }

    if (body.internalNote && typeof body.internalNote.note === "string") {
      const text = body.internalNote.note.trim();
      if (text) {
        order.internalNotes.push({
          note: text.slice(0, 5000),
          addedBy: adminName,
          addedAt: new Date(),
        });
        updates.push("internal note added");
      }
    }

    const trackingNumberIn =
      body.trackingNumber !== undefined
        ? String(body.trackingNumber || "").trim().slice(0, 120)
        : body.tracking?.number !== undefined
          ? String(body.tracking.number || "").trim().slice(0, 120)
          : undefined;
    const courierIn =
      body.courier !== undefined
        ? String(body.courier || "Postex").trim().slice(0, 120)
        : body.tracking?.carrier !== undefined
          ? String(body.tracking.carrier || "Postex").trim().slice(0, 120)
          : undefined;

    if (trackingNumberIn !== undefined || courierIn !== undefined) {
      const number = trackingNumberIn ?? order.trackingNumber ?? order.tracking?.number ?? "";
      const carrier = courierIn ?? order.courier ?? order.tracking?.carrier ?? "Postex";
      const url =
        String(body.trackingUrl || body.tracking?.url || "").trim().slice(0, 500) ||
        (number && carrier.toLowerCase() === "postex"
          ? postexPublicTrackingUrl(number)
          : order.trackingUrl || order.tracking?.url || "");

      order.trackingNumber = number;
      order.courier = carrier;
      order.trackingUrl = url;
      order.tracking = {
        number,
        carrier,
        url,
        notifiedAt: order.tracking?.notifiedAt || null,
      };

      if (number) {
        if (order.orderStatus === "processing") {
          order.orderStatus = "shipped";
          order.statusHistory.push({
            status: "shipped",
            changedBy: adminName,
            changedAt: new Date(),
            note: `Auto-shipped — tracking ${number}`,
          });
          const statusInfo = ORDER_STATUS_TIMELINE_TITLES.shipped || {
            title: "Shipped",
            description: "",
          };
          if (!Array.isArray(order.timeline)) order.timeline = [];
          order.timeline.push({
            status: "shipped",
            title: statusInfo.title,
            description: statusInfo.description,
            timestamp: new Date(),
            by: "admin",
          });
          order.markModified("timeline");
          updates.push("orderStatus → shipped");
        }
        if (!order.shippedAt) {
          order.shippedAt = new Date();
        }
        updates.push(`Tracking added: ${number}`);
      } else {
        updates.push("Tracking updated");
      }
    } else if (body.tracking && typeof body.tracking === "object") {
      const number = String(body.tracking.number || "").trim().slice(0, 120);
      const carrier = String(body.tracking.carrier || "Postex").trim().slice(0, 120);
      const url =
        String(body.tracking.url || "").trim().slice(0, 500) ||
        (number && carrier.toLowerCase() === "postex" ? postexPublicTrackingUrl(number) : "");
      order.trackingNumber = number;
      order.courier = carrier;
      order.trackingUrl = url;
      order.tracking = {
        number,
        carrier,
        url,
        notifiedAt: order.tracking?.notifiedAt || null,
      };
      if (number && order.orderStatus === "processing") {
        order.orderStatus = "shipped";
        order.shippedAt = order.shippedAt || new Date();
        updates.push("orderStatus → shipped");
      }
      updates.push(number ? `Tracking added: ${number}` : "Tracking updated");
    }

    if (!updates.length) {
      const lean = await Order.findById(id).populate("customer.customerId", "name email phone").lean();
      return NextResponse.json({ success: true, order: serializeOrder(lean), changed: false });
    }

    await order.save();

    await logActivity({
      user: user.userId,
      userName: adminName,
      action: `Order ${order.orderNumber} updated: ${updates.join(", ")}`,
      resource: "Order",
      resourceId: id,
      details: { updates },
      type: "update",
      ip: requestIp(request),
    });

    const lean = await Order.findById(id).populate("customer.customerId", "name email phone").lean();
    return NextResponse.json({ success: true, order: serializeOrder(lean), changed: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Update failed." },
      { status: 500 }
    );
  }
}
