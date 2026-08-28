import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import Order from "@/lib/models/Order.model";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { ORDER_STATUS_TIMELINE_TITLES } from "@/lib/orderStatusTimeline";
import { orderGrandTotal } from "@/lib/orderFormat";
import { dispatchOrderLifecycleEmails } from "@/lib/customerLifecycleEmail";
import {
  createPostexShipment,
  fetchPostexLabel,
  buildCleanStreetAddress,
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
    const denied = denyUnlessCapability(user, "canManageOrders");
    if (denied) return denied;

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
    const prevStatus = order.orderStatus;
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
      type: body.type,
      pieces: body.pieces,
      invoiceDivision: body.invoiceDivision,
      remarks: body.remarks,
      weight: body.weight,
      pickupAddressCode: body.pickupAddressCode,
      paymentMethod: body.paymentMethod,
      cityName: body.cityName || body.city || "",
      deliveryAddress: body.deliveryAddress || "",
      customerName: body.customerName || "",
      codAmount: body.codAmount,
    };

    // Optional pre-book edits from PostEx recheck modal.
    if (body.shippingAddress && typeof body.shippingAddress === "object") {
      const sa = body.shippingAddress;
      if (!order.shippingAddress) order.shippingAddress = {};
      if (sa.street != null || sa.address != null) {
        const street = String(sa.street || sa.address || "").trim();
        order.shippingAddress.street = street;
        order.shippingAddress.line1 = street;
        order.shippingAddress.address = street;
      }
      if (sa.area != null) order.shippingAddress.area = String(sa.area || "").trim();
      if (sa.phone != null) {
        const phone = String(sa.phone || "").trim();
        order.shippingAddress.phone = phone;
        if (!order.customer) order.customer = {};
        order.customer.phone = phone;
        order.markModified("customer");
      }
      if (sa.name != null) {
        const name = String(sa.name || "").trim();
        if (name) {
          order.shippingAddress.name = name;
          if (!order.customer) order.customer = {};
          order.customer.name = name;
          order.markModified("customer");
        }
      }
      if (sa.city != null) order.shippingAddress.city = String(sa.city || "").trim();
      order.markModified("shippingAddress");
    }

    const result = await createPostexShipment(
      { order: order.toObject(), settings },
      { settings, bookingOptions }
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Booking failed.",
          suggestions: result.suggestions || [],
        },
        { status: 400 }
      );
    }

    let label = result.label || "";
    if (!label) {
      const labelRes = await fetchPostexLabel(result.trackingNumber, { settingsCourier: settings.courier });
      if (labelRes.success) label = labelRes.label;
    }

    // Persist cleaned street (dedupe line1/address clones) + mapped city.
    const matchedCity = String(result.matchedCity || "").trim();
    if (order.shippingAddress) {
      const cleanStreet = buildCleanStreetAddress(order.shippingAddress);
      if (cleanStreet) {
        order.shippingAddress.street = cleanStreet;
        order.shippingAddress.line1 = cleanStreet;
        order.shippingAddress.address = cleanStreet;
      }
      const prevCity = String(order.shippingAddress.city || "").trim();
      if (matchedCity && prevCity !== matchedCity) {
        order.shippingAddress.city = matchedCity;
        if (!Array.isArray(order.timeline)) order.timeline = [];
        order.timeline.push({
          status: "city_mapped",
          title: "City mapped for PostEx",
          description: `Customer city "${prevCity || "—"}" → PostEx "${matchedCity}"`,
          timestamp: new Date(),
          by: "admin",
        });
        order.markModified("timeline");
      }
      order.markModified("shippingAddress");
    }

    applyShipmentToOrder(order, {
      trackingNumber: result.trackingNumber,
      label,
      adminName,
    });

    await order.save();

    dispatchOrderLifecycleEmails(order, {
      prevStatus,
      nextStatus: order.orderStatus,
      prevPayment: order.paymentStatus,
      nextPayment: order.paymentStatus,
      prevTracking: existingTracking,
      nextTracking: String(order.trackingNumber || order.tracking?.number || "").trim(),
    }).catch((e) => console.error("[email] postex book:", e?.message || e));

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
      message: matchedCity && result.cityResolvedFrom && matchedCity !== result.cityResolvedFrom
        ? `Shipment booked (city mapped: ${result.cityResolvedFrom} → ${matchedCity}).`
        : `Shipment booked successfully.`,
      trackingNumber: result.trackingNumber,
      orderReference: result.orderReference || "",
      trackingUrl: order.trackingUrl,
      matchedCity: matchedCity || "",
      cityResolvedFrom: result.cityResolvedFrom || "",
      label: label ? true : false,
      hasLabel: Boolean(label),
      /** Client opens this to auto-download the shipping slip PDF after booking. */
      labelDownloadUrl: `/api/postex/label?trackingNumber=${encodeURIComponent(result.trackingNumber)}&orderId=${encodeURIComponent(orderId)}&download=1`,
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
