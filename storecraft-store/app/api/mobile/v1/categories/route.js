/**
 * GET /api/mobile/v1/catalog/categories
 * Returns category tree with products-only pruning.
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import {
  getCategoryIdsWithProducts,
  loadStoreCategoriesTreeSlim,
  pruneCategoryTreeWithoutProducts,
  serializeCategoryTreeNode,
} from "@/lib/storeCategoryData";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await dbConnect();
    const [tree, withProducts] = await Promise.all([
      loadStoreCategoriesTreeSlim(),
      getCategoryIdsWithProducts(),
    ]);
    const categories = pruneCategoryTreeWithoutProducts(
      (Array.isArray(tree) ? tree : []).map(serializeCategoryTreeNode),
      withProducts
    );
    return NextResponse.json(
      { categories },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch (err) {
    console.error("[mobile/catalog/categories]", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to load categories." } },
      { status: 500 }
    );
  }
}
