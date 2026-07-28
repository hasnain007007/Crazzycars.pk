import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Product from "@/lib/models/Product.model";
import { effectiveUnitPrice, isSaleCurrentlyActive } from "@/lib/storePricing";

function escapeRegex(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function lightSerialize(p) {
  const regularPrice = Number(p.pricing?.regularPrice) || 0;
  const salePrice = Number(p.pricing?.salePrice) || 0;
  const isOnSale =
    salePrice > 0 && salePrice < regularPrice && isSaleCurrentlyActive(p.pricing);
  const price = isOnSale ? salePrice : effectiveUnitPrice(p) || regularPrice;
  const img =
    p?.media?.images?.find((i) => i?.isMain)?.url || p?.media?.images?.[0]?.url || "";
  return {
    id: String(p._id),
    name: p.name,
    slug: p.slug,
    image: img,
    price,
    regularPrice,
    salePrice,
  };
}

const SELECT =
  "name slug media.images pricing.regularPrice pricing.salePrice pricing.saleSchedule";

/**
 * Fast typeahead endpoint — minimal fields, no count, no category populate, no aggregation.
 * GET /api/products/suggest?q=corolla&limit=8
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const limit = Math.min(12, Math.max(1, parseInt(searchParams.get("limit"), 10) || 8));

    if (q.length < 2) {
      return NextResponse.json(
        { success: true, products: [], total: 0 },
        {
          headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
          },
        }
      );
    }

    await dbConnect();

    let rows = [];

    // Prefer MongoDB text index when present (much faster than multi-field regex).
    try {
      rows = await Product.find(
        { status: "active", $text: { $search: q } },
        { score: { $meta: "textScore" } }
      )
        .select(SELECT)
        .sort({ score: { $meta: "textScore" } })
        .limit(limit)
        .maxTimeMS(2500)
        .lean();
    } catch {
      rows = [];
    }

    if (!rows.length) {
      const rx = new RegExp(escapeRegex(q), "i");
      rows = await Product.find({
        status: "active",
        $or: [
          { name: rx },
          { slug: rx },
          { articleNo: rx },
          { tags: rx },
          { "compatibleCars.make": rx },
          { "compatibleCars.model": rx },
        ],
      })
        .select(SELECT)
        .sort({ createdAt: -1 })
        .limit(limit)
        .maxTimeMS(2500)
        .lean();
    }

    // Approximate total for “View all” without a second expensive count query.
    // If we filled the page, there are likely more matches.
    const total = rows.length < limit ? rows.length : rows.length + 1;

    return NextResponse.json(
      {
        success: true,
        products: rows.map(lightSerialize),
        total,
        hasMore: rows.length >= limit,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
        },
      }
    );
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Suggest failed." },
      { status: 500 }
    );
  }
}
