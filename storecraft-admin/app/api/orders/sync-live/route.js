/**
 * POST /api/orders/sync-live
 * Refresh courier tracking for all in-transit orders and auto-set delivered / returned.
 *
 * Body (optional): { limit?: number } — max orders to process (default 120, max 200).
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import Order from "@/lib/models/Order.model";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { fetchPostexTracking } from "@/lib/postex";
import {
  fetchRunCourierTracking,
  isRunCourierOrder,
} from "@/lib/runcourier";
import {
  mapRunCourierStatusToOrderStatus,
  isRunCourierDeliveredStatus,
} from "@/lib/runcourierWebhook";
import { ORDER_STATUS_TIMELINE_TITLES } from "@/lib/orderStatusTimeline";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const LIVE_STATUSES = ["confirmed", "processing", "packed", "shipped"];
const BATCH_HARD_CAP = 200;
const DEFAULT_LIMIT = 120;

function mapPostexToOrderStatus(postexStatus) {
  const s = String(postexStatus || "").toLowerCase();
  if (
    s.includes("deliver") &&
    !s.includes("out for") &&
    !s.includes("attempt") &&
    !s.includes("waiting")
  ) {
    return "delivered";
  }
  if (s.includes("return")) return "returned";
  return null;
}

function isCodPaymentMethod(method) {
  const m = String(method || "").toLowerCase();
  return m === "cod" || m.includes("cash");
}

function isPostexish(order) {
  const c = String(order.courier || order.tracking?.carrier || "").toLowerCase();
  if (c.includes("postex") || c.includes("post ex")) return true;
  if (isRunCourierOrder(order)) return false;
  // Tracking-only rows with no courier marker — try PostEx first historically.
  return !c || c.includes("post");
}

async function syncOneOrder(order, { settings, userName }) {
  const trackingNumber = String(order.trackingNumber || order.tracking?.number || "").trim();
  if (!trackingNumber) {
    return {
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      success: false,
      skipped: true,
      error: "No tracking number",
    };
  }

  const preferRunCourier = isRunCourierOrder(order) && !String(order.courier || "").toLowerCase().includes("postex");
  let live = null;
  let source = "";

  if (preferRunCourier) {
    live = await fetchRunCourierTracking(trackingNumber, { settingsCourier: settings?.courier });
    source = "runcourier";
    if (!live?.success && isPostexish(order)) {
      live = await fetchPostexTracking(trackingNumber, { settingsCourier: settings?.courier });
      source = "postex";
    }
  } else {
    live = await fetchPostexTracking(trackingNumber, { settingsCourier: settings?.courier });
    source = "postex";
    if (!live?.success) {
      live = await fetchRunCourierTracking(trackingNumber, { settingsCourier: settings?.courier });
      source = "runcourier";
    }
  }

  if (!live?.success) {
    return {
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      trackingNumber,
      success: false,
      error: live?.error || "Tracking failed",
    };
  }

  if (!order.tracking) order.tracking = {};
  order.tracking.lastStatus = live.status || "";
  order.tracking.lastStatusAt = new Date();
  order.tracking.currentLocation = live.currentLocation || live.location || "";
  order.tracking.destinationCity = live.destination || order.tracking.destinationCity || "";
  order.tracking.destinationReceived = Boolean(live.destinationReceived);
  if (!order.tracking.number) order.tracking.number = trackingNumber;
  if (!order.tracking.carrier) {
    order.tracking.carrier = order.courier || live.courier || (source === "postex" ? "Postex" : "Run Courier");
  }
  order.markModified("tracking");

  let orderStatusSynced = null;
  const mapped =
    source === "postex"
      ? mapPostexToOrderStatus(live.status)
      : mapRunCourierStatusToOrderStatus(live.status);

  if (mapped && order.orderStatus !== mapped) {
    // Never demote delivered → shipped
    if (!(order.orderStatus === "delivered" && mapped === "shipped")) {
      const prev = order.orderStatus;
      order.orderStatus = mapped;
      if (!Array.isArray(order.statusHistory)) order.statusHistory = [];
      order.statusHistory.push({
        status: mapped,
        changedBy: userName || "Admin",
        changedAt: new Date(),
        note: `Synced from ${source === "postex" ? "Postex" : "Run Courier"} live status: ${live.status}`,
      });
      if (!Array.isArray(order.timeline)) order.timeline = [];
      const info = ORDER_STATUS_TIMELINE_TITLES[mapped] || { title: mapped, description: "" };
      order.timeline.push({
        status: mapped,
        title: info.title,
        description: info.description || `${source}: ${live.status}`,
        timestamp: new Date(),
        by: "system",
      });
      order.markModified("timeline");

      if (mapped === "delivered" || isRunCourierDeliveredStatus(live.status)) {
        if (!order.deliveredAt) order.deliveredAt = new Date();
        if (isCodPaymentMethod(order.paymentMethod) && order.paymentStatus !== "paid") {
          order.paymentStatus = "paid";
          if (!order.payment || typeof order.payment !== "object") order.payment = {};
          order.payment.paidAt = new Date();
          order.markModified("payment");
        }
      }

      orderStatusSynced = { from: prev, to: mapped };
    }
  }

  await order.save();
  return {
    orderId: String(order._id),
    orderNumber: order.orderNumber,
    trackingNumber,
    success: true,
    source,
    status: live.status,
    currentLocation: live.currentLocation || live.location || "",
    orderStatus: order.orderStatus,
    orderStatusSynced,
  };
}

export async function POST(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessCapability(user, "canManageOrders");
    if (denied) return denied;

    const body = await request.json().catch(() => ({}));
    const limit = Math.min(
      BATCH_HARD_CAP,
      Math.max(1, Number(body.limit) || DEFAULT_LIMIT)
    );

    await dbConnect();
    const settings =
      (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean()) ||
      (await Settings.findOne({}).lean());

    const liveOrders = await Order.find({
      orderStatus: { $in: LIVE_STATUSES },
      $or: [
        { trackingNumber: { $exists: true, $nin: [null, ""] } },
        { "tracking.number": { $exists: true, $nin: [null, ""] } },
      ],
    })
      .select(
        "orderNumber orderStatus trackingNumber courier tracking paymentStatus paymentMethod runCourierApi runCourierLabel deliveredAt payment"
      )
      .sort({ shippedAt: -1, updatedAt: -1 })
      .limit(limit)
      .exec();

    const results = [];
    let okCount = 0;
    let skipCount = 0;
    let failCount = 0;
    let syncedCount = 0;
    const userName = user.name || "Admin";

    for (const order of liveOrders) {
      const row = await syncOneOrder(order, { settings, userName });
      results.push(row);
      if (row.skipped) skipCount += 1;
      else if (row.success) {
        okCount += 1;
        if (row.orderStatusSynced) syncedCount += 1;
      } else failCount += 1;
    }

    return NextResponse.json({
      success: true,
      scanned: liveOrders.length,
      limit,
      okCount,
      skipCount,
      failCount,
      syncedCount,
      results,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Live sync failed." },
      { status: 500 }
    );
  }
}
