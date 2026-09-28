import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import { sendTemplatedCustomerEmail } from "@/lib/customerLifecycleEmail";
import { resolveCustomerEmail } from "@/lib/orderEmailPlan";
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

    const to = resolveCustomerEmail(order);
    if (!to) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Customer has no real email (guest checkout). Enter an email on the order or use WhatsApp.",
        },
        { status: 400 }
      );
    }

    const trackingNumber = String(order.trackingNumber || order.tracking?.number || "").trim();
    if (!trackingNumber) {
      return NextResponse.json(
        { success: false, error: "Save a tracking number before sending the email." },
        { status: 400 }
      );
    }

    const carrier = order.tracking?.carrier || order.courier || "Carrier";
    const sent = await sendTemplatedCustomerEmail(order, "orderShipped", settingsDoc, {
      force: true,
      extra: { email: to },
    });
    if (!sent?.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            sent?.error ||
            "Failed to send email. Check admin RESEND_API_KEY + FROM_EMAIL in Coolify.",
        },
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
      details: { to, trackingNumber, carrier },
      type: "update",
      ip: requestIp(request),
    });

    return NextResponse.json({
      success: true,
      message: `Email sent to ${to}`,
      to,
      trackingNumber,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to prepare email." },
      { status: 500 }
    );
  }
}
