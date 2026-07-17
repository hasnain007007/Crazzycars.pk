import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import Order from "@/lib/models/Order.model";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { orderPricing } from "@/lib/orderFormat";
import { requestIp } from "@/lib/requestIp";
import { formatAdminPrice } from "@/lib/currency";

function formatMoney(n) {
  return formatAdminPrice(n);
}

export async function POST(request, context) {
  try {
    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
    }
    await dbConnect();
    const settingsDoc = await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean();
    const storeName = settingsDoc?.general?.storeName || "Store";
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
          `<tr><td>${item.name || "-"}</td><td>${item.quantity || 0}</td><td>${formatMoney(item.unitPrice || 0)}</td><td>${formatMoney(item.total || 0)}</td></tr>`
      )
      .join("");
    const html = `
<div style="text-align:center; margin-bottom:20px">
  ${logoUrl ? `<img src="${logoUrl}" height="50" style="object-fit:contain" />` : ""}
  <h1>${storeName}</h1>
</div>
<h2>Invoice ${order.orderNumber}</h2>
<p>Customer: ${order.customer?.name || "-"}</p>
<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;">
<thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead>
<tbody>${rows}</tbody>
</table>
<p>Subtotal: ${formatMoney(pricing.subtotal)}</p>
<p>Shipping: ${formatMoney(pricing.shippingCost)}</p>
<p><strong>Total: ${formatMoney(pricing.total)}</strong></p>
`;
    // TODO: wire SMTP sender from Settings (payload prepared above).

    await logActivity({
      user: user.userId,
      userName: user.name || "Admin",
      action: `Invoice email logged for ${order.orderNumber}`,
      resource: "Order",
      resourceId: id,
      details: { to: order.customer.email },
      type: "update",
      ip: requestIp(request),
    });

    return NextResponse.json({ success: true, message: "Email logged" });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to prepare invoice email." },
      { status: 500 }
    );
  }
}
