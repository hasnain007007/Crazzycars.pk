import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import Customer from "@/lib/models/Customer.model";
import Order from "@/lib/models/Order.model";
import { orderGrandTotal } from "@/lib/orderFormat";
import { requestIp } from "@/lib/requestIp";

export async function GET(request, context) {
  try {
    if (!getRequestUser(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
    }
    await dbConnect();
    const customer = await Customer.findById(id).lean();
    if (!customer) {
      return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    }

    const oid = new mongoose.Types.ObjectId(id);
    const orders = await Order.find({
      $or: [{ "customer.customerId": oid }, { "customer.email": customer.email }],
    })
      .sort({ createdAt: -1 })
      .select("orderNumber createdAt orderStatus paymentStatus pricing total items.quantity")
      .lean();

    let totalSpent = 0;
    let paidCount = 0;
    for (const o of orders) {
      const t = orderGrandTotal(o);
      totalSpent += t;
      if (o.paymentStatus === "paid" || o.paymentStatus === "partial") paidCount += 1;
    }
    const avgOrder = orders.length ? totalSpent / orders.length : 0;
    const lastOrder = orders[0]?.createdAt || null;

    const orderRows = orders.map((o) => ({
      id: o._id.toString(),
      orderNumber: o.orderNumber,
      createdAt: o.createdAt,
      total: orderGrandTotal(o),
      orderStatus: o.orderStatus,
      paymentStatus: o.paymentStatus,
      itemCount: Array.isArray(o.items) ? o.items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0) : 0,
    }));

    return NextResponse.json({
      success: true,
      customer: {
        id: customer._id.toString(),
        name: customer.name,
        email: customer.email,
        phone: customer.phone || "",
        address: customer.address || {},
        status: customer.status || "active",
        isActive: customer.isActive !== false,
        joinedAt: customer.createdAt,
      },
      stats: {
        totalOrders: orders.length,
        totalSpent: Math.round(totalSpent * 100) / 100,
        avgOrderValue: Math.round(avgOrder * 100) / 100,
        lastOrderDate: lastOrder,
      },
      orders: orderRows,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load customer." },
      { status: 500 }
    );
  }
}

export async function PUT(request, context) {
  try {
    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
    }
    await dbConnect();
    const existing = await Customer.findById(id).lean();
    if (!existing) {
      return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const updateData = {};

    if (body.status !== undefined) {
      if (!["active", "blocked", "inactive"].includes(body.status)) {
        return NextResponse.json({ success: false, error: "Invalid status." }, { status: 400 });
      }
      updateData.status = body.status;
    }
    if (body.isActive !== undefined) {
      updateData.isActive = Boolean(body.isActive);
    }
    if (body.firstName !== undefined) updateData.firstName = String(body.firstName).trim();
    if (body.lastName !== undefined) updateData.lastName = String(body.lastName).trim();
    if (body.email !== undefined) updateData.email = String(body.email).trim().toLowerCase();
    if (body.phone !== undefined) updateData.phone = String(body.phone).trim();

    if (body.status !== undefined && body.isActive === undefined) {
      updateData.isActive = body.status === "active";
    }
    if (body.isActive !== undefined && body.status === undefined) {
      updateData.status = body.isActive ? "active" : "blocked";
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, error: "No valid fields to update." }, { status: 400 });
    }

    const customer = await Customer.findByIdAndUpdate(id, { $set: updateData }, { new: true }).lean();
    if (!customer) {
      return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    }

    if (updateData.status !== undefined || updateData.isActive !== undefined) {
      await logActivity({
        user: user.userId,
        userName: user.name || "Admin",
        action: `Customer ${customer.email} updated (status: ${customer.status}, isActive: ${customer.isActive})`,
        resource: "Customer",
        resourceId: id,
        details: { status: customer.status, isActive: customer.isActive },
        type: "customer",
        ip: requestIp(request),
      });
    }

    return NextResponse.json({ success: true, customer });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Update failed." },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
  try {
    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
    }
    await dbConnect();
    const doc = await Customer.findById(id).lean();
    if (!doc) {
      return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    }

    await Customer.deleteOne({ _id: id });

    await logActivity({
      user: user.userId,
      userName: user.name || "Admin",
      action: `Customer deleted: ${doc.email || doc.name || id}`,
      resource: "Customer",
      resourceId: id,
      details: {
        email: doc.email || "",
        name: doc.name || "",
      },
      type: "delete",
      ip: requestIp(request),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Delete failed." },
      { status: 500 }
    );
  }
}
