/**
 * Shopkeeper accounts receivable — outstanding, ledger, receipt allocation.
 */
import mongoose from "mongoose";
import Invoice from "./models/Invoice.model";
import Receipt from "./models/Receipt.model";
import { recomputeInvoicePaymentFields } from "./invoicePayments";

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function invoiceMatchForCustomer(customerId, customer) {
  const oid = new mongoose.Types.ObjectId(String(customerId));
  const or = [{ customerId: oid }];
  if (customer?.phone) or.push({ "customer.phone": customer.phone });
  if (customer?.email && !String(customer.email).includes("@guest.")) {
    or.push({ "customer.email": customer.email });
  }
  return { $or: or };
}

/** Open invoice remaining (recomputed from payments). */
export function invoiceRemaining(inv) {
  const total = Number(inv?.pricing?.total) || 0;
  const paid = Array.isArray(inv?.payments)
    ? inv.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0)
    : Number(inv?.amountPaid) || 0;
  if (Array.isArray(inv?.payments) && inv.payments.length === 0) {
    const status = String(inv?.paymentStatus || "unpaid").toLowerCase();
    if (status === "paid") return 0;
  }
  return Math.max(0, round2(total - paid));
}

/**
 * Outstanding owed by customer = sum of open invoice remainings − unallocated receipt credits.
 */
export async function getCustomerArSummary(customerId, customer, { excludeInvoiceId } = {}) {
  const match = invoiceMatchForCustomer(customerId, customer);
  const invoices = await Invoice.find(match).select("pricing payments amountPaid paymentStatus invoiceNumber createdAt").lean();
  const receipts = await Receipt.find({ customerId }).select("unallocatedAmount amount").lean();

  let invoiceOutstanding = 0;
  const openInvoices = [];
  for (const inv of invoices) {
    if (excludeInvoiceId && String(inv._id) === String(excludeInvoiceId)) continue;
    const remaining = invoiceRemaining(inv);
    if (remaining > 0.009) {
      invoiceOutstanding = round2(invoiceOutstanding + remaining);
      openInvoices.push({
        id: String(inv._id),
        invoiceNumber: inv.invoiceNumber,
        createdAt: inv.createdAt,
        total: Number(inv.pricing?.total) || 0,
        remaining,
      });
    }
  }

  const credit = round2(
    receipts.reduce((s, r) => s + (Number(r.unallocatedAmount) || 0), 0)
  );
  const outstanding = round2(invoiceOutstanding - credit);

  return {
    invoiceOutstanding,
    credit,
    outstanding,
    openInvoices: openInvoices.sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    ),
  };
}

/**
 * Apply a cash receipt to invoices (FIFO by default, or explicit allocations).
 * Mutates invoice docs and returns allocation rows + unallocated remainder.
 */
export async function applyReceiptToInvoices({
  customerId,
  customer,
  amount,
  method,
  paidAt,
  note,
  recordedBy,
  receiptNumber,
  allocations: explicitAllocations,
}) {
  const totalAmount = round2(amount);
  if (!(totalAmount > 0)) throw new Error("Amount must be greater than 0.");

  const summary = await getCustomerArSummary(customerId, customer);
  let remainingToApply = totalAmount;
  const allocations = [];

  const plan =
    Array.isArray(explicitAllocations) && explicitAllocations.length
      ? explicitAllocations
          .map((a) => ({
            invoiceId: String(a.invoiceId || a.id || ""),
            amount: round2(a.amount),
          }))
          .filter((a) => a.invoiceId && a.amount > 0)
      : summary.openInvoices.map((inv) => ({
          invoiceId: inv.id,
          amount: inv.remaining,
        }));

  for (const row of plan) {
    if (remainingToApply <= 0.009) break;
    const invoice = await Invoice.findById(row.invoiceId);
    if (!invoice) continue;
    const belongs =
      String(invoice.customerId || "") === String(customerId) ||
      (customer?.phone && invoice.customer?.phone === customer.phone);
    if (!belongs && String(invoice.customerId || "") !== String(customerId)) {
      // still allow if in open list for this customer match
      const openIds = new Set(summary.openInvoices.map((o) => o.id));
      if (!openIds.has(String(invoice._id))) continue;
    }

    const due = invoiceRemaining(invoice);
    if (due <= 0.009) continue;

    const applyAmt = round2(Math.min(due, row.amount, remainingToApply));
    if (applyAmt <= 0) continue;

    if (!Array.isArray(invoice.payments)) invoice.payments = [];
    invoice.payments.push({
      amount: applyAmt,
      paidAt: paidAt || new Date(),
      method: method || "cash",
      note: note || `Receipt ${receiptNumber}`,
      recordedBy: recordedBy || "Admin",
      receiptNumber: receiptNumber || "",
    });
    recomputeInvoicePaymentFields(invoice);
    invoice.markModified("payments");
    await invoice.save();

    allocations.push({
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      amount: applyAmt,
    });
    remainingToApply = round2(remainingToApply - applyAmt);
  }

  return {
    allocations,
    unallocatedAmount: Math.max(0, remainingToApply),
  };
}

