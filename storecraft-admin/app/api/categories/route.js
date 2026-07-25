import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessMinRole } from "@/lib/requireRole";
import Category from "@/lib/models/Category.model";
import Product from "@/lib/models/Product.model";

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function ensureUniqueSlug(base) {
  const root = slugify(base) || "category";
  let slug = root;
  let index = 1;
  while (await Category.findOne({ slug }).select("_id").lean()) {
    slug = `${root}-${index}`;
    index += 1;
  }
  return slug;
}

const buildTree = (categories) => {
  const map = {};
  const roots = [];
  categories.forEach((cat) => {
    map[String(cat._id)] = { ...cat, children: [] };
  });
  categories.forEach((cat) => {
    if (cat.parentCategory) {
      const parentId = String(cat.parentCategory._id || cat.parentCategory);
      const parent = map[parentId];
      if (parent) parent.children.push(map[String(cat._id)]);
    } else {
      roots.push(map[String(cat._id)]);
    }
  });
  return roots;
};

export async function GET(request) {
  try {
    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const wantTree = searchParams.get("tree") === "true";
    const wantFlat = searchParams.get("flat") === "true";

    const categoriesRaw = await Category.find({})
      .populate("parentCategory", "name slug")
      .sort({ level: 1, sortOrder: 1, name: 1 })
      .lean();

    const allCategoryIds = categoriesRaw.map((c) => c._id);
    const childrenMap = new Map();
    for (const c of categoriesRaw) {
      const id = String(c._id);
      if (!childrenMap.has(id)) childrenMap.set(id, []);
    }
    for (const c of categoriesRaw) {
      const pid = c.parentCategory ? String(c.parentCategory._id || c.parentCategory) : "";
      if (pid && childrenMap.has(pid)) childrenMap.get(pid).push(String(c._id));
    }

    const products = await Product.find({
      status: { $regex: /^active$/i },
      $or: [{ categories: { $in: allCategoryIds } }, { category: { $in: allCategoryIds } }],
    })
      .select("categories category")
      .lean();

    function refsOnProduct(p) {
      const refs = new Set();
      for (const x of p.categories || []) {
        if (x != null) refs.add(String(x));
      }
      if (p.category != null) refs.add(String(p.category));
      return refs;
    }

    function strictDescendantIds(rootId) {
      const root = String(rootId);
      const stack = [...(childrenMap.get(root) || [])];
      const seen = new Set();
      while (stack.length) {
        const id = stack.pop();
        if (seen.has(id)) continue;
        seen.add(id);
        for (const ch of childrenMap.get(id) || []) stack.push(ch);
      }
      return seen;
    }

    function countInScope(scopeIds) {
      let n = 0;
      for (const p of products) {
        const refs = refsOnProduct(p);
        let hit = false;
        for (const r of refs) {
          if (scopeIds.has(r)) {
            hit = true;
            break;
          }
        }
        if (hit) n += 1;
      }
      return n;
    }

    const categories = categoriesRaw.map((cat) => {
      const self = String(cat._id);
      const scope = new Set([self, ...strictDescendantIds(cat._id)]);
      const productCount = countInScope(scope);
      return {
        ...cat,
        parentName: cat.parentCategory?.name || "",
        productCount,
        subcategoryCount: (childrenMap.get(self) || []).length,
      };
    });

    if (wantTree) {
      return NextResponse.json({
        success: true,
        categories: buildTree(categories),
        data: buildTree(categories),
        total: categories.length,
      });
    }

    return NextResponse.json({
      success: true,
      categories,
      data: categories,
      total: categories.length,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to list categories." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessMinRole(user, "editor");
    if (denied) return denied;
    await dbConnect();

    const body = await request.json();
    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json({ success: false, error: "Name is required." }, { status: 400 });
    }

    const incomingSlug = String(body.slug || "").trim();
    const slug = await ensureUniqueSlug(incomingSlug || name);

    let parentCategory = null;
    let level = 0;
    let ancestors = [];

    if (body.parentCategory) {
      if (!mongoose.Types.ObjectId.isValid(body.parentCategory)) {
        return NextResponse.json({ success: false, error: "Invalid parent category." }, { status: 400 });
      }
      parentCategory = new mongoose.Types.ObjectId(body.parentCategory);
      const parentDoc = await Category.findById(parentCategory).select("_id level ancestors").lean();
      if (!parentDoc) {
        return NextResponse.json({ success: false, error: "Parent category not found." }, { status: 400 });
      }
      level = Number(parentDoc.level || 0) + 1;
      ancestors = [...(Array.isArray(parentDoc.ancestors) ? parentDoc.ancestors : []), parentDoc._id];
    }

    const doc = await Category.create({
      name,
      slug,
      description: String(body.description || ""),
      parentCategory,
      level,
      ancestors,
      image: {
        url: body.image?.url || "",
        publicId: body.image?.publicId || "",
        altText: body.image?.altText || "",
        title: body.image?.title || "",
      },
      status: ["active", "draft"].includes(body.status) ? body.status : "active",
      isFeatured: Boolean(body.featured ?? body.isFeatured),
      featured: Boolean(body.featured ?? body.isFeatured),
      showInNav: Boolean(body.showInNav),
      showInFooter: Boolean(body.showInFooter),
      showOnHomepage: Boolean(body.showOnHomepage),
      homepageOrder: Number(body.homepageOrder) || 0,
      homepageIcon: String(body.homepageIcon || ""),
      sortOrder: Number(body.sortOrder) || 0,
      seo: {
        metaTitle: String(body.seo?.metaTitle || ""),
        metaDescription: String(body.seo?.metaDescription || ""),
        metaKeywords: Array.isArray(body.seo?.metaKeywords)
          ? body.seo.metaKeywords.map((k) => String(k || "").trim()).filter(Boolean)
          : [],
      },
    });

    const category = await Category.findById(doc._id).populate("parentCategory", "name").lean();
    return NextResponse.json({ success: true, category, data: category }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create category." },
      { status: 500 }
    );
  }
}
