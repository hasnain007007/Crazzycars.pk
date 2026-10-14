import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Order from "@/lib/models/Order.model";
import { EXPORTABLE_ORDER_FILTER, FEED_PROJECTION, requireKey, toOrderHubOrder } from "@/lib/orderhub";

export const dynamic = "force-dynamic";

/**
 * Order Hub feed (read-only). Includes where each order came from (origin).
 * GET ?updated_after=<ISO>&page=<n>&limit=<1-100>  Authorization: Bearer ORDERHUB_PULL_TOKEN
 */
export async function GET(req) {
  const denied = requireKey(req, "read");
  if (denied) return denied;
  try {
    const { searchParams } = new URL(req.url);
    const after = new Date(searchParams.get("updated_after") || 0);
    const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get("limit"), 10) || 100));
    const page = Math.max(1, Number.parseInt(searchParams.get("page"), 10) || 1);
    await dbConnect();
    const orders = await Order.find({
      $and: [{ updatedAt: { $gte: Number.isNaN(after.getTime()) ? new Date(0) : after } }, EXPORTABLE_ORDER_FILTER],
    })
      .sort({ updatedAt: 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit + 1)
      .select(FEED_PROJECTION)
      .lean();
    return NextResponse.json(
      { orders: orders.slice(0, limit).map(toOrderHubOrder), has_more: orders.length > limit },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("[internal/orderhub/orders]", e);
    return NextResponse.json({ error: "Order export failed" }, { status: 500 });
  }
}
