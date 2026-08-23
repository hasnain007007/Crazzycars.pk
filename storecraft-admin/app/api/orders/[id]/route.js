/**
 * Single order: read and update (status, payment, internal notes).
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import Order from "@/lib/models/Order.model";
import { orderGrandTotal, orderPricing } from "@/lib/orderFormat";
import { ORDER_STATUS_TIMELINE_TITLES } from "@/lib/orderStatusTimeline";
import { postexPublicTrackingUrl, storefrontTrackingUrl } from "@/lib/postex";

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
    invoiceId: o.invoiceId ? String(o.invoiceId) : null,
    invoiceNumber: o.invoiceNumber || "",
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
      selectedVariation: i.selectedVariation || null,
      selectedAddOns: Array.isArray(i.selectedAddOns)
        ? i.selectedAddOns.map((a) => ({
            name: String(a?.name || "").trim(),
            price: Math.max(0, Number(a?.price) || 0),
          })).filter((a) => a.name)
        : [],
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      total: i.total,
    })),
    pricing,
    orderStatus: o.orderStatus,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod || "",
    payment: (() => {
      const pay = o.payment;
      if (!pay || typeof pay !== "object") return {};
      const plain = typeof pay.toObject === "function" ? pay.toObject() : { ...pay };
      return {
        paypalOrderId: plain.paypalOrderId || "",
        paypalCaptureId: plain.paypalCaptureId || "",
        transactionId: plain.transactionId || "",
        stripePaymentIntentId: plain.stripePaymentIntentId || "",
        paidAt: plain.paidAt || null,
        amount: Number(plain.amount) || 0,
        paidAmount: Number(plain.paidAmount ?? plain.amount) || 0,
        remainingCod: Number(plain.remainingCod) || 0,
      };
    })(),
    paymentConfirmation: (() => {
      const pc = o.paymentConfirmation;
      if (!pc || typeof pc !== "object") {
        return { reference: "", confirmedBy: "", confirmedAt: null };
      }
      const plain = typeof pc.toObject === "function" ? pc.toObject() : { ...pc };
      return {
        reference: plain.reference || "",
        confirmedBy: plain.confirmedBy || "",
        confirmedAt: plain.confirmedAt || null,
      };
    })(),
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
    tags: Array.isArray(o.tags) ? o.tags.map((t) => String(t)) : [],
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

/** Newest-first list neighbors (Shopify-style ↑ newer / ↓ older). */
async function findOrderNeighbors(doc) {
  const createdAt = doc.createdAt || new Date(0);
  const id = doc._id;
  const [newer, older] = await Promise.all([
    Order.findOne({
      $or: [
        { createdAt: { $gt: createdAt } },
        { createdAt, _id: { $gt: id } },
      ],
    })
      .sort({ createdAt: 1, _id: 1 })
      .select("_id orderNumber")
      .lean(),
    Order.findOne({
      $or: [
        { createdAt: { $lt: createdAt } },
        { createdAt, _id: { $lt: id } },
      ],
    })
      .sort({ createdAt: -1, _id: -1 })
      .select("_id orderNumber")
      .lean(),
  ]);
  return {
    prev: newer
      ? { id: String(newer._id), orderNumber: newer.orderNumber || "" }
      : null,
    next: older
      ? { id: String(older._id), orderNumber: older.orderNumber || "" }
      : null,
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
    const neighbors = await findOrderNeighbors(doc);
    return NextResponse.json({ success: true, order: serializeOrder(doc), neighbors });
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
    const denied = denyUnlessCapability(user, "canManageOrders");
    if (denied) return denied;
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
        "returned",
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

    if (body.paymentStatus !== undefined) {
      const allowedPay = ["unpaid", "paid", "refunded", "partial", "failed"];
      const nextPay = String(body.paymentStatus || "").toLowerCase().trim();
      if (!allowedPay.includes(nextPay)) {
        return NextResponse.json({ success: false, error: "Invalid payment status." }, { status: 400 });
      }

      const statusChanging = nextPay !== order.paymentStatus;
      if (statusChanging) {
        order.paymentStatus = nextPay;
        updates.push(`paymentStatus → ${nextPay}`);
      }

      const paymentRef = String(body.paymentReference ?? body.transactionId ?? "").trim();

      if (nextPay === "partial") {
        const paidAmount = Number(body.paidAmount);
        const remainingCod = Number(body.remainingCod);
        if (!Number.isFinite(paidAmount) || paidAmount < 0) {
          return NextResponse.json(
            { success: false, error: "Enter a valid paid amount for partial payment." },
            { status: 400 }
          );
        }
        if (!Number.isFinite(remainingCod) || remainingCod < 0) {
          return NextResponse.json(
            { success: false, error: "Enter a valid remaining COD amount." },
            { status: 400 }
          );
        }
        if (paidAmount <= 0 && remainingCod <= 0) {
          return NextResponse.json(
            { success: false, error: "Partial payment requires a paid amount and/or remaining COD." },
            { status: 400 }
          );
        }
        if (!order.payment || typeof order.payment !== "object") order.payment = {};
        order.payment.paidAmount = paidAmount;
        order.payment.remainingCod = remainingCod;
        order.payment.amount = paidAmount;
        if (paymentRef) {
          order.payment.transactionId = paymentRef;
          order.paymentConfirmation = {
            reference: paymentRef,
            confirmedBy: adminName,
            confirmedAt: new Date(),
          };
          order.markModified("paymentConfirmation");
          updates.push(`paymentConfirmation → ${paymentRef}`);
        }
        order.markModified("payment");
        updates.push(`partial: paid ${paidAmount}, remaining COD ${remainingCod}`);
      } else if (statusChanging && ["unpaid", "paid", "refunded", "failed"].includes(nextPay)) {
        if (!order.payment || typeof order.payment !== "object") order.payment = {};
        if (nextPay === "paid") {
          if (!paymentRef) {
            return NextResponse.json(
              {
                success: false,
                error: "Enter a transaction ID / payment reference when marking paid.",
              },
              { status: 400 }
            );
          }
          const total = orderGrandTotal(order);
          order.payment.paidAmount = total;
          order.payment.remainingCod = 0;
          order.payment.amount = total;
          order.payment.paidAt = order.payment.paidAt || new Date();
          order.payment.transactionId = paymentRef;
          order.paymentConfirmation = {
            reference: paymentRef,
            confirmedBy: adminName,
            confirmedAt: new Date(),
          };
          order.markModified("paymentConfirmation");
          updates.push(`paymentConfirmation → ${paymentRef}`);
        } else if (nextPay === "unpaid") {
          order.payment.paidAmount = 0;
          order.payment.remainingCod = 0;
          order.payment.amount = 0;
        }
        order.markModified("payment");
      } else if (!statusChanging) {
        return NextResponse.json(
          { success: false, error: "Select a different payment status." },
          { status: 400 }
        );
      }
    }

    if (Array.isArray(body.items)) {
      if (body.items.length < 1) {
        return NextResponse.json(
          { success: false, error: "Order must have at least one item." },
          { status: 400 }
        );
      }
      const normalizedItems = [];
      for (const raw of body.items) {
        const name = String(raw?.name || "").trim();
        const quantity = Math.max(1, Math.min(999, Math.round(Number(raw?.quantity) || 1)));
        const unitPrice = Math.max(0, Number(raw?.unitPrice) || 0);
        if (!name) {
          return NextResponse.json(
            { success: false, error: "Each item needs a product name." },
            { status: 400 }
          );
        }
        if (!Number.isFinite(unitPrice)) {
          return NextResponse.json(
            { success: false, error: "Each item needs a valid unit price." },
            { status: 400 }
          );
        }
        const lineTotal = Math.round(quantity * unitPrice * 100) / 100;
        let productId = null;
        if (raw?.productId && mongoose.Types.ObjectId.isValid(String(raw.productId))) {
          productId = raw.productId;
        }
        const selectedAddOns = Array.isArray(raw?.selectedAddOns)
          ? raw.selectedAddOns
              .map((a) => ({
                name: String(a?.name || "").trim().slice(0, 120),
                price: Math.max(0, Number(a?.price) || 0),
              }))
              .filter((a) => a.name)
              .slice(0, 20)
          : [];
        const selectedVariation =
          raw?.selectedVariation && typeof raw.selectedVariation === "object"
            ? raw.selectedVariation
            : null;
        normalizedItems.push({
          productId,
          name: name.slice(0, 300),
          image: String(raw?.image || "").trim().slice(0, 1000),
          variation: String(raw?.variation || "").trim().slice(0, 200),
          selectedVariation,
          selectedAddOns,
          quantity,
          unitPrice,
          total: lineTotal,
        });
      }

      const subtotal = Math.round(
        normalizedItems.reduce((s, i) => s + Number(i.total || 0), 0) * 100
      ) / 100;
      const discount = Math.max(0, Number(order.pricing?.discount) || 0);

      let shippingCost = Number(order.pricing?.shippingCost ?? order.shippingCost ?? 0) || 0;
      if (body.deliveryEnabled === false) {
        shippingCost = 0;
      } else if (body.shippingCost !== undefined) {
        shippingCost = Math.max(0, Number(body.shippingCost) || 0);
      } else if (body.deliveryEnabled === true && body.shippingCost === undefined && shippingCost <= 0) {
        shippingCost = 250;
      }

      const total = Math.max(0, Math.round((subtotal - discount + shippingCost) * 100) / 100);

      order.items = normalizedItems;
      order.subtotal = subtotal;
      order.shippingCost = shippingCost;
      order.pricing = {
        ...(order.pricing?.toObject?.() || order.pricing || {}),
        subtotal,
        discount,
        shippingCost,
        shippingMethod: order.pricing?.shippingMethod || "",
        shippingZone: order.pricing?.shippingZone || "",
        total,
      };
      order.markModified("items");
      order.markModified("pricing");

      if (!Array.isArray(order.timeline)) order.timeline = [];
      order.timeline.push({
        status: "items_updated",
        title: "Order items updated by admin",
        description: `${normalizedItems.length} item(s) · total Rs. ${total}`,
        timestamp: new Date(),
        by: "admin",
      });
      order.markModified("timeline");
      updates.push("items & pricing updated");
    } else if (body.shippingCost !== undefined || body.deliveryEnabled !== undefined) {
      const discount = Math.max(0, Number(order.pricing?.discount) || 0);
      const subtotal = Math.max(
        0,
        Number(order.pricing?.subtotal ?? order.subtotal) || 0
      );
      let shippingCost = Number(order.pricing?.shippingCost ?? order.shippingCost ?? 0) || 0;
      if (body.deliveryEnabled === false) shippingCost = 0;
      else if (body.shippingCost !== undefined) shippingCost = Math.max(0, Number(body.shippingCost) || 0);
      const total = Math.max(0, Math.round((subtotal - discount + shippingCost) * 100) / 100);
      order.shippingCost = shippingCost;
      order.pricing = {
        ...(order.pricing?.toObject?.() || order.pricing || {}),
        subtotal,
        discount,
        shippingCost,
        shippingMethod: order.pricing?.shippingMethod || "",
        shippingZone: order.pricing?.shippingZone || "",
        total,
      };
      order.markModified("pricing");
      updates.push(`shipping → ${shippingCost}`);
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

    if (body.tags !== undefined) {
      const nextTags = Array.isArray(body.tags)
        ? [
            ...new Set(
              body.tags
                .map((t) => String(t || "").trim().toLowerCase().slice(0, 40))
                .filter(Boolean)
            ),
          ].slice(0, 20)
        : [];
      order.tags = nextTags;
      order.markModified("tags");
      updates.push(`tags → [${nextTags.join(", ")}]`);
      if (!Array.isArray(order.timeline)) order.timeline = [];
      order.timeline.push({
        status: order.orderStatus,
        title: "Tags updated",
        description: nextTags.length ? nextTags.join(", ") : "(cleared)",
        timestamp: new Date(),
        by: adminName,
      });
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
        (number ? storefrontTrackingUrl(number) : "") ||
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
        (number ? storefrontTrackingUrl(number) : "") ||
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
