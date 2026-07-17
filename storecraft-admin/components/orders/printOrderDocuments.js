/**
 * Print-safe HTML fragments (inline styles; no app Tailwind).
 * Full documents are printed via a hidden iframe (see printHtmlWithIframe).
 */

import { formatAdminPrice } from "@/lib/currency";

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMoney(n) {
  return formatAdminPrice(n);
}

function formatAddrLines(a) {
  if (!a) return [];
  const region = a.state || a.province;
  return [
    a.name,
    a.street,
    [a.city, region, a.zip].filter(Boolean).join(", "),
    a.country,
    a.phone,
    a.nif ? `NIF: ${a.nif}` : "",
  ].filter(Boolean);
}

function measurementHtml(item) {
  const raw = item?.customMeasurements;
  if (!raw || typeof raw !== "object") return "";
  const entries = Object.entries(raw).filter(([k, v]) => k && String(v || "").trim());
  if (!entries.length) return "";
  return `<div style="margin-top:4px;font-size:11px;color:#334155;"><strong>Custom Measurements:</strong>${entries
    .map(([k, v]) => `<div>${esc(k)}: ${esc(v)}</div>`)
    .join("")}</div>`;
}

export function packingSlipInnerHtml(order, options = {}) {
  const name = options.storeName || `${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'}`;
  const logoUrl = options.logoUrl || "";
  const addr = formatAddrLines(order.shippingAddress);
  const items = order.items || [];
  const totalItems = items.reduce((s, i) => s + (i.quantity || 0), 0);
  const p = order.pricing || { total: 0 };
  const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—";
  const rows = items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0;border-bottom:1px solid #ddd;">${esc(i.quantity)}× ${esc(i.name)}${i.variation ? ` <span style="color:#555;">(${esc(i.variation)})</span>` : ""}</td></tr>`
    )
    .join("");
  const trackingNum = order.tracking?.number || "";
  const trackingCarrier = order.tracking?.carrier || "";

  return `
    <div class="slip">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;">PACKING SLIP</div>
      <div style="text-align:center; margin-bottom:12px;">
        ${
          logoUrl
            ? `<img src="${esc(logoUrl)}" height="40" style="object-fit:contain; max-width:180px;" />`
            : `<div style="height:28px;width:28px;border:1px solid #111;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;">LOGO</div>`
        }
        <div style="font-size:18px;font-weight:700;margin-top:8px;">${esc(name)}</div>
      </div>
      <div style="margin-top:4px;font-size:13px;">Order: <strong>${esc(order.orderNumber)}</strong></div>
      <div style="font-size:12px;color:#444;">Date: ${esc(dateStr)}</div>
      <hr style="margin:14px 0;border:none;border-top:1px solid #000;" />
      <div style="font-size:11px;font-weight:700;">SHIP TO</div>
      <div style="margin-top:6px;font-size:13px;line-height:1.45;">${addr.map((l) => `<div>${esc(l)}</div>`).join("")}</div>
      <hr style="margin:14px 0;border:none;border-top:1px solid #000;" />
      <div style="font-size:11px;font-weight:700;margin-bottom:6px;">ITEMS</div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">${rows}</table>
      <div style="margin-top:16px;font-size:13px;"><strong>Total items:</strong> ${totalItems}</div>
      <div style="margin-top:4px;font-size:13px;"><strong>Order total:</strong> ${formatMoney(p.total)}</div>
      ${
        trackingNum
          ? `<div style="margin-top:12px;font-size:12px;"><strong>Tracking:</strong> ${esc(trackingCarrier)} ${esc(trackingNum)}</div>
             <div style="margin-top:6px;font-size:11px;color:#475569;">TRACKING: ${esc(trackingNum)}</div>`
          : ""
      }
      <div style="margin-top:18px;border-top:1px solid #ccc;padding-top:10px;font-size:12px;color:#334155;">Thank you for shopping with Crazzycars.pk!</div>
    </div>
  `;
}

