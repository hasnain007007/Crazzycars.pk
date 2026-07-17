import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Order from "@/lib/models/Order.model";

export async function GET(_req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;

    const order = await Order.findById(id)
      .select("orderNumber pricing paymentStatus paymentMethod orderStatus createdAt customer.email")
      .lean();

    if (!order) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      order: {
        ...JSON.parse(JSON.stringify(order)),
        total: Number(order?.pricing?.total ?? 0),
      },
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
