/**
 * Match CPR lines to Orders by tracking CN; compute COGS + line profit.
 */
import Order from "@/lib/models/Order.model";
import Product from "@/lib/models/Product.model";

export function normalizeTracking(raw) {
  return String(raw || "").replace(/\D/g, "");
}

export async function computeOrderCogs(order, costByProduct = null) {
  let map = costByProduct;
  if (!map) {
    const ids = (order?.items || [])
      .map((it) => (it?.productId ? String(it.productId) : ""))
      .filter(Boolean);
    map = new Map();
    if (ids.length) {
      const products = await Product.find({ _id: { $in: ids } })
        .select("pricing.costPerItem")
        .lean();
      for (const p of products) {
        map.set(String(p._id), Number(p.pricing?.costPerItem) || 0);
      }
    }
  }
  let cost = 0;
  for (const it of order?.items || []) {
    const qty = Math.max(1, Number(it.quantity) || 1);
    let unitCost = Number(it.unitCost);
    if (!Number.isFinite(unitCost) || unitCost <= 0) {
      unitCost = it.productId ? map.get(String(it.productId)) || 0 : 0;
    }
    cost += Math.max(0, unitCost) * qty;
  }
  return Math.round(cost * 100) / 100;
}

/**
 * Find orders for a list of tracking numbers.
 * @returns {Map<string, object>}
 */
export async function findOrdersByTracking(trackingNumbers) {
  const norms = [...new Set(trackingNumbers.map(normalizeTracking).filter(Boolean))];
  const map = new Map();
  if (!norms.length) return map;

  const orders = await Order.find({
    $or: [
      { trackingNumber: { $in: norms } },
      { "tracking.number": { $in: norms } },
    ],
  })
    .select(
      "orderNumber trackingNumber tracking.number items.productId items.quantity items.unitCost paymentStatus paymentMethod pricing.total"
    )
    .lean();

  for (const o of orders) {
    const keys = [
      normalizeTracking(o.trackingNumber),
      normalizeTracking(o.tracking?.number),
    ].filter(Boolean);
    for (const k of keys) {
      if (!map.has(k)) map.set(k, o);
    }
  }
  return map;
}

export async function enrichLinesWithMatches(lines) {
  const orderMap = await findOrdersByTracking(lines.map((l) => l.trackingNumber));
  const productIds = new Set();
  for (const o of orderMap.values()) {
    for (const it of o.items || []) {
      if (it?.productId) productIds.add(String(it.productId));
    }
  }
  const costByProduct = new Map();
  if (productIds.size) {
    const products = await Product.find({ _id: { $in: [...productIds] } })
      .select("pricing.costPerItem")
      .lean();
    for (const p of products) {
      costByProduct.set(String(p._id), Number(p.pricing?.costPerItem) || 0);
    }
  }

  const out = [];
  for (const line of lines) {
    const key = normalizeTracking(line.trackingNumber);
    const order = orderMap.get(key);
    let productCogs = 0;
    let matchStatus = "unmatched";
    let orderId = null;
    let orderNumber = "";
    if (order) {
      matchStatus = "matched";
      orderId = order._id;
      orderNumber = order.orderNumber || "";
      productCogs = await computeOrderCogs(order, costByProduct);
    }
    const net = Number(line.netAmount) || 0;
    const lineProfit =
      line.status === "Delivered" ? Math.round((net - productCogs) * 100) / 100 : 0;
    out.push({
      ...line,
      trackingNumber: key || line.trackingNumber,
      orderId,
      orderNumber,
      matchStatus,
      productCogs,
      lineProfit,
    });
  }
  return out;
}