export function invoiceInnerHtml(order, options = {}) {
  const name = options.storeName || `${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'}`;
  const logoUrl = options.logoUrl || "";
  const p = order.pricing || { subtotal: 0, discount: 0, shippingCost: 0, total: 0 };
  const items = order.items || [];
  const rows = items
    .map(
      (i) => `<tr>
      <td style="padding:6px 8px;border-bottom:1px solid #ddd;">${esc(i.name)}${measurementHtml(i)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #ddd;color:#555;">${esc(i.variation || "—")}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:right;">${i.quantity}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:right;">${formatMoney(i.unitPrice)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:right;font-weight:600;">${formatMoney(i.total)}</td>
    </tr>`
    )
    .join("");
  const ship = formatAddrLines(order.shippingAddress).join("<br/>");

  return `
    <div class="inv">
      <div style="border-bottom:1px solid #000;padding-bottom:16px;">
        <div style="text-align:center; margin-bottom:20px">
          ${logoUrl ? `<img src="${esc(logoUrl)}" height="50" style="object-fit:contain" />` : ""}
          <h1 style="margin:10px 0 0 0;font-size:24px;font-weight:800;">${esc(name)}</h1>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <div style="font-size:12px;color:#555;margin-top:4px;">Invoice</div>
          </div>
        <div style="text-align:right;font-size:13px;">
          <div style="font-family:monospace;font-weight:700;">${esc(order.orderNumber)}</div>
          <div style="color:#555;">${order.createdAt ? esc(new Date(order.createdAt).toLocaleString()) : "—"}</div>
        </div>
        </div>
      </div>
      <div style="display:flex;gap:32px;margin-top:20px;font-size:13px;">
        <div style="flex:1;">
          <div style="font-size:10px;font-weight:700;color:#666;">BILL TO</div>
          <div style="margin-top:6px;font-weight:600;">${esc(order.customer?.name || "—")}</div>
          <div>${esc(order.customer?.email || "")}</div>
          <div>${esc(order.customer?.phone || "")}</div>
        </div>
        <div style="flex:1;">
          <div style="font-size:10px;font-weight:700;color:#666;">SHIP TO</div>
          <div style="margin-top:6px;line-height:1.45;">${ship}</div>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-top:24px;font-size:13px;">
        <thead><tr style="border-bottom:1px solid #000;">
          <th style="text-align:left;padding:6px 8px;">Product</th>
          <th style="text-align:left;padding:6px 8px;">Variation</th>
          <th style="text-align:right;padding:6px 8px;">Qty</th>
          <th style="text-align:right;padding:6px 8px;">Unit</th>
          <th style="text-align:right;padding:6px 8px;">Total</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="margin-top:20px;display:flex;justify-content:flex-end;">
        <div style="width:260px;font-size:13px;">
          <div style="display:flex;justify-content:space-between;"><span>Subtotal</span><span>${formatMoney(p.subtotal)}</span></div>
          ${p.discount > 0 ? `<div style="display:flex;justify-content:space-between;color:#0a0;"><span>Discount</span><span>−${formatMoney(p.discount)}</span></div>` : ""}
          <div style="display:flex;justify-content:space-between;"><span>Shipping</span><span>${formatMoney(p.shippingCost)}</span></div>
          <div style="display:flex;justify-content:space-between;margin-top:8px;padding-top:8px;border-top:1px solid #000;font-size:15px;font-weight:800;"><span>Total</span><span>${formatMoney(p.total)}</span></div>
        </div>
      </div>
      <div style="margin-top:32px;text-align:center;font-size:12px;color:#666;border-top:1px solid #ccc;padding-top:16px;">Thank you for shopping with Crazzycars.pk.</div>
    </div>
  `;
}

/** Full HTML document string for iframe printing. */
export function printDocumentShell(title, bodyInner) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${esc(title)}</title>
  <style>
    @page { margin: 16mm; }
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #111; margin: 0; padding: 16px; }
    .page { page-break-after: always; }
    .page:last-child { page-break-after: auto; }
  </style></head><body>${bodyInner}</body></html>`;
}

/**
 * Print a full HTML document without window.open (avoids popup blockers).
 * @param {string} htmlContent — complete document from printDocumentShell()
 */
export function printHtmlWithIframe(htmlContent) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.display = "none";
  document.body.appendChild(iframe);
  const idoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!idoc) {
    iframe.remove();
    throw new Error("Could not access print frame.");
  }
  idoc.open();
  idoc.write(htmlContent);
  idoc.close();
  const win = iframe.contentWindow;
  if (!win) {
    iframe.remove();
    throw new Error("Could not access print window.");
  }
  win.focus();
  win.print();
  setTimeout(() => {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  }, 1000);
}

export function wrapPages(slipsHtmlArray) {
  return slipsHtmlArray.map((h) => `<div class="page">${h}</div>`).join("");
}
