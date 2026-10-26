/**
 * POST /api/orders/[id]/review-requested — record that the post-delivery review request was sent
 * on WhatsApp, so the order leaves the "Ask for reviews" queue.
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import Order from "@/lib/models/Order.model";

export async function POST(request, { params }) {
  if (!getRequestUser(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, error: "Invalid order id." }, { status: 400 });
  }
  await dbConnect();
  const res = await Order.updateOne({ _id: id }, { $set: { reviewRequestedAt: new Date() } });
  if (!res.matchedCount) {
    return NextResponse.json({ success: false, error: "Order not found." }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
