/**
 * Sales report: summary, revenue by day, by category, top product.
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import Order from "@/lib/models/Order.model";

function parseRange(fromStr, toStr) {
  const now = new Date();
  const ts = toStr ? String(toStr).trim() : "";
  const fs = fromStr ? String(fromStr).trim() : "";

  let to = now;
  if (ts && /^\d{4}-\d{2}-\d{2}$/.test(ts)) {
    to = new Date(`${ts}T23:59:59.999Z`);
  } else if (ts) {
    const d = new Date(ts);
    if (!Number.isNaN(d.getTime())) to = d;
  }

  let from = null;
  if (fs && /^\d{4}-\d{2}-\d{2}$/.test(fs)) {
    from = new Date(`${fs}T00:00:00.000Z`);
  } else if (fs) {
    const d = new Date(fs);
    if (!Number.isNaN(d.getTime())) from = d;
  }
  if (!from || Number.isNaN(from.getTime())) {
    from = new Date(to);
    from.setUTCDate(from.getUTCDate() - 30);
    from.setUTCHours(0, 0, 0, 0);
  }
  return { from, to };
}

export async function GET(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessCapability(user, "canViewFinancials");
    if (denied) return denied;
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const status = (searchParams.get("status") || "all").trim();
    const { from, to } = parseRange(searchParams.get("from"), searchParams.get("to"));

    const match = { createdAt: { $gte: from, $lte: to } };
    if (status !== "all") {
      match.orderStatus = status;
    }

    const [summaryAgg, byDay, byCategory, topAgg] = await Promise.all([
      Order.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$pricing.total" },
            totalOrders: { $sum: 1 },
          },
        },
      ]),
      Order.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } },
            revenue: { $sum: "$pricing.total" },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        { $match: match },
        { $unwind: "$items" },
        {
          $lookup: {
            from: "products",
            localField: "items.productId",
            foreignField: "_id",
            as: "prod",
          },
        },
        { $unwind: { path: "$prod", preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            firstCat: { $arrayElemAt: ["$prod.categories", 0] },
          },
        },
        {
          $lookup: {
            from: "categories",
            localField: "firstCat",
            foreignField: "_id",
            as: "cat",
          },
        },
        { $unwind: { path: "$cat", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: { $ifNull: ["$cat.name", "Uncategorized"] },
            revenue: { $sum: "$items.total" },
            count: { $sum: "$items.quantity" },
          },
        },
        { $sort: { revenue: -1 } },
      ]),
      Order.aggregate([
        { $match: match },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.name",
            revenue: { $sum: "$items.total" },
            count: { $sum: "$items.quantity" },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 1 },
      ]),
    ]);

    const s = summaryAgg[0] || {};
    const totalRevenue = Number(s.totalRevenue) || 0;
    const totalOrders = Number(s.totalOrders) || 0;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const top = topAgg[0];
    const topProduct = top
      ? { name: top._id || "—", revenue: Number(top.revenue) || 0, count: Number(top.count) || 0 }
      : { name: "—", revenue: 0, count: 0 };

    const byDayOut = byDay.map((d) => ({
      date: d._id,
      orders: d.orders || 0,
      revenue: Number(d.revenue) || 0,
      avg: d.orders > 0 ? (Number(d.revenue) || 0) / d.orders : 0,
    }));

    const byCategoryOut = byCategory.map((c) => ({
      name: c._id || "Uncategorized",
      revenue: Number(c.revenue) || 0,
      count: Number(c.count) || 0,
    }));

    return NextResponse.json({
      success: true,
      summary: {
        totalRevenue,
        totalOrders,
        avgOrderValue,
        topProduct,
      },
      byDay: byDayOut,
      byCategory: byCategoryOut,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Sales report failed." },
      { status: 500 }
    );
  }
}
