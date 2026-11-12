import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { resolvePublicTracking } from "@/lib/resolvePublicTracking";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import Order from "@/lib/models/Order.model";
import { signReviewRequestToken } from "@/lib/reviewRequestToken";
import {
  checkPublicTrackingRateLimit,
  clientIpFromRequest,
  normalizePublicTrackingNumber,
  toPublicTrackingPayload,
} from "@/lib/publicTracking";

/** Order numbers shoppers see on the thank-you page and in WhatsApp (ORD-2026-00577). */
const ORDER_NUMBER_RE = /^ORD-\d{4}-\d{1,8}$/;

const ORDER_STATUS_LABEL = {
  pending: "Order received — we will confirm it on WhatsApp",
  confirmed: "Confirmed — your order is being packed",
  processing: "Confirmed — your order is being packed",
  packed: "Packed — handing over to the courier",
  shipped: "Dispatched — courier booking in progress",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
  refunded: "Refunded",
};

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const ip = clientIpFromRequest(request);
    const limited = checkPublicTrackingRateLimit(ip, { max: 30, windowMs: 60_000 });
    if (limited.limited) {
      return NextResponse.json(
        { success: false, error: "Too many tracking requests. Try again shortly." },
        {
          status: 429,
          headers: {
            "Cache-Control": "no-store",
            "Retry-After": String(Math.ceil(limited.remainingMs / 1000) || 60),
          },
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const trackingNumber = normalizePublicTrackingNumber(
      searchParams.get("trackingNumber") || searchParams.get("tracking") || ""
    );
    if (!trackingNumber) {
      return NextResponse.json(
        { success: false, error: "Invalid tracking number" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    let settingsCourier = null;
    try {
      await dbConnect();
      const settings =
        (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean()) ||
        (await Settings.findOne({}).lean());
      settingsCourier = settings?.courier || null;
    } catch {
      /* env-only fallback */
    }

    // Order number instead of a courier tracking number: track the parcel booked for that order,
    // or show the order's own status before it is booked. Order numbers are sequential, so the
    // destination city is left out for these lookups.
    let lookupNumber = trackingNumber;
    let byOrder = null;
    if (ORDER_NUMBER_RE.test(trackingNumber)) {
      byOrder = await Order.findOne({ orderNumber: trackingNumber })
        .select("orderNumber orderStatus trackingNumber tracking.number courier")
        .lean();
      if (!byOrder) {
        return NextResponse.json(
          { success: false, error: "Order not found. Check the order number or WhatsApp 03284010007." },
          { status: 404, headers: { "Cache-Control": "no-store" } }
        );
      }
      lookupNumber = normalizePublicTrackingNumber(byOrder.trackingNumber || byOrder.tracking?.number || "");
      if (!lookupNumber) {
        const statusKey = String(byOrder.orderStatus || "pending").toLowerCase();
        return NextResponse.json(
          toPublicTrackingPayload(
            {
              success: true,
              trackingNumber: byOrder.orderNumber,
              status: ORDER_STATUS_LABEL[statusKey] || ORDER_STATUS_LABEL.pending,
              courier: "Not booked with a courier yet",
              events: [],
            },
            { orderNumber: byOrder.orderNumber }
          ),
          { headers: { "Cache-Control": "no-store" } }
        );
      }
    }

    const result = await resolvePublicTracking(lookupNumber, { settingsCourier });
    if (byOrder && result?.success) result.destination = "";
    // Delivered orders get a signed "Rate your order" link (reviews stay moderated).
    if (result?.success) {
      try {
        const order = await Order.findOne({
          $or: [{ trackingNumber: lookupNumber }, { "tracking.number": lookupNumber }],
          orderStatus: "delivered",
        })
          .select("_id")
          .lean();
        const token = order ? signReviewRequestToken(String(order._id)) : "";
        if (token) result.reviewUrl = `/review/${order._id}?t=${encodeURIComponent(token)}`;
      } catch {
        /* no review link */
      }
    }
    const status = result.success ? 200 : result.error === "Tracking unavailable" ? 503 : 404;
    return NextResponse.json(result, {
      status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Could not connect to courier" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
