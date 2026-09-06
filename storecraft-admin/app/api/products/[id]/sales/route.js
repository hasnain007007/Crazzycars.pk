/**
 * Product sales: qty sold, revenue, customers who ordered this product.
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import { hasCapability } from "@/lib/permissions";
import Product from "@/lib/models/Product.model";
import { getProductSalesSummary } from "@/lib/productSales";

export async function GET(request, context) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessCapability(user, "canViewOrders");
    if (denied) return denied;

    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
    }

    await dbConnect();
    const product = await Product.findById(id).select("name articleNo slug").lean();
    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found." }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const summary = await getProductSalesSummary(id, {
      articleNo: product.articleNo || "",
      limitCustomers: Math.min(200, Math.max(1, parseInt(searchParams.get("customers"), 10) || 50)),
      limitOrders: Math.min(100, Math.max(1, parseInt(searchParams.get("orders"), 10) || 30)),
    });

    const showMoney = hasCapability(user, "canViewFinancials");
    const customers = (summary.customers || []).map((c) => ({
      key: c.key,
      name: c.name,
      email: c.email,
      phone: c.phone,
      customerId: c.customerId,
      orderCount: c.orderCount,
      qtyBought: c.qtyBought,
      lastOrderAt: c.lastOrderAt,
      ...(showMoney ? { revenue: c.revenue } : {}),
      orders: (c.orders || []).map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        createdAt: o.createdAt,
        orderStatus: o.orderStatus,
        paymentStatus: o.paymentStatus,
        qty: o.qty,
        ...(showMoney ? { revenue: o.revenue } : {}),
      })),
    }));

    const recentOrders = (summary.recentOrders || []).map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      createdAt: o.createdAt,
      orderStatus: o.orderStatus,
      paymentStatus: o.paymentStatus,
      qty: o.qty,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      customerEmail: o.customerEmail,
      ...(showMoney ? { revenue: o.revenue } : {}),
    }));

    return NextResponse.json({
      success: true,
      product: {
        id: String(product._id),
        name: product.name || "",
        slug: product.slug || "",
        articleNo: product.articleNo || "",
      },
      qtySold: summary.qtySold,
      orderCount: summary.orderCount,
      customerCount: summary.customerCount,
      ...(showMoney ? { revenue: summary.revenue } : {}),
      showRevenue: showMoney,
      customers,
      recentOrders,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load product sales." },
      { status: 500 }
    );
  }
}