function paymentBelongsToReceipt(payment, receiptNumber) {
  const rn = String(receiptNumber || "").trim();
  if (!rn) return false;
  if (String(payment?.receiptNumber || "").trim() === rn) return true;
  const note = String(payment?.note || "");
  return note.includes(rn);
}

/**
 * Remove invoice payment lines that belong to this receipt, then recompute each invoice.
 */
export async function reverseReceiptAllocations(receipt) {
  const receiptNumber = String(receipt?.receiptNumber || "").trim();
  const receiptPaidAt = receipt?.paidAt ? new Date(receipt.paidAt).getTime() : 0;

  const touched = new Set();

  for (const alloc of receipt?.allocations || []) {
    const invoiceId = alloc.invoiceId ? String(alloc.invoiceId) : "";
    if (!invoiceId) continue;
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) continue;

    let payments = Array.isArray(invoice.payments) ? [...invoice.payments] : [];
    const tagged = payments.filter((p) => paymentBelongsToReceipt(p, receiptNumber));

    if (tagged.length) {
      payments = payments.filter((p) => !paymentBelongsToReceipt(p, receiptNumber));
    } else {
      // Legacy receipts: remove one payment matching allocation amount nearest to receipt date
      const target = round2(alloc.amount);
      let bestIdx = -1;
      let bestDiff = Infinity;
      payments.forEach((p, i) => {
        if (Math.abs(round2(p.amount) - target) > 0.009) return;
        const d = Math.abs(new Date(p.paidAt || 0).getTime() - receiptPaidAt);
        if (d < bestDiff) {
          bestDiff = d;
          bestIdx = i;
        }
      });
      if (bestIdx >= 0) payments.splice(bestIdx, 1);
    }

    invoice.payments = payments;
    recomputeInvoicePaymentFields(invoice);
    invoice.markModified("payments");
    await invoice.save();
    touched.add(invoiceId);
  }

  if (receiptNumber) {
    const taggedInvoices = await Invoice.find({ "payments.receiptNumber": receiptNumber });
    for (const invoice of taggedInvoices) {
      if (touched.has(String(invoice._id))) continue;
      invoice.payments = (invoice.payments || []).filter(
        (p) => !paymentBelongsToReceipt(p, receiptNumber)
      );
      recomputeInvoicePaymentFields(invoice);
      invoice.markModified("payments");
      await invoice.save();
    }
  }
}

/**
 * Update an existing receipt: reverse old allocations, then re-apply with new amount/meta.
 */
