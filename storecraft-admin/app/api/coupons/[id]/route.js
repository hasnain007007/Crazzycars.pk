import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import Coupon from "@/lib/models/Coupon.model";
import { requestIp } from "@/lib/requestIp";

export async function GET(request, context) {
  try {
    if (!getRequestUser(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
    }
    await dbConnect();
    const doc = await Coupon.findById(id).populate("categoryIds", "name slug").lean();
    if (!doc) return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    return NextResponse.json({ success: true, coupon: doc });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load coupon." },
      { status: 500 }
    );
  }
}

export async function PUT(request, context) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessCapability(user, "canManageCoupons");
    if (denied) return denied;
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
    }
    await dbConnect();
    const doc = await Coupon.findById(id);
    if (!doc) return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });

    const body = await request.json();
    if (body.code !== undefined) doc.code = String(body.code).trim().toUpperCase();
    if (body.discountType !== undefined) doc.discountType = body.discountType === "fixed" ? "fixed" : "percentage";
    if (body.discountValue !== undefined) doc.discountValue = Math.max(0, Number(body.discountValue) || 0);
    if (body.minOrderAmount !== undefined) doc.minOrderAmount = Math.max(0, Number(body.minOrderAmount) || 0);
    if (body.maxDiscount !== undefined) doc.maxDiscount = Math.max(0, Number(body.maxDiscount) || 0);
    if (body.usageLimit !== undefined) doc.usageLimit = Math.max(0, parseInt(body.usageLimit, 10) || 0);
    if (body.usedCount !== undefined) doc.usedCount = Math.max(0, parseInt(body.usedCount, 10) || 0);
    if (body.expiryDate !== undefined) doc.expiryDate = body.expiryDate ? new Date(body.expiryDate) : null;
    if (body.status !== undefined) doc.status = body.status === "inactive" ? "inactive" : "active";
    if (body.appliesTo !== undefined) doc.appliesTo = body.appliesTo === "categories" ? "categories" : "all";
    if (body.categoryIds !== undefined) {
      doc.categoryIds = Array.isArray(body.categoryIds)
        ? body.categoryIds.filter((x) => mongoose.Types.ObjectId.isValid(x))
        : [];
    }

    await doc.save();
    await logActivity({
      user: user.userId,
      userName: user.name || "Admin",
      action: `Coupon updated: ${doc.code}`,
      resource: "Coupon",
      resourceId: id,
      type: "coupon",
      ip: requestIp(request),
    });
    const lean = await Coupon.findById(id).populate("categoryIds", "name").lean();
    return NextResponse.json({ success: true, coupon: lean });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json({ success: false, error: "Code already exists." }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: error.message || "Update failed." },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessCapability(user, "canManageCoupons");
    if (denied) return denied;
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
    }
    await dbConnect();
    const doc = await Coupon.findById(id);
    if (!doc) return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    const code = doc.code;
    await Coupon.deleteOne({ _id: id });
    await logActivity({
      user: user.userId,
      userName: user.name || "Admin",
      action: `Coupon deleted: ${code}`,
      resource: "Coupon",
      resourceId: id,
      type: "delete",
      ip: requestIp(request),
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Delete failed." },
      { status: 500 }
    );
  }
}
