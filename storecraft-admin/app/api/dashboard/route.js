/**
 * Dashboard metrics with optional date range filter.
 *
 * Rules (PKT / Asia/Karachi) — the maths lives in lib/dashboardMetrics.js:
 * - Sales = booked order value (all non-void) — COD-friendly.
 * - Collected = paid orders + delivered COD parcels + advances received.
 * - To collect = still owed on open orders (total − advance received).
 * - Conversion only uses days where visitor tracking ran (no inflated rates from missing days).
 * - Profit = realised sales (paid / delivered) on items that have a cost price.
 * - Courier Dispatched = activity in window (ship / deliver / return), not "in transit only".
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { hasCapability, stripFinancialDashboardData } from "@/lib/permissions";
import { buildChartBuckets, resolveDashboardRange } from "@/lib/dashboardRanges";
import {
  findOrderGaps,
  ordersByDay,
  pctChange,
  profitSummary,
  summarizeOrders,
  topCities,
  topProducts,
  trackedConversion,
  isVoidOrder,
} from "@/lib/dashboardMetrics";
import { karachiDayBounds, karachiDayKey, shiftDayKey } from "@/lib/karachiDay";
import Customer from "@/lib/models/Customer.model";
import DailyVisitor from "@/lib/models/DailyVisitor.model";
import Order from "@/lib/models/Order.model";
import Product from "@/lib/models/Product.model";
import { orderGrandTotal } from "@/lib/orderFormat";
import { orderOriginLabel } from "@/lib/orderOrigin";
import { withoutDemo } from "@/lib/orderDemoFilter";

const TZ = "Asia/Karachi";
const sumTotal = { $sum: { $ifNull: ["$pricing.total", { $ifNull: ["$total", 0] }] } };
const NOT_VOID = { $nin: ["cancelled", "returned", "refunded"] };
const ORDER_FIELDS =
  "createdAt orderStatus paymentStatus paymentMethod payment.method payment.paidAmount pricing.total pricing.discount total " +
  "items.productId items.quantity items.unitPrice items.unitCost items.name shippingAddress.city " +
  "attribution.label attribution.channel aiAttributedSource";
/** Parcels still "shipped" after this many days usually mean courier status is not syncing. */
const STUCK_SHIPPED_DAYS = 10;

function dateMatch(from, to) {
  if (!from && !to) return withoutDemo({});
  const createdAt = {};
  if (from) createdAt.$gte = from;
  if (to) createdAt.$lte = to;
  return withoutDemo({ createdAt });
}

/** Build { $gte, $lte } date bounds when either end is set. */
function dateBounds(from, to) {
  if (!from && !to) return null;
  const bounds = {};
  if (from) bounds.$gte = from;
  if (to) bounds.$lte = to;
  return bounds;
}

/**
 * Courier event in range: prefer event timestamp (shippedAt / deliveredAt),
 * else fall back to createdAt for legacy rows missing those fields.
 */
function courierEventMatch(eventField, statuses, from, to) {
  const bounds = dateBounds(from, to);
  const statusFilter = Array.isArray(statuses) ? { $in: statuses } : statuses;
  if (!bounds) {
    return withoutDemo({ orderStatus: statusFilter });
  }
  return withoutDemo({
    $or: [
      { [eventField]: bounds },
      {
        $and: [
          {
            $or: [{ [eventField]: null }, { [eventField]: { $exists: false } }],
          },
          { orderStatus: statusFilter, createdAt: bounds },
        ],
      },
    ],
  });
}

/**
 * Parcels that had courier activity in the window (dispatch OR settle).
 * Prevents Delivered > Dispatched when parcels shipped before the window deliver inside it.
 */
function courierDispatchedMatch(from, to) {
  const bounds = dateBounds(from, to);
  if (!bounds) {
    return withoutDemo({ orderStatus: { $in: ["shipped", "delivered", "returned"] } });
  }
  return withoutDemo({
    $or: [
      { shippedAt: bounds },
      { deliveredAt: bounds },
      { orderStatus: "returned", updatedAt: bounds },
      {
        $and: [
          { orderStatus: { $in: ["shipped", "delivered", "returned"] } },
          {
            $and: [
              { $or: [{ shippedAt: null }, { shippedAt: { $exists: false } }] },
              { $or: [{ deliveredAt: null }, { deliveredAt: { $exists: false } }] },
            ],
          },
          { createdAt: bounds },
        ],
      },
    ],
  });
}

