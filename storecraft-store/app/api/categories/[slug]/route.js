import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { loadStoreCategoryDetail } from "@/lib/storeCategoryData";
import { resolveCategoryHandle } from "@/lib/resolveCategoryHandle";

export async function GET(_request, context) {
  try {
    await dbConnect();
    const { slug } = await context.params;
    const slugStr = String(slug || "").trim();

    let detail = await loadStoreCategoryDetail(slugStr);
    if (!detail) {
      const canonicalSlug = await resolveCategoryHandle(slugStr);
      if (canonicalSlug && canonicalSlug !== slugStr) {
        detail = await loadStoreCategoryDetail(canonicalSlug);
      }
    }
    if (!detail) {
      return NextResponse.json({ success: false, error: "Category not found." }, { status: 404 });
    }

    const {
      category,
      subcategories,
      products,
      breadcrumbs,
      breadcrumb,
      productCount,
      totalIncludingSubcategories,
    } = detail;

    return NextResponse.json(
      {
        success: true,
        category,
        subcategories,
        products,
        breadcrumbs,
        breadcrumb,
        productCount,
        totalIncludingSubcategories,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
        },
      }
    );
  } catch (error) {
    console.error("Category page error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load category." },
      { status: 500 }
    );
  }
}
