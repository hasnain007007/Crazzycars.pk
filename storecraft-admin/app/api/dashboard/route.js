/**
 * Dashboard metrics with optional date range filter.
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import {
  buildChartBuckets,
  formatYmdUtc,
  resolveDashboardRange,
} from "@/lib/dashboardRanges";
import Customer from "@/lib/models/Customer.model";
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
              : {
                  createdAt: { $gte: chartFrom, $lte: chartTo },
                }),
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
                timezone: "UTC",
              },
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
      Order.find(sellMatch).select("items.productId items.quantity items.unitPrice items.unitCost").lean(),
    ]);

    const periodSales = periodSalesAgg[0]?.total ?? 0;
    const totalRevenue = paidRevenueAgg[0]?.total ?? 0;
    const totalSell = totalSellAgg[0]?.total ?? 0;

    const productIds = new Set();
    for (const o of profitOrders) {
      for (const it of o.items || []) {
        if (it.productId) productIds.add(String(it.productId));
      }
    }
    const costByProduct = new Map();
    if (productIds.size) {
      const products = await Product.find({ _id: { $in: [...productIds] } })
        .select("pricing.costPerItem")
        .lean();
      for (const p of products) {
        costByProduct.set(String(p._id), Math.max(0, Number(p.pricing?.costPerItem) || 0));
      }
    }

    let totalProfit = 0;
    for (const o of profitOrders) {
      for (const it of o.items || []) {
        const qty = Math.max(0, Number(it.quantity) || 0);
        const unitPrice = Math.max(0, Number(it.unitPrice) || 0);
        let unitCost = Number(it.unitCost);
        if (!Number.isFinite(unitCost) || unitCost < 0) {
          unitCost = it.productId ? costByProduct.get(String(it.productId)) || 0 : 0;
        }
        totalProfit += (unitPrice - unitCost) * qty;
      }
    }
    totalProfit = Math.round(totalProfit * 100) / 100;

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
      // all-time fallback: last 30 days
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

    const recentOrders = recentOrdersDocs.map((o) => ({
      id: o._id.toString(),
      orderNumber: o.orderNumber,
      customerName: o.customer?.name || o.customer?.customerId?.name || "Guest",
      total: orderGrandTotal(o),
      status: o.orderStatus,
      date: o.createdAt,
    }));

    const lowStock = lowStockProducts.map((p) => ({
      id: p._id.toString(),
      name: p.name,
      quantity: p.inventory?.quantity ?? 0,
      threshold: p.inventory?.lowStockThreshold ?? 5,
    }));

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
        todaySales: periodSales,
        todayOrders: periodOrdersCount,
        totalRevenue,
        totalSell,
        totalProfit,
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
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Dashboard failed." },
      { status: 500 }
    );
  }
}
