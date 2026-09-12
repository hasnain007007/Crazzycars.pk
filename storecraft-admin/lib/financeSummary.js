/**
 * Date-range finance KPIs from posted courier settlements + paid order revenue.
 */
import { karachiDayKey } from "@/lib/karachiDay";
import CourierSettlementBatch from "@/lib/models/CourierSettlementBatch.model";
import CourierSettlementLine from "@/lib/models/CourierSettlementLine.model";
import Order from "@/lib/models/Order.model";

export function pktRangeBounds(fromKey, toKey) {
  const from = String(fromKey || "").trim() || karachiDayKey();
  const to = String(toKey || "").trim() || from;
  const start = new Date(`${from}T00:00:00+05:00`);
  const end = new Date(`${to}T23:59:59.999+05:00`);
  return { from, to, start, end };
}

export async function buildFinanceSummary({ from, to } = {}) {
  const { start, end, from: fromKey, to: toKey } = pktRangeBounds(from, to);

  const batches = await CourierSettlementBatch.find({
    status: "posted",
    cprDate: { $gte: start, $lte: end },
  })
    .select(
      "cprNumber cprDate codTotal shippingCharges gst deduction4pct netTotal deliveredCount returnedCount matchedCount"
    )
    .lean();

  const batchIds = batches.map((b) => b._id);
  const lines = batchIds.length
    ? await CourierSettlementLine.find({
        batchId: { $in: batchIds },
        status: "Delivered",
        matchStatus: { $in: ["matched", "manual"] },
      })
        .select("netAmount productCogs lineProfit codAmount shippingCharges gst deduction4pct")
        .lean()
    : [];

  let remittanceReceived = 0;
  let productCogs = 0;
  let cashProfit = 0;
  let shippingFees = 0;
  let gstTotal = 0;
  let codTax = 0;
  let deliveredCod = 0;
  for (const l of lines) {
    remittanceReceived += Number(l.netAmount) || 0;
    productCogs += Number(l.productCogs) || 0;
    cashProfit += Number(l.lineProfit) || 0;
    shippingFees += Number(l.shippingCharges) || 0;
    gstTotal += Number(l.gst) || 0;
    codTax += Number(l.deduction4pct) || 0;
    deliveredCod += Number(l.codAmount) || 0;
  }

  // Prefer batch summary nets when available (authoritative CPR totals)
  const batchNet = batches.reduce((s, b) => s + (Number(b.netTotal) || 0), 0);
  const batchShip = batches.reduce((s, b) => s + (Number(b.shippingCharges) || 0), 0);
  const batchGst = batches.reduce((s, b) => s + (Number(b.gst) || 0), 0);
  const batchTax = batches.reduce((s, b) => s + (Number(b.deduction4pct) || 0), 0);
  const batchCod = batches.reduce((s, b) => s + (Number(b.codTotal) || 0), 0);

  const paidOrders = await Order.find({
    paymentStatus: "paid",
    createdAt: { $gte: start, $lte: end },
    orderStatus: { $nin: ["cancelled", "returned", "refunded"] },
  })
    .select("pricing.total")
    .lean();

  let orderRevenuePaid = 0;
  for (const o of paidOrders) {
    orderRevenuePaid += Number(o.pricing?.total) || 0;
  }

  const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

  return {
    from: fromKey,
    to: toKey,
    batchCount: batches.length,
    matchedDeliveredLines: lines.length,
    orderRevenuePaid: round2(orderRevenuePaid),
    remittanceReceived: round2(batchNet || remittanceReceived),
    shippingFees: round2(batchShip || shippingFees),
    gst: round2(batchGst || gstTotal),
    codTax: round2(batchTax || codTax),
    deliveredCod: round2(batchCod || deliveredCod),
    productCogs: round2(productCogs),
    cashProfit: round2((batchNet || remittanceReceived) - productCogs),
    batches: batches.map((b) => ({
      id: String(b._id),
      cprNumber: b.cprNumber,
      cprDate: b.cprDate,
      netTotal: b.netTotal,
      shippingCharges: b.shippingCharges,
      gst: b.gst,
      deduction4pct: b.deduction4pct,
      codTotal: b.codTotal,
    })),
  };
}
