import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessMinRole } from "@/lib/requireRole";
import Coupon from "@/lib/models/Coupon.model";
import Order from "@/lib/models/Order.model";
import { requestIp } from "@/lib/requestIp";

function displayStatus(doc) {
  if (doc.status === "inactive") return "inactive";
  if (doc.expiryDate && new Date(doc.expiryDate) < new Date()) return "expired";
  const lim = Number(doc.usageLimit) || 0;
  if (lim > 0 && (doc.usedCount || 0) >= lim) return "expired";
  return "active";
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request) {
  try {
    if (!getRequestUser(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const filterParam = (searchParams.get("filter") || "all").trim();
    const search = (searchParams.get("search") || "").trim();

    const filter = {};
    if (search) filter.code = new RegExp(escapeRegex(search), "i");

    const docs = await Coupon.find(filter).sort({ createdAt: -1 }).populate("categoryIds", "name slug").lean();

    const startDay = new Date();
    startDay.setUTCHours(0, 0, 0, 0);
    const usedToday = await Order.countDocuments({
      couponCode: { $nin: ["", null] },
      createdAt: { $gte: startDay },
    });

    let rows = docs.map((d) => ({
      id: d._id.toString(),
      code: d.code,
      discountType: d.discountType,
      discountValue: d.discountValue,
      minOrderAmount: d.minOrderAmount,
      maxDiscount: d.maxDiscount,
      usageLimit: d.usageLimit,
      usedCount: d.usedCount || 0,
      expiryDate: d.expiryDate,
      status: d.status,
      appliesTo: d.appliesTo,
      categoryIds: (d.categoryIds || []).map((c) => (typeof c === "object" && c?._id ? c._id.toString() : String(c))),
      categories: (d.categoryIds || [])
        .map((c) => (typeof c === "object" && c?.name ? c.name : ""))
        .filter(Boolean),
      displayStatus: displayStatus(d),
      updatedAt: d.updatedAt,
    }));

    if (filterParam === "active") rows = rows.filter((r) => r.displayStatus === "active");
    if (filterParam === "expired") rows = rows.filter((r) => r.displayStatus === "expired");

    const all = await Coupon.find({}).lean();
    const total = all.length;
    const activeN = all.filter((d) => displayStatus(d) === "active").length;
    const expiredN = all.filter((d) => displayStatus(d) === "expired").length;

    return NextResponse.json({
      success: true,
      coupons: rows,
      stats: { total, active: activeN, expired: expiredN, usedToday },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load coupons." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessMinRole(user, "editor");
    if (denied) return denied;
    await dbConnect();
    const body = await request.json();

    const code = String(body.code || "")
      .trim()
      .toUpperCase();
    if (!code) {
      return NextResponse.json({ success: false, error: "Code is required." }, { status: 400 });
    }
    const discountType = body.discountType === "fixed" ? "fixed" : "percentage";
    const discountValue = Number(body.discountValue);
    if (!Number.isFinite(discountValue) || discountValue < 0) {
      return NextResponse.json({ success: false, error: "Invalid discount value." }, { status: 400 });
    }

    const doc = await Coupon.create({
      code,
      discountType,
      discountValue,
      minOrderAmount: Math.max(0, Number(body.minOrderAmount) || 0),
      maxDiscount: Math.max(0, Number(body.maxDiscount) || 0),
      usageLimit: Math.max(0, parseInt(body.usageLimit, 10) || 0),
      usedCount: 0,
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
      status: body.status === "inactive" ? "inactive" : "active",
      appliesTo: body.appliesTo === "categories" ? "categories" : "all",
      categoryIds: Array.isArray(body.categoryIds)
        ? body.categoryIds.filter((id) => mongoose.Types.ObjectId.isValid(id))
        : [],
    });

    await logActivity({
      user: user.userId,
      userName: user.name || "Admin",
      action: `Coupon created: ${doc.code}`,
      resource: "Coupon",
      resourceId: doc._id.toString(),
      type: "coupon",
      ip: requestIp(request),
    });

    const lean = await Coupon.findById(doc._id).populate("categoryIds", "name").lean();
    return NextResponse.json({ success: true, coupon: lean });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json({ success: false, error: "Code already exists." }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: error.message || "Create failed." },
      { status: 500 }
    );
  }
}
