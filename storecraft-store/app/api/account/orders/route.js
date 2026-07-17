import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Order from "@/lib/models/Order.model";
import { orderGrandTotal } from "@/lib/orderFormat";
import { readStoreCustomerTokenFromRequest } from "@/lib/storeAuth";

export async function GET(request) {
  try {
    const session = readStoreCustomerTokenFromRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();
    const rows = await Order.find({ "customer.customerId": session.customerId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const orders = rows.map((o) => ({
      id: o._id.toString(),
      orderNumber: o.orderNumber,
      createdAt: o.createdAt,
      orderStatus: o.orderStatus,
      paymentStatus: o.paymentStatus,
      total: orderGrandTotal(o),
    }));

    return NextResponse.json({ success: true, orders });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Failed." }, { status: 500 });
  }
}
