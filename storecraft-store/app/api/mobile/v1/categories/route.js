/**
 * GET /api/mobile/v1/catalog/categories
 * Returns category tree with products-only pruning.
 * Query: segment=car|bike (default car) — top-level categories of that store only.
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import {
  getCategoryIdsWithProducts,
  loadStoreCategoriesTreeSlim,
  pruneCategoryTreeWithoutProducts,
  serializeCategoryTreeNode,
} from "@/lib/storeCategoryData";
import { absoluteMediaUrl } from "@/lib/mobile/absoluteMediaUrl";
import { filterCategoryTreeBySegment, parseSegment } from "@/lib/segment";

export const dynamic = "force-dynamic";

function absolutizeCategoryTree(node) {
  if (!node || typeof node !== "object") return node;
  return {
    ...node,
    image: absoluteMediaUrl(node.image),
    children: Array.isArray(node.children) ? node.children.map(absolutizeCategoryTree) : [],
  };
}

export async function GET(request) {
  try {
    const segment = parseSegment(new URL(request.url).searchParams.get("segment")) || "car";
    await dbConnect();
    const [tree, withProducts] = await Promise.all([
      loadStoreCategoriesTreeSlim(),
      getCategoryIdsWithProducts(),
    ]);
    const categories = filterCategoryTreeBySegment(
      pruneCategoryTreeWithoutProducts(
        (Array.isArray(tree) ? tree : []).map(serializeCategoryTreeNode).map(absolutizeCategoryTree),
        withProducts
      ),
      segment
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
