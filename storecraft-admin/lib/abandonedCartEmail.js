/**
 * Helpers for abandoned-cart emails in admin (duplicate of store helper, admin-safe).
 */
import { formatAdminPrice } from "@/lib/currency";
import { recoveryCheckoutUrl } from "@/lib/abandonedCart";

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildAbandonedCartEmailHtml(cart, { storeName = "Crazzycars.pk", storePhone = "" } = {}) {
  const name = String(cart?.customer?.name || "").trim() || "there";
  const recoverUrl = recoveryCheckoutUrl(cart?.recoveryToken);
  const itemsHtml = (cart?.items || [])
    .map((i) => {
      const label = i.variationLabel ? ` <span style="color:#666">(${escapeHtml(i.variationLabel)})</span>` : "";
      const line = formatAdminPrice((Number(i.unitPrice) || 0) * (Number(i.quantity) || 1));
      return `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #eee;font-size:14px;color:#111">
          ${escapeHtml(i.name)}${label}<br/>
          <span style="color:#666;font-size:12px">Qty ${i.quantity}</span>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;font-size:14px;font-weight:600">${line}</td>
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
        You left ${cart?.itemCount || 0} item(s) in your cart (about <strong>${formatAdminPrice(cart?.subtotal || 0)}</strong>).
        Finish checkout anytime — your picks are waiting.
      </p>
      <table style="width:100%;border-collapse:collapse;margin:8px 0 20px">${itemsHtml}</table>
      <div style="text-align:center;margin:24px 0">
        <a href="${recoverUrl}" style="display:inline-block;background:#C41E1E;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:14px 28px;border-radius:8px">
          Complete checkout
        </a>
      </div>
      ${storePhone ? `<p style="margin:16px 0 0;font-size:12px;color:#666">Need help? Call ${escapeHtml(storePhone)}</p>` : ""}
    </div>
  </div>
  </body></html>`;

  return { subject, html, recoverUrl };
}
