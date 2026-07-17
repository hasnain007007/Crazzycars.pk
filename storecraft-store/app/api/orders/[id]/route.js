import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Order from "@/lib/models/Order.model";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { recordEmailSent, resolveOrderConfirmationEmail, sendEmail, sendAdminOrderNotification } from "@/lib/email";

async function sendPaidOrderEmail(orderId) {
  const order = await Order.findById(orderId).lean();
  if (!order?.customer?.email) return;
  const settings = await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean();
  const storeName = settings?.general?.storeName || process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk';
  const logoUrl = settings?.general?.logo?.url || "";
  const { subject, html } = await resolveOrderConfirmationEmail(order, storeName, logoUrl);
  const sent = await sendEmail({
    to: order.customer.email,
    subject,
    html,
  });
  if (sent?.success) {
    await recordEmailSent(orderId, "order_confirmation", subject, order.customer.email);
  }
}

export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();

    const update = {};
    if (body.paymentStatus) update.paymentStatus = body.paymentStatus;
    if (body.status || body.orderStatus) update.orderStatus = body.status || body.orderStatus;
    if (body["payment.stripePaymentIntentId"]) {
      update["payment.stripePaymentIntentId"] = String(body["payment.stripePaymentIntentId"]);
    }
    if (body["payment.paidAt"]) {
      update["payment.paidAt"] = new Date(body["payment.paidAt"]);
    }
    if (body["payment.amount"] != null) {
      update["payment.amount"] = Number(body["payment.amount"]) || 0;
    }

    const order = await Order.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found." }, { status: 404 });
    }

    if (update.paymentStatus === "paid") {
      sendPaidOrderEmail(id).catch((e) => console.error("Paid order email failed:", e));
      Order.findById(id).lean().then((o) => {
        if (o) sendAdminOrderNotification(o).catch((e) => console.error("Admin notification failed:", e));
      });
    }

    return NextResponse.json({ success: true, order });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Failed to update order." }, { status: 500 });
  }
}
