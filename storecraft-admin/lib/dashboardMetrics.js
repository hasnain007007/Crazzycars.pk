/**
 * Pure dashboard maths (no DB). The dashboard route loads orders once per window and
 * passes them here, so every card on the page is computed from the same rows.
 *
 * COD store rules:
 * - Sales (booked) = order value of every non-void order.
 * - Collected = money actually in: paid orders, delivered COD parcels (courier collected),
 *   and advances already received on partial orders.
 * - To collect = what is still owed on open orders (total − advance received).
 * - Profit only counts line items that have a cost price; coverage says how much that is.
 */
import { karachiDayKey } from "@/lib/karachiDay";

export const VOID_STATUSES = new Set(["cancelled", "returned", "refunded"]);

/** A day only counts toward conversion once visitor tracking clearly ran all day. */
export const MIN_TRACKED_VISITORS_PER_DAY = 20;

/** Consecutive zero-order days that look like missing data rather than a slow week. */
export const ORDER_GAP_MIN_DAYS = 4;

export function orderTotal(o) {
  return Math.max(0, Number(o?.pricing?.total ?? o?.total ?? 0) || 0);
}

export function isVoidOrder(o) {
  return VOID_STATUSES.has(String(o?.orderStatus || ""));
}

/** Money already received for this order (Rs). */
export function collectedAmount(o) {
  if (isVoidOrder(o)) return 0;
  const total = orderTotal(o);
  if (o.paymentStatus === "paid" || o.orderStatus === "delivered") return total;
  if (o.paymentStatus === "partial") return Math.min(total, Math.max(0, Number(o.payment?.paidAmount) || 0));
  return 0;
}

/** Money still owed on an open order (Rs). */
export function outstandingAmount(o) {
  if (isVoidOrder(o)) return 0;
  return Math.max(0, orderTotal(o) - collectedAmount(o));
}

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const pct1 = (part, whole) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : null);

export function pctChange(current, previous) {
  const c = Number(current) || 0;
  const p = Number(previous) || 0;
  if (p === 0) return c > 0 ? 100 : 0;
  return Math.round(((c - p) / p) * 1000) / 10;
}

/**
 * Booked / collected / outstanding totals for a list of orders.
 * @param {object[]} orders lean orders (any status)
 */
export function summarizeOrders(orders) {
  let booked = 0;
  let collected = 0;
  let outstanding = 0;
  let nonVoid = 0;
  let cancelled = 0;
  let returned = 0;
  let pendingConfirm = 0;
  let paidOrders = 0;
  let partialOrders = 0;
  let unpaidOrders = 0;
  for (const o of orders || []) {
    const status = String(o.orderStatus || "");
    if (status === "cancelled") cancelled += 1;
    if (status === "returned") returned += 1;
    if (isVoidOrder(o)) continue;
    nonVoid += 1;
    booked += orderTotal(o);
    collected += collectedAmount(o);
    outstanding += outstandingAmount(o);
    if (status === "pending") pendingConfirm += 1;
    if (o.paymentStatus === "paid") paidOrders += 1;
    else if (o.paymentStatus === "partial") partialOrders += 1;
    else if (status !== "delivered") unpaidOrders += 1;
  }
  return {
    orders: (orders || []).length,
    nonVoidOrders: nonVoid,
    booked: round2(booked),
    collected: round2(collected),
    outstanding: round2(outstanding),
    avgOrderValue: nonVoid > 0 ? Math.round(booked / nonVoid) : 0,
    cancelled,
    returned,
    cancelRate: pct1(cancelled, (orders || []).length),
    pendingConfirm,
    paidOrders,
    partialOrders,
    unpaidOrders,
  };
}

function lineCost(it, costByProduct) {
  const snap = Number(it.unitCost);
  if (Number.isFinite(snap) && snap > 0) return snap;
  return it.productId ? Number(costByProduct.get(String(it.productId))) || 0 : 0;
}

/**
 * Gross profit on realised sales (paid or delivered, not void), items with a cost price only.
 * Order discount is shared across lines by value. Shipping is pass-through and ignored.
 */
