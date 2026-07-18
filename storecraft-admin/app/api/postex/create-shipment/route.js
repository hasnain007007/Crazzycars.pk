import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import Order from "@/lib/models/Order.model";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { ORDER_STATUS_TIMELINE_TITLES } from "@/lib/orderStatusTimeline";
import { orderGrandTotal } from "@/lib/orderFormat";
import {
  createPostexShipment,
  fetchPostexLabel,
  isPrepaidOrder,
  storefrontTrackingUrl,
} from "@/lib/postex";

function requestIp(request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
}

function applyShipmentToOrder(order, { trackingNumber, label, adminName }) {
  const tn = String(trackingNumber || "").trim();
  const url = storefrontTrackingUrl(tn);

  order.trackingNumber = tn;
  order.courier = "Postex";
  order.trackingUrl = url;
  order.tracking = {
    number: tn,
    carrier: "Postex",
    url,
    notifiedAt: order.tracking?.notifiedAt || null,
  };
  if (label) {
    order.postexLabel = String(label);
  }

  const wasNotShipped = order.orderStatus !== "shipped" && order.orderStatus !== "delivered";
  if (wasNotShipped) {
    order.orderStatus = "shipped";
    order.statusHistory.push({
      status: "shipped",
      changedBy: adminName,
      changedAt: new Date(),
      note: `Shipment booked with Postex — ${tn}`,
    });
    const statusInfo = ORDER_STATUS_TIMELINE_TITLES.shipped || {
      title: "Order Shipped",
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
  }

  if (!Array.isArray(order.timeline)) order.timeline = [];
  order.timeline.push({
    status: "postex_booked",
    title: "Shipment booked with Postex",
    description: `Tracking number assigned: ${tn}`,
    timestamp: new Date(),
    by: "admin",
  });

  if (!order.shippedAt) {
    order.shippedAt = new Date();
  }

  order.markModified("timeline");
  order.markModified("tracking");
}

export async function POST(request) {
  try {
    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const orderId = String(body.orderId || "").trim();
    const rebook = Boolean(body.rebook);

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return NextResponse.json({ success: false, error: "Invalid order id." }, { status: 400 });
    }

    await dbConnect();
    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found." }, { status: 404 });
    }

    const existingTracking = String(order.trackingNumber || order.tracking?.number || "").trim();
    if (existingTracking && !rebook) {
      return NextResponse.json(
        {
          success: false,
          error: "Order already has a tracking number. Use rebook to create a new shipment.",
          trackingNumber: existingTracking,
        },
        { status: 409 }
      );
    }

    const settings =
      (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean()) ||
      (await Settings.findOne({}).lean()) ||
      {};

    const adminName = user.name || "Admin";
    const bookingOptions = {
      handling: body.handling,
      pieces: body.pieces,
      invoiceDivision: body.invoiceDivision,
      remarks: body.remarks,
      codAmount: body.codAmount,
      weight: body.weight,
      pickupAddressCode: body.pickupAddressCode,
      paymentMethod: body.paymentMethod,
    };

    const result = await createPostexShipment(
      { order: order.toObject(), settings },
      { settings, bookingOptions }
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || "Booking failed." }, { status: 400 });
    }

    let label = result.label || "";
    if (!label) {
      const labelRes = await fetchPostexLabel(result.trackingNumber, { settingsCourier: settings.courier });
      if (labelRes.success) label = labelRes.label;
    }

    applyShipmentToOrder(order, {
      trackingNumber: result.trackingNumber,
      label,
      adminName,
    });

    await order.save();

    await logActivity({
      user: user.userId,
      userName: adminName,
      action: `Postex shipment booked for ${order.orderNumber}: ${result.trackingNumber}`,
      resource: "Order",
      resourceId: orderId,
      type: "update",
      ip: requestIp(request),
    });

    const total = orderGrandTotal(order);
    return NextResponse.json({
      success: true,
      message: `Shipment booked successfully.`,
      trackingNumber: result.trackingNumber,
      orderReference: result.orderReference || "",
      trackingUrl: order.trackingUrl,
      label: label ? true : false,
      hasLabel: Boolean(label),
      order: {
        id: order._id.toString(),
        orderNumber: order.orderNumber,
        orderStatus: order.orderStatus,
        trackingNumber: order.trackingNumber,
        courier: order.courier,
        trackingUrl: order.trackingUrl,
        total,
        isCod: !isPrepaidOrder(order),
      },
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Could not book shipment." },
      { status: 500 }
    );
  }
}
