/**
 * Helpers for cart sync, recovery links, and reminder emails.
 */
import crypto from "crypto";
import { formatPrice } from "@/lib/currency";

export const DEFAULT_ABANDONED_CART_SETTINGS = {
  enabled: true,
  abandonAfterMinutes: 60,
  maxEmailReminders: 2,
  reminderIntervalHours: 24,
};

export function normalizeCartItems(rawItems) {
  if (!Array.isArray(rawItems)) return [];
  return rawItems
    .map((item) => {
      const productId = String(item?.productId || item?._id || item?.id || item?.itemId || "").trim();
      if (!productId) return null;
      const qty = Math.max(1, Math.min(99, Number(item?.quantity) || 1));
      const unit = Number(item?.unitPrice ?? item?.price) || 0;
      return {
        productId,
        slug: String(item?.slug || "").trim(),
        name: String(item?.name || "Product").trim() || "Product",
        image: String(item?.image || "").trim(),
        quantity: qty,
        unitPrice: unit,
        price: unit,
        variantId: String(item?.variantId || "").trim(),
        variationLabel: String(item?.variationLabel || "").trim(),
        selectedOptions:
          item?.selectedOptions && typeof item.selectedOptions === "object"
            ? item.selectedOptions
            : undefined,
        matchedCombination:
          item?.matchedCombination && typeof item.matchedCombination === "object"
            ? item.matchedCombination
            : undefined,
        selectedAddOns: Array.isArray(item?.selectedAddOns) ? item.selectedAddOns : undefined,
        articleNo: String(item?.articleNo || "").trim(),
        sku: String(item?.sku || "").trim(),
      };
    })
    .filter(Boolean)
    .slice(0, 50);
}

export function cartTotals(items) {
  const list = Array.isArray(items) ? items : [];
  const itemCount = list.reduce((s, i) => s + (Number(i.quantity) || 1), 0);
  const subtotal =
    Math.round(
      list.reduce((s, i) => s + (Number(i.unitPrice ?? i.price) || 0) * (Number(i.quantity) || 1), 0) * 100
    ) / 100;
  return { itemCount, subtotal };
}

export function hasContact(customer = {}) {
  const email = String(customer.email || "").trim().toLowerCase();
  const phone = String(customer.phone || "").replace(/\D/g, "");
  const realEmail = email && email.includes("@") && !email.startsWith("guest+");
  return Boolean(realEmail || phone.length >= 10);
}

export function ensureRecoveryToken(doc) {
  if (doc.recoveryToken) return doc.recoveryToken;
  doc.recoveryToken = crypto.randomBytes(24).toString("hex");
  return doc.recoveryToken;
}

export function storefrontBaseUrl() {
  return (
    String(process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "") ||
    String(process.env.NEXT_PUBLIC_STORE_URL || "").replace(/\/$/, "") ||
    "https://crazzycars.pk"
  );
}

export function recoveryCheckoutUrl(token) {
  const base = storefrontBaseUrl();
  return `${base}/checkout?recover=${encodeURIComponent(token)}`;
}

export function itemsListText(items) {
  return (items || [])
    .map((i) => {
      const label = i.variationLabel ? ` (${i.variationLabel})` : "";
      return `• ${i.name}${label} × ${i.quantity} — ${formatPrice((Number(i.unitPrice) || 0) * (Number(i.quantity) || 1))}`;
    })
    .join("\n");
}

export function buildAbandonedCartEmail({ cart, storeName = "Crazzycars.pk", storePhone = "" }) {
  const name = String(cart?.customer?.name || "").trim() || "there";
  const token = cart?.recoveryToken || "";
  const recoverUrl = recoveryCheckoutUrl(token);
  const itemsHtml = (cart?.items || [])
    .map((i) => {
      const label = i.variationLabel ? ` <span style="color:#666">(${i.variationLabel})</span>` : "";
      const line = formatPrice((Number(i.unitPrice) || 0) * (Number(i.quantity) || 1));
      return `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #eee;font-size:14px;color:#111">
          ${escapeHtml(i.name)}${label}<br/>
          <span style="color:#666;font-size:12px">Qty ${i.quantity}</span>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;font-size:14px;font-weight:600;color:#111">${line}</td>
      </tr>`;
    })
    .join("");

  const subject = `You left items in your cart — ${storeName}`;
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
  <div style="max-width:560px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e5e5">
    <div style="background:#111;color:#fff;padding:20px 24px">
      <div style="font-size:18px;font-weight:700">${escapeHtml(storeName)}</div>
      <div style="font-size:13px;opacity:.8;margin-top:4px">Complete your order</div>
    </div>
    <div style="padding:24px">
      <p style="margin:0 0 12px;font-size:16px;color:#111">Hi ${escapeHtml(name)},</p>
      <p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:#444">
        You left ${cart?.itemCount || 0} item(s) in your cart (about <strong>${formatPrice(cart?.subtotal || 0)}</strong>).
        Your picks are still waiting — finish checkout anytime.
      </p>
      <table style="width:100%;border-collapse:collapse;margin:8px 0 20px">${itemsHtml}</table>
      <div style="text-align:center;margin:24px 0">
        <a href="${recoverUrl}" style="display:inline-block;background:#C41E1E;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:14px 28px;border-radius:8px">
          Complete checkout
        </a>
      </div>
      <p style="margin:0;font-size:12px;color:#888;line-height:1.5">
        Or copy this link:<br/>
        <a href="${recoverUrl}" style="color:#C41E1E;word-break:break-all">${recoverUrl}</a>
      </p>
      ${storePhone ? `<p style="margin:16px 0 0;font-size:12px;color:#666">Need help? Call ${escapeHtml(storePhone)}</p>` : ""}
    </div>
  </div>
  </body></html>`;

  return { subject, html, recoverUrl };
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function resolveAbandonedCartSettings(Settings, SETTINGS_SINGLETON_KEY) {
  try {
    const doc =
      (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY })
        .select("abandonedCart notifications general")
        .lean()) || (await Settings.findOne({}).select("abandonedCart notifications general").lean());
    const cfg = { ...DEFAULT_ABANDONED_CART_SETTINGS, ...(doc?.abandonedCart || {}) };
    if (doc?.notifications?.emailAbandonedCart === false) {
      cfg.emailEnabled = false;
    } else {
      cfg.emailEnabled = true;
    }
    cfg.storeName = String(doc?.general?.storeName || process.env.NEXT_PUBLIC_STORE_NAME || "Crazzycars.pk");
    cfg.storePhone = String(doc?.general?.phone || process.env.NEXT_PUBLIC_STORE_PHONE || "");
    return cfg;
  } catch {
    return {
      ...DEFAULT_ABANDONED_CART_SETTINGS,
      emailEnabled: true,
      storeName: process.env.NEXT_PUBLIC_STORE_NAME || "Crazzycars.pk",
      storePhone: "",
    };
  }
}
