/**
 * Invoice installment / partial payment helpers.
 */

export const INVOICE_PAYMENT_METHODS = [
  "cod",
  "jazzcash",
  "easypaisa",
  "bankTransfer",
  "hbl",
  "meezan",
  "ubl",
  "cash",
  "other",
];

export function sumInvoicePayments(payments) {
  if (!Array.isArray(payments)) return 0;
  return Math.round(payments.reduce((s, p) => s + (Number(p?.amount) || 0), 0) * 100) / 100;
}

/**
 * Recompute amountPaid, remainingBalance, paymentStatus on an invoice doc / plain object.
 * When a payment ledger exists, status is derived from it.
 * When the ledger is empty, honor existing paymentStatus (legacy invoices).
 */
export function recomputeInvoicePaymentFields(invoice) {
  const total = Math.max(0, Number(invoice?.pricing?.total) || 0);
  const payments = Array.isArray(invoice?.payments) ? invoice.payments : [];
  let amountPaid = sumInvoicePayments(payments);
  let remainingBalance = Math.max(0, Math.round((total - amountPaid) * 100) / 100);
  let paymentStatus = "unpaid";

  if (payments.length > 0) {
    if (amountPaid <= 0) paymentStatus = "unpaid";
    else if (amountPaid + 0.009 >= total) {
      paymentStatus = "paid";
      remainingBalance = 0;
      amountPaid = Math.min(amountPaid, total) || amountPaid;
    } else paymentStatus = "partial";
  } else {
    const legacy = String(invoice?.paymentStatus || "unpaid").toLowerCase();
    if (legacy === "paid") {
      amountPaid = total;
      remainingBalance = 0;
      paymentStatus = "paid";
    } else if (legacy === "partial") {
      const stored = Math.max(0, Number(invoice?.amountPaid) || 0);
      amountPaid = stored;
      remainingBalance = Math.max(0, Math.round((total - amountPaid) * 100) / 100);
      paymentStatus = amountPaid > 0 ? (remainingBalance <= 0 ? "paid" : "partial") : "unpaid";
    } else {
      amountPaid = 0;
      remainingBalance = total;
      paymentStatus = "unpaid";
    }
  }

  invoice.amountPaid = amountPaid;
  invoice.remainingBalance = remainingBalance;
  invoice.paymentStatus = paymentStatus;
  return { amountPaid, remainingBalance, paymentStatus, total };
}

export function serializeInvoicePayments(payments) {
  if (!Array.isArray(payments)) return [];
  return payments.map((p) => ({
    id: p._id ? String(p._id) : undefined,
    amount: Number(p.amount) || 0,
    paidAt: p.paidAt || null,
    method: p.method || "cash",
    note: p.note || "",
    recordedBy: p.recordedBy || "",
  }));
}
