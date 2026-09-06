import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import Order from "@/lib/models/Order.model";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { fetchRunCourierTracking, isRunCourierOrder } from "@/lib/runcourier";
import { mapRunCourierStatusToOrderStatus, isRunCourierDeliveredStatus } from "@/lib/runcourierWebhook";
import { ORDER_STATUS_TIMELINE_TITLES } from "@/lib/orderStatusTimeline";

export const dynamic = "force-dynamic";

const MAX_IDS = 40;

function isCodPaymentMethod(method) {
  const m = String(method || "").toLowerCase();
  return m === "cod" || m.includes("cash");
}

/**
 * POST /api/runcourier/track-bulk
 * Body: { orderIds: string[], syncOrderStatus?: boolean }
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
      .select(
        "orderNumber orderStatus trackingNumber courier tracking paymentStatus paymentMethod runCourierApi runCourierLabel"
      )
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

      // Skip obvious PostEx-only rows unless they somehow have RC markers
      if (!isRunCourierOrder(order) && String(order.courier || "").toLowerCase().includes("postex")) {
        results.push({
          orderId: id,
          orderNumber: order.orderNumber,
          success: false,
          skipped: true,
          error: "Not a Run Courier shipment",
        });
        skipCount += 1;
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

      const live = await fetchRunCourierTracking(trackingNumber, {
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
      order.tracking.currentLocation = live.currentLocation || live.location || "";
      order.tracking.destinationCity = live.destination || order.tracking.destinationCity || "";
      order.tracking.destinationReceived = Boolean(live.destinationReceived);
      if (!order.tracking.number) order.tracking.number = trackingNumber;
      if (!order.tracking.carrier) {
        order.tracking.carrier = order.courier || live.courier || "Run Courier";
      }
      order.markModified("tracking");

      let orderStatusSynced = null;
      const mapped = syncOrderStatus ? mapRunCourierStatusToOrderStatus(live.status) : null;
      if (mapped && order.orderStatus !== mapped) {
        if (!(order.orderStatus === "delivered" && mapped === "shipped")) {
          const prev = order.orderStatus;
          order.orderStatus = mapped;
          if (!Array.isArray(order.statusHistory)) order.statusHistory = [];
          order.statusHistory.push({
            status: mapped,
            changedBy: user.name || "Admin",
            changedAt: new Date(),
            note: `Synced from Run Courier live status: ${live.status} (was ${prev})`,
          });
          const statusInfo = ORDER_STATUS_TIMELINE_TITLES[mapped] || {
            title: mapped,
            description: "",
          };
          if (!Array.isArray(order.timeline)) order.timeline = [];
          order.timeline.push({
            status: mapped,
            title: statusInfo.title,
            description: `Synced from Run Courier: ${live.status}`,
            timestamp: new Date(),
            by: "admin",
          });
          order.markModified("timeline");
          orderStatusSynced = mapped;
          syncedCount += 1;

          if (isRunCourierDeliveredStatus(live.status)) {
            if (!order.deliveredAt) order.deliveredAt = new Date();
            if (isCodPaymentMethod(order.paymentMethod) && order.paymentStatus !== "paid") {
              order.paymentStatus = "paid";
              if (!order.payment || typeof order.payment !== "object") order.payment = {};
              order.payment.paidAt = new Date();
              order.markModified("payment");
            }
          }
        }
      }

      await order.save();
      okCount += 1;
      results.push({
        orderId: id,
        orderNumber: order.orderNumber,
        trackingNumber,
        success: true,
        status: live.status,
        location: live.currentLocation || live.location || "",
        orderStatusSynced,
        events: Array.isArray(live.events) ? live.events.slice(0, 5) : [],
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
      { success: false, error: e.message || "Bulk track failed." },
      { status: 500 }
    );
  }
}
