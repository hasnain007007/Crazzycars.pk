import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Order from "@/lib/models/Order.model";

export async function GET(_req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;

    const order = await Order.findById(id)
      .select(
        "orderNumber pricing paymentStatus paymentMethod orderStatus createdAt customer.email items.productId items.quantity items.unitPrice items.total items.name"
      )
      .lean();

    if (!order) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const items = Array.isArray(order.items)
      ? order.items.map((it) => ({
          productId: it?.productId ? String(it.productId) : "",
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
        customer: { email: order.customer?.email || "" },
        items,
        total: Number(order?.pricing?.total ?? 0),
      },
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
