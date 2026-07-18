import { postexPublicTrackingUrl } from "@/lib/postex";

export const DEFAULT_WHATSAPP_TEMPLATES = {
  customerOrderConfirmation: {
    enabled: true,
    template: `Assalam o Alaikum {customerName}! 🚗

Your order from *Crazzycars.pk* has been confirmed!

📦 *Order:* #{orderNumber}
📅 *Date:* {orderDate}

🛍️ *Items:*
{itemsList}

💰 *Order Summary:*
Subtotal: Rs. {subtotal}
Shipping: {shipping}
*Total: Rs. {total}*

💳 *Payment:* {paymentMethod}
{paymentInstructions}

🚚 *Delivery Address:*
{customerName}
{address}, {city}, {province}
📞 {customerPhone}

🕐 Estimated Delivery: 2-4 business days
{trackingSection}
Need help? Call us: 📞 {storePhone}

Thank you for shopping with Crazzycars.pk! 🚗✨`,
  },
  adminNewOrder: {
    enabled: true,
    template: `🆕 *NEW ORDER* #{orderNumber}

👤 Customer: {customerName}
📞 Phone: {customerPhone}
🏙️ City: {city}, {province}

🛍️ Items:
{itemsList}

{productImages}

💰 Total: *Rs. {total}*
💳 Payment: {paymentMethod}

📍 Address: {address}, {city}

🔗 View order: {adminOrderUrl}

————————————
📋 *Quick action (tap a link):*
✅ Confirm order: {confirmOrderUrl}
❌ Cancel order: {cancelOrderUrl}

Or reply here:
1️⃣ CONFIRM
2️⃣ CANCEL`,
  },
  orderShipped: {
    enabled: true,
    template: `📦 *Order Shipped!*

Assalam o Alaikum {customerName}!

Your Crazzycars.pk order #{orderNumber} has been shipped via *{courier}*!

🔍 *Tracking Number:* {trackingNumber}
🔗 Track here: {trackingUrl}

🏠 Delivery Address:
{address}, {city}

Questions? Call: 📞 {storePhone}

Thank you! 🚗✨`,
  },
};

export function buildWhatsAppMessage(template, variables) {
  let message = String(template || "");
  Object.entries(variables || {}).forEach(([key, value]) => {
    message = message.replaceAll(`{${key}}`, value == null ? "" : String(value));
  });
  return message;
}

function customerNameFromOrder(order) {
  const c = order?.customer || {};
  const addr = order?.shippingAddress || {};
  return (
    String(addr.name || "").trim() ||
    [c.firstName, c.lastName].filter(Boolean).join(" ").trim() ||
    String(c.name || "").trim() ||
    "Customer"
  );
}

