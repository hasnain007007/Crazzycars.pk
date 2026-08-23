import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import Coupon from "@/lib/models/Coupon.model";
import { computeCouponDiscount } from "@/lib/couponCompute";

export async function POST(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessCapability(user, "canManageCoupons");
    if (denied) return denied;
    await dbConnect();
    const { code, orderAmount, categoryIds } = await request.json();
    const amt = Number(orderAmount);
    if (!Number.isFinite(amt) || amt < 0) {
      return NextResponse.json({ success: false, error: "Invalid order amount." }, { status: 400 });
    }
    const c = await Coupon.findOne({
      code: String(code || "")
        .trim()
        .toUpperCase(),
    }).lean();
    if (!c) {
      return NextResponse.json({ success: true, valid: false, discount: 0, message: "Coupon not found." });
    }
    const result = computeCouponDiscount(c, amt, Array.isArray(categoryIds) ? categoryIds : []);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Validation failed." },
      { status: 500 }
    );
  }
}
