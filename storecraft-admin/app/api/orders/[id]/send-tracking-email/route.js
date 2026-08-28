import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import { sendTemplatedCustomerEmail } from "@/lib/customerLifecycleEmail";
import Order from "@/lib/models/Order.model";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { requestIp } from "@/lib/requestIp";

export async function POST(request, context) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessCapability(user, "canManageOrders");
    if (denied) return denied;
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
    }
    await dbConnect();
    const settingsDoc = await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean();
    const order = await Order.findById(id).lean();
    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found." }, { status: 404 });
    }
    if (!order.customer?.email) {
      return NextResponse.json({ success: false, error: "Customer email missing." }, { status: 400 });
    }

    const carrier = order.tracking?.carrier || "Carrier";
    const trackingNumber = order.tracking?.number || "";
    const sent = await sendTemplatedCustomerEmail(order, "orderShipped", settingsDoc, { force: true });
    if (!sent?.success) {
      return NextResponse.json(
        { success: false, error: sent?.error || "Failed to send email." },
        { status: 502 }
      );
    }

    await Order.updateOne({ _id: id }, { $set: { "tracking.notifiedAt": new Date() } });

    await logActivity({
      user: user.userId,
      userName: user.name || "Admin",
      action: `Tracking email sent for ${order.orderNumber}`,
      resource: "Order",
      resourceId: id,
      details: { to: order.customer.email, trackingNumber, carrier },
      type: "update",
      ip: requestIp(request),
    });

    return NextResponse.json({ success: true, message: "Email sent" });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to prepare email." },
      { status: 500 }
    );
  }
}
