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
  createRunCourierShipment,
  displayCourierName,
  fetchRunCourierLabel,
  storefrontTrackingUrl,
} from "@/lib/runcourier";

function requestIp(request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
}

function applyRunCourierShipmentToOrder(order, { trackingNumber, label, invoiceLink, adminName, selectedApi }) {
  const tn = String(trackingNumber || "").trim();
  const carrierDisplay = displayCourierName(selectedApi);
  const url = storefrontTrackingUrl(tn);

  order.trackingNumber = tn;
  order.courier = carrierDisplay;
  order.trackingUrl = url;
  order.runCourierApi = String(selectedApi || "Auto");
  order.tracking = {
    number: tn,
    carrier: carrierDisplay,
    url,
    notifiedAt: order.tracking?.notifiedAt || null,
    lastStatus: order.tracking?.lastStatus || "",
    lastStatusAt: order.tracking?.lastStatusAt || null,
    currentLocation: order.tracking?.currentLocation || "",
    destinationCity: order.tracking?.destinationCity || "",
    destinationReceived: Boolean(order.tracking?.destinationReceived),
  };
  if (label) {
    order.runCourierLabel = String(label);
  } else if (invoiceLink) {
    // Store portal airbill/invoice URL for print/download.
    order.runCourierLabel = String(invoiceLink);
  }

  const wasNotShipped = order.orderStatus !== "shipped" && order.orderStatus !== "delivered";
  if (wasNotShipped) {
    order.orderStatus = "shipped";
    order.statusHistory.push({
      status: "shipped",
      changedBy: adminName,
      changedAt: new Date(),
      note: `Shipment booked with Run Courier (${carrierDisplay}) — ${tn}`,
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
    status: "runcourier_booked",
    title: `Shipment booked with Run Courier (${carrierDisplay})`,
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
      selectedApi: body.selectedApi || body.api || body.courierApi,
      productType: body.productType,
      serviceType: body.serviceType,
      pieces: body.pieces,
      remarks: body.remarks,
      weight: body.weight,
      cityName: body.cityName || body.city || "",
      deliveryAddress: body.deliveryAddress || "",
      customerName: body.customerName || "",
      customerPhone: body.customerPhone || "",
      codAmount: body.codAmount,
      paymentMethod: body.paymentMethod,
    };

    // Optional pre-book edits from Run Courier booking table.
    if (body.shippingAddress && typeof body.shippingAddress === "object") {
      const sa = body.shippingAddress;
      if (!order.shippingAddress) order.shippingAddress = {};
      if (sa.street != null || sa.address != null) {
        const street = String(sa.street || sa.address || "").trim();
        order.shippingAddress.street = street;
        order.shippingAddress.line1 = street;
        order.shippingAddress.address = street;
      }
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

    if (bookingOptions.customerName) {
      bookingOptions.customerName = String(bookingOptions.customerName).trim();
    }
    if (bookingOptions.customerPhone) {
      bookingOptions.customerPhone = String(bookingOptions.customerPhone).trim();
    }
    if (bookingOptions.cityName) {
      bookingOptions.cityName = String(bookingOptions.cityName).trim();
    }
    if (bookingOptions.deliveryAddress) {
      bookingOptions.deliveryAddress = String(bookingOptions.deliveryAddress).trim();
    }

    const result = await createRunCourierShipment(
      { order: order.toObject(), settings },
      { bookingOptions }
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Booking failed.",
          selectedApi: result.selectedApi || bookingOptions.selectedApi,
        },
        { status: 400 }
      );
    }

    let label = result.label || "";
    const invoiceLink = String(result.invoiceLink || "").trim();
    if (!label && invoiceLink) {
      label = invoiceLink;
    }
    if (!label) {
      const labelRes = await fetchRunCourierLabel(result.trackingNumber, {
        settingsCourier: settings.courier,
        invoiceLink,
      });
      if (labelRes.success && labelRes.invoiceLink) label = labelRes.invoiceLink;
      else if (labelRes.success) label = labelRes.label;
    }

    applyRunCourierShipmentToOrder(order, {
      trackingNumber: result.trackingNumber,
      label,
      invoiceLink,
      adminName,
      selectedApi: result.selectedApi,
    });

    await order.save();

    dispatchOrderLifecycleEmails(order, {
      prevStatus,
      nextStatus: order.orderStatus,
      prevPayment: order.paymentStatus,
      nextPayment: order.paymentStatus,
      prevTracking: existingTracking,
      nextTracking: String(order.trackingNumber || order.tracking?.number || "").trim(),
    }).catch((e) => console.error("[email] runcourier book:", e?.message || e));

    await logActivity({
      user: user.userId,
      userName: adminName,
      action: `Run Courier shipment booked for ${order.orderNumber}: ${result.trackingNumber} (${result.selectedApi})`,
      resource: "Order",
      resourceId: orderId,
      type: "update",
      ip: requestIp(request),
    });

    const total = orderGrandTotal(order);
    const labelPdf =
      label && !String(label).startsWith("http")
        ? String(label).replace(/^data:application\/pdf;base64,/, "")
        : "";
    const invoiceUrl = invoiceLink || (String(label).startsWith("http") ? label : "");
    return NextResponse.json({
      success: true,
      message: `Shipment booked via Run Courier (${result.selectedApi}).`,
      trackingNumber: result.trackingNumber,
      orderReference: result.orderReference || "",
      selectedApi: result.selectedApi,
      trackingUrl: order.trackingUrl,
      label: Boolean(label || invoiceUrl),
      hasLabel: Boolean(label || invoiceUrl),
      invoiceUrl,
      // Inline PDF so the browser can save the airbill immediately on book.
      ...(labelPdf ? { labelPdfBase64: labelPdf } : {}),
      labelDownloadUrl: invoiceUrl
        ? invoiceUrl
        : `/api/runcourier/label?trackingNumber=${encodeURIComponent(result.trackingNumber)}&orderId=${encodeURIComponent(orderId)}&download=1`,
      order: {
        id: order._id.toString(),
        orderNumber: order.orderNumber,
        orderStatus: order.orderStatus,
        trackingNumber: order.trackingNumber,
        courier: order.courier,
        trackingUrl: order.trackingUrl,
        runCourierApi: order.runCourierApi,
        total,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Could not book Run Courier shipment." },
      { status: 500 }
    );
  }
}
