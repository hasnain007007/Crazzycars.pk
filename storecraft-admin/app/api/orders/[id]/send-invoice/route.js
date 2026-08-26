import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { buildOrderInvoiceEmailHtml, resolveOrderInvoiceEmail } from "@/lib/orderInvoice";
import { recordEmailSent, sendEmail } from "@/lib/email";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import { storeMetaFromSettings } from "@/lib/invoiceStoreMeta";
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

    let body = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    await dbConnect();
    const [settingsDoc, orderDoc] = await Promise.all([
      Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean(),
      Order.findById(id),
    ]);

    if (!orderDoc) {
      return NextResponse.json({ success: false, error: "Order not found." }, { status: 404 });
    }

    const order = orderDoc.toObject ? orderDoc.toObject() : orderDoc;
    const storeMeta = storeMetaFromSettings(settingsDoc);
    const storeName = storeMeta.storeName || "Homefy.pk";

    const to = String(body.email || resolveOrderInvoiceEmail(order) || "").trim().toLowerCase();
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return NextResponse.json(
        { success: false, error: "A valid customer email is required." },
        { status: 400 }
      );
    }

    const note = String(body.note || "").trim().slice(0, 500);
    const subject = `Invoice ${order.orderNumber} — ${storeName}`;
    const html = buildOrderInvoiceEmailHtml(order, storeMeta, { note });

    const sent = await sendEmail({ to, subject, html });
    if (!sent.success) {
      await recordEmailSent(id, "invoice", subject, to, "failed");
      return NextResponse.json(
        { success: false, error: sent.error || "Failed to send invoice email." },
        { status: 503 }
      );
    }

    await recordEmailSent(id, "invoice", subject, to, "sent");

    if (!Array.isArray(orderDoc.timeline)) orderDoc.timeline = [];
    orderDoc.timeline.push({
      status: "invoice_sent",
      title: "Invoice sent to customer",
      description: `${to}${note ? ` · "${note.slice(0, 80)}"` : ""}`,
      timestamp: new Date(),
      by: user.name || user.email || "admin",
    });
    orderDoc.markModified("timeline");
    await orderDoc.save();

    await logActivity({
      user: user.userId,
      userName: user.name || "Admin",
      action: `Invoice email sent for ${order.orderNumber}`,
      resource: "Order",
      resourceId: id,
      details: { to, messageId: sent.messageId },
      type: "update",
      ip: requestIp(request),
    });

    const serialized = {
      ...order,
      id: String(order._id || id),
      emailHistory: [
        ...(order.emailHistory || []),
        {
          type: "invoice",
          subject,
          to,
          sentAt: new Date(),
          status: "sent",
        },
      ],
      timeline: orderDoc.timeline,
    };

    return NextResponse.json({
      success: true,
      message: "Invoice email sent",
      to,
      order: serialized,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to send invoice email." },
      { status: 500 }
    );
  }
}
