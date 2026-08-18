/**
 * Dashboard metrics with optional date range filter.
 * Extended for the modern ops dashboard (KPIs, category, payments, weekday, insights).
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import {
  buildChartBuckets,
  formatYmdUtc,
  resolveDashboardRange,
} from "@/lib/dashboardRanges";
import { karachiDayBounds, karachiDayKey, shiftDayKey } from "@/lib/karachiDay";
import Customer from "@/lib/models/Customer.model";
import DailyVisitor from "@/lib/models/DailyVisitor.model";
import Order from "@/lib/models/Order.model";
import Product from "@/lib/models/Product.model";
import { orderGrandTotal } from "@/lib/orderFormat";

const sumTotal = { $sum: { $ifNull: ["$pricing.total", { $ifNull: ["$total", 0] }] } };

function dateMatch(from, to) {
  if (!from && !to) return {};
  const createdAt = {};
  if (from) createdAt.$gte = from;
  if (to) createdAt.$lte = to;
  return { createdAt };
}

function pctChange(current, previous) {
  const c = Number(current) || 0;
  const p = Number(previous) || 0;
  if (p === 0) return c > 0 ? 100 : 0;
  return Math.round(((c - p) / p) * 1000) / 10;
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

function computeOrderProfit(order, costByProduct) {
  let profit = 0;
  let cost = 0;
  let sell = 0;
  for (const it of order.items || []) {
    const qty = Math.max(0, Number(it.quantity) || 0);
    const unitPrice = Math.max(0, Number(it.unitPrice) || 0);
    let unitCost = Number(it.unitCost);
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      unitCost = it.productId ? costByProduct.get(String(it.productId)) || 0 : 0;
    }
    sell += unitPrice * qty;
    cost += unitCost * qty;
    profit += (unitPrice - unitCost) * qty;
  }
  return { profit, cost, sell };
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
    // Month bounds in Pakistan time (YYYY-MM from todayKey)
    const [ty, tm] = todayKey.split("-").map(Number);
    const monthStart = new Date(`${ty}-${String(tm).padStart(2, "0")}-01T00:00:00+05:00`);
    const prevMonth = tm === 1 ? { y: ty - 1, m: 12 } : { y: ty, m: tm - 1 };
    const lastMonthStart = new Date(
      `${prevMonth.y}-${String(prevMonth.m).padStart(2, "0")}-01T00:00:00+05:00`
    );
    const lastMonthEnd = new Date(monthStart.getTime() - 1);

    const sellMatch = {
      ...period,
      orderStatus: { $nin: ["cancelled", "returned", "refunded"] },
    };
    const paidMatch = { ...period, paymentStatus: "paid" };

    const chartFrom =
      range.from ||
      (() => {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() - 29);
        return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      })();
    const chartTo = range.to || new Date();
    const { mode: chartMode, buckets } = buildChartBuckets(
      range.id === "all" ? chartFrom : range.from || chartFrom,
      range.id === "all" ? chartTo : range.to || chartTo
    );

    const [
      periodSalesAgg,
      periodOrdersCount,
      paidRevenueAgg,
      totalSellAgg,
      totalCustomers,
      pendingOrders,
      ordersReceived,
      ordersDispatched,
      ordersDelivered,
      ordersReturned,
      recentOrdersDocs,
      statusAgg,
      salesByDayAgg,
      lowStockProducts,
      profitOrders,
      todayPaidAgg,
      todayOrderCount,
      todayOrderValueAgg,
      yesterdayPaidAgg,
      yesterdayOrderCount,
      monthPaidAgg,
      lastMonthPaidAgg,
      paymentAgg,
      weekdayAgg,
      categoryOrders,
      todayVisitorCount,
      yesterdayVisitorCount,
    ] = await Promise.all([
      Order.aggregate([{ $match: paidMatch }, { $group: { _id: null, total: sumTotal } }]),
      Order.countDocuments(period),
      Order.aggregate([{ $match: paidMatch }, { $group: { _id: null, total: sumTotal } }]),
      Order.aggregate([{ $match: sellMatch }, { $group: { _id: null, total: sumTotal } }]),
      Customer.countDocuments(),
      Order.countDocuments({ orderStatus: "pending" }),
      Order.countDocuments(period),
      Order.countDocuments({ ...period, orderStatus: "shipped" }),
      Order.countDocuments({ ...period, orderStatus: "delivered" }),
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
            ...(range.from || range.to
              ? {
                  createdAt: {
                    ...(range.from ? { $gte: range.from } : {}),
                    ...(range.to ? { $lte: range.to } : {}),
                  },
                }
              : { createdAt: { $gte: chartFrom, $lte: chartTo } }),
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" },
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
      Order.find(sellMatch)
        .select("items.productId items.quantity items.unitPrice items.unitCost items.name")
        .lean(),
      Order.aggregate([
        {
          $match: {
            paymentStatus: "paid",
            createdAt: { $gte: todayStart, $lte: todayEnd },
          },
        },
        { $group: { _id: null, total: sumTotal } },
      ]),
      Order.countDocuments({ createdAt: { $gte: todayStart, $lte: todayEnd } }),
      Order.aggregate([
        {
          $match: { createdAt: { $gte: todayStart, $lte: todayEnd } },
        },
        { $group: { _id: null, total: sumTotal } },
      ]),
      Order.aggregate([
        {
          $match: {
            paymentStatus: "paid",
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
            createdAt: { $gte: monthStart, $lte: todayEnd },
          },
        },
        { $group: { _id: null, total: sumTotal } },
      ]),
      Order.aggregate([
        {
          $match: {
            paymentStatus: "paid",
            createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
          },
        },
        { $group: { _id: null, total: sumTotal } },
      ]),
      Order.aggregate([
        { $match: period },
        {
          $group: {
            _id: { $ifNull: ["$paymentMethod", "$payment.method"] },
            count: { $sum: 1 },
            total: sumTotal,
          },
        },
      ]),
      Order.aggregate([
        {
          $match: {
            paymentStatus: "paid",
            createdAt: {
              $gte: new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000),
              $lte: todayEnd,
            },
          },
        },
        {
          $group: {
            _id: { $dayOfWeek: "$createdAt" },
            revenue: sumTotal,
            cost: {
              $sum: {
                $reduce: {
                  input: { $ifNull: ["$items", []] },
                  initialValue: 0,
                  in: {
                    $add: [
                      "$$value",
                      {
                        $multiply: [
                          { $ifNull: ["$$this.quantity", 0] },
                          { $ifNull: ["$$this.unitCost", 0] },
                        ],
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      ]),
      Order.find(sellMatch)
        .select("items.productId items.quantity items.unitPrice items.name")
        .lean(),
      DailyVisitor.countDocuments({ dayKey: todayKey }),
      DailyVisitor.countDocuments({ dayKey: yesterdayKey }),
    ]);

    const periodSales = periodSalesAgg[0]?.total ?? 0;
    const totalRevenue = paidRevenueAgg[0]?.total ?? 0;
    const totalSell = totalSellAgg[0]?.total ?? 0;
    const calendarTodaySales = todayPaidAgg[0]?.total ?? 0;
    const todayOrderValue = todayOrderValueAgg[0]?.total ?? 0;
    const yesterdaySales = yesterdayPaidAgg[0]?.total ?? 0;
    const thisMonthRevenue = monthPaidAgg[0]?.total ?? 0;
    const lastMonthRevenue = lastMonthPaidAgg[0]?.total ?? 0;

    const productIds = new Set();
    for (const o of profitOrders) {
      for (const it of o.items || []) {
        if (it.productId) productIds.add(String(it.productId));
      }
    }
    for (const o of categoryOrders) {
      for (const it of o.items || []) {
        if (it.productId) productIds.add(String(it.productId));
      }
    }
    const costByProduct = new Map();
    const categoryByProduct = new Map();
    if (productIds.size) {
      const products = await Product.find({ _id: { $in: [...productIds] } })
        .select("pricing.costPerItem categories")
        .populate("categories", "name")
        .lean();
      for (const p of products) {
        costByProduct.set(String(p._id), Math.max(0, Number(p.pricing?.costPerItem) || 0));
        const catName = Array.isArray(p.categories) && p.categories[0]?.name
          ? p.categories[0].name
          : "Uncategorized";
        categoryByProduct.set(String(p._id), catName);
      }
    }

    let totalProfit = 0;
    let totalCost = 0;
    for (const o of profitOrders) {
      const { profit, cost } = computeOrderProfit(o, costByProduct);
      totalProfit += profit;
      totalCost += cost;
    }
    totalProfit = Math.round(totalProfit * 100) / 100;
    totalCost = Math.round(totalCost * 100) / 100;
    const profitMargin =
      totalSell > 0 ? Math.round((totalProfit / totalSell) * 1000) / 10 : 0;

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
        const cursor = new Date(b.from);
        while (cursor <= b.to) {
          rev += revenueByDay[formatYmdUtc(cursor)] ?? 0;
          cursor.setUTCDate(cursor.getUTCDate() + 1);
        }
        return { date: b.key, label: b.label, revenue: rev };
      });
    } else {
      const end = new Date();
      const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
      start.setUTCDate(start.getUTCDate() - 29);
      for (let i = 0; i < 30; i += 1) {
        const d = new Date(start);
        d.setUTCDate(d.getUTCDate() + i);
        const key = formatYmdUtc(d);
        salesTrend.push({
          date: key,
          label: d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
          revenue: revenueByDay[key] ?? 0,
        });
      }
    }

    // Mongo dayOfWeek: 1=Sun … 7=Sat → map to Mon–Sun chart
    const weekdayMap = { 2: 0, 3: 1, 4: 2, 5: 3, 6: 4, 7: 5, 1: 6 };
    const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const weekdayRevenueVsCost = weekdayLabels.map((label) => ({
      label,
      revenue: 0,
      cost: 0,
    }));
    for (const row of weekdayAgg) {
      const idx = weekdayMap[row._id];
      if (idx == null) continue;
      weekdayRevenueVsCost[idx].revenue = Math.round((Number(row.revenue) || 0) * 100) / 100;
      weekdayRevenueVsCost[idx].cost = Math.round((Number(row.cost) || 0) * 100) / 100;
    }

    // Payment methods
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

    // Sales by category
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

    // Business insights (simple heuristics)
    const insights = [];
    const bestWeekday = [...weekdayRevenueVsCost].sort((a, b) => b.revenue - a.revenue)[0];
    if (bestWeekday?.revenue > 0) {
      insights.push({
        icon: "bolt",
        text: `${bestWeekday.label} is your strongest day this week (avg Rs ${Math.round(bestWeekday.revenue).toLocaleString("en-PK")}). Consider promos on quieter days.`,
      });
    }
    if (profitMargin > 0) {
      insights.push({
        icon: "bolt",
        text: `Net margin is ${profitMargin}% on sell in this period. Keep cost-per-item updated for accurate profit.`,
      });
    }
    const codShare = paymentMethods.find((p) => p.key === "cod")?.percent || 0;
    if (codShare >= 40) {
      insights.push({
        icon: "bolt",
        text: `COD is ${codShare}% of orders. Nudge customers to JazzCash/Easypaisa to lower returns and collection delays.`,
      });
    }
    if (ordersReturned > 0 && ordersReceived > 0) {
      const retPct = Math.round((ordersReturned / ordersReceived) * 1000) / 10;
      insights.push({
        icon: "bolt",
        text: `Return rate is ${retPct}% in this period. Review returned SKUs and city patterns.`,
      });
    }
    if (!insights.length) {
      insights.push({
        icon: "bolt",
        text: "Keep adding orders and product costs — insights will appear as your data grows.",
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        range: {
          id: range.id,
          label: range.label,
          from: range.from ? range.from.toISOString() : null,
          to: range.to ? range.to.toISOString() : null,
        },
        periodSales,
        periodOrders: periodOrdersCount,
        todaySales: calendarTodaySales,
        todayOrders: todayOrderCount,
        todayOrderValue,
        todaySalesGrowth: pctChange(calendarTodaySales, yesterdaySales),
        todayOrdersGrowth: pctChange(todayOrderCount, yesterdayOrderCount),
        todayVisitors: todayVisitorCount,
        yesterdayVisitors: yesterdayVisitorCount,
        todayVisitorsGrowth: pctChange(todayVisitorCount, yesterdayVisitorCount),
        monthlyRevenue: thisMonthRevenue,
        lastMonthRevenue,
        monthlyGrowth: pctChange(thisMonthRevenue, lastMonthRevenue),
        timezone: "Asia/Karachi",
        todayKey,
        totalRevenue,
        totalSell,
        totalProfit,
        totalCost,
        profitMargin,
        profitGrowth: pctChange(totalProfit, lastMonthRevenue > 0 ? lastMonthRevenue * 0.25 : 0),
        totalCustomers,
        pendingOrders,
        ordersReceived,
        ordersDispatched,
        ordersDelivered,
        ordersReturned,
        recentOrders,
        orderStatusCounts,
        salesLast7Days: salesTrend,
        salesTrend,
        chartMode,
        lowStockProducts: lowStock,
        salesByCategory,
        paymentMethods,
        weekdayRevenueVsCost,
        insights,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Dashboard failed." },
      { status: 500 }
    );
  }
}
