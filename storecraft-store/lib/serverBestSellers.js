/**
 * Homepage best sellers — products marked Featured in admin.
 */
import { dbConnect } from "@/lib/db";
import Product from "@/lib/models/Product.model";
import { serializeStoreProductSummary } from "@/lib/storeSerialize";
import { PRODUCT_CARD_SELECT } from "@/lib/serverProductFetch";

/**
 * @param {{ limit?: number }} opts
 */
export async function fetchBestSellersServer({ limit = 100 } = {}) {
  const lim = Math.min(100, Math.max(1, Number(limit) || 100));
  try {
    await dbConnect();
    const rows = await Product.find({
      status: { $regex: /^active$/i },
      $or: [{ featured: true }, { isFeatured: true }],
    })
      .select(PRODUCT_CARD_SELECT)
      .populate("categories", "name slug")
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(lim)
      .lean();

    return JSON.parse(
      JSON.stringify(rows.map((row) => serializeStoreProductSummary(row, { maxImages: 2 })))
    );
  } catch (err) {
    console.error("[fetchBestSellersServer]", err?.message || err);
    return [];
  }
}
