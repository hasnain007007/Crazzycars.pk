/**
 * GET  /api/products/csv?template=1 — sample template
 * GET  /api/products/csv — export all products
 * POST /api/products/csv — import CSV (multipart file or JSON { csv })
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import { hasCapability } from "@/lib/permissions";
import Product from "@/lib/models/Product.model";
import Category from "@/lib/models/Category.model";
import { slugify } from "@/lib/slugify";
import { normalizeMetaKeywords } from "@/lib/seoKeywords";
import {
  parseCsv,
  rowsToCsv,
  csvResponse,
  splitList,
  joinList,
  truthy,
  num,
} from "@/lib/csv";
import { PRODUCT_CSV_HEADERS, PRODUCT_CSV_SAMPLE_ROWS } from "@/lib/productCsv";

async function uniqueProductSlug(base, excludeId) {
  const root = slugify(base || "product") || "product";
  let slug = root;
  const exclude = excludeId ? { _id: { $ne: excludeId } } : {};
  for (let i = 0; i < 5000; i += 1) {
    const exists = await Product.findOne({ slug, ...exclude }).select("_id").lean();
    if (!exists) return slug;
    slug = `${root}-${i + 1}`;
  }
  throw new Error("Could not allocate unique slug.");
}

function productToRow(p, slugByCatId, { includeCost }) {
  const catSlugs = (p.categories || [])
    .map((c) => {
      if (c?.slug) return c.slug;
      return slugByCatId.get(String(c?._id || c)) || "";
    })
    .filter(Boolean);

  const images = Array.isArray(p.media?.images) ? p.media.images : [];
  const imageUrls = images.map((img) => img?.url).filter(Boolean);
  const keywords = Array.isArray(p.seo?.metaKeywords)
    ? p.seo.metaKeywords
    : normalizeMetaKeywords(p.seo?.metaKeywords);

  return {
    name: p.name || "",
    slug: p.slug || "",
    articleNo: p.articleNo || "",
    status: p.status || "draft",
    featured: String(Boolean(p.featured || p.isFeatured)),
    newArrival: String(Boolean(p.newArrival)),
    isDeal: String(Boolean(p.isDeal)),
    isUniversal: String(Boolean(p.isUniversal)),
    categorySlugs: joinList(catSlugs),
    shortDescription: p.shortDescription || "",
    longDescription: p.longDescription || "",
    regularPrice: String(p.pricing?.regularPrice ?? ""),
    salePrice: p.pricing?.salePrice != null ? String(p.pricing.salePrice) : "",
    costPerItem: includeCost ? String(p.pricing?.costPerItem ?? "") : "",
    sku: p.inventory?.sku || "",
    quantity: String(p.inventory?.quantity ?? 0),
    trackInventory: String(p.inventory?.trackInventory !== false),
    allowBackorder: String(p.inventory?.allowBackorder === true),
    lowStockThreshold: String(p.inventory?.lowStockThreshold ?? 5),
    weight: String(p.inventory?.weight ?? ""),
    weightUnit: p.inventory?.weightUnit || "kg",
    imageUrls: joinList(imageUrls),
    tags: joinList(p.tags || []),
    vendor: p.vendor || "",
    productType: p.productType || "",
    condition: p.condition || "new",
    partNumber: p.partNumber || "",
    ean: p.ean || "",
    metaTitle: p.seo?.metaTitle || p.metaTitle || "",
    metaDescription: p.seo?.metaDescription || p.metaDescription || "",
    metaKeywords: joinList(keywords),
  };
}

export async function GET(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessCapability(user, "canManageCatalog");
    if (denied) return denied;

    const { searchParams } = new URL(request.url);
    if (searchParams.get("template") === "1") {
      const csv = rowsToCsv(PRODUCT_CSV_HEADERS, PRODUCT_CSV_SAMPLE_ROWS);
      return csvResponse("products-template.csv", csv);
    }

    await dbConnect();
    const [products, categories] = await Promise.all([
      Product.find({})
        .populate("categories", "name slug")
        .sort({ updatedAt: -1 })
        .lean(),
      Category.find({}).select("_id slug").lean(),
    ]);
    const slugByCatId = new Map(categories.map((c) => [String(c._id), c.slug]));
    const includeCost = hasCapability(user, "canViewProductCosts");
    const rows = products.map((p) => productToRow(p, slugByCatId, { includeCost }));
    const csv = rowsToCsv(PRODUCT_CSV_HEADERS, rows);
    return csvResponse(`products-export-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Product CSV export failed." },
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

    const allCats = await Category.find({}).select("_id slug").lean();
    const idBySlug = new Map(allCats.map((c) => [c.slug, c._id]));

    let created = 0;
    let updated = 0;
    const errors = [];

    for (let idx = 0; idx < rows.length; idx += 1) {
      const row = rows[idx];
      try {
        const name = String(row.name || "").trim();
        if (!name) throw new Error("name is required");

        const regularPrice = num(row.regularPrice, NaN);
        if (!Number.isFinite(regularPrice) || regularPrice < 0) {
          throw new Error("regularPrice must be a valid number >= 0");
        }

        const statusRaw = String(row.status || "draft").trim().toLowerCase();
        const status = ["active", "inactive", "draft"].includes(statusRaw) ? statusRaw : "draft";
        const articleNo = String(row.articleNo || "").trim();
        if (status === "active" && !articleNo) {
          throw new Error("articleNo is required when status is active");
        }

        const categorySlugs = splitList(row.categorySlugs);
        const categoryIds = [];
        for (const s of categorySlugs) {
          const id = idBySlug.get(s);
          if (!id) throw new Error(`Unknown categorySlugs entry "${s}" — create/import categories first`);
          categoryIds.push(id);
        }

        const imageUrls = splitList(row.imageUrls);
        const mediaImages = imageUrls.map((url, i) => ({
          url,
          publicId: "",
          isMain: i === 0,
          altText: name,
          imageName: "",
        }));

        const saleRaw = String(row.salePrice ?? "").trim();
        const salePrice = saleRaw === "" ? undefined : num(saleRaw, undefined);
        const keywords = normalizeMetaKeywords(splitList(row.metaKeywords));
        const featured = truthy(row.featured, false);
        const requestedSlug = String(row.slug || "").trim() || slugify(name);

        const fields = {
          name,
          articleNo,
          ean: String(row.ean || "").trim(),
          partNumber: String(row.partNumber || "").trim(),
          condition: ["new", "used", "refurbished"].includes(String(row.condition || "").toLowerCase())
            ? String(row.condition).toLowerCase()
            : "new",
          categories: categoryIds,
          shortDescription: String(row.shortDescription || "").trim().slice(0, 300),
          longDescription: String(row.longDescription || ""),
          pricing: {
            regularPrice,
            ...(salePrice != null && Number.isFinite(salePrice) ? { salePrice } : {}),
            costPerItem: Math.max(0, num(row.costPerItem, 0)),
          },
          inventory: {
            sku: String(row.sku || articleNo || "").trim(),
            quantity: Math.max(0, Math.floor(num(row.quantity, 0))),
            trackInventory: truthy(row.trackInventory, true),
            allowBackorder: truthy(row.allowBackorder, false),
            lowStockThreshold: Math.max(0, Math.floor(num(row.lowStockThreshold, 5))),
            weight: Math.max(0, num(row.weight, 0)),
            weightUnit: String(row.weightUnit || "kg").trim() || "kg",
          },
          media: {
            images: mediaImages,
            videos: [],
            videoUrl: "",
            videoType: "",
          },
          tags: splitList(row.tags),
          vendor: String(row.vendor || "").trim(),
          productType: String(row.productType || "").trim(),
          status,
          featured,
          isFeatured: featured,
          newArrival: truthy(row.newArrival, false),
          isDeal: truthy(row.isDeal, false),
          isUniversal: truthy(row.isUniversal, false),
          seo: {
            metaTitle: String(row.metaTitle || "").trim(),
            metaDescription: String(row.metaDescription || "").trim(),
            metaKeywords: keywords,
          },
          metaTitle: String(row.metaTitle || "").trim(),
          metaDescription: String(row.metaDescription || "").trim(),
        };

        let existing = await Product.findOne({ slug: requestedSlug });
        if (!existing && articleNo) {
          existing = await Product.findOne({ articleNo });
        }

        if (existing) {
          const slug = await uniqueProductSlug(requestedSlug, existing._id);
          // Merge images: if CSV provided images, replace; else keep existing
          if (!imageUrls.length && existing.media?.images?.length) {
            fields.media = existing.media;
          }
          Object.assign(existing, fields, { slug });
          await existing.save();
          updated += 1;
        } else {
          const slug = await uniqueProductSlug(requestedSlug);
          await Product.create({ ...fields, slug });
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
      processed: rows.length,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Product CSV import failed." },
      { status: 500 }
    );
  }
}
