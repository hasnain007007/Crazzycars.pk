import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import Order from "@/lib/models/Order.model";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { cancelRunCourierShipment } from "@/lib/runcourier";

function requestIp(request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
}

export async function POST(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessCapability(user, "canManageOrders");
    if (denied) return denied;

    const body = await request.json().catch(() => ({}));
    const orderId = String(body.orderId || "").trim();
    let trackingNumber = String(body.trackingNumber || "").trim();

    await dbConnect();
    let order = null;
    if (orderId && mongoose.Types.ObjectId.isValid(orderId)) {
      order = await Order.findById(orderId);
      if (order) {
        trackingNumber = trackingNumber || order.trackingNumber || order.tracking?.number || "";
      }
    }

    if (!trackingNumber) {
      return NextResponse.json({ success: false, error: "Tracking number required." }, { status: 400 });
    }

    const settings =
      (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean()) ||
      (await Settings.findOne({}).lean()) ||
      {};

    const result = await cancelRunCourierShipment(trackingNumber, {
      settingsCourier: settings.courier,
    });
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || "Cancel failed." }, { status: 400 });
    }

    if (order) {
      const adminName = user.name || "Admin";
      if (!Array.isArray(order.timeline)) order.timeline = [];
      order.timeline.push({
        status: "runcourier_cancelled",
        title: "Run Courier shipment cancelled",
        description: `Tracking ${trackingNumber} cancelled with Run Courier`,
        timestamp: new Date(),
        by: "admin",
      });
      order.markModified("timeline");

      order.trackingNumber = "";
      order.trackingUrl = "";
      order.courier = "";
      order.runCourierLabel = "";
      order.runCourierApi = "";
      order.tracking = {
        number: "",
        carrier: "",
        url: "",
        notifiedAt: null,
        currentLocation: "",
        destinationCity: "",
        destinationReceived: false,
        lastStatus: "",
      };
      order.markModified("tracking");

      if (order.orderStatus === "shipped") {
        order.orderStatus = "processing";
        order.statusHistory.push({
          status: "processing",
          changedBy: adminName,
          changedAt: new Date(),
          note: `Run Courier cancel — ${trackingNumber}`,
        });
      }
      await order.save();
      await logActivity({
        user: user.userId,
        userName: adminName,
        action: `Run Courier shipment cancelled: ${trackingNumber}`,
        resource: "Order",
        resourceId: String(order._id),
        type: "update",
        ip: requestIp(request),
      });
    }

    return NextResponse.json({ success: true, trackingNumber, message: "Shipment cancelled." });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Cancel failed." },
      { status: 500 }
    );
  }
}
