/**
 * GET /api/categories/tree — AutoJin-style nested category tree for mega-menu.
 * Slim payload (no product counts) + short CDN/SWR cache + warm-instance memory cache.
 */
import { NextResponse } from "next/server";
import { filterCategoryTreeBySegment } from "@/lib/segment";
import { dbConnect } from "@/lib/db";
import {
  getCategoryIdsWithProducts,
  loadStoreCategoriesTreeSlim,
  pruneCategoryTreeWithoutProducts,
  serializeCategoryTreeNode,
} from "@/lib/storeCategoryData";
import {
  getCachedCategoryTreePayload,
  setCachedCategoryTreePayload,
} from "@/lib/categoryTreeServerCache";

export async function GET() {
  try {
    const cached = getCachedCategoryTreePayload();
    if (cached) {
      return NextResponse.json(
        { success: true, categories: cached, data: cached },
        {
          headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
            "X-Category-Tree-Cache": "HIT",
          },
        }
      );
    }

    await dbConnect();
    const [tree, withProducts] = await Promise.all([
      loadStoreCategoriesTreeSlim(),
      getCategoryIdsWithProducts(),
    ]);
    // Website menus are the car store; bike categories appear only in the app until /bikes ships.
    const payload = filterCategoryTreeBySegment(
      pruneCategoryTreeWithoutProducts(
        (Array.isArray(tree) ? tree : []).map(serializeCategoryTreeNode),
        withProducts
      ),
      "car"
    );
    setCachedCategoryTreePayload(payload);

    return NextResponse.json(
      {
        success: true,
        categories: payload,
        data: payload,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
          "X-Category-Tree-Cache": "MISS",
        },
      }
    );
  } catch (e) {
    console.error("Categories tree API error:", e);
    return NextResponse.json(
      { success: false, error: e.message || "Failed to load category tree." },
      { status: 500 }
    );
  }
}
