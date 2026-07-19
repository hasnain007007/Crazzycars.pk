/**
 * GET /api/categories/tree — AutoJin-style nested category tree for mega-menu.
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import {
  loadStoreCategoriesTree,
  serializeCategoryTreeNode,
} from "@/lib/storeCategoryData";

export async function GET() {
  try {
    await dbConnect();
    const tree = await loadStoreCategoriesTree(true);
    const payload = (Array.isArray(tree) ? tree : []).map(serializeCategoryTreeNode);

    return NextResponse.json(
      {
        success: true,
        categories: payload,
        data: payload,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
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
