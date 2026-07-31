/**
 * Homepage best sellers — curated productIds from settings, else popular fallback.
 */
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import Product from "@/lib/models/Product.model";
import Settings from "@/lib/models/Settings.model";
import { serializeStoreProductSummary } from "@/lib/storeSerialize";
import { PRODUCT_CARD_SELECT, fetchProductsServer } from "@/lib/serverProductFetch";

function toObjectId(id) {
  const s = String(id || "").trim();
  if (!mongoose.Types.ObjectId.isValid(s)) return null;
  return new mongoose.Types.ObjectId(s);
}

/**
 * @param {{ limit?: number }} opts
 */
export async function fetchBestSellersServer({ limit = 8 } = {}) {
  const lim = Math.min(24, Math.max(1, Number(limit) || 8));
  try {
    await dbConnect();
    const settings = await Settings.findOne().select("homepageSettings.bestSellers").lean();
    const bs = settings?.homepageSettings?.bestSellers || {};
    const ids = (Array.isArray(bs.productIds) ? bs.productIds : [])
      .map(toObjectId)
      .filter(Boolean);

    if (ids.length) {
      const rows = await Product.find({
        status: { $regex: /^active$/i },
        _id: { $in: ids },
      })
        .select(PRODUCT_CARD_SELECT)
        .populate("categories", "name slug")
        .lean();

      const byId = new Map(rows.map((r) => [String(r._id), r]));
      const ordered = ids.map((id) => byId.get(String(id))).filter(Boolean).slice(0, lim);
      return JSON.parse(JSON.stringify(ordered.map(serializeStoreProductSummary)));
    }

    const fallback = await fetchProductsServer({ limit: lim, sort: "popular" });
    return fallback.products || [];
  } catch (err) {
    console.error("[fetchBestSellersServer]", err?.message || err);
    return [];
  }
}
