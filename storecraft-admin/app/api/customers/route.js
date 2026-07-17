/**
 * Customer list with stats, search, status filter, pagination.
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import Customer from "@/lib/models/Customer.model";

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function monthStartUtc() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

export async function GET(request) {
  try {
    if (!getRequestUser(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit"), 10) || 20));
    const search = (searchParams.get("search") || "").trim();
    const status = (searchParams.get("status") || "all").trim();

    const filter = {};
    const clauses = [];

    if (status === "active") {
      clauses.push({ $nor: [{ status: "blocked" }, { status: "inactive" }, { isActive: false }] });
    }
    if (status === "blocked") {
      clauses.push({ $or: [{ status: "blocked" }, { status: "inactive" }, { isActive: false }] });
    }
    if (search) {
      const rx = new RegExp(escapeRegex(search), "i");
      clauses.push({ $or: [{ name: rx }, { email: rx }, { phone: rx }] });
    }
    if (clauses.length === 1) {
      Object.assign(filter, clauses[0]);
    } else if (clauses.length > 1) {
      filter.$and = clauses;
    }

    const skip = (page - 1) * limit;
    const m0 = monthStartUtc();

    const [rows, total, totalCustomers, activeCount, blockedCount, newMonth] = await Promise.all([
      Customer.aggregate([
        { $match: filter },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: "orders",
            let: { cid: "$_id", email: "$email" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $or: [{ $eq: ["$customer.customerId", "$$cid"] }, { $eq: ["$customer.email", "$$email"] }],
                  },
                },
              },
              {
                $group: {
                  _id: null,
                  orders: { $sum: 1 },
                  spent: {
                    $sum: { $ifNull: ["$pricing.total", { $ifNull: ["$total", 0] }] },
                  },
                },
              },
            ],
            as: "agg",
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            email: 1,
            phone: 1,
            status: 1,
            isActive: 1,
            createdAt: 1,
            address: 1,
            orderCount: { $ifNull: [{ $arrayElemAt: ["$agg.orders", 0] }, 0] },
            totalSpent: { $ifNull: [{ $arrayElemAt: ["$agg.spent", 0] }, 0] },
          },
        },
      ]),
      Customer.countDocuments(filter),
      Customer.countDocuments({}),
      Customer.countDocuments({
        $nor: [{ status: "blocked" }, { status: "inactive" }, { isActive: false }],
      }),
      Customer.countDocuments({
        $or: [{ status: "blocked" }, { status: "inactive" }, { isActive: false }],
      }),
      Customer.countDocuments({ createdAt: { $gte: m0 } }),
    ]);

    const customers = rows.map((c) => {
      const blocked =
        c.status === "blocked" || c.status === "inactive" || c.isActive === false;
      return {
        id: c._id.toString(),
        name: c.name,
        email: c.email,
        phone: c.phone || "",
        orderCount: c.orderCount,
        totalSpent: Math.round(c.totalSpent * 100) / 100,
        status: blocked ? "blocked" : "active",
        joinedAt: c.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      customers,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      stats: {
        total: totalCustomers,
        active: activeCount,
        blocked: blockedCount,
        newThisMonth: newMonth,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load customers." },
      { status: 500 }
    );
  }
}
