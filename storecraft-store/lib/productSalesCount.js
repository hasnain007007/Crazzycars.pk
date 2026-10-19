/**
 * Units of one product sold in the last N days, from real orders (cancelled / returned /
 * refunded excluded). Powers the "N sold in the last 30 days" line — never estimated.
 */
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import Order from "@/lib/models/Order.model";

const NOT_SOLD = ["cancelled", "returned", "refunded"];

export async function unitsSoldRecently(productId, days = 30) {
  if (!productId || !mongoose.isValidObjectId(String(productId))) return 0;
  try {
    await dbConnect();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const pid = new mongoose.Types.ObjectId(String(productId));
    const [row] = await Order.aggregate([
      { $match: { createdAt: { $gte: since }, orderStatus: { $nin: NOT_SOLD }, "items.productId": pid } },
      { $unwind: "$items" },
      { $match: { "items.productId": pid } },
      { $group: { _id: null, units: { $sum: { $ifNull: ["$items.quantity", 1] } } } },
    ]);
    return Number(row?.units) || 0;
  } catch (err) {
    console.error("[unitsSoldRecently]", err?.message || err);
    return 0;
  }
}
