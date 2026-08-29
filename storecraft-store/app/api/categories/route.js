import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { loadStoreCategoriesTree } from "@/lib/storeCategoryData";

function resolveParentId(cat) {
  if (cat.parentId) return String(cat.parentId);
  if (cat.parentCategory?._id) return String(cat.parentCategory._id);
  if (cat.parentCategory) return String(cat.parentCategory);
  return null;
}

function serializeCategory(cat) {
  return {
    _id: cat._id,
    name: cat.name,
    slug: cat.slug,
    parentId: resolveParentId(cat),
    image: cat.image,
    showInNav: Boolean(cat.showInNav),
    showInFooter: Boolean(cat.showInFooter),
    productCount: cat.productCount,
    subcategoryCount: cat.subcategoryCount,
    featured: cat.featured,
    isFeatured: cat.isFeatured,
    sortOrder: cat.sortOrder,
    level: cat.level,
    showOnHomepage: Boolean(cat.showOnHomepage),
    homepageOrder: Number(cat.homepageOrder || 0),
    homepageIcon: String(cat.homepageIcon || ""),
  };
}

function flattenCategories(list) {
  const out = [];
  const walk = (items) => {
    for (const item of items) {
      const { children, ...rest } = item;
      out.push(rest);
      if (Array.isArray(children) && children.length) walk(children);
    }
  };
  walk(list);
  return out;
}

export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const wantTree = searchParams.get("tree") === "true";
    const featuredOnly = searchParams.get("featured") === "true";
    const showInFooterOnly = searchParams.get("showInFooter") === "true";
    const showOnHomepageOnly = searchParams.get("showOnHomepage") === "true";

    const categories = await loadStoreCategoriesTree(wantTree, { featuredOnly, showInFooterOnly, showOnHomepageOnly });
    const flat = wantTree ? flattenCategories(categories) : categories;
    const serialized = (Array.isArray(flat) ? flat : [])
      .map(serializeCategory)
      .filter((c) => Number(c.productCount || 0) > 0);

    return NextResponse.json(
      {
        success: true,
        categories: serialized,
        data: serialized,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (e) {
    console.error("Categories API error:", e);
    return NextResponse.json({ success: false, error: e.message || "Failed to load categories." }, { status: 500 });
  }
}
