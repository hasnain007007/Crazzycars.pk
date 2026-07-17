import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Order from "@/lib/models/Order.model";
import { orderGrandTotal } from "@/lib/orderFormat";
import { readStoreCustomerTokenFromRequest } from "@/lib/storeAuth";

export async function GET(req) {
  try {
    const session = readStoreCustomerTokenFromRequest(req);
    if (!session) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    await dbConnect();

    const rows = await Order.find({ "customer.customerId": session.customerId })
      .select(
        "orderNumber orderStatus paymentStatus pricing items createdAt shippingAddress timeline trackingNumber courier trackingUrl tracking"
      )
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({
      success: true,
      orders: rows.map((o) => ({
        id: o._id.toString(),
        orderNumber: o.orderNumber,
        status: o.orderStatus,
        paymentStatus: o.paymentStatus,
        total: orderGrandTotal(o),
        itemCount: o.items?.length || 0,
        items: (o.items || []).slice(0, 3),
        createdAt: o.createdAt,
        shippingAddress: o.shippingAddress,
        trackingNumber: o.trackingNumber || o.tracking?.number || "",
        courier: o.courier || o.tracking?.carrier || "",
        trackingUrl: o.trackingUrl || o.tracking?.url || "",
      })),
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Failed" }, { status: 500 });
  }
}
