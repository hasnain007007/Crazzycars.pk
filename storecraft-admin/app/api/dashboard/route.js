/**
 * Dashboard metrics: KPIs, charts data, recent orders, low-stock products.
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import Customer from "@/lib/models/Customer.model";
import Order from "@/lib/models/Order.model";
import Product from "@/lib/models/Product.model";
import { orderGrandTotal } from "@/lib/orderFormat";

const sumTotal = { $sum: { $ifNull: ["$pricing.total", { $ifNull: ["$total", 0] }] } };

function utcStartOfDay(d) {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0)
  );
}

function utcEndOfDay(d) {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999)
  );
}

function formatYmdUtc(d) {
  return d.toISOString().slice(0, 10);
}

export async function GET(request) {
  try {
    if (!getRequestUser(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const now = new Date();
    const dayStart = utcStartOfDay(now);
    const dayEnd = utcEndOfDay(now);

    const sevenDaysStart = utcStartOfDay(now);
    sevenDaysStart.setUTCDate(sevenDaysStart.getUTCDate() - 6);

    const [
      todaySalesAgg,
      todayOrdersCount,
      totalRevenueAgg,
      totalCustomers,
      pendingOrders,
      recentOrdersDocs,
      statusAgg,
      salesByDayAgg,
      lowStockProducts,
    ] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            paymentStatus: "paid",
            createdAt: { $gte: dayStart, $lte: dayEnd },
          },
        },
        { $group: { _id: null, total: sumTotal } },
      ]),
      Order.countDocuments({
        createdAt: { $gte: dayStart, $lte: dayEnd },
      }),
      Order.aggregate([
        { $match: { paymentStatus: "paid" } },
        { $group: { _id: null, total: sumTotal } },
      ]),
      Customer.countDocuments(),
      Order.countDocuments({ orderStatus: "pending" }),
      Order.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("customer.customerId", "name email")
        .lean(),
      Order.aggregate([
        {
          $group: {
            _id: "$orderStatus",
            count: { $sum: 1 },
          },
        },
      ]),
      Order.aggregate([
        {
          $match: {
            paymentStatus: "paid",
            createdAt: { $gte: sevenDaysStart },
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
          $lte: [
            "$inventory.quantity",
            { $ifNull: ["$inventory.lowStockThreshold", 5] },
          ],
        },
      })
        .select("name inventory.quantity inventory.lowStockThreshold")
        .lean(),
    ]);

    const todaySales = todaySalesAgg[0]?.total ?? 0;
    const totalRevenue = totalRevenueAgg[0]?.total ?? 0;

    const orderStatusCounts = {
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      refunded: 0,
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

    const salesLast7Days = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(dayStart);
      d.setUTCDate(d.getUTCDate() - i);
      const key = formatYmdUtc(d);
      salesLast7Days.push({
        date: key,
        label: d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        }),
        revenue: revenueByDay[key] ?? 0,
      });
    }

    const recentOrders = recentOrdersDocs.map((o) => ({
      id: o._id.toString(),
      orderNumber: o.orderNumber,
      customerName:
        o.customer?.name || o.customer?.customerId?.name || "Guest",
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
        todaySales,
        todayOrders: todayOrdersCount,
        totalRevenue,
        totalCustomers,
        pendingOrders,
        recentOrders,
        orderStatusCounts,
        salesLast7Days,
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