export function profitSummary(orders, costByProduct) {
  let profit = 0;
  let costedSales = 0;
  let allSales = 0;
  let realisedOrders = 0;
  const missing = new Map();
  for (const o of orders || []) {
    if (isVoidOrder(o)) continue;
    if (!(o.paymentStatus === "paid" || o.orderStatus === "delivered")) continue;
    realisedOrders += 1;
    const items = o.items || [];
    const lineSell = items.reduce(
      (s, it) => s + Math.max(0, Number(it.unitPrice) || 0) * Math.max(0, Number(it.quantity) || 0),
      0
    );
    const discount = Math.max(0, Number(o.pricing?.discount) || 0);
    for (const it of items) {
      const qty = Math.max(0, Number(it.quantity) || 0);
      const sell = Math.max(0, Number(it.unitPrice) || 0) * qty;
      const share = lineSell > 0 ? discount * (sell / lineSell) : 0;
      allSales += sell - share;
      const cost = lineCost(it, costByProduct);
      if (cost > 0) {
        costedSales += sell - share;
        profit += sell - share - cost * qty;
      } else {
        const key = String(it.productId || it.name || "");
        const row = missing.get(key) || { name: it.name || "Unnamed item", sales: 0 };
        row.sales += sell;
        missing.set(key, row);
      }
    }
  }
  return {
    profit: round2(profit),
    margin: pct1(profit, costedSales),
    costedSales: round2(costedSales),
    realisedSales: round2(allSales),
    coverage: allSales > 0 ? pct1(costedSales, allSales) : null,
    realisedOrders,
    missingCost: [...missing.values()].sort((a, b) => b.sales - a.sales).slice(0, 5),
  };
}

/** Booked sales + order count per Karachi day (non-void for money, all for count). */
export function ordersByDay(orders) {
  const map = new Map();
  for (const o of orders || []) {
    const key = karachiDayKey(new Date(o.createdAt));
    const row = map.get(key) || { orders: 0, booked: 0 };
    row.orders += 1;
    if (!isVoidOrder(o)) row.booked += orderTotal(o);
    map.set(key, row);
  }
  return map;
}

/**
 * Conversion over days where visitor tracking clearly ran (≥ MIN visitors).
 * Days before tracking started (or lost in a DB move) would otherwise inflate the rate.
 * @param {Map<string, number>} visitorsByDay
 * @param {Map<string, {orders:number}>} dayOrders
 */
export function trackedConversion(visitorsByDay, dayOrders) {
  let visitors = 0;
  let orders = 0;
  let days = 0;
  for (const [day, v] of visitorsByDay) {
    if (v < MIN_TRACKED_VISITORS_PER_DAY) continue;
    days += 1;
    visitors += v;
    orders += dayOrders.get(day)?.orders || 0;
  }
  return { rate: pct1(orders, visitors), visitors, orders, days };
}

/**
 * Runs of ≥ ORDER_GAP_MIN_DAYS days with no orders at all, for a store that normally gets
 * at least one a day. Points at lost data (e.g. a database move), not a quiet week.
 * @param {string[]} dayKeys ascending, excluding today
 */
export function findOrderGaps(dayKeys, dayOrders) {
  const active = dayKeys.filter((k) => (dayOrders.get(k)?.orders || 0) > 0);
  if (!active.length) return [];
  const total = active.reduce((s, k) => s + dayOrders.get(k).orders, 0);
  if (total / active.length < 1.5) return [];
  const gaps = [];
  let start = null;
  let len = 0;
  const flush = (endKey) => {
    if (start && len >= ORDER_GAP_MIN_DAYS) gaps.push({ from: start, to: endKey, days: len });
    start = null;
    len = 0;
  };
  let prev = null;
  for (const k of dayKeys) {
    if ((dayOrders.get(k)?.orders || 0) === 0) {
      if (!start) start = k;
      len += 1;
    } else {
      flush(prev);
    }
    prev = k;
  }
  flush(prev);
  return gaps;
}

function cleanCity(raw) {
  const s = String(raw || "").trim().replace(/\s+/g, " ");
  if (!s) return "";
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Top products by units in non-void orders. */
export function topProducts(orders, limit = 8) {
  const map = new Map();
  for (const o of orders || []) {
    if (isVoidOrder(o)) continue;
    for (const it of o.items || []) {
      const key = String(it.productId || it.name || "");
      if (!key) continue;
      const qty = Math.max(0, Number(it.quantity) || 0);
      const row = map.get(key) || {
        id: it.productId ? String(it.productId) : "",
        name: it.name || "Unnamed item",
        units: 0,
        revenue: 0,
        orders: 0,
      };
      row.units += qty;
      row.revenue += Math.max(0, Number(it.unitPrice) || 0) * qty;
      row.orders += 1;
      map.set(key, row);
    }
  }
  return [...map.values()]
    .sort((a, b) => b.units - a.units || b.revenue - a.revenue)
    .slice(0, limit)
    .map((r) => ({ ...r, revenue: round2(r.revenue) }));
}

/** Top shipping cities by order count (non-void). */
export function topCities(orders, limit = 8) {
  const map = new Map();
  let total = 0;
  for (const o of orders || []) {
    if (isVoidOrder(o)) continue;
    const city = cleanCity(o.shippingAddress?.city) || "Unknown";
    const row = map.get(city) || { city, orders: 0, booked: 0 };
    row.orders += 1;
    row.booked += orderTotal(o);
    map.set(city, row);
    total += 1;
  }
  return [...map.values()]
    .sort((a, b) => b.orders - a.orders)
    .slice(0, limit)
    .map((r) => ({ ...r, booked: round2(r.booked), percent: pct1(r.orders, total) || 0 }));
}
