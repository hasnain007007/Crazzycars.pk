/**
 * Order invoice helpers — enrich order docs for print/email and build customer messages.
 */
import { invoiceInnerHtml } from "@/components/orders/printOrderDocuments";
import { formatAdminPrice } from "@/lib/currency";
import { orderPricing } from "@/lib/orderFormat";

function formatMoney(n) {
  return formatAdminPrice(Number(n) || 0);
}

/** Add amountPaid / balance fields expected by invoiceInnerHtml. */
export function enrichOrderForInvoice(order) {
  if (!order) return order;
  const pricing = orderPricing(order);
  const total = Math.round(Number(pricing.total) || 0);
  const payStatus = String(order.paymentStatus || "").toLowerCase();
  const paidFromPayment = Math.round(Number(order.payment?.paidAmount ?? order.payment?.amount) || 0);
  let amountPaid = 0;
  if (payStatus === "paid") {
    amountPaid = paidFromPayment > 0 ? paidFromPayment : total;
  } else if (payStatus === "partial") {
    amountPaid = paidFromPayment;
  }
  const remainingBalance = Math.max(0, total - amountPaid);
  return {
    ...order,
    pricing,
    amountPaid,
    remainingBalance,
    totalReceivables: remainingBalance,
    previousBalance: Number(order.previousBalance) || 0,
  };
}

export function buildOrderInvoiceBodyHtml(order, storeMeta = {}) {
  const enriched = enrichOrderForInvoice(order);
  const items = Array.isArray(enriched?.items) ? enriched.items : [];
  const compact = items.length > 0 && items.length < 10;
  return invoiceInnerHtml(enriched, { ...storeMeta, compact });
}

