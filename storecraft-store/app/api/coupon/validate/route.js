import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Coupon from "@/lib/models/Coupon.model";
import { computeCouponDiscount } from "@/lib/couponCompute";

/** Public coupon check for storefront checkout (no admin JWT). */
export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json().catch(() => ({}));
    const amt = Number(body.orderAmount);
    if (!Number.isFinite(amt) || amt < 0) {
      return NextResponse.json({ success: false, error: "Invalid order amount." }, { status: 400 });
    }
    const c = await Coupon.findOne({
      code: String(body.code || "")
        .trim()
        .toUpperCase(),
    }).lean();
    if (!c) {
      return NextResponse.json({ success: true, valid: false, discount: 0, message: "Coupon not found." });
    }
    const result = computeCouponDiscount(c, amt, Array.isArray(body.categoryIds) ? body.categoryIds : []);
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Validation failed." }, { status: 500 });
  }
}
