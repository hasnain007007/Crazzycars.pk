import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import Order from "@/lib/models/Order.model";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { fetchPostexTracking } from "@/lib/postex";
import { ORDER_STATUS_TIMELINE_TITLES } from "@/lib/orderStatusTimeline";

export const dynamic = "force-dynamic";

const MAX_IDS = 40;

function mapPostexToOrderStatus(postexStatus) {
  const s = String(postexStatus || "").toLowerCase();
  if (s.includes("deliver") && !s.includes("out for") && !s.includes("attempt") && !s.includes("waiting")) {
    return "delivered";
  }
  if (s.includes("return")) return "returned";
  return null;
}

/**
 * POST /api/postex/track-bulk
 * Body: { orderIds: string[], syncOrderStatus?: boolean }
 * Fetches live Postex status for each selected order that has a tracking number.
 */
export async function POST(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessCapability(user, "canManageOrders");
    if (denied) return denied;

    const body = await request.json().catch(() => ({}));
    const rawIds = Array.isArray(body.orderIds) ? body.orderIds : [];
    const syncOrderStatus = body.syncOrderStatus !== false;
    const orderIds = rawIds
      .map((id) => String(id || "").trim())
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .slice(0, MAX_IDS);

    if (!orderIds.length) {
      return NextResponse.json({ success: false, error: "Select at least one order." }, { status: 400 });
    }

    await dbConnect();
    const settings =
      (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean()) ||
      (await Settings.findOne({}).lean());

    const orders = await Order.find({ _id: { $in: orderIds } })
      .select("orderNumber orderStatus trackingNumber courier tracking paymentStatus paymentMethod")
      .exec();

    const byId = new Map(orders.map((o) => [String(o._id), o]));
    const results = [];
    let okCount = 0;
    let skipCount = 0;
    let failCount = 0;
    let syncedCount = 0;

    for (const id of orderIds) {
      const order = byId.get(id);
      if (!order) {
        results.push({ orderId: id, success: false, error: "Order not found" });
        failCount += 1;
        continue;
      }

      const trackingNumber = String(order.trackingNumber || order.tracking?.number || "").trim();
      if (!trackingNumber) {
        results.push({
          orderId: id,
          orderNumber: order.orderNumber,
          success: false,
          skipped: true,
          error: "No tracking number",
        });
        skipCount += 1;
        continue;
      }

      const live = await fetchPostexTracking(trackingNumber, {
        settingsCourier: settings?.courier,
      });

      if (!live?.success) {
        results.push({
          orderId: id,
          orderNumber: order.orderNumber,
          trackingNumber,
          success: false,
          error: live?.error || "Tracking failed",
        });
        failCount += 1;
        continue;
      }

      if (!order.tracking) order.tracking = {};
      order.tracking.lastStatus = live.status || "";
      order.tracking.lastStatusAt = new Date();
      order.tracking.currentLocation = live.currentLocation || "";
      order.tracking.destinationCity = live.destination || "";
      order.tracking.destinationReceived = Boolean(live.destinationReceived);
      if (!order.tracking.number) order.tracking.number = trackingNumber;
      if (!order.tracking.carrier) order.tracking.carrier = order.courier || "Postex";
      order.markModified("tracking");

      let orderStatusSynced = null;
      const mapped = syncOrderStatus ? mapPostexToOrderStatus(live.status) : null;
      if (mapped && order.orderStatus !== mapped) {
        const prev = order.orderStatus;
        order.orderStatus = mapped;
        if (!Array.isArray(order.statusHistory)) order.statusHistory = [];
        order.statusHistory.push({
          status: mapped,
          changedBy: user.name || "Admin",
          changedAt: new Date(),
          note: `Synced from Postex live status: ${live.status}`,
        });
        if (!Array.isArray(order.timeline)) order.timeline = [];
        const info = ORDER_STATUS_TIMELINE_TITLES[mapped] || { title: mapped, description: "" };
        order.timeline.push({
          status: mapped,
          title: info.title,
          description: info.description || `Postex: ${live.status}`,
          timestamp: new Date(),
          by: "system",
        });
        order.markModified("timeline");
        if (mapped === "delivered" && !order.deliveredAt) {
          order.deliveredAt = new Date();
        }
        orderStatusSynced = { from: prev, to: mapped };
        syncedCount += 1;
      }

      await order.save();
      okCount += 1;
      results.push({
        orderId: id,
        orderNumber: order.orderNumber,
        trackingNumber,
        success: true,
        status: live.status,
        currentLocation: live.currentLocation || "",
        destination: live.destination || "",
        destinationReceived: Boolean(live.destinationReceived),
        destinationReceivedLabel: live.destinationReceivedLabel || "",
        orderStatus: order.orderStatus,
        orderStatusSynced,
      });
    }

    return NextResponse.json({
      success: true,
      okCount,
      skipCount,
      failCount,
      syncedCount,
      results,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Bulk tracking failed." },
      { status: 500 }
    );
  }
}