/** Returns finalized in the window (prefer updatedAt — when status flipped to returned). */
function courierReturnedMatch(from, to) {
  const bounds = dateBounds(from, to);
  if (!bounds) return withoutDemo({ orderStatus: "returned" });
  return withoutDemo({
    orderStatus: "returned",
    $or: [{ updatedAt: bounds }, { createdAt: bounds }],
  });
}

/** Orders ÷ unique visitors → conversion % (1 decimal). Null when no visitors. */
function conversionRate(orders, visitors) {
  const v = Number(visitors) || 0;
  if (v <= 0) return null;
  return Math.round(((Number(orders) || 0) / v) * 1000) / 10;
}

/** Inclusive Karachi dayKey list bounds for DailyVisitor queries. */
function visitorDayKeyFilter(from, to, todayKey) {
  const fromKey = from ? karachiDayKey(from) : null;
  const toKey = to ? karachiDayKey(to) : todayKey;
  if (!fromKey && !toKey) return {};
  if (fromKey && toKey) return { dayKey: { $gte: fromKey, $lte: toKey } };
  if (fromKey) return { dayKey: { $gte: fromKey } };
  return { dayKey: { $lte: toKey } };
}

/** Prior window of equal length (for growth + conversion trend). */
function priorWindowFor(from, to) {
  if (!from || !to) return null;
  const fromKey = karachiDayKey(from);
  const toKey = karachiDayKey(to);
  let days = 0;
  for (let k = fromKey; k <= toKey; k = shiftDayKey(k, 1)) days += 1;
  if (days < 1) return null;
  const priorToKey = shiftDayKey(fromKey, -1);
  const priorFromKey = shiftDayKey(priorToKey, -(days - 1));
  return {
    days,
    visitorFilter: { dayKey: { $gte: priorFromKey, $lte: priorToKey } },
    orderFrom: karachiDayBounds(priorFromKey).start,
    orderTo: karachiDayBounds(priorToKey).end,
  };
}

function normalizePaymentKey(raw) {
  const s = String(raw || "").toLowerCase().trim();
  if (!s) return "other";
  // Before the COD check: "jazzcash" contains "cash".
  if (s.includes("jazz")) return "jazzcash";
  if (s.includes("easy")) return "easypaisa";
  if (s.includes("cod") || s.includes("cash")) return "cod";
  if (
    s.includes("bank") ||
    s.includes("transfer") ||
    s.includes("hbl") ||
    s.includes("meezan") ||
    s.includes("ubl")
  ) {
    return "bank";
  }
  if (s.includes("card") || s.includes("stripe")) return "card";
  if (s.includes("paypal")) return "paypal";
  return "other";
}

const PAYMENT_LABELS = {
  cod: "Cash on Delivery",
  jazzcash: "JazzCash",
  easypaisa: "Easypaisa",
  bank: "Bank Transfer",
  card: "Card",
  paypal: "PayPal",
  other: "Other",
};

async function loadCostAndCategoryMaps(orders) {
  const productIds = new Set();
  for (const o of orders) {
    for (const it of o.items || []) {
      if (it.productId) productIds.add(String(it.productId));
    }
  }
  const costByProduct = new Map();
  const categoryByProduct = new Map();
  if (!productIds.size) return { costByProduct, categoryByProduct };
  const products = await Product.find({ _id: { $in: [...productIds] } })
    .select("pricing.costPerItem categories")
    .populate("categories", "name")
    .lean();
  for (const p of products) {
    costByProduct.set(String(p._id), Math.max(0, Number(p.pricing?.costPerItem) || 0));
    const catName =
      Array.isArray(p.categories) && p.categories[0]?.name ? p.categories[0].name : "Uncategorized";
    categoryByProduct.set(String(p._id), catName);
  }
  return { costByProduct, categoryByProduct };
}

function countMap(rows) {
  const map = new Map();
  for (const r of rows) if (r._id) map.set(r._id, r.n);
  return map;
}

function formatDayKey(key) {
  return karachiDayBounds(key).start.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: TZ,
  });
}

