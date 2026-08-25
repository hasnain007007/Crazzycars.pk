/**
 * Helpers for abandoned-cart admin UI and WhatsApp messages.
 */
import { formatAdminPrice } from "@/lib/currency";
import { getStorefrontBaseUrl } from "@/lib/storefrontUrl";
import { buildWhatsAppMessage } from "@/lib/whatsappTemplates";

export const DEFAULT_ABANDONED_CART_WHATSAPP = {
  enabled: true,
  template: `Assalam o Alaikum {customerName}! 🚗

You left items in your *Crazzycars.pk* cart:

🛍️ *Items:*
{itemsList}

💰 *Cart total:* Rs. {subtotal}

Complete your order here:
{recoverUrl}

Need help? Call {storePhone}

Shukriya — Crazzycars.pk ✨`,
};

export function recoveryCheckoutUrl(token) {
  const base = getStorefrontBaseUrl().replace(/\/$/, "") || "https://crazzycars.pk";
  return `${base}/checkout?recover=${encodeURIComponent(token || "")}`;
}

export function formatCartItemsList(items) {
  return (items || [])
    .map((i) => {
      const label = i.variationLabel ? ` (${i.variationLabel})` : "";
      const line = formatAdminPrice((Number(i.unitPrice) || 0) * (Number(i.quantity) || 1));
      return `• ${i.name}${label} × ${i.quantity} — ${line}`;
    })
    .join("\n");
}

export function getAbandonedCartWhatsAppMessage(cart, settings = {}) {
  const tpl =
    settings?.whatsappTemplates?.abandonedCart?.template ||
    DEFAULT_ABANDONED_CART_WHATSAPP.template;
  const name = String(cart?.customer?.name || "").trim() || "there";
  const phone = String(settings?.whatsapp?.phone || settings?.general?.phone || "").trim();
  return buildWhatsAppMessage(tpl, {
    customerName: name,
    customerPhone: cart?.customer?.phone || "",
    itemsList: formatCartItemsList(cart?.items),
    subtotal: String(Math.round(Number(cart?.subtotal) || 0).toLocaleString("en-PK")),
    itemCount: String(cart?.itemCount || 0),
    recoverUrl: recoveryCheckoutUrl(cart?.recoveryToken),
    storePhone: phone || "—",
    storeName: settings?.general?.storeName || "Crazzycars.pk",
  });
}

export function serializeCartSession(doc) {
  if (!doc) return null;
  const o = typeof doc.toObject === "function" ? doc.toObject() : doc;
  return {
    id: String(o._id),
    sessionId: o.sessionId,
    recoveryToken: o.recoveryToken,
    items: o.items || [],
    itemCount: o.itemCount || 0,
    subtotal: o.subtotal || 0,
    customer: o.customer || {},
    status: o.status,
    lastActivityAt: o.lastActivityAt,
    abandonedAt: o.abandonedAt,
    recoveredAt: o.recoveredAt,
    convertedOrderId: o.convertedOrderId ? String(o.convertedOrderId) : null,
    convertedOrderNumber: o.convertedOrderNumber || "",
    reminders: o.reminders || [],
    emailReminderCount: o.emailReminderCount || 0,
    lastEmailReminderAt: o.lastEmailReminderAt,
    lastPath: o.lastPath || "",
    userAgent: o.userAgent || "",
    expiresAt: o.expiresAt || null,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    recoverUrl: recoveryCheckoutUrl(o.recoveryToken),
  };
}
