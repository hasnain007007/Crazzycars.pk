/**
 * Dashboard metrics with optional date range filter.
 * Extended for the modern ops dashboard (KPIs, category, payments, weekday, insights).
 *
 * Rules (PKT / Asia/Karachi):
 * - Paid revenue KPIs and Net Profit use the same paid, non-cancelled cohort.
 * - Range presets use Karachi day bounds (same as Today / Monthly cards).
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { hasCapability, stripFinancialDashboardData } from "@/lib/permissions";
import { buildChartBuckets, resolveDashboardRange } from "@/lib/dashboardRanges";
import { karachiDayBounds, karachiDayKey, shiftDayKey } from "@/lib/karachiDay";
import Customer from "@/lib/models/Customer.model";
import DailyVisitor from "@/lib/models/DailyVisitor.model";
import Order from "@/lib/models/Order.model";
import Product from "@/lib/models/Product.model";
import { orderGrandTotal } from "@/lib/orderFormat";

const TZ = "Asia/Karachi";
const sumTotal = { $sum: { $ifNull: ["$pricing.total", { $ifNull: ["$total", 0] }] } };
const NOT_VOID = { $nin: ["cancelled", "returned", "refunded"] };

function dateMatch(from, to) {
  if (!from && !to) return {};
  const createdAt = {};
  if (from) createdAt.$gte = from;
  if (to) createdAt.$lte = to;
  return { createdAt };
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
    return { orderStatus: statusFilter };
  }
  return {
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
  };
}

function pctChange(current, previous) {
  const c = Number(current) || 0;
  const p = Number(previous) || 0;
  if (p === 0) return c > 0 ? 100 : 0;
  return Math.round(((c - p) / p) * 1000) / 10;
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

/** Prior window of equal length (for conversion trend). */
function priorVisitorWindow(from, to, todayKey) {
  if (!from || !to) return null;
  const fromKey = karachiDayKey(from);
  const toKey = karachiDayKey(to);
  let days = 0;
  for (let k = fromKey; k <= toKey; k = shiftDayKey(k, 1)) days += 1;
  if (days < 1) return null;
  const priorToKey = shiftDayKey(fromKey, -1);
  const priorFromKey = shiftDayKey(priorToKey, -(days - 1));
  return {
    visitorFilter: { dayKey: { $gte: priorFromKey, $lte: priorToKey } },
    orderFrom: karachiDayBounds(priorFromKey).start,
    orderTo: karachiDayBounds(priorToKey).end,
  };
}

