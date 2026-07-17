import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import Order from "@/lib/models/Order.model";
import { orderGrandTotal, orderPricing } from "@/lib/orderFormat";
import { readStoreCustomerTokenFromRequest } from "@/lib/storeAuth";

export async function GET(request, context) {
  try {
    const session = readStoreCustomerTokenFromRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid order" }, { status: 400 });
    }

    await dbConnect();
    const o = await Order.findOne({
      _id: id,
      "customer.customerId": session.customerId,
    }).lean();

    if (!o) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      order: {
        id: o._id.toString(),
        orderNumber: o.orderNumber,
        status: o.orderStatus,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        total: orderGrandTotal(o),
        pricing: orderPricing(o),
        items: o.items || [],
        createdAt: o.createdAt,
        shippingAddress: o.shippingAddress || {},
        tracking: o.tracking || {},
        timeline: o.timeline || [],
        currency: o.currency || "PKR",
      },
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Failed" }, { status: 500 });
  }
}