export async function updateReceiptRecord(receipt, patch, { customer, recordedBy } = {}) {
  await reverseReceiptAllocations(receipt);

  const amount = round2(patch.amount != null ? patch.amount : receipt.amount);
  if (!(amount > 0)) throw new Error("Amount must be greater than 0.");

  let method = String(patch.method != null ? patch.method : receipt.method || "cash").trim();
  if (method === "card") method = "bankTransfer";

  const paidAt =
    patch.paidAt != null
      ? new Date(patch.paidAt)
      : receipt.paidAt
        ? new Date(receipt.paidAt)
        : new Date();
  if (Number.isNaN(paidAt.getTime())) throw new Error("Invalid payment date.");

  const note =
    patch.note != null ? String(patch.note).trim().slice(0, 300) : receipt.note || "";
  const particular =
    patch.particular != null
      ? String(patch.particular).trim().slice(0, 400)
      : receipt.particular || "";

  const { allocations, unallocatedAmount } = await applyReceiptToInvoices({
    customerId: receipt.customerId,
    customer,
    amount,
    method,
    paidAt,
    note,
    recordedBy: recordedBy || receipt.recordedBy || "Admin",
    receiptNumber: receipt.receiptNumber,
    allocations: patch.allocations,
  });

  receipt.amount = amount;
  receipt.unallocatedAmount = unallocatedAmount;
  receipt.paidAt = paidAt;
  receipt.method = method;
  receipt.note = note;
  receipt.particular = particular;
  receipt.allocations = allocations;
  if (recordedBy) receipt.recordedBy = recordedBy;
  receipt.markModified("allocations");
  await receipt.save();

  return receipt;
}

/**
 * Build account ledger rows (sale invoices = debit, receipts = credit).
 */
export async function buildCustomerLedger(customerId, customer, { from, to } = {}) {
  const match = invoiceMatchForCustomer(customerId, customer);
  const dateFilter = {};
  if (from) dateFilter.$gte = new Date(from);
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    dateFilter.$lte = end;
  }

  const invoiceQuery = { ...match };
  const receiptQuery = { customerId: new mongoose.Types.ObjectId(String(customerId)) };
  if (Object.keys(dateFilter).length) {
    invoiceQuery.createdAt = dateFilter;
    receiptQuery.paidAt = dateFilter;
  }

  const [invoices, receipts, allInvoicesBefore, allReceiptsBefore] = await Promise.all([
    Invoice.find(invoiceQuery).sort({ createdAt: 1 }).lean(),
    Receipt.find(receiptQuery).sort({ paidAt: 1 }).lean(),
    from
      ? Invoice.find({ ...match, createdAt: { $lt: new Date(from) } }).lean()
      : Promise.resolve([]),
    from
      ? Receipt.find({
          customerId: new mongoose.Types.ObjectId(String(customerId)),
          paidAt: { $lt: new Date(from) },
        }).lean()
      : Promise.resolve([]),
  ]);

  let openingBalance = 0;
  for (const inv of allInvoicesBefore) {
    openingBalance = round2(openingBalance + (Number(inv.pricing?.total) || 0));
  }
  for (const r of allReceiptsBefore) {
    openingBalance = round2(openingBalance - (Number(r.amount) || 0));
  }

  const entries = [];
  for (const inv of invoices) {
    entries.push({
      date: inv.createdAt,
      voucherNo: inv.invoiceNumber,
      type: "sale",
      particular: `SALE INVOICE NO : ${inv.invoiceNumber}`,
      debit: Number(inv.pricing?.total) || 0,
      credit: 0,
      invoiceId: String(inv._id),
    });
  }
  for (const r of receipts) {
    const methodLabel = r.method || "cash";
    entries.push({
      date: r.paidAt || r.createdAt,
      voucherNo: r.receiptNumber,
      type: "receipt",
      particular:
        r.particular ||
        `received from ${r.customerName || "customer"} through ${methodLabel}${
          r.note ? ` — ${r.note}` : ""
        }`,
      debit: 0,
      credit: Number(r.amount) || 0,
      receiptId: String(r._id),
    });
  }

  entries.sort((a, b) => new Date(a.date) - new Date(b.date));

  let balance = openingBalance;
  let totalDebits = 0;
  let totalCredits = 0;
  const rows = entries.map((e) => {
    balance = round2(balance + e.debit - e.credit);
    totalDebits = round2(totalDebits + e.debit);
    totalCredits = round2(totalCredits + e.credit);
    return { ...e, balance };
  });

  return {
    openingBalance,
    totalDebits,
    totalCredits,
    closingBalance: balance,
    rows,
  };
}
