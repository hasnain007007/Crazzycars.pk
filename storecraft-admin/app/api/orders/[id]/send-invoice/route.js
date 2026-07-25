import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessMinRole } from "@/lib/requireRole";
import Order from "@/lib/models/Order.model";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { orderPricing } from "@/lib/orderFormat";
import { requestIp } from "@/lib/requestIp";
import { formatAdminPrice } from "@/lib/currency";

function formatMoney(n) {
  return formatAdminPrice(n);
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(request, context) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessMinRole(user, "editor");
    if (denied) return denied;
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
    }
    await dbConnect();
    const settingsDoc = await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean();
    const storeName = settingsDoc?.general?.storeName || "Crazzycars.pk";
    const logoUrl = settingsDoc?.general?.logo?.url || "";
    const order = await Order.findById(id).lean();
    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found." }, { status: 404 });
    }
    if (!order.customer?.email) {
      return NextResponse.json({ success: false, error: "Customer email missing." }, { status: 400 });
    }
    const pricing = orderPricing(order);
    const rows = (order.items || [])
      .map(
        (item) =>
          `<tr><td>${escapeHtml(item.name || "-")}</td><td>${item.quantity || 0}</td><td>${formatMoney(item.unitPrice || 0)}</td><td>${formatMoney(item.total || 0)}</td></tr>`
      )
      .join("");
    const html = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <div style="text-align:center; margin-bottom:20px">
    ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" height="50" style="object-fit:contain" alt="" />` : ""}
    <h1>${escapeHtml(storeName)}</h1>
  </div>
  <h2>Invoice ${escapeHtml(order.orderNumber)}</h2>
  <p>Customer: ${escapeHtml(order.customer?.name || "-")}</p>
  <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%">
  <thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead>
  <tbody>${rows}</tbody>
  </table>
  <p>Subtotal: ${formatMoney(pricing.subtotal)}</p>
  <p>Shipping: ${formatMoney(pricing.shippingCost)}</p>
  <p><strong>Total: ${formatMoney(pricing.total)}</strong></p>
</div>
`;

    const sent = await sendEmail({
      to: order.customer.email,
      subject: `Invoice ${order.orderNumber} — ${storeName}`,
      html,
    });

    if (!sent.success) {
      return NextResponse.json(
        { success: false, error: sent.error || "Failed to send invoice email." },
        { status: 503 }
      );
    }

    await logActivity({
      user: user.userId,
      userName: user.name || "Admin",
      action: `Invoice email sent for ${order.orderNumber}`,
      resource: "Order",
      resourceId: id,
      details: { to: order.customer.email, messageId: sent.messageId },
      type: "update",
      ip: requestIp(request),
    });

    return NextResponse.json({ success: true, message: "Invoice email sent" });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to send invoice email." },
      { status: 500 }
    );
  }
}
