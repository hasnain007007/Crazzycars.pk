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
  const name = options.storeName || `${process.env.NEXT_PUBLIC_STORE_NAME || 'Homefy.pk'}`;
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
      <div style="margin-top:18px;border-top:1px solid #ccc;padding-top:10px;font-size:12px;color:#334155;">Thank you for shopping with Homefy.pk!</div>
    </div>
  `;
}

export function invoiceInnerHtml(order, options = {}) {
  const name = options.storeName || process.env.NEXT_PUBLIC_STORE_NAME || "Homefy.pk";
  const logoUrl = options.logoUrl || "";
  const phone = options.phone || "";
  const email = options.email || "";
  const website = options.website || "";
  const address = options.address || "";
  const accent = options.primaryColor || "#1A7A4C";
  const ntn = options.ntn || "";
  const strn = options.strn || "";
  const bankName = options.bankName || "";
  const bankAccountTitle = options.bankAccountTitle || "";
  const bankAccountNumber = options.bankAccountNumber || "";
  const bankIban = options.bankIban || "";
  const terms =
    options.terms ||
    "Goods once sold are non-returnable unless defective. Please retain this invoice for your records.";
  const footerNote = options.footerNote || options.footerText || "Thank you for your business.";
  const p = order.pricing || { subtotal: 0, discount: 0, shippingCost: 0, total: 0 };
  const items = order.items || [];
  const invNo = order.invoiceNumber || order.orderNumber || "—";
  const dateStr = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString("en-PK", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
  const timeStr = order.createdAt
    ? new Date(order.createdAt).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })
    : "";

  const paymentMethodLabels = {
    cod: "Cash / COD",
    jazzcash: "JazzCash",
    easypaisa: "Easypaisa",
    bankTransfer: "Bank Transfer",
    hbl: "HBL",
    meezan: "Meezan",
    ubl: "UBL",
    stripe: "Card (Stripe)",
    paypal: "PayPal",
  };
  const payMethod =
    paymentMethodLabels[order.paymentMethod] || order.paymentMethod || "—";
  const payStatus = String(order.paymentStatus || "—").toUpperCase();

  const rows = items
    .map((i, idx) => {
      const lineTotal =
        i.total != null
          ? Number(i.total)
          : Math.round((Number(i.quantity) || 0) * (Number(i.unitPrice) || 0) * 100) / 100;
      return `<tr>
      <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;color:#64748b;width:36px;">${idx + 1}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;">
        <div style="font-weight:600;color:#0f172a;">${esc(i.name)}</div>
        ${i.variation ? `<div style="font-size:11px;color:#64748b;margin-top:2px;">${esc(i.variation)}</div>` : ""}
        ${measurementHtml(i)}
      </td>
      <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:center;">${i.quantity}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatMoney(i.unitPrice)}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:700;">${formatMoney(lineTotal)}</td>
    </tr>`;
    })
    .join("");

  const billLines = [
    order.customer?.name,
    order.customer?.phone,
    order.customer?.email,
    order.shippingAddress?.street || order.billingAddress?.street,
    [order.shippingAddress?.city || order.billingAddress?.city, order.shippingAddress?.country || order.billingAddress?.country]
      .filter(Boolean)
      .join(", "),
  ].filter(Boolean);

  const companyBits = [address, phone ? `Tel: ${phone}` : "", email, website].filter(Boolean);
  const taxBits = [ntn ? `NTN: ${ntn}` : "", strn ? `STRN: ${strn}` : ""].filter(Boolean);

  const bankBlock =
    bankName || bankAccountTitle || bankAccountNumber || bankIban
      ? `<div style="margin-top:20px;padding:14px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
          <div style="font-size:10px;font-weight:800;letter-spacing:0.08em;color:#64748b;margin-bottom:8px;">BANK DETAILS</div>
          ${bankName ? `<div style="font-size:12px;"><strong>Bank:</strong> ${esc(bankName)}</div>` : ""}
          ${bankAccountTitle ? `<div style="font-size:12px;"><strong>Title:</strong> ${esc(bankAccountTitle)}</div>` : ""}
          ${bankAccountNumber ? `<div style="font-size:12px;"><strong>Account:</strong> ${esc(bankAccountNumber)}</div>` : ""}
          ${bankIban ? `<div style="font-size:12px;"><strong>IBAN:</strong> ${esc(bankIban)}</div>` : ""}
        </div>`
      : "";

  return `
    <div class="inv" style="max-width:800px;margin:0 auto;color:#0f172a;">
      <div style="height:6px;background:${esc(accent)};border-radius:4px 4px 0 0;margin:-16px -16px 20px;"></div>

      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:24px;flex-wrap:wrap;">
        <div style="flex:1;min-width:220px;">
          ${
            logoUrl
              ? `<img src="${esc(logoUrl)}" alt="${esc(name)}" crossorigin="anonymous" style="height:120px;max-height:120px;max-width:320px;width:auto;object-fit:contain;display:block;" />`
              : `<div style="font-size:22px;font-weight:800;color:${esc(accent)};">${esc(name)}</div>`
          }
          ${logoUrl ? `<div style="margin-top:10px;font-size:16px;font-weight:800;">${esc(name)}</div>` : ""}
          <div style="margin-top:8px;font-size:12px;line-height:1.55;color:#475569;">
            ${companyBits.map((l) => `<div>${esc(l)}</div>`).join("")}
            ${taxBits.length ? `<div style="margin-top:4px;">${taxBits.map(esc).join(" · ")}</div>` : ""}
          </div>
        </div>
        <div style="text-align:right;min-width:180px;">
          <div style="display:inline-block;background:${esc(accent)};color:#fff;font-size:11px;font-weight:800;letter-spacing:0.12em;padding:6px 14px;border-radius:999px;">INVOICE</div>
          <div style="margin-top:12px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:18px;font-weight:800;">${esc(invNo)}</div>
          <div style="margin-top:6px;font-size:12px;color:#64748b;">Date: <strong style="color:#0f172a;">${esc(dateStr)}</strong>${timeStr ? ` · ${esc(timeStr)}` : ""}</div>
          <div style="margin-top:8px;font-size:12px;">
            <span style="display:inline-block;padding:3px 10px;border-radius:999px;background:${payStatus === "PAID" ? "#ecfdf5" : "#fff7ed"};color:${payStatus === "PAID" ? "#047857" : "#c2410c"};font-weight:700;font-size:11px;">${esc(payStatus)}</span>
          </div>
        </div>
      </div>

      <div style="display:flex;gap:20px;margin-top:28px;flex-wrap:wrap;">
        <div style="flex:1;min-width:200px;padding:14px 16px;border:1px solid #e2e8f0;border-radius:10px;">
          <div style="font-size:10px;font-weight:800;letter-spacing:0.08em;color:${esc(accent)};">BILL TO</div>
          <div style="margin-top:8px;font-size:13px;line-height:1.55;">
            ${billLines.map((l, i) => `<div style="${i === 0 ? "font-weight:700;font-size:14px;" : ""}">${esc(l)}</div>`).join("") || "<div>—</div>"}
          </div>
        </div>
        <div style="flex:1;min-width:200px;padding:14px 16px;border:1px solid #e2e8f0;border-radius:10px;">
          <div style="font-size:10px;font-weight:800;letter-spacing:0.08em;color:${esc(accent)};">PAYMENT</div>
          <div style="margin-top:8px;font-size:13px;line-height:1.7;">
            <div><span style="color:#64748b;">Method:</span> <strong>${esc(payMethod)}</strong></div>
            <div><span style="color:#64748b;">Status:</span> <strong>${esc(payStatus)}</strong></div>
            <div><span style="color:#64748b;">Currency:</span> <strong>${esc(options.currency || order.currency || "PKR")}</strong></div>
          </div>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-top:28px;font-size:13px;">
        <thead>
          <tr style="background:${esc(accent)};color:#fff;">
            <th style="text-align:left;padding:10px 8px;font-size:11px;letter-spacing:0.04em;">#</th>
            <th style="text-align:left;padding:10px 8px;font-size:11px;letter-spacing:0.04em;">DESCRIPTION</th>
            <th style="text-align:center;padding:10px 8px;font-size:11px;letter-spacing:0.04em;">QTY</th>
            <th style="text-align:right;padding:10px 8px;font-size:11px;letter-spacing:0.04em;">UNIT</th>
            <th style="text-align:right;padding:10px 8px;font-size:11px;letter-spacing:0.04em;">AMOUNT</th>
          </tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="5" style="padding:16px;text-align:center;color:#94a3b8;">No items</td></tr>`}</tbody>
      </table>

      <div style="margin-top:20px;display:flex;justify-content:flex-end;">
        <div style="width:300px;font-size:13px;">
          <div style="display:flex;justify-content:space-between;padding:4px 0;color:#475569;"><span>Total</span><span>${formatMoney(p.subtotal)}</span></div>
          <div style="display:flex;justify-content:space-between;padding:4px 0;color:#475569;"><span>Invoice Discount</span><span>${formatMoney(p.discount || 0)}</span></div>
          ${Number(p.shippingCost) > 0 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;color:#475569;"><span>Delivery</span><span>${formatMoney(p.shippingCost)}</span></div>` : ""}
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-top:1px solid #e2e8f0;font-weight:700;"><span>Net Amount</span><span>${formatMoney(p.total)}</span></div>
          <div style="display:flex;justify-content:space-between;padding:4px 0;color:#047857;"><span>Received Amount</span><span>${formatMoney(order.amountPaid || 0)}</span></div>
          <div style="display:flex;justify-content:space-between;padding:4px 0;color:#c2410c;"><span>Invoice Balance</span><span>${formatMoney(
            order.remainingBalance != null
              ? order.remainingBalance
              : Math.max(0, (Number(p.total) || 0) - (Number(order.amountPaid) || 0))
          )}</span></div>
          <div style="display:flex;justify-content:space-between;padding:4px 0;color:#475569;"><span>Previous Balance</span><span>${formatMoney(order.previousBalance || 0)}</span></div>
          <div style="display:flex;justify-content:space-between;margin-top:8px;padding:12px 14px;background:${esc(accent)};color:#fff;border-radius:8px;font-size:14px;font-weight:800;">
            <span>Total Receivables</span><span>${formatMoney(
              order.totalReceivables != null
                ? order.totalReceivables
                : Math.round(
                    ((Number(
                      order.remainingBalance != null
                        ? order.remainingBalance
                        : Math.max(0, (Number(p.total) || 0) - (Number(order.amountPaid) || 0))
                    ) || 0) +
                      (Number(order.previousBalance) || 0)) *
                      100
                  ) / 100
            )}</span>
          </div>
        </div>
      </div>

      ${bankBlock}

      ${
        order.note
          ? `<div style="margin-top:18px;font-size:12px;color:#475569;"><strong>Note:</strong> ${esc(order.note)}</div>`
          : ""
      }

      <div style="margin-top:28px;padding-top:16px;border-top:1px solid #e2e8f0;">
        <div style="font-size:11px;color:#64748b;line-height:1.55;"><strong style="color:#334155;">Terms:</strong> ${esc(terms)}</div>
        <div style="margin-top:14px;text-align:center;font-size:13px;font-weight:700;color:${esc(accent)};">${esc(footerNote)}</div>
        <div style="margin-top:6px;text-align:center;font-size:10px;color:#94a3b8;">${esc(name)} · Computer-generated invoice</div>
      </div>
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
