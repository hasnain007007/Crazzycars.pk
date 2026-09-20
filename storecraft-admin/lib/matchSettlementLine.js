/**
 * Match settlement lines to Orders by tracking CN (PostEx digits + Run Courier GW…)
 * or printed order number; compute COGS + line profit.
 */
import Order from "@/lib/models/Order.model";
import Product from "@/lib/models/Product.model";

/** Digits only — PostEx CN style. */
export function normalizeTrackingDigits(raw) {
  return String(raw || "").replace(/\D/g, "");
}

/** Alphanumeric compact uppercase — Run Courier GW… style. */
export function compactTracking(raw) {
  return String(raw || "")
    .trim()
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
}

/** @deprecated use normalizeTrackingDigits — kept for callers */
export function normalizeTracking(raw) {
  return normalizeTrackingDigits(raw);
}

/**
 * All lookup keys for a tracking token (digit + compact).
 * @returns {string[]}
 */
export function trackingLookupKeys(raw) {
  const keys = new Set();
  const compact = compactTracking(raw);
  const digits = normalizeTrackingDigits(raw);
  if (compact) keys.add(compact);
  if (digits) keys.add(digits);
  return [...keys];
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
 * Find orders for a list of tracking numbers (PostEx + GW).
 * Map keys are every lookup key that resolved to that order.
 * @returns {Map<string, object>}
 */
export async function findOrdersByTracking(trackingNumbers) {
  const map = new Map();
  const compactSet = new Set();
  const digitSet = new Set();
  for (const tn of trackingNumbers || []) {
    for (const k of trackingLookupKeys(tn)) {
      if (/^\d+$/.test(k)) digitSet.add(k);
      else compactSet.add(k);
    }
  }
  if (!compactSet.size && !digitSet.size) return map;

  const or = [];
  const compactList = [...compactSet];
  const digitList = [...digitSet];
  if (compactList.length) {
    or.push({ trackingNumber: { $in: compactList } });
    or.push({ "tracking.number": { $in: compactList } });
    // Case variants stored lowercase
    or.push({ trackingNumber: { $in: compactList.map((s) => s.toLowerCase()) } });
    or.push({ "tracking.number": { $in: compactList.map((s) => s.toLowerCase()) } });
  }
  if (digitList.length) {
    or.push({ trackingNumber: { $in: digitList } });
    or.push({ "tracking.number": { $in: digitList } });
    // Regex suffix for "GW" + digits stored as full CN when query is digits-only
    for (const d of digitList) {
      if (d.length >= 8) {
        or.push({ trackingNumber: new RegExp(`${d}$`, "i") });
        or.push({ "tracking.number": new RegExp(`${d}$`, "i") });
      }
    }
  }

  const orders = await Order.find({ $or: or })
    .select(
      "orderNumber trackingNumber tracking.number items.productId items.quantity items.unitCost paymentStatus paymentMethod pricing.total"
    )
    .lean();

  for (const o of orders) {
    const keys = [
      ...trackingLookupKeys(o.trackingNumber),
      ...trackingLookupKeys(o.tracking?.number),
    ];
    for (const k of keys) {
      if (!map.has(k)) map.set(k, o);
    }
  }
  return map;
}

/**
 * Find orders by printed order numbers (ORD-2026-00xxx).
 * @returns {Map<string, object>} keyed by uppercased orderNumber
 */
export async function findOrdersByOrderNumbers(orderNumbers) {
  const map = new Map();
  const nums = [
    ...new Set(
      (orderNumbers || [])
        .map((n) => String(n || "").trim().toUpperCase())
        .filter((n) => n.length >= 5)
    ),
  ];
  if (!nums.length) return map;

  const orders = await Order.find({
    orderNumber: { $in: nums },
  })
    .select(
      "orderNumber trackingNumber tracking.number items.productId items.quantity items.unitCost paymentStatus paymentMethod pricing.total"
    )
    .lean();

  for (const o of orders) {
    const key = String(o.orderNumber || "").trim().toUpperCase();
    if (key && !map.has(key)) map.set(key, o);
  }
  return map;
}

function resolveOrderFromMaps(line, orderByTracking, orderByNumber) {
  for (const k of trackingLookupKeys(line.trackingNumber)) {
    const hit = orderByTracking.get(k);
    if (hit) return hit;
  }
  const on = String(line.orderNumberHint || line.sheetOrderNumber || "").trim().toUpperCase();
  if (on && orderByNumber.has(on)) return orderByNumber.get(on);
  return null;
}

export async function enrichLinesWithMatches(lines) {
  const orderByTracking = await findOrdersByTracking(lines.map((l) => l.trackingNumber));
  const orderByNumber = await findOrdersByOrderNumbers(
    lines.map((l) => l.orderNumberHint || l.sheetOrderNumber || "")
  );

  const productIds = new Set();
  for (const o of [...orderByTracking.values(), ...orderByNumber.values()]) {
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
    const order = resolveOrderFromMaps(line, orderByTracking, orderByNumber);
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
    // Preserve original CN form (GW…) — prefer compact alphanumeric over digits-only
    const compact = compactTracking(line.trackingNumber);
    const storedTn = compact || String(line.trackingNumber || "").trim();
    out.push({
      ...line,
      trackingNumber: storedTn,
      orderId,
      orderNumber,
      matchStatus,
      productCogs,
      lineProfit,
      returnReceivedStatus:
        line.status === "Return" ? line.returnReceivedStatus || "pending" : "pending",
    });
  }
  return out;
}