export async function GET(request) {
  try {
    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const range = resolveDashboardRange(
      searchParams.get("range") || "last30",
      searchParams.get("from"),
      searchParams.get("to")
    );
    const period = dateMatch(range.from, range.to);

    const now = new Date();
    const todayKey = karachiDayKey(now);
    const yesterdayKey = shiftDayKey(todayKey, -1);
    const { start: todayStart, end: todayEnd } = karachiDayBounds(todayKey);
    const { start: yesterdayStart, end: yesterdayEnd } = karachiDayBounds(yesterdayKey);
    const [ty, tm, td] = todayKey.split("-").map(Number);
    const monthStart = new Date(`${ty}-${String(tm).padStart(2, "0")}-01T00:00:00+05:00`);
    const prevMonth = tm === 1 ? { y: ty - 1, m: 12 } : { y: ty, m: tm - 1 };
    const prevMm = String(prevMonth.m).padStart(2, "0");
    const lastMonthStart = new Date(`${prevMonth.y}-${prevMm}-01T00:00:00+05:00`);
    const lastMonthEnd = new Date(monthStart.getTime() - 1);
    // Month-to-date vs the same days of last month (a full month always "beats" a partial one).
    const prevMonthDays = new Date(Date.UTC(prevMonth.y, prevMonth.m, 0)).getUTCDate();
    const lastMonthSameDayEnd = karachiDayBounds(
      `${prevMonth.y}-${prevMm}-${String(Math.min(td, prevMonthDays)).padStart(2, "0")}`
    ).end;

    const chartFrom = range.from || karachiDayBounds(shiftDayKey(todayKey, -29)).start;
    const chartTo = range.to || todayEnd;
    const { mode: chartMode, buckets } = buildChartBuckets(chartFrom, chartTo);

    const prior = priorWindowFor(range.from, range.to);
    const periodVisitorFilter = visitorDayKeyFilter(range.from, range.to, todayKey);
    const stuckBefore = new Date(now.getTime() - STUCK_SHIPPED_DAYS * 24 * 60 * 60 * 1000);
    const bookedAgg = (from, to) =>
      Order.aggregate([
        { $match: withoutDemo({ orderStatus: NOT_VOID, createdAt: { $gte: from, $lte: to } }) },
        { $group: { _id: null, total: sumTotal } },
      ]);

    const [
      periodOrders,
      priorOrders,
      chartOrders,
      totalCustomers,
      pendingOrdersAllTime,
      ordersDispatched,
      ordersDelivered,
      ordersReturned,
      stuckShipped,
      recentOrdersDocs,
      lowStockProducts,
      todayOrders,
      yesterdayOrders,
      monthBookedAgg,
      lastMonthSameDaysAgg,
      lastMonthBookedAgg,
      periodVisitorRows,
      priorVisitorRows,
      todayVisitorCount,
      yesterdayVisitorCount,
    ] = await Promise.all([
      Order.find(period).select(ORDER_FIELDS).lean(),
      prior
        ? Order.find(withoutDemo({ createdAt: { $gte: prior.orderFrom, $lte: prior.orderTo } }))
            .select(ORDER_FIELDS)
            .lean()
        : Promise.resolve(null),
      // "All time" charts the last 30 days; other ranges chart the range itself.
      range.from
        ? Promise.resolve(null)
        : Order.find(dateMatch(chartFrom, chartTo)).select("createdAt orderStatus pricing.total total").lean(),
      Customer.countDocuments(),
      Order.countDocuments(withoutDemo({ orderStatus: "pending" })),
      Order.countDocuments(courierDispatchedMatch(range.from, range.to)),
      Order.countDocuments(courierEventMatch("deliveredAt", "delivered", range.from, range.to)),
      Order.countDocuments(courierReturnedMatch(range.from, range.to)),
      Order.countDocuments(
        withoutDemo({
          orderStatus: "shipped",
          $or: [
            { shippedAt: { $lt: stuckBefore } },
            { shippedAt: null, createdAt: { $lt: stuckBefore } },
          ],
        })
      ),
      Order.find(period)
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("customer.customerId", "name email")
        .lean(),
      Product.find({
        status: "active",
        "inventory.quantity": { $exists: true, $ne: null },
        $or: [{ "inventory.trackInventory": true }, { "inventory.trackInventory": { $exists: false } }],
        $expr: {
          $lte: ["$inventory.quantity", { $ifNull: ["$inventory.lowStockThreshold", 5] }],
        },
      })
        .select("name inventory.quantity inventory.lowStockThreshold")
        .sort({ "inventory.quantity": 1 })
        .lean(),
      Order.find(withoutDemo({ createdAt: { $gte: todayStart, $lte: todayEnd } }))
        .select(ORDER_FIELDS)
        .lean(),
      Order.find(withoutDemo({ createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd } }))
        .select(ORDER_FIELDS)
        .lean(),
      bookedAgg(monthStart, todayEnd),
      bookedAgg(lastMonthStart, lastMonthSameDayEnd),
      bookedAgg(lastMonthStart, lastMonthEnd),
      DailyVisitor.aggregate([
        { $match: periodVisitorFilter },
        { $group: { _id: "$dayKey", n: { $sum: 1 } } },
      ]),
      prior
        ? DailyVisitor.aggregate([
            { $match: prior.visitorFilter },
            { $group: { _id: "$dayKey", n: { $sum: 1 } } },
          ])
        : Promise.resolve([]),
      DailyVisitor.countDocuments({ dayKey: todayKey }),
      DailyVisitor.countDocuments({ dayKey: yesterdayKey }),
    ]);

    // ── Money + order counts ─────────────────────────────────────────────
    const summary = summarizeOrders(periodOrders);
    const priorSummary = priorOrders ? summarizeOrders(priorOrders) : null;
    const today = summarizeOrders(todayOrders);
    const yesterday = summarizeOrders(yesterdayOrders);
    const monthBooked = monthBookedAgg[0]?.total ?? 0;
    const lastMonthSameDays = lastMonthSameDaysAgg[0]?.total ?? 0;
    const lastMonthBooked = lastMonthBookedAgg[0]?.total ?? 0;

    const { costByProduct, categoryByProduct } = await loadCostAndCategoryMaps([
      ...periodOrders,
      ...(priorOrders || []),
    ]);
    const profit = profitSummary(periodOrders, costByProduct);
    const priorProfit = priorOrders ? profitSummary(priorOrders, costByProduct) : null;

    // ── Visitors + conversion (tracked days only) ────────────────────────
    const periodDayOrders = ordersByDay(periodOrders);
    const periodVisitorsByDay = countMap(periodVisitorRows);
    const periodVisitors = [...periodVisitorsByDay.values()].reduce((s, n) => s + n, 0);
    const conversion = trackedConversion(periodVisitorsByDay, periodDayOrders);
    const priorConversion = priorOrders
      ? trackedConversion(countMap(priorVisitorRows), ordersByDay(priorOrders))
      : null;
    const todayConversionRate = conversionRate(todayOrders.length, todayVisitorCount);
    const yesterdayConversionRate = conversionRate(yesterdayOrders.length, yesterdayVisitorCount);

    // Calendar days in the window (for "tracked X of Y days" and gap detection).
    const firstOrderKey = periodOrders.length
      ? karachiDayKey(new Date(Math.min(...periodOrders.map((o) => new Date(o.createdAt).getTime()))))
      : todayKey;
    const windowFromKey = range.from ? karachiDayKey(range.from) : firstOrderKey;
    const windowToKey = range.to ? karachiDayKey(range.to) : todayKey;
    const windowDayKeys = [];
    for (let k = windowFromKey; k <= windowToKey && windowDayKeys.length < 800; k = shiftDayKey(k, 1)) {
      windowDayKeys.push(k);
    }
    const orderGaps = findOrderGaps(
      windowDayKeys.filter((k) => k < todayKey),
      periodDayOrders
    ).map((g) => ({ ...g, label: `${formatDayKey(g.from)} – ${formatDayKey(g.to)}` }));

    // ── Sales trend (booked sales + order count) ─────────────────────────
    const chartDayOrders = chartOrders ? ordersByDay(chartOrders) : periodDayOrders;
    const salesTrend = buckets.map((b) => {
      let revenue = 0;
      let orders = 0;
      for (let key = karachiDayKey(b.from); key <= karachiDayKey(b.to); key = shiftDayKey(key, 1)) {
        const row = chartDayOrders.get(key);
        if (row) {
          revenue += row.booked;
          orders += row.orders;
        }
      }
      return { date: b.key, label: b.label, revenue: Math.round(revenue), orders };
    });

    // ── Mix cards ────────────────────────────────────────────────────────
    const liveOrders = periodOrders.filter((o) => !isVoidOrder(o));
    const paymentCounts = {};
    for (const o of liveOrders) {
      const key = normalizePaymentKey(o.paymentMethod || o.payment?.method);
      paymentCounts[key] = (paymentCounts[key] || 0) + 1;
    }
    const paymentMethods = Object.entries(paymentCounts)
      .map(([key, count]) => ({
        key,
        label: PAYMENT_LABELS[key] || key,
        count,
        percent: liveOrders.length ? Math.round((count / liveOrders.length) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const originCounts = {};
    for (const o of periodOrders) {
      const label = orderOriginLabel(o) || "Direct";
      originCounts[label] = (originCounts[label] || 0) + 1;
    }
    const ordersByOrigin = Object.entries(originCounts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const catSell = {};
    for (const o of liveOrders) {
      for (const it of o.items || []) {
        const line = Math.max(0, Number(it.quantity) || 0) * Math.max(0, Number(it.unitPrice) || 0);
        const catName = it.productId
          ? categoryByProduct.get(String(it.productId)) || "Uncategorized"
          : "Uncategorized";
        catSell[catName] = (catSell[catName] || 0) + line;
      }
    }
    const catEntries = Object.entries(catSell).sort((a, b) => b[1] - a[1]);
    const catTotal = catEntries.reduce((s, [, v]) => s + v, 0) || 1;
    const salesByCategory = catEntries.slice(0, 5).map(([name, value]) => ({
      name,
      value: Math.round(value),
      percent: Math.round((value / catTotal) * 1000) / 10,
    }));
    if (catEntries.length > 5) {
      const rest = catEntries.slice(5).reduce((s, [, v]) => s + v, 0);
      salesByCategory.push({
        name: "Other",
        value: Math.round(rest),
        percent: Math.round((rest / catTotal) * 1000) / 10,
      });
    }

    const statusCounts = {
      pending: 0,
      confirmed: 0,
      processing: 0,
      packed: 0,
      shipped: 0,
      delivered: 0,
      returned: 0,
      cancelled: 0,
      refunded: 0,
      disputed: 0,
    };
    for (const o of periodOrders) {
      if (Object.prototype.hasOwnProperty.call(statusCounts, o.orderStatus)) statusCounts[o.orderStatus] += 1;
    }

    const recentOrders = recentOrdersDocs.map((o) => ({
      id: o._id.toString(),
      orderNumber: o.orderNumber,
      customerName: o.customer?.name || o.customer?.customerId?.name || "Guest",
      city: o.shippingAddress?.city || "",
      total: orderGrandTotal(o),
      status: o.orderStatus,
      paymentStatus: o.paymentStatus || "",
      date: o.createdAt,
    }));

    const lowStock = lowStockProducts.map((p) => ({
      id: p._id.toString(),
      name: p.name,
      quantity: p.inventory?.quantity ?? 0,
      threshold: p.inventory?.lowStockThreshold ?? 5,
    }));

    const courierSettled = (Number(ordersDelivered) || 0) + (Number(ordersReturned) || 0);
    const deliveryRatio =
      courierSettled > 0 ? Math.round((ordersDelivered / courierSettled) * 1000) / 10 : null;
    const returnRatio =
      courierSettled > 0 ? Math.round((ordersReturned / courierSettled) * 1000) / 10 : null;

    const cities = topCities(periodOrders);
    const products = topProducts(periodOrders);

    // ── Insights: things to act on, most urgent first ───────────────────
    const insights = [];
    for (const g of orderGaps) {
      insights.push({
        tone: "alert",
        text: `No orders are recorded ${g.label} (${g.days} days). That looks like missing data (for example from the database move), not a slow week — the totals for this period are too low.`,
      });
    }
    if (stuckShipped > 0) {
      insights.push({
        tone: "alert",
        text: `${stuckShipped} parcel${stuckShipped === 1 ? " has" : "s have"} been "shipped" for over ${STUCK_SHIPPED_DAYS} days. Update them to delivered or returned so collected money and return rate are correct.`,
      });
    }
    if (summary.pendingConfirm > 0) {
      insights.push({
        tone: "action",
        text: `${summary.pendingConfirm} order${summary.pendingConfirm === 1 ? " is" : "s are"} still pending in ${range.label} (${pendingOrdersAllTime} in total). Confirm or cancel them so they are dispatched.`,
      });
    }
    if (profit.coverage != null && profit.coverage < 80) {
      const names = profit.missingCost.map((m) => m.name).slice(0, 3).join(", ");
      insights.push({
        tone: "action",
        text: `Profit only covers ${profit.coverage}% of sales — the rest have no cost price. Add cost price for ${names || "these products"}.`,
      });
    }
    if (conversion.days > 0 && conversion.days < windowDayKeys.length) {
      insights.push({
        tone: "info",
        text: `Visitor tracking covers ${conversion.days} of ${windowDayKeys.length} days in ${range.label}, so conversion uses only those days (${conversion.orders} orders ÷ ${conversion.visitors.toLocaleString("en-PK")} visitors).`,
      });
    }
    if (returnRatio != null && returnRatio >= 15) {
      insights.push({
        tone: "action",
        text: `Return rate is ${returnRatio}% of settled parcels. Ask for the booking advance on high-value COD orders and call to confirm before dispatch.`,
      });
    }
    if (cities[0] && cities[0].city !== "Unknown") {
      insights.push({
        tone: "info",
        text: `${cities[0].city} brings the most orders (${cities[0].percent}%). Consider city-targeted ads there.`,
      });
    }
    if (!insights.length) {
      insights.push({ tone: "info", text: "All good — no issues found for this period." });
    }

    const data = {
      range: {
        id: range.id,
        label: range.label,
        from: range.from ? range.from.toISOString() : null,
        to: range.to ? range.to.toISOString() : null,
        days: windowDayKeys.length,
      },
      timezone: TZ,
      todayKey,

      // Today
      todaySales: today.booked,
      todayOrderValue: today.booked,
      todayPaidSales: today.collected,
      todayOrders: todayOrders.length,
      todaySalesGrowth: pctChange(today.booked, yesterday.booked),
      todayOrdersGrowth: pctChange(todayOrders.length, yesterdayOrders.length),
      pendingOrders: today.pendingConfirm,
      unpaidOrdersToday: today.unpaidOrders,
      unpaidOrderValueToday: today.outstanding,
      todayVisitors: todayVisitorCount,
      yesterdayVisitors: yesterdayVisitorCount,
      todayVisitorsGrowth: pctChange(todayVisitorCount, yesterdayVisitorCount),
      todayConversionRate,
      yesterdayConversionRate,

      // Period
      periodOrders: summary.orders,
      ordersReceived: summary.orders,
      periodBooked: summary.booked,
      totalSellOpen: summary.booked,
      priorPeriodBooked: priorSummary ? priorSummary.booked : null,
      periodBookedGrowth: priorSummary ? pctChange(summary.booked, priorSummary.booked) : null,
      periodOrdersGrowth: priorSummary ? pctChange(summary.orders, priorSummary.orders) : null,
      avgOrderValue: summary.avgOrderValue,
      priorAvgOrderValue: priorSummary ? priorSummary.avgOrderValue : null,
      periodCollected: summary.collected,
      periodSales: summary.collected,
      totalRevenue: summary.collected,
      periodToCollect: summary.outstanding,
      unpaidOrderValuePeriod: summary.outstanding,
      periodPaidOrders: summary.paidOrders,
      unpaidOrdersPeriod: summary.unpaidOrders,
      partialOrdersPeriod: summary.partialOrders,
      pendingOrdersPeriod: summary.pendingConfirm,
      pendingOrdersAllTime,
      cancelledOrdersPeriod: summary.cancelled,
      cancelRate: summary.cancelRate,
      periodVisitors,
      periodConversionRate: conversion.rate,
      conversionTrackedDays: conversion.days,
      conversionOrders: conversion.orders,
      conversionVisitors: conversion.visitors,
      priorPeriodConversionRate: priorConversion?.rate ?? null,
      periodConversionGrowth:
        conversion.rate != null && priorConversion?.rate != null
          ? pctChange(conversion.rate, priorConversion.rate)
          : null,

      // Month
      monthlyRevenue: monthBooked,
      lastMonthSameDaysRevenue: lastMonthSameDays,
      lastMonthRevenue: lastMonthBooked,
      monthlyGrowth: pctChange(monthBooked, lastMonthSameDays),

      // Profit
      totalProfit: profit.profit,
      profitMargin: profit.margin,
      profitCostCoverage: profit.coverage,
      profitRealisedSales: profit.realisedSales,
      profitRealisedOrders: profit.realisedOrders,
      profitMissingCost: profit.missingCost,
      profitGrowth: priorProfit ? pctChange(profit.profit, priorProfit.profit) : null,

      // Courier
      ordersDispatched,
      ordersDelivered,
      ordersReturned,
      courierSettled,
      deliveryRatio,
      returnRatio,
      stuckShipped,

      totalCustomers,
      orderGaps,
      recentOrders,
      orderStatusCounts: statusCounts,
      salesTrend,
      salesTrendTotal: salesTrend.reduce((s, b) => s + b.revenue, 0),
      salesTrendOrders: salesTrend.reduce((s, b) => s + b.orders, 0),
      chartMode,
      lowStockProducts: lowStock,
      salesByCategory,
      paymentMethods,
      ordersByOrigin,
      topProducts: products,
      topCities: cities,
      insights,
    };

    if (!hasCapability(user, "canViewFinancials")) {
      stripFinancialDashboardData(data);
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Dashboard failed." },
      { status: 500 }
    );
  }
}

