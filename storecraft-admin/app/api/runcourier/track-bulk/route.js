import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import Order from "@/lib/models/Order.model";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { fetchRunCourierTracking } from "@/lib/runcourier";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessCapability(user, "canManageOrders");
    if (denied) return denied;

    const body = await request.json().catch(() => ({}));
    const orderIds = Array.isArray(body.orderIds) ? body.orderIds.map(String) : [];
    const syncOrderStatus = Boolean(body.syncOrderStatus);
    const limit = Math.min(40, orderIds.length || 0);
    if (!limit) {
      return NextResponse.json({ success: false, error: "orderIds required." }, { status: 400 });
    }

    await dbConnect();
    const settings =
      (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean()) ||
      (await Settings.findOne({}).lean()) ||
      {};

    const orders = await Order.find({ _id: { $in: orderIds.slice(0, limit) } });
    const results = [];

    for (const order of orders) {
      const tn = String(order.trackingNumber || order.tracking?.number || "").trim();
      if (!tn) {
        results.push({ orderId: String(order._id), success: false, error: "No tracking" });
        continue;
      }
      const track = await fetchRunCourierTracking(tn, { settingsCourier: settings.courier });
      if (!track.success) {
        results.push({
          orderId: String(order._id),
          orderNumber: order.orderNumber,
          trackingNumber: tn,
          success: false,
          error: track.error,
        });
        continue;
      }

      if (!order.tracking) order.tracking = {};
      order.tracking.lastStatus = track.status;
      order.tracking.lastStatusAt = new Date();
      if (track.location) order.tracking.currentLocation = track.location;
      order.markModified("tracking");

      const statusLower = String(track.status || "").toLowerCase();
      if (syncOrderStatus) {
        if (statusLower.includes("deliver") && order.orderStatus !== "delivered") {
          order.orderStatus = "delivered";
          order.deliveredAt = order.deliveredAt || new Date();
        } else if (
          (statusLower.includes("return") || statusLower.includes("rto")) &&
          order.orderStatus !== "cancelled"
        ) {
          order.orderStatus = "cancelled";
        }
      }
      await order.save();
      results.push({
        orderId: String(order._id),
        orderNumber: order.orderNumber,
        trackingNumber: tn,
        success: true,
        status: track.status,
        location: track.location || "",
      });
    }

    return NextResponse.json({ success: true, results });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Bulk track failed." },
      { status: 500 }
    );
  }
}