function normalizePaymentKey(raw) {
  const s = String(raw || "").toLowerCase().trim();
  if (!s) return "other";
  if (s.includes("cod") || s.includes("cash")) return "cod";
  if (s.includes("jazz")) return "jazzcash";
  if (s.includes("easy")) return "easypaisa";
  if (s.includes("bank") || s.includes("transfer") || s.includes("hbl") || s.includes("meezan")) {
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

/**
 * Profit on collected money: order total − COGS.
 * Snapshot unitCost of 0 is treated as missing so product costPerItem can fill in.
 */
function computeOrderProfit(order, costByProduct) {
  let cost = 0;
  let lineSell = 0;
  for (const it of order.items || []) {
    const qty = Math.max(0, Number(it.quantity) || 0);
    const unitPrice = Math.max(0, Number(it.unitPrice) || 0);
    let unitCost = Number(it.unitCost);
    if (!Number.isFinite(unitCost) || unitCost <= 0) {
      unitCost = it.productId ? costByProduct.get(String(it.productId)) || 0 : 0;
    }
    lineSell += unitPrice * qty;
    cost += unitCost * qty;
  }
  const revenue = Math.max(0, Number(order.pricing?.total ?? order.total ?? lineSell) || 0);
  return { profit: revenue - cost, cost, sell: revenue };
}

function sumProfits(orders, costByProduct) {
  let totalProfit = 0;
  let totalCost = 0;
  let totalSell = 0;
  for (const o of orders) {
    const { profit, cost, sell } = computeOrderProfit(o, costByProduct);
    totalProfit += profit;
    totalCost += cost;
    totalSell += sell;
  }
  return {
    totalProfit: Math.round(totalProfit * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    totalSell: Math.round(totalSell * 100) / 100,
  };
}

async function loadCostAndCategoryMaps(productIds) {
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

function collectProductIds(...orderLists) {
  const productIds = new Set();
  for (const orders of orderLists) {
    for (const o of orders || []) {
      for (const it of o.items || []) {
        if (it.productId) productIds.add(String(it.productId));
      }
    }
  }
  return productIds;
}

export async function GET(request) {
  try {
    if (!getRequestUser(request)) {
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
    const [ty, tm] = todayKey.split("-").map(Number);
    const monthStart = new Date(`${ty}-${String(tm).padStart(2, "0")}-01T00:00:00+05:00`);
    const prevMonth = tm === 1 ? { y: ty - 1, m: 12 } : { y: ty, m: tm - 1 };
    const lastMonthStart = new Date(
      `${prevMonth.y}-${String(prevMonth.m).padStart(2, "0")}-01T00:00:00+05:00`
    );
    const lastMonthEnd = new Date(monthStart.getTime() - 1);
    const weekFrom = karachiDayBounds(shiftDayKey(todayKey, -6)).start;

    const sellMatch = {
      ...period,
      orderStatus: NOT_VOID,
    };
    const paidMatch = {
      ...period,
      paymentStatus: "paid",
      orderStatus: NOT_VOID,
    };
    const priorPaidMatch = {
      createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
      paymentStatus: "paid",
      orderStatus: NOT_VOID,
    };

    const chartFrom = range.from || karachiDayBounds(shiftDayKey(todayKey, -29)).start;
    const chartTo = range.to || todayEnd;
    const { mode: chartMode, buckets } = buildChartBuckets(
      range.id === "all" ? chartFrom : range.from || chartFrom,
      range.id === "all" ? chartTo : range.to || chartTo
    );

    const trendCreatedAt =
      range.from || range.to
        ? {
            ...(range.from ? { $gte: range.from } : {}),
            ...(range.to ? { $lte: range.to } : {}),
          }
        : { $gte: chartFrom, $lte: chartTo };

    const priorWindow = priorVisitorWindow(range.from, range.to, todayKey);
    const periodVisitorFilter = visitorDayKeyFilter(range.from, range.to, todayKey);

    const [
      periodSalesAgg,
      periodOrdersCount,
      periodPaidOrdersCount,
      totalSellAgg,
      totalCustomers,
      pendingOrdersAllTime,
      pendingOrdersPeriod,
      pendingOrdersToday,
      ordersReceived,
      ordersDispatched,
      ordersDelivered,
      ordersReturned,
      recentOrdersDocs,
      statusAgg,
      salesByDayAgg,
      lowStockProducts,
      profitOrders,
      priorProfitOrders,
      todayPaidAgg,
      todayOrderCount,
      todayOrderValueAgg,
      yesterdayPaidAgg,
      yesterdayOrderCount,
      monthPaidAgg,
      lastMonthPaidAgg,
      paymentAgg,
      categoryOrders,
      weekdayOrders,
      todayVisitorCount,
      yesterdayVisitorCount,
      periodVisitorCount,
      priorPeriodVisitorCount,
      priorPeriodOrderCount,
      unpaidOrdersPeriod,
      partialOrdersPeriod,
      unpaidOrdersToday,
      unpaidValuePeriodAgg,
      unpaidValueTodayAgg,
    ] = await Promise.all([
      Order.aggregate([{ $match: paidMatch }, { $group: { _id: null, total: sumTotal } }]),
      Order.countDocuments(period),
      Order.countDocuments(paidMatch),
      Order.aggregate([{ $match: sellMatch }, { $group: { _id: null, total: sumTotal } }]),
      Customer.countDocuments(),
      Order.countDocuments({ orderStatus: "pending" }),
      Order.countDocuments({ ...period, orderStatus: "pending" }),
      Order.countDocuments({
        orderStatus: "pending",
        createdAt: { $gte: todayStart, $lte: todayEnd },
      }),
      Order.countDocuments(period),
      // Dispatched in selected days (shippedAt), including parcels now delivered/returned.
      Order.countDocuments(
        courierEventMatch("shippedAt", ["shipped", "delivered", "returned"], range.from, range.to)
      ),
      Order.countDocuments(courierEventMatch("deliveredAt", "delivered", range.from, range.to)),
      // Returned: no returnedAt field — use createdAt window + current returned status.
      Order.countDocuments({ ...period, orderStatus: "returned" }),
      Order.find(period)
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("customer.customerId", "name email")
        .lean(),
      Order.aggregate([
        { $match: period },
        { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        {
          $match: {
            paymentStatus: "paid",
            orderStatus: NOT_VOID,
            createdAt: trendCreatedAt,
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TZ },
            },
            revenue: sumTotal,
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Product.find({
        "inventory.quantity": { $exists: true, $ne: null },
        $or: [{ "inventory.trackInventory": true }, { "inventory.trackInventory": { $exists: false } }],
        $expr: {
          $lte: ["$inventory.quantity", { $ifNull: ["$inventory.lowStockThreshold", 5] }],
        },
      })
        .select("name inventory.quantity inventory.lowStockThreshold")
        .lean(),
      Order.find(paidMatch)
        .select("items.productId items.quantity items.unitPrice items.unitCost items.name pricing.total total")
        .lean(),
      Order.find(priorPaidMatch)
        .select("items.productId items.quantity items.unitPrice items.unitCost items.name pricing.total total")
        .lean(),
      Order.aggregate([
        {
          $match: {
            paymentStatus: "paid",
            orderStatus: NOT_VOID,
            createdAt: { $gte: todayStart, $lte: todayEnd },
          },
        },
        { $group: { _id: null, total: sumTotal } },
      ]),
      Order.countDocuments({ createdAt: { $gte: todayStart, $lte: todayEnd } }),
      Order.aggregate([
        { $match: { createdAt: { $gte: todayStart, $lte: todayEnd } } },
        { $group: { _id: null, total: sumTotal } },
      ]),
      Order.aggregate([
        {
          $match: {
            paymentStatus: "paid",
            orderStatus: NOT_VOID,
            createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd },
          },
        },
        { $group: { _id: null, total: sumTotal } },
      ]),
      Order.countDocuments({ createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd } }),
      Order.aggregate([
        {
          $match: {
            paymentStatus: "paid",
            orderStatus: NOT_VOID,
            createdAt: { $gte: monthStart, $lte: todayEnd },
          },
        },
        { $group: { _id: null, total: sumTotal } },
      ]),
      Order.aggregate([
        {
          $match: {
            paymentStatus: "paid",
            orderStatus: NOT_VOID,
            createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
          },
        },
        { $group: { _id: null, total: sumTotal } },
      ]),
      Order.aggregate([
        { $match: paidMatch },
        {
          $group: {
            _id: { $ifNull: ["$paymentMethod", "$payment.method"] },
            count: { $sum: 1 },
            total: sumTotal,
          },
        },
      ]),
      Order.find(paidMatch)
        .select("items.productId items.quantity items.unitPrice items.name")
        .lean(),
      Order.find({
        paymentStatus: "paid",
        orderStatus: NOT_VOID,
        createdAt: { $gte: weekFrom, $lte: todayEnd },
      })
        .select(
          "createdAt items.productId items.quantity items.unitPrice items.unitCost pricing.total total"
        )
        .lean(),
      DailyVisitor.countDocuments({ dayKey: todayKey }),
      DailyVisitor.countDocuments({ dayKey: yesterdayKey }),
      DailyVisitor.countDocuments(periodVisitorFilter),
      priorWindow
        ? DailyVisitor.countDocuments(priorWindow.visitorFilter)
        : Promise.resolve(0),
      priorWindow
        ? Order.countDocuments({
            createdAt: { $gte: priorWindow.orderFrom, $lte: priorWindow.orderTo },
          })
        : Promise.resolve(0),
      Order.countDocuments({
        ...period,
        orderStatus: NOT_VOID,
        paymentStatus: "unpaid",
      }),
      Order.countDocuments({
        ...period,
        orderStatus: NOT_VOID,
        paymentStatus: "partial",
      }),
      Order.countDocuments({
        orderStatus: NOT_VOID,
        paymentStatus: "unpaid",
        createdAt: { $gte: todayStart, $lte: todayEnd },
      }),
      Order.aggregate([
        {
          $match: {
            ...period,
            orderStatus: NOT_VOID,
            paymentStatus: { $in: ["unpaid", "partial"] },
          },
        },
        { $group: { _id: null, total: sumTotal } },
      ]),
      Order.aggregate([
        {
          $match: {
            orderStatus: NOT_VOID,
            paymentStatus: { $in: ["unpaid", "partial"] },
            createdAt: { $gte: todayStart, $lte: todayEnd },
          },
        },
        { $group: { _id: null, total: sumTotal } },
      ]),
    ]);

    const periodSales = periodSalesAgg[0]?.total ?? 0;
    const totalRevenue = periodSales;
    const totalSellOpen = totalSellAgg[0]?.total ?? 0;
    const calendarTodaySales = todayPaidAgg[0]?.total ?? 0;
    const todayOrderValue = todayOrderValueAgg[0]?.total ?? 0;
    const yesterdaySales = yesterdayPaidAgg[0]?.total ?? 0;
    const thisMonthRevenue = monthPaidAgg[0]?.total ?? 0;
    const lastMonthRevenue = lastMonthPaidAgg[0]?.total ?? 0;

    const productIds = collectProductIds(profitOrders, priorProfitOrders, categoryOrders, weekdayOrders);
    const { costByProduct, categoryByProduct } = await loadCostAndCategoryMaps(productIds);

    const { totalProfit, totalCost, totalSell } = sumProfits(profitOrders, costByProduct);
    const { totalProfit: priorProfit } = sumProfits(priorProfitOrders, costByProduct);
    const profitMargin = totalSell > 0 ? Math.round((totalProfit / totalSell) * 1000) / 10 : 0;

    const orderStatusCounts = {
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
    for (const row of statusAgg) {
      if (row._id && Object.prototype.hasOwnProperty.call(orderStatusCounts, row._id)) {
        orderStatusCounts[row._id] = row.count;
      }
    }

    const revenueByDay = {};
    for (const row of salesByDayAgg) {
      if (row._id) revenueByDay[row._id] = row.revenue;
    }

    let salesTrend = [];
    if (chartMode === "day" && buckets.length) {
      salesTrend = buckets.map((b) => ({
        date: b.key,
        label: b.label,
        revenue: revenueByDay[b.key] ?? 0,
      }));
    } else if (buckets.length) {
      salesTrend = buckets.map((b) => {
        let rev = 0;
        for (let key = karachiDayKey(b.from); key <= karachiDayKey(b.to); key = shiftDayKey(key, 1)) {
          rev += revenueByDay[key] ?? 0;
        }
        return { date: b.key, label: b.label, revenue: rev };
      });
    } else {
      for (let i = 29; i >= 0; i -= 1) {
        const key = shiftDayKey(todayKey, -i);
        const { start } = karachiDayBounds(key);
        salesTrend.push({
          date: key,
          label: start.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: TZ }),
          revenue: revenueByDay[key] ?? 0,
        });
      }
    }

    const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const labelToIdx = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
    const weekdayRevenueVsCost = weekdayLabels.map((label) => ({
      label,
      revenue: 0,
      cost: 0,
    }));
    for (const o of weekdayOrders) {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: TZ,
        weekday: "short",
      }).formatToParts(new Date(o.createdAt));
      const wd = parts.find((p) => p.type === "weekday")?.value;
      const idx = labelToIdx[wd];
      if (idx == null) continue;
      const { cost, sell } = computeOrderProfit(o, costByProduct);
      weekdayRevenueVsCost[idx].revenue += sell;
      weekdayRevenueVsCost[idx].cost += cost;
    }
    for (const row of weekdayRevenueVsCost) {
      row.revenue = Math.round(row.revenue * 100) / 100;
      row.cost = Math.round(row.cost * 100) / 100;
    }

    const paymentTotals = {};
    let paymentSum = 0;
    for (const row of paymentAgg) {
      const key = normalizePaymentKey(row._id);
      paymentTotals[key] = (paymentTotals[key] || 0) + (Number(row.count) || 0);
      paymentSum += Number(row.count) || 0;
    }
    const paymentMethods = Object.entries(paymentTotals)
      .map(([key, count]) => ({
        key,
        label: PAYMENT_LABELS[key] || key,
        count,
        percent: paymentSum ? Math.round((count / paymentSum) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const catSell = {};
    for (const o of categoryOrders) {
      for (const it of o.items || []) {
        const qty = Math.max(0, Number(it.quantity) || 0);
        const unitPrice = Math.max(0, Number(it.unitPrice) || 0);
        const line = qty * unitPrice;
        const catName = it.productId
          ? categoryByProduct.get(String(it.productId)) || "Uncategorized"
          : "Uncategorized";
        catSell[catName] = (catSell[catName] || 0) + line;
      }
    }
    const catEntries = Object.entries(catSell).sort((a, b) => b[1] - a[1]);
    const catTotal = catEntries.reduce((s, [, v]) => s + v, 0) || 1;
    let salesByCategory = catEntries.slice(0, 5).map(([name, value]) => ({
      name,
      value: Math.round(value * 100) / 100,
      percent: Math.round((value / catTotal) * 1000) / 10,
    }));
    if (catEntries.length > 5) {
      const rest = catEntries.slice(5).reduce((s, [, v]) => s + v, 0);
      salesByCategory.push({
        name: "Other",
        value: Math.round(rest * 100) / 100,
        percent: Math.round((rest / catTotal) * 1000) / 10,
      });
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

    const insights = [];
    const bestWeekday = [...weekdayRevenueVsCost].sort((a, b) => b.revenue - a.revenue)[0];
    if (bestWeekday?.revenue > 0) {
      insights.push({
        icon: "bolt",
        text: `${bestWeekday.label} is your strongest day this week (Rs ${Math.round(bestWeekday.revenue).toLocaleString("en-PK")} paid). Consider promos on quieter days.`,
      });
    }
    if (profitMargin > 0) {
      insights.push({
        icon: "bolt",
        text: `Net margin is ${profitMargin}% on paid sales in this period. Keep cost-per-item updated for accurate profit.`,
      });
    }
    const codShare = paymentMethods.find((p) => p.key === "cod")?.percent || 0;
    if (codShare >= 40) {
      insights.push({
        icon: "bolt",
        text: `COD is ${codShare}% of paid orders. Nudge customers to JazzCash/Easypaisa to lower returns and collection delays.`,
      });
    }
    if (ordersReturned > 0 && ordersReceived > 0) {
      const settledForInsight = ordersDelivered + ordersReturned;
      const retPct =
        settledForInsight > 0
          ? Math.round((ordersReturned / settledForInsight) * 1000) / 10
          : Math.round((ordersReturned / ordersReceived) * 1000) / 10;
      insights.push({
        icon: "bolt",
        text: `Return ratio is ${retPct}% of settled courier orders (delivered + returned) in this period. Review returned SKUs and city patterns.`,
      });
    }
    const periodConvInsight = conversionRate(periodOrdersCount, periodVisitorCount);
    if (periodConvInsight != null && periodVisitorCount > 0) {
      insights.push({
        icon: "bolt",
        text: `Conversion is ${periodConvInsight}% (${periodOrdersCount} orders ÷ ${periodVisitorCount} visitors) for ${range.label}.`,
      });
    }
    if (!insights.length) {
      insights.push({
        icon: "bolt",
        text: "Keep adding orders and product costs — insights will appear as your data grows.",
      });
    }

    const trendPaidTotal = salesTrend.reduce((s, b) => s + (Number(b.revenue) || 0), 0);

    const courierSettled = (Number(ordersDelivered) || 0) + (Number(ordersReturned) || 0);
    const deliveryRatio =
      courierSettled > 0 ? Math.round((ordersDelivered / courierSettled) * 1000) / 10 : null;
    const returnRatio =
      courierSettled > 0 ? Math.round((ordersReturned / courierSettled) * 1000) / 10 : null;

    const user = getRequestUser(request);
    const data = {
      range: {
        id: range.id,
        label: range.label,
        from: range.from ? range.from.toISOString() : null,
        to: range.to ? range.to.toISOString() : null,
      },
      periodSales,
      periodOrders: periodOrdersCount,
      periodPaidOrders: periodPaidOrdersCount,
      todaySales: calendarTodaySales,
      todayOrders: todayOrderCount,
      todayOrderValue,
      todaySalesGrowth: pctChange(calendarTodaySales, yesterdaySales),
      todayOrdersGrowth: pctChange(todayOrderCount, yesterdayOrderCount),
      todayVisitors: todayVisitorCount,
      yesterdayVisitors: yesterdayVisitorCount,
      todayVisitorsGrowth: pctChange(todayVisitorCount, yesterdayVisitorCount),
      periodVisitors: periodVisitorCount,
      todayConversionRate: conversionRate(todayOrderCount, todayVisitorCount),
      yesterdayConversionRate: conversionRate(yesterdayOrderCount, yesterdayVisitorCount),
      todayConversionGrowth: (() => {
        const cur = conversionRate(todayOrderCount, todayVisitorCount);
        const prev = conversionRate(yesterdayOrderCount, yesterdayVisitorCount);
        if (cur == null || prev == null) return null;
        return pctChange(cur, prev);
      })(),
      periodConversionRate: conversionRate(periodOrdersCount, periodVisitorCount),
      priorPeriodConversionRate: conversionRate(priorPeriodOrderCount, priorPeriodVisitorCount),
      periodConversionGrowth: (() => {
        const cur = conversionRate(periodOrdersCount, periodVisitorCount);
        const prev = conversionRate(priorPeriodOrderCount, priorPeriodVisitorCount);
        if (cur == null || prev == null) return null;
        return pctChange(cur, prev);
      })(),
      monthlyRevenue: thisMonthRevenue,
      lastMonthRevenue,
      monthlyGrowth: pctChange(thisMonthRevenue, lastMonthRevenue),
      timezone: TZ,
      todayKey,
      totalRevenue,
      totalSell,
      totalSellOpen,
      totalProfit,
      totalCost,
      profitMargin,
      profitGrowth: pctChange(totalProfit, priorProfit),
      totalCustomers,
      pendingOrders: pendingOrdersToday,
      pendingOrdersPeriod,
      pendingOrdersAllTime,
      unpaidOrdersPeriod,
      partialOrdersPeriod,
      unpaidOrdersToday,
      unpaidOrderValuePeriod: unpaidValuePeriodAgg[0]?.total ?? 0,
      unpaidOrderValueToday: unpaidValueTodayAgg[0]?.total ?? 0,
      ordersReceived,
      ordersDispatched,
      ordersDelivered,
      ordersReturned,
      courierSettled,
      deliveryRatio,
      returnRatio,
      recentOrders,
      orderStatusCounts,
      salesLast7Days: salesTrend,
      salesTrend,
      salesTrendTotal: Math.round(trendPaidTotal * 100) / 100,
      chartMode,
      lowStockProducts: lowStock,
      salesByCategory,
      paymentMethods,
      weekdayRevenueVsCost,
      insights,
    };

    if (!hasCapability(user, "canViewFinancials")) {
      stripFinancialDashboardData(data);
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Dashboard failed." },
      { status: 500 }
    );
  }
}
