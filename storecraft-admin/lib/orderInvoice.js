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
  const total = Number(pricing.total) || 0;
  const payStatus = String(order.paymentStatus || "").toLowerCase();
  const paidFromPayment = Number(order.payment?.paidAmount ?? order.payment?.amount) || 0;
  let amountPaid = 0;
  if (payStatus === "paid") {
    amountPaid = paidFromPayment > 0 ? paidFromPayment : total;
  } else if (payStatus === "partial") {
    amountPaid = paidFromPayment;
  }
  const remainingBalance = Math.max(0, Math.round((total - amountPaid) * 100) / 100);
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
  return invoiceInnerHtml(enrichOrderForInvoice(order), storeMeta);
}

export function buildOrderInvoiceEmailHtml(order, storeMeta = {}, options = {}) {
  const enriched = enrichOrderForInvoice(order);
  const storeName = storeMeta.storeName || "Crazzycars.pk";
  const customerName = enriched.customer?.name || "Customer";
  const note = String(options.note || "").trim();
  const body = buildOrderInvoiceBodyHtml(enriched, storeMeta);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <div style="max-width:820px;margin:24px auto;padding:0 12px;">
    <div style="background:#ffffff;border-radius:12px;padding:20px 24px;margin-bottom:16px;border:1px solid #e2e8f0;">
      <p style="margin:0 0 8px;font-size:16px;color:#0f172a;">Hello ${escapeHtml(customerName)},</p>
      <p style="margin:0;font-size:14px;line-height:1.6;color:#475569;">
        Please find your invoice for order <strong>${escapeHtml(enriched.orderNumber)}</strong> from ${escapeHtml(storeName)} below.
        ${note ? `<br><br><em>${escapeHtml(note)}</em>` : ""}
      </p>
    </div>
    <div style="background:#ffffff;border-radius:12px;padding:16px;border:1px solid #e2e8f0;">
      ${body}
    </div>
    <p style="text-align:center;font-size:11px;color:#94a3b8;margin:16px 0 0;">
      This email was sent from ${escapeHtml(storeName)} admin. Reply to this email if you have questions about your order.
    </p>
  </div>
</body></html>`;
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
