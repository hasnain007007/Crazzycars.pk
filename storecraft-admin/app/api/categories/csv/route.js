/**
 * GET  /api/categories/csv?template=1 — sample template
 * GET  /api/categories/csv — export all categories
 * POST /api/categories/csv — import CSV (multipart file or JSON { csv })
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import Category from "@/lib/models/Category.model";
import { slugify } from "@/lib/slugify";
import {
  parseCsv,
  rowsToCsv,
  csvResponse,
  splitList,
  joinList,
  truthy,
  num,
} from "@/lib/csv";
import { CATEGORY_CSV_HEADERS, CATEGORY_CSV_SAMPLE_ROWS } from "@/lib/categoryCsv";

async function uniqueCategorySlug(base, excludeId) {
  const root = slugify(base || "category") || "category";
  let slug = root;
  for (let i = 0; i < 2000; i += 1) {
    const q = excludeId ? { slug, _id: { $ne: excludeId } } : { slug };
    const exists = await Category.findOne(q).select("_id").lean();
    if (!exists) return slug;
    slug = `${root}-${i + 1}`;
  }
  throw new Error("Could not allocate unique category slug.");
}

function categoryToRow(cat, slugById) {
  const parentId = cat.parentCategory
    ? String(cat.parentCategory._id || cat.parentCategory)
    : "";
  const keywords = Array.isArray(cat.seo?.metaKeywords)
    ? cat.seo.metaKeywords
    : [];
  return {
    name: cat.name || "",
    slug: cat.slug || "",
    parentSlug: parentId ? slugById.get(parentId) || "" : "",
    description: cat.description || "",
    status: cat.status || "active",
    sortOrder: String(cat.sortOrder ?? 0),
    isFeatured: String(Boolean(cat.isFeatured || cat.featured)),
    showInNav: String(Boolean(cat.showInNav)),
    showInFooter: String(Boolean(cat.showInFooter)),
    showOnHomepage: String(Boolean(cat.showOnHomepage)),
    imageUrl: cat.image?.url || "",
    imageAlt: cat.image?.altText || "",
    imageTitle: cat.image?.title || "",
    metaTitle: cat.seo?.metaTitle || "",
    metaDescription: cat.seo?.metaDescription || "",
    metaKeywords: joinList(keywords),
  };
}

export async function GET(request) {
  try {
    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    if (searchParams.get("template") === "1") {
      const csv = rowsToCsv(CATEGORY_CSV_HEADERS, CATEGORY_CSV_SAMPLE_ROWS);
      return csvResponse("categories-template.csv", csv);
    }

    await dbConnect();
    const cats = await Category.find({}).sort({ level: 1, sortOrder: 1, name: 1 }).lean();
    const slugById = new Map(cats.map((c) => [String(c._id), c.slug]));
    const rows = cats.map((c) => categoryToRow(c, slugById));
    const csv = rowsToCsv(CATEGORY_CSV_HEADERS, rows);
    return csvResponse(`categories-export-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Category CSV export failed." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessCapability(user, "canManageCatalog");
    if (denied) return denied;
    await dbConnect();

    let csvText = "";
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!file || typeof file === "string") {
        return NextResponse.json({ success: false, error: "Upload a CSV file." }, { status: 400 });
      }
      csvText = await file.text();
    } else {
      const body = await request.json().catch(() => ({}));
      csvText = String(body.csv || "");
    }

    const { rows } = parseCsv(csvText);
    if (!rows.length) {
      return NextResponse.json({ success: false, error: "CSV has no data rows." }, { status: 400 });
    }

    // Pass 1: upsert by slug (parents first by empty parentSlug then children)
    const sorted = [...rows].sort((a, b) => {
      const ap = String(a.parentSlug || "").trim() ? 1 : 0;
      const bp = String(b.parentSlug || "").trim() ? 1 : 0;
      return ap - bp;
    });

    let created = 0;
    let updated = 0;
    const errors = [];

    for (let idx = 0; idx < sorted.length; idx += 1) {
      const row = sorted[idx];
      try {
        const name = String(row.name || "").trim();
        if (!name) throw new Error("name is required");

        const requestedSlug = String(row.slug || "").trim() || slugify(name);
        let existing = await Category.findOne({ slug: requestedSlug });
        if (!existing && row.slug) {
          // try match by name if slug empty collision — skip
        }

        const parentSlug = String(row.parentSlug || "").trim();
        let parentCategory = null;
        let level = 0;
        let ancestors = [];
        let parents = [];
        if (parentSlug) {
          const parent = await Category.findOne({ slug: parentSlug }).select("_id level ancestors").lean();
          if (!parent) throw new Error(`parentSlug "${parentSlug}" not found — import parents first`);
          parentCategory = parent._id;
          level = Number(parent.level || 0) + 1;
          ancestors = [...(Array.isArray(parent.ancestors) ? parent.ancestors : []), parent._id];
          parents = [parent._id];
        }

        const statusRaw = String(row.status || "active").trim().toLowerCase();
        const status = ["active", "inactive", "draft"].includes(statusRaw) ? statusRaw : "active";
        const featured = truthy(row.isFeatured, false);
        const keywords = splitList(row.metaKeywords);

        const fields = {
          name,
          description: String(row.description || ""),
          parentCategory,
          parents,
          level,
          ancestors,
          status,
          sortOrder: num(row.sortOrder, 0),
          isFeatured: featured,
          featured,
          showInNav: truthy(row.showInNav, status === "active"),
          showInFooter: truthy(row.showInFooter, false),
          showOnHomepage: truthy(row.showOnHomepage, featured),
          image: {
            url: String(row.imageUrl || "").trim(),
            publicId: "",
            altText: String(row.imageAlt || "").trim(),
            title: String(row.imageTitle || "").trim(),
          },
          seo: {
            metaTitle: String(row.metaTitle || "").trim(),
            metaDescription: String(row.metaDescription || "").trim(),
            metaKeywords: keywords,
          },
        };

        if (existing) {
          const slug = await uniqueCategorySlug(requestedSlug, existing._id);
          Object.assign(existing, fields, { slug });
          await existing.save();
          updated += 1;
        } else {
          const slug = await uniqueCategorySlug(requestedSlug);
          await Category.create({ ...fields, slug });
          created += 1;
        }
      } catch (e) {
        errors.push({ row: idx + 2, name: row.name || "", error: e.message || String(e) });
      }
    }

    return NextResponse.json({
      success: true,
      created,
      updated,
      errors,
      processed: sorted.length,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Category CSV import failed." },
      { status: 500 }
    );
  }
}