function formatOrderDate(order) {
  const raw = order?.createdAt || order?.orderDate;
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatItemsList(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  if (!items.length) return "—";
  return items.map((i) => `• ${i.quantity}x ${i.name}`).join("\n");
}

function formatProductImages(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  const lines = [];
  items.forEach((i, idx) => {
    const url = String(i?.image || "").trim();
    if (!url) return;
    const label = String(i?.name || `Item ${idx + 1}`).slice(0, 60);
    lines.push(`🖼️ ${label}:\n${url}`);
  });
  if (!lines.length) return "";
  return `📸 *Product photos:*\n${lines.join("\n\n")}`;
}

function paymentMethodLabel(order) {
  const pm = String(order?.paymentMethod || order?.payment?.method || "").toLowerCase();
  if (pm.includes("cod") || pm.includes("cash")) return "Cash on Delivery";
  if (pm.includes("jazz")) return "JazzCash";
  if (pm.includes("easy")) return "Easypaisa";
  if (pm.includes("bank") || pm.includes("transfer")) return "Bank Transfer";
  if (pm.includes("stripe") || pm.includes("card")) return "Card";
  if (pm.includes("paypal")) return "PayPal";
  return order?.paymentMethod || order?.payment?.method || "—";
}

export function buildPaymentInstructions(order, settings = {}) {
  const pm = String(order?.paymentMethod || order?.payment?.method || "").toLowerCase();
  const total = Number(order?.pricing?.total ?? order?.total ?? 0);
  const totalStr = total.toLocaleString("en-PK");
  const pk = settings.pakistaniPaymentMethods || {};

  if (pm.includes("cod") || pm.includes("cash")) {
    return `You will pay Rs. ${totalStr} when order arrives 🚪`;
  }
  if (pm.includes("jazz")) {
    const j = pk.jazzcash || {};
    return `Please send Rs. ${totalStr} to:\nJazzCash: ${j.accountNumber || "—"}\nName: ${j.accountName || "—"}`;
  }
  if (pm.includes("easy")) {
    const e = pk.easypaisa || {};
    return `Please send Rs. ${totalStr} to:\nEasypaisa: ${e.accountNumber || "—"}\nName: ${e.accountName || "—"}`;
  }
  if (pm.includes("bank") || pm.includes("transfer") || pm.includes("hbl") || pm.includes("meezan") || pm.includes("ubl")) {
    const b = pk.bankTransfer || pk.hbl || pk.meezan || pk.ubl || {};
    return `Please transfer Rs. ${totalStr} to:\nBank: ${b.bankName || b.label || "—"}\nAccount: ${b.accountNumber || "—"}\nTitle: ${b.accountTitle || "—"}\nIBAN: ${b.iban || "—"}`;
  }
  if (order?.paymentStatus === "paid") {
    return "✅ Payment received — thank you!";
  }
  return "Please complete payment as discussed with our team.";
}

export function buildTrackingSection(order) {
  const tn = String(order?.trackingNumber || order?.tracking?.number || "").trim();
  const url = String(order?.trackingUrl || order?.tracking?.url || "").trim() || postexPublicTrackingUrl(tn);
  if (!tn && !url) return "";
  if (url) return `📍 Track: ${url}`;
  return `📍 Tracking: ${tn}`;
}

export function resolveTemplate(settings, key) {
  const saved = settings?.whatsappTemplates?.[key];
  const defaults = DEFAULT_WHATSAPP_TEMPLATES[key];
  if (!defaults) return { enabled: true, template: "" };
  return {
    enabled: saved?.enabled !== false,
    template: String(saved?.template || "").trim() || defaults.template,
  };
}

export function buildCustomerOrderVariables(order, settings = {}) {
  const addr = order?.shippingAddress || {};
  const pricing = order?.pricing || {};
  const subtotal = Number(pricing.subtotal ?? order?.subtotal ?? 0);
  const shipping = Number(pricing.shippingCost ?? pricing.shipping ?? 0);
  const total = Number(pricing.total ?? order?.total ?? 0);
  const storeName = settings?.general?.storeName || "Crazzycars.pk";
  const storePhone = settings?.general?.phone || "";

  return {
    customerName: customerNameFromOrder(order),
    orderNumber: String(order?.orderNumber || order?.id || ""),
    orderDate: formatOrderDate(order),
    itemsList: formatItemsList(order),
    subtotal: subtotal.toLocaleString("en-PK"),
    shipping: shipping === 0 ? "FREE" : `Rs. ${shipping.toLocaleString("en-PK")}`,
    total: total.toLocaleString("en-PK"),
    paymentMethod: paymentMethodLabel(order),
    paymentInstructions: buildPaymentInstructions(order, settings),
    address: [addr.street, addr.line1, addr.address].filter(Boolean).join(" ").trim() || "—",
    city: String(addr.city || addr.state || "").trim() || "—",
    province: String(addr.province || addr.state || "").trim() || "—",
    customerPhone: String(addr.phone || order?.customer?.phone || "").trim() || "—",
    trackingSection: buildTrackingSection(order),
    trackingNumber: String(order?.trackingNumber || order?.tracking?.number || ""),
    trackingUrl: String(order?.trackingUrl || order?.tracking?.url || ""),
    storePhone,
    storeName,
  };
}

export function buildAdminNewOrderVariables(order, settings = {}, extras = {}) {
  const addr = order?.shippingAddress || {};
  const total = Number(order?.pricing?.total ?? order?.total ?? 0);
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_ADMIN_URL || process.env.NEXT_PUBLIC_APP_URL || "";
  const orderId = order?.id || order?._id || "";
  const adminOrderUrl = orderId ? `${String(base).replace(/\/$/, "")}/orders/${orderId}` : "";

  return {
    customerName: customerNameFromOrder(order),
    customerPhone: String(addr.phone || order?.customer?.phone || "").trim() || "—",
    orderNumber: String(order?.orderNumber || ""),
    city: String(addr.city || "").trim() || "—",
    province: String(addr.province || addr.state || "").trim() || "—",
    itemsList: formatItemsList(order),
    productImages: formatProductImages(order) || String(extras.productImages || ""),
    total: total.toLocaleString("en-PK"),
    paymentMethod: paymentMethodLabel(order),
    address: [addr.street, addr.line1, addr.address].filter(Boolean).join(" ").trim() || "—",
    adminOrderUrl,
    confirmOrderUrl: String(extras.confirmOrderUrl || extras.confirmUrl || adminOrderUrl),
    cancelOrderUrl: String(extras.cancelOrderUrl || extras.cancelUrl || adminOrderUrl),
  };
}

export function buildOrderShippedVariables(order, settings = {}, overrides = {}) {
  const addr = order?.shippingAddress || {};
  const trackingNumber =
    String(overrides.trackingNumber || order?.trackingNumber || order?.tracking?.number || "").trim();
  const courier = String(overrides.courier || order?.courier || order?.tracking?.carrier || "Postex");
  const trackingUrl =
    String(overrides.trackingUrl || order?.trackingUrl || order?.tracking?.url || "").trim() ||
    postexPublicTrackingUrl(trackingNumber);
  const storePhone = settings?.general?.phone || "";

  return {
    customerName: customerNameFromOrder(order),
    orderNumber: String(order?.orderNumber || ""),
    courier,
    trackingNumber,
    trackingUrl,
    address: [addr.street, addr.line1, addr.address].filter(Boolean).join(" ").trim() || "—",
    city: String(addr.city || "").trim() || "—",
    storePhone,
  };
}

export function getCustomerOrderWhatsAppMessage(order, settings) {
  const { enabled, template } = resolveTemplate(settings, "customerOrderConfirmation");
  if (!enabled) return "";
  return buildWhatsAppMessage(template, buildCustomerOrderVariables(order, settings));
}

export function getAdminNewOrderWhatsAppMessage(order, settings, extras = {}) {
  const { enabled, template } = resolveTemplate(settings, "adminNewOrder");
  if (!enabled) return "";
  return buildWhatsAppMessage(template, buildAdminNewOrderVariables(order, settings, extras));
}

export function getOrderShippedWhatsAppMessage(order, settings, overrides = {}) {
  const { enabled, template } = resolveTemplate(settings, "orderShipped");
  if (!enabled) return "";
  return buildWhatsAppMessage(template, buildOrderShippedVariables(order, settings, overrides));
}

/** Legacy fallback when templates disabled or empty */
export function getLegacyTrackingWhatsAppMessage({
  storeName = "Crazzycars.pk",
  orderNumber,
  trackingNumber,
  storeUrl = "",
}) {
  const postexLink = postexPublicTrackingUrl(trackingNumber);
  const siteBase = String(storeUrl || process.env.NEXT_PUBLIC_STORE_URL || "").replace(/\/$/, "");
  const storeTrack = siteBase
    ? `${siteBase}/track-order?tracking=${encodeURIComponent(trackingNumber)}`
    : "";
  let msg = `Your ${storeName} order #${orderNumber} has been shipped!\n\nTrack your order:\n${postexLink}`;
  if (storeTrack) {
    msg += `\n\nOr track on our website:\n${storeTrack}`;
  }
  return msg;
}