export function buildOrderInvoiceEmailHtml(order, storeMeta = {}, options = {}) {
  const enriched = enrichOrderForInvoice(order);
  const storeName = storeMeta.storeName || "Crazzycars.pk";
  const customerName = enriched.customer?.name || "Customer";
  const note = String(options.note || "").trim();
  const accent = String(storeMeta.primaryColor || "#C41E1E").trim() || "#C41E1E";
  const pricing = enriched.pricing || {};
  const items = Array.isArray(enriched.items) ? enriched.items : [];
  const payStatus = String(enriched.paymentStatus || "—").toUpperCase();
  const payMethodLabels = {
    cod: "Cash / COD",
    jazzcash: "JazzCash",
    easypaisa: "Easypaisa",
    bankTransfer: "Bank Transfer",
    hbl: "HBL",
    meezan: "Meezan",
    ubl: "UBL",
    stripe: "Card",
    paypal: "PayPal",
  };
  const payMethod =
    payMethodLabels[enriched.paymentMethod] || enriched.paymentMethod || "—";
  const invNo = enriched.invoiceNumber || enriched.orderNumber || "—";
  const dateStr = enriched.createdAt
    ? new Date(enriched.createdAt).toLocaleDateString("en-PK", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

  const billBits = [
    enriched.customer?.name,
    enriched.customer?.phone,
    enriched.customer?.email,
    enriched.shippingAddress?.street,
    [enriched.shippingAddress?.city, enriched.shippingAddress?.country].filter(Boolean).join(", "),
  ].filter(Boolean);

  const itemRows = items
    .map((i, idx) => {
      const qty = i.quantity || 1;
      const lineTotal =
        i.total != null
          ? Number(i.total)
          : Math.round(qty * (Number(i.unitPrice) || 0) * 100) / 100;
      return `<tr>
        <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;color:#64748b;">${idx + 1}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;color:#0f172a;">
          <strong>${escapeHtml(i.name)}</strong>
          ${i.variation ? `<br><span style="font-size:12px;color:#64748b;">${escapeHtml(i.variation)}</span>` : ""}
        </td>
        <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:center;color:#0f172a;">${qty}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:right;color:#0f172a;">${escapeHtml(formatMoney(i.unitPrice))}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:700;color:#0f172a;">${escapeHtml(formatMoney(lineTotal))}</td>
      </tr>`;
    })
    .join("");

  const companyBits = [
    storeMeta.address,
    storeMeta.phone ? `Tel: ${storeMeta.phone}` : "",
    storeMeta.email,
    storeMeta.website,
  ].filter(Boolean);

  // Table-based layout — Gmail/Outlook strip flexbox and leave a text mush.
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="color-scheme" content="light"/>
<title>Invoice ${escapeHtml(invNo)}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;">
        <tr><td style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:20px 24px;margin-bottom:16px;">
          <p style="margin:0 0 8px;font-size:16px;color:#0f172a;">Hello ${escapeHtml(customerName)},</p>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#475569;">
            Please find your invoice for order <strong>${escapeHtml(enriched.orderNumber)}</strong> from ${escapeHtml(storeName)} below.
            ${note ? `<br><br><em style="color:#334155;">${escapeHtml(note)}</em>` : ""}
          </p>
        </td></tr>
        <tr><td height="16" style="font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="height:6px;background:${escapeHtml(accent)};font-size:0;line-height:0;">&nbsp;</td></tr>
            <tr><td style="padding:20px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="top" style="padding-right:12px;">
                    <div style="font-size:20px;font-weight:800;color:${escapeHtml(accent)};">${escapeHtml(storeName)}</div>
                    <div style="margin-top:8px;font-size:12px;line-height:1.55;color:#475569;">
                      ${companyBits.map((l) => `<div>${escapeHtml(l)}</div>`).join("")}
                    </div>
                  </td>
                  <td valign="top" align="right" style="white-space:nowrap;">
                    <span style="display:inline-block;background:${escapeHtml(accent)};color:#ffffff;font-size:11px;font-weight:800;letter-spacing:0.12em;padding:6px 14px;border-radius:999px;">INVOICE</span>
                    <div style="margin-top:12px;font-size:18px;font-weight:800;font-family:Consolas,Monaco,monospace;">${escapeHtml(invNo)}</div>
                    <div style="margin-top:6px;font-size:12px;color:#64748b;">Date: <strong style="color:#0f172a;">${escapeHtml(dateStr)}</strong></div>
                    <div style="margin-top:8px;">
                      <span style="display:inline-block;padding:3px 10px;border-radius:999px;background:${payStatus === "PAID" ? "#ecfdf5" : "#fff7ed"};color:${payStatus === "PAID" ? "#047857" : "#c2410c"};font-weight:700;font-size:11px;">${escapeHtml(payStatus)}</span>
                    </div>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                <tr>
                  <td width="50%" valign="top" style="padding-right:8px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;">
                      <tr><td style="padding:14px 16px;">
                        <div style="font-size:10px;font-weight:800;letter-spacing:0.08em;color:${escapeHtml(accent)};">BILL TO</div>
                        <div style="margin-top:8px;font-size:13px;line-height:1.55;color:#0f172a;">
                          ${billBits.map((l, i) => `<div style="${i === 0 ? "font-weight:700;font-size:14px;" : ""}">${escapeHtml(l)}</div>`).join("") || "<div>—</div>"}
                        </div>
                      </td></tr>
                    </table>
                  </td>
                  <td width="50%" valign="top" style="padding-left:8px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;">
                      <tr><td style="padding:14px 16px;">
                        <div style="font-size:10px;font-weight:800;letter-spacing:0.08em;color:${escapeHtml(accent)};">PAYMENT</div>
                        <div style="margin-top:8px;font-size:13px;line-height:1.7;color:#0f172a;">
                          <div><span style="color:#64748b;">Method:</span> <strong>${escapeHtml(payMethod)}</strong></div>
                          <div><span style="color:#64748b;">Status:</span> <strong>${escapeHtml(payStatus)}</strong></div>
                          <div><span style="color:#64748b;">Currency:</span> <strong>${escapeHtml(storeMeta.currency || enriched.currency || "PKR")}</strong></div>
                        </div>
                      </td></tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;border-collapse:collapse;font-size:13px;">
                <tr style="background:${escapeHtml(accent)};color:#ffffff;">
                  <th align="left" style="padding:10px 8px;font-size:11px;">#</th>
                  <th align="left" style="padding:10px 8px;font-size:11px;">DESCRIPTION</th>
                  <th align="center" style="padding:10px 8px;font-size:11px;">QTY</th>
                  <th align="right" style="padding:10px 8px;font-size:11px;">UNIT</th>
                  <th align="right" style="padding:10px 8px;font-size:11px;">AMOUNT</th>
                </tr>
                ${itemRows || `<tr><td colspan="5" style="padding:16px;text-align:center;color:#94a3b8;">No items</td></tr>`}
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                <tr><td align="right">
                  <table role="presentation" width="280" cellpadding="0" cellspacing="0" style="font-size:13px;">
                    <tr><td style="padding:4px 0;color:#475569;">Subtotal</td><td align="right" style="padding:4px 0;color:#475569;">${escapeHtml(formatMoney(pricing.subtotal))}</td></tr>
                    ${Number(pricing.discount) > 0 ? `<tr><td style="padding:4px 0;color:#475569;">Discount</td><td align="right" style="padding:4px 0;color:#475569;">−${escapeHtml(formatMoney(pricing.discount))}</td></tr>` : ""}
                    ${Number(pricing.shippingCost) > 0 ? `<tr><td style="padding:4px 0;color:#475569;">Delivery</td><td align="right" style="padding:4px 0;color:#475569;">${escapeHtml(formatMoney(pricing.shippingCost))}</td></tr>` : ""}
                    <tr><td style="padding:8px 0;border-top:1px solid #e2e8f0;font-weight:700;">Total</td><td align="right" style="padding:8px 0;border-top:1px solid #e2e8f0;font-weight:700;">${escapeHtml(formatMoney(pricing.total))}</td></tr>
                    <tr><td colspan="2" style="padding-top:8px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${escapeHtml(accent)};color:#ffffff;border-radius:8px;">
                        <tr>
                          <td style="padding:12px 14px;font-size:14px;font-weight:800;">Amount</td>
                          <td align="right" style="padding:12px 14px;font-size:14px;font-weight:800;">${escapeHtml(formatMoney(pricing.total))}</td>
                        </tr>
                      </table>
                    </td></tr>
                  </table>
                </td></tr>
              </table>

              <div style="margin-top:28px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center;font-size:13px;font-weight:700;color:${escapeHtml(accent)};">
                ${escapeHtml(storeMeta.footerNote || "Thank you for your business.")}
              </div>
              <div style="margin-top:6px;text-align:center;font-size:10px;color:#94a3b8;">${escapeHtml(storeName)} · Computer-generated invoice</div>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="text-align:center;font-size:11px;color:#94a3b8;padding:16px 0 0;">
          This email was sent from ${escapeHtml(storeName)}. Reply if you have questions about your order.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export function buildOrderInvoiceEmailText(order, storeMeta = {}, options = {}) {
  const enriched = enrichOrderForInvoice(order);
  const storeName = storeMeta.storeName || "Crazzycars.pk";
  const note = String(options.note || "").trim();
  const pricing = enriched.pricing || {};
  const lines = (enriched.items || []).map((i, idx) => {
    const qty = i.quantity || 1;
    const lineTotal =
      i.total != null
        ? Number(i.total)
        : Math.round(qty * (Number(i.unitPrice) || 0) * 100) / 100;
    return `${idx + 1}. ${qty}× ${i.name || "Item"} — ${formatMoney(lineTotal)}`;
  });
  return [
    `Hello ${enriched.customer?.name || "Customer"},`,
    "",
    `Invoice ${enriched.orderNumber} from ${storeName}`,
    note ? `Note: ${note}` : "",
    "",
    ...lines,
    "",
    `Total: ${formatMoney(pricing.total)}`,
    `Payment: ${String(enriched.paymentStatus || "").toUpperCase()}`,
    "",
    "Open this email in HTML view to see the full formatted invoice.",
  ]
    .filter((l) => l !== "")
    .join("\n");
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const PAYMENT_LABELS = {
  cod: "Cash on Delivery",
  jazzcash: "JazzCash",
  easypaisa: "Easypaisa",
  bankTransfer: "Bank Transfer",
  hbl: "HBL",
  meezan: "Meezan",
  stripe: "Card",
  paypal: "PayPal",
};

/** Plain-text invoice summary for WhatsApp. */
export function buildOrderInvoiceWhatsAppMessage(order, storeMeta = {}) {
  const enriched = enrichOrderForInvoice(order);
  const storeName = storeMeta.storeName || "Crazzycars.pk";
  const pricing = enriched.pricing || {};
  const customerName = enriched.customer?.name || "Customer";
  const payMethod =
    PAYMENT_LABELS[enriched.paymentMethod] || enriched.paymentMethod || "—";
  const lines = (enriched.items || []).map((item, i) => {
    const qty = item.quantity || 1;
    const lineTotal =
      item.total != null
        ? Number(item.total)
        : Math.round(qty * (Number(item.unitPrice) || 0) * 100) / 100;
    const varPart = item.variation ? ` (${item.variation})` : "";
    return `${i + 1}. ${qty}× ${item.name}${varPart} — ${formatMoney(lineTotal)}`;
  });

  const parts = [
    `Hello ${customerName}! 👋`,
    "",
    `📄 *Invoice — ${enriched.orderNumber}*`,
    `🛍️ ${storeName}`,
    "",
    ...lines,
    "",
    `Subtotal: ${formatMoney(pricing.subtotal)}`,
  ];

  if (Number(pricing.discount) > 0) {
    parts.push(`Discount: −${formatMoney(pricing.discount)}`);
  }
  if (Number(pricing.shippingCost) > 0) {
    parts.push(`Delivery: ${formatMoney(pricing.shippingCost)}`);
  }
  parts.push(`*Total: ${formatMoney(pricing.total)}*`);
  parts.push(`Payment: ${payMethod} (${String(enriched.paymentStatus || "unpaid").toUpperCase()})`);

  if (Number(enriched.remainingBalance) > 0 && enriched.paymentStatus !== "paid") {
    parts.push(`Balance due: ${formatMoney(enriched.remainingBalance)}`);
  }

  const tracking = enriched.trackingNumber || enriched.tracking?.number;
  if (tracking) {
    parts.push("", `📦 Tracking: ${tracking}`);
  }

  parts.push("", "Thank you for shopping with Crazzycars.pk! 🙏");
  return parts.join("\n");
}

/** Resolve best customer email for invoice delivery. */
export function resolveOrderInvoiceEmail(order) {
  const customerEmail = String(order?.customer?.email || "").trim();
  if (customerEmail && !/^(guest|invoice)\+/i.test(customerEmail)) {
    return customerEmail;
  }
  const shipEmail = String(order?.shippingAddress?.email || "").trim();
  if (shipEmail && !/^(guest|invoice)\+/i.test(shipEmail)) {
    return shipEmail;
  }
  return customerEmail || shipEmail || "";
}
