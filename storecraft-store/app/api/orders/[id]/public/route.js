import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import Order from "@/lib/models/Order.model";

/**
 * Guest success-page order summary.
 * Requires `?t=` matching order.publicAccessToken when the order has a token
 * (all new checkouts). Legacy orders without a token return 404 to avoid IDOR.
 * Never returns customer email/phone/address.
 */
export async function GET(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const token = String(new URL(req.url).searchParams.get("t") || "").trim();

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const order = await Order.findById(id)
      .select(
        "orderNumber publicAccessToken pricing paymentStatus paymentMethod orderStatus createdAt items.productId items.articleNo items.quantity items.unitPrice items.total items.name payment.advanceRequired payment.advanceMode payment.advanceMaxPercent payment.remainingCod"
      )
      .lean();

    if (!order) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const stored = String(order.publicAccessToken || "").trim();
    if (!stored || !token || token !== stored) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const items = Array.isArray(order.items)
      ? order.items.map((it) => ({
          productId: it?.productId ? String(it.productId) : "",
          articleNo: String(it?.articleNo || "").trim(),
          name: String(it?.name || ""),
          quantity: Math.max(1, Number(it?.quantity) || 1),
          unitPrice: Math.max(0, Number(it?.unitPrice) || 0),
          total: Math.max(0, Number(it?.total) || 0),
        }))
      : [];

    return NextResponse.json({
      success: true,
      order: {
        _id: String(order._id),
        orderNumber: order.orderNumber,
        pricing: order.pricing,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        orderStatus: order.orderStatus,
        createdAt: order.createdAt,
        payment: {
          advanceRequired: Number(order.payment?.advanceRequired) || 0,
          advanceMode: String(order.payment?.advanceMode || ""),
          advanceMaxPercent: Number(order.payment?.advanceMaxPercent) || 0,
          remainingCod: Number(order.payment?.remainingCod) || 0,
        },
        items,
        total: Number(order?.pricing?.total ?? 0),
      },
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
