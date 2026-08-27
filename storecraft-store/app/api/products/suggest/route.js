import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Product from "@/lib/models/Product.model";
import { effectiveUnitPrice, isSaleCurrentlyActive } from "@/lib/storePricing";
import { queryProductsSmart } from "@/lib/smartProductSearch";
import { isPostgresCatalog } from "@/lib/pg/enabled";
import { pgSuggestProducts } from "@/lib/pg/catalog";

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
  "name slug media.images pricing.regularPrice pricing.salePrice pricing.saleSchedule tags articleNo compatibleCars.make compatibleCars.model";

/**
 * Fast typeahead endpoint — minimal fields, smart phrase + type ranking.
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

    if (isPostgresCatalog()) {
      const rows = await pgSuggestProducts(q, limit);
      return NextResponse.json(
        {
          success: true,
          products: rows.map(lightSerialize),
          total: rows.length,
          hasMore: rows.length >= limit,
          mode: "postgres",
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
          },
        }
      );
    }

    await dbConnect();

    const { rows, total, mode } = await queryProductsSmart(
      Product,
      { status: "active" },
      q,
      {
        limit,
        skip: 0,
        select: SELECT,
        candidateLimit: Math.max(48, limit * 6),
        countTotal: false,
      }
    );

    return NextResponse.json(
      {
        success: true,
        products: rows.map(lightSerialize),
        total: rows.length < limit ? rows.length : Math.max(total, rows.length + 1),
        hasMore: rows.length >= limit,
        mode,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
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
