/**
 * Homepage best sellers — ranked by units actually sold (last 90 days, excluding cancelled /
 * returned / refunded orders), topped up with products marked Featured in admin.
 * `excludeIds` keeps products already shown in Hot Deals out, so the two rows never repeat.
 */
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import Order from "@/lib/models/Order.model";
import Product from "@/lib/models/Product.model";
import { serializeStoreProductSummary } from "@/lib/storeSerialize";
import { PRODUCT_CARD_SELECT } from "@/lib/serverProductFetch";

const SALES_WINDOW_DAYS = 90;
const NOT_SOLD = ["cancelled", "returned", "refunded"];

async function topSoldProductIds(limit) {
  const since = new Date(Date.now() - SALES_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const rows = await Order.aggregate([
    { $match: { createdAt: { $gte: since }, orderStatus: { $nin: NOT_SOLD } } },
    { $unwind: "$items" },
    { $match: { "items.productId": { $ne: null } } },
    { $group: { _id: "$items.productId", units: { $sum: { $ifNull: ["$items.quantity", 1] } } } },
    { $sort: { units: -1 } },
    { $limit: limit },
  ]);
  return rows.map((r) => r._id).filter((id) => mongoose.isValidObjectId(id));
}

/**
 * @param {{ limit?: number, excludeIds?: string[] }} opts
 */
export async function fetchBestSellersServer({ limit = 500, excludeIds = [] } = {}) {
  const lim = Math.min(500, Math.max(1, Number(limit) || 500));
  const exclude = new Set((excludeIds || []).map(String));
  try {
    await dbConnect();
    const base = { status: { $regex: /^active$/i } };

    let soldIds = [];
    try {
      soldIds = (await topSoldProductIds(lim + exclude.size + 20)).filter((id) => !exclude.has(String(id)));
    } catch (err) {
      console.error("[fetchBestSellersServer] sales ranking", err?.message || err);
    }

    const sold = soldIds.length
      ? await Product.find({ ...base, _id: { $in: soldIds } })
          .select(PRODUCT_CARD_SELECT)
          .populate("categories", "name slug")
          .lean()
      : [];
    const rank = new Map(soldIds.map((id, i) => [String(id), i]));
    sold.sort((a, b) => rank.get(String(a._id)) - rank.get(String(b._id)));

    const taken = new Set([...exclude, ...sold.map((p) => String(p._id))]);
    const need = lim - sold.length;
    const featured =
      need > 0
        ? await Product.find({
            ...base,
            $or: [{ featured: true }, { isFeatured: true }],
            _id: { $nin: [...taken].filter((id) => mongoose.isValidObjectId(id)) },
          })
            .select(PRODUCT_CARD_SELECT)
            .populate("categories", "name slug")
            .sort({ updatedAt: -1, createdAt: -1 })
            .limit(need)
            .lean()
        : [];

    const rows = [...sold, ...featured].slice(0, lim);
    return JSON.parse(
      JSON.stringify(rows.map((row) => serializeStoreProductSummary(row, { maxImages: 1 })))
    );
  } catch (err) {
    console.error("[fetchBestSellersServer]", err?.message || err);
    return [];
  }
}
