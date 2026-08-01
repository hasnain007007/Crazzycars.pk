import { postexPublicTrackingUrl, storefrontTrackingUrl } from "@/lib/postex";

export const DEFAULT_WHATSAPP_TEMPLATES = {
  customerOrderConfirmation: {
    enabled: true,
    template: `Assalam o Alaikum {customerName}! 🚗

*Crazzycars.pk* — please confirm your order:

❓ *Is your order confirmed?*
Tap one option below:

✅ *YES — Confirm my order:*
{confirmOrderUrl}

❌ *NO — Cancel / not confirm:*
{cancelOrderUrl}

————————————
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

Or reply with:
1️⃣ CONFIRM
2️⃣ CANCEL

Shukriya — Crazzycars.pk 🚗✨`,
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

🔗 Open in admin (login required): {adminOrderUrl}`,
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
  const status = String(order?.paymentStatus || "").toLowerCase();
  let label = "—";
  if (pm.includes("cod") || pm.includes("cash")) label = "Cash on Delivery";
  else if (pm.includes("jazz")) label = "JazzCash";
  else if (pm.includes("easy")) label = "Easypaisa";
  else if (pm.includes("bank") || pm.includes("transfer")) label = "Bank Transfer";
  else if (pm.includes("stripe") || pm.includes("card")) label = "Card";
  else if (pm.includes("paypal")) label = "PayPal";
  else label = order?.paymentMethod || order?.payment?.method || "—";

  if (status === "partial") return `${label} (Partial)`;
  if (status === "paid") return `${label} (Paid)`;
  return label;
}

function moneyPk(n) {
  return Number(n || 0).toLocaleString("en-PK");
}

/** Paid / remaining helpers — prefer payment.* then fall back to pricing.total */
export function getOrderPaymentBreakdown(order) {
  const total = Math.max(0, Number(order?.pricing?.total ?? order?.total ?? 0) || 0);
  const status = String(order?.paymentStatus || "unpaid").toLowerCase();
  let paid = Math.max(0, Number(order?.payment?.paidAmount) || 0);
  let remaining = Number(order?.payment?.remainingCod);

  if (status === "paid") {
    paid = paid > 0 ? paid : total;
    remaining = 0;
  } else if (status === "partial") {
    if (!Number.isFinite(remaining) || remaining < 0) {
      remaining = Math.max(0, total - paid);
    }
    // If paidAmount missing but remainingCod set
    if (paid <= 0 && remaining >= 0 && remaining < total) {
      paid = Math.max(0, total - remaining);
    }
  } else if (status === "unpaid" || status === "failed") {
    if (!Number.isFinite(remaining) || remaining < 0) remaining = total;
    if (paid <= 0) paid = 0;
  } else {
    if (!Number.isFinite(remaining) || remaining < 0) remaining = Math.max(0, total - paid);
  }

  return {
    status,
    total,
    paid,
    remaining: Math.max(0, remaining),
  };
}

export function buildPaymentInstructions(order, settings = {}) {
  const pm = String(order?.paymentMethod || order?.payment?.method || "").toLowerCase();
  const pk = settings.pakistaniPaymentMethods || {};
  const { status, total, paid, remaining } = getOrderPaymentBreakdown(order);
  const totalStr = moneyPk(total);
  const paidStr = moneyPk(paid);
  const remainingStr = moneyPk(remaining);

  // Fully paid — never ask for more money
  if (status === "paid" || (remaining <= 0 && paid >= total && total > 0)) {
    return `✅ *Payment received in full* (Rs. ${paidStr || totalStr}) — thank you!`;
  }

  // Partial — always show received + balance due (works for COD and prepaid)
  if (status === "partial" || (paid > 0 && remaining > 0)) {
    const dueLine =
      pm.includes("cod") || pm.includes("cash")
        ? `🚪 *Balance due on delivery:* Rs. ${remainingStr}`
        : `⏳ *Balance still due:* Rs. ${remainingStr}`;
    return [
      `✅ *Already received:* Rs. ${paidStr}`,
      dueLine,
      `🧾 Order total: Rs. ${totalStr}`,
    ].join("\n");
  }

  // Unpaid / remaining = full total
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
  if (
    pm.includes("bank") ||
    pm.includes("transfer") ||
    pm.includes("hbl") ||
    pm.includes("meezan") ||
    pm.includes("ubl")
  ) {
    const b = pk.bankTransfer || pk.hbl || pk.meezan || pk.ubl || {};
    return `Please transfer Rs. ${totalStr} to:\nBank: ${b.bankName || b.label || "—"}\nAccount: ${b.accountNumber || "—"}\nTitle: ${b.accountTitle || "—"}\nIBAN: ${b.iban || "—"}`;
  }
  return "Please complete payment as discussed with our team.";
}

export function buildTrackingSection(order) {
  const tn = String(order?.trackingNumber || order?.tracking?.number || "").trim();
  const url = storefrontTrackingUrl(tn) || String(order?.trackingUrl || order?.tracking?.url || "").trim();
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

export function buildCustomerOrderVariables(order, settings = {}, extras = {}) {
  const addr = order?.shippingAddress || {};
  const pricing = order?.pricing || {};
  const subtotal = Number(pricing.subtotal ?? order?.subtotal ?? 0);
  const shipping = Number(pricing.shippingCost ?? pricing.shipping ?? 0);
  const total = Number(pricing.total ?? order?.total ?? 0);
  const pay = getOrderPaymentBreakdown(order);
  const storeName = settings?.general?.storeName || "Crazzycars.pk";
  const storePhone = settings?.general?.phone || "";
  const orderId = order?.id || order?._id || "";
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "";
  const fallbackUrl = orderId ? `${String(base).replace(/\/$/, "")}/orders/${orderId}` : "";

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
    paidAmount: moneyPk(pay.paid),
    remainingBalance: moneyPk(pay.remaining),
    paymentStatus: pay.status || "unpaid",
    address: [addr.street, addr.line1, addr.address].filter(Boolean).join(" ").trim() || "—",
    city: String(addr.city || addr.state || "").trim() || "—",
    province: String(addr.province || addr.state || "").trim() || "—",
    customerPhone: String(addr.phone || order?.customer?.phone || "").trim() || "—",
    trackingSection: buildTrackingSection(order),
    trackingNumber: String(order?.trackingNumber || order?.tracking?.number || ""),
    trackingUrl:
      storefrontTrackingUrl(String(order?.trackingNumber || order?.tracking?.number || "").trim()) ||
      String(order?.trackingUrl || order?.tracking?.url || ""),
    storePhone,
    storeName,
    confirmOrderUrl: String(extras.confirmOrderUrl || extras.confirmUrl || fallbackUrl),
    cancelOrderUrl: String(extras.cancelOrderUrl || extras.cancelUrl || fallbackUrl),
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
    storefrontTrackingUrl(trackingNumber) ||
    String(overrides.trackingUrl || order?.trackingUrl || order?.tracking?.url || "").trim() ||
    postexPublicTrackingUrl(trackingNumber);
  const storePhone = settings?.general?.phone || "";

  return {
    customerName: customerNameFromOrder(order),
    orderNumber: String(order?.orderNumber || ""),
    courier,
    trackingNumber,
    trackingUrl,
    estimatedDelivery: String(overrides.estimatedDelivery || "2-4 business days"),
    address: [addr.street, addr.line1, addr.address].filter(Boolean).join(" ").trim() || "—",
    city: String(addr.city || "").trim() || "—",
    storePhone,
  };
}

export function getCustomerOrderWhatsAppMessage(order, settings, extras = {}) {
  const { enabled, template } = resolveTemplate(settings, "customerOrderConfirmation");
  if (!enabled) return "";
  const vars = buildCustomerOrderVariables(order, settings, extras);
  let message = buildWhatsAppMessage(template, vars);
  const confirmUrl = String(vars.confirmOrderUrl || "").trim();
  const cancelUrl = String(vars.cancelOrderUrl || "").trim();
  // Always surface clear Yes/No confirmation options even if Settings template is outdated.
  if (confirmUrl && cancelUrl && !message.includes(confirmUrl)) {
    message = `${message.trim()}

————————————
❓ *Is your order confirmed?*

✅ *YES — Confirm my order:*
${confirmUrl}

❌ *NO — Cancel / not confirm:*
${cancelUrl}

Please tap one option above, or reply CONFIRM / CANCEL.`;
  }
  return message;
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
  const storeTrack = storefrontTrackingUrl(trackingNumber, storeUrl);
  return `Your ${storeName} order #${orderNumber} has been shipped!\n\nTrack your order:\n${storeTrack || postexPublicTrackingUrl(trackingNumber)}`;
}
