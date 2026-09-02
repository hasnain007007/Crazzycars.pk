/**
 * GET  /api/reviews/csv?template=1 — sample template
 * GET  /api/reviews/csv — export reviews (optional ?status=)
 * POST /api/reviews/csv — import CSV (multipart file or JSON { csv })
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import Product from "@/lib/models/Product.model";
import Review from "@/lib/models/Review.model";
import { requestIp } from "@/lib/requestIp";
import {
  parseCsv,
  rowsToCsv,
  csvResponse,
  splitList,
  truthy,
  num,
} from "@/lib/csv";
import { REVIEW_CSV_HEADERS, REVIEW_CSV_SAMPLE_ROWS } from "@/lib/reviewCsv";

function reviewToRow(r) {
  const product = r.product && typeof r.product === "object" ? r.product : null;
  const images = Array.isArray(r.images)
    ? r.images.map((img) => (typeof img === "string" ? img : img?.url || "")).filter(Boolean)
    : [];
  return {
    productSlug: r.productSlug || product?.slug || "",
    productId: product?._id ? String(product._id) : r.product ? String(r.product) : "",
    articleNo: product?.articleNo || "",
    reviewerName: r.reviewer?.name || "",
    reviewerEmail: r.reviewer?.email || "",
    reviewerLocation: r.reviewer?.location || "",
    verified: String(Boolean(r.reviewer?.verified)),
    rating: String(r.rating ?? ""),
    title: r.title || "",
    body: r.body || "",
    status: r.status || "pending",
    featured: String(Boolean(r.featured)),
    imageUrls: images.join("|"),
    orderId: r.orderId || "",
    createdAt: r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : "",
  };
}

function cell(row, ...keys) {
  for (const k of keys) {
    if (row[k] != null && String(row[k]).trim() !== "") return String(row[k]).trim();
  }
  return "";
}

function parseCreatedAt(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

async function resolveProduct(row, bySlug, byArticle, byId) {
  const id = cell(row, "productId", "product_id", "Product ID");
  if (id && mongoose.Types.ObjectId.isValid(id)) {
    const hit = byId.get(id) || (await Product.findById(id).select("name slug articleNo").lean());
    if (hit) return hit;
  }
  const slug = cell(row, "productSlug", "product_slug", "slug", "Product Slug").toLowerCase();
  if (slug && bySlug.has(slug)) return bySlug.get(slug);
  const article = cell(row, "articleNo", "article_no", "sku", "SKU", "Article No");
  if (article) {
    const key = article.toUpperCase();
    if (byArticle.has(key)) return byArticle.get(key);
  }
  return null;
}

async function refreshProductRatings(productIds) {
  const ids = [...new Set(productIds.map((id) => String(id)).filter(Boolean))];
  for (const pid of ids) {
    if (!mongoose.Types.ObjectId.isValid(pid)) continue;
    const approved = await Review.find({ product: pid, status: "approved" }).select("rating").lean();
    const count = approved.length;
    const avg = count ? approved.reduce((s, r) => s + (Number(r.rating) || 0), 0) / count : 0;
    const rounded = Math.round(avg * 10) / 10;
    await Product.findByIdAndUpdate(pid, {
      $set: {
        rating: rounded,
        averageRating: rounded,
        reviewCount: count,
        numReviews: count,
        totalReviews: count,
      },
    });
  }
}

export async function GET(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessCapability(user, "canManageContent");
    if (denied) return denied;

    const { searchParams } = new URL(request.url);
    if (searchParams.get("template") === "1") {
      const csv = rowsToCsv(REVIEW_CSV_HEADERS, REVIEW_CSV_SAMPLE_ROWS);
      return csvResponse("reviews-template.csv", csv);
    }

    await dbConnect();
    const status = (searchParams.get("status") || "all").trim();
    const query = {};
    if (["pending", "approved", "rejected"].includes(status)) query.status = status;

    const reviews = await Review.find(query)
      .populate("product", "name slug articleNo")
      .sort({ createdAt: -1 })
      .limit(5000)
      .lean();
    const rows = reviews.map(reviewToRow);
    const csv = rowsToCsv(REVIEW_CSV_HEADERS, rows);
    return csvResponse(`reviews-export-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Review CSV export failed." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessCapability(user, "canManageContent");
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
    if (rows.length > 2000) {
      return NextResponse.json(
        { success: false, error: "CSV limited to 2000 rows per import." },
        { status: 400 }
      );
    }

    const products = await Product.find({})
      .select("name slug articleNo")
      .lean();
    const bySlug = new Map();
    const byArticle = new Map();
    const byId = new Map();
    for (const p of products) {
      byId.set(String(p._id), p);
      if (p.slug) bySlug.set(String(p.slug).toLowerCase(), p);
      if (p.articleNo) byArticle.set(String(p.articleNo).trim().toUpperCase(), p);
    }

    let created = 0;
    const errors = [];
    const touchedProducts = new Set();
    const docs = [];

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const rowNum = i + 2; // header is row 1
      try {
        const product = await resolveProduct(row, bySlug, byArticle, byId);
        if (!product) {
          errors.push({
            row: rowNum,
            error: "Product not found — set productSlug, productId, or articleNo",
          });
          continue;
        }

        const reviewerName = cell(row, "reviewerName", "reviewer_name", "name", "Name");
        if (!reviewerName) {
          errors.push({ row: rowNum, error: "reviewerName is required" });
          continue;
        }

        const rating = Math.round(num(cell(row, "rating", "Rating"), 0));
        if (rating < 1 || rating > 5) {
          errors.push({ row: rowNum, error: "rating must be 1–5" });
          continue;
        }

        const statusRaw = cell(row, "status", "Status").toLowerCase() || "approved";
        const status = ["pending", "approved", "rejected"].includes(statusRaw)
          ? statusRaw
          : "approved";

        const imageUrls = splitList(cell(row, "imageUrls", "images", "image_urls"));
        const images = imageUrls.slice(0, 8).map((url) => ({ url, publicId: "" }));

        const createdAt = parseCreatedAt(cell(row, "createdAt", "date", "reviewDate"));

        const doc = {
          product: product._id,
          productName: product.name || "",
          productSlug: product.slug || "",
          reviewer: {
            name: reviewerName.slice(0, 120),
            email: cell(row, "reviewerEmail", "email").slice(0, 200),
            location: cell(row, "reviewerLocation", "location", "city").slice(0, 120),
            avatar: "",
            verified: truthy(cell(row, "verified", "Verified"), false),
          },
          rating,
          title: cell(row, "title", "Title").slice(0, 200),
          body: cell(row, "body", "review", "comment", "Body").slice(0, 5000),
          images,
          status,
          featured: truthy(cell(row, "featured", "Featured"), false),
          source: "import",
          orderId: cell(row, "orderId", "order_id").slice(0, 80),
          helpfulVotes: 0,
        };
        if (createdAt) doc.createdAt = createdAt;

        docs.push(doc);
        touchedProducts.add(String(product._id));
      } catch (e) {
        errors.push({ row: rowNum, error: e.message || "Row failed" });
      }
    }

    if (docs.length) {
      const chunkSize = 200;
      for (let i = 0; i < docs.length; i += chunkSize) {
        const chunk = docs.slice(i, i + chunkSize);
        try {
          const inserted = await Review.insertMany(chunk, { ordered: false });
          created += inserted.length;
        } catch (bulkErr) {
          const written = Array.isArray(bulkErr?.insertedDocs)
            ? bulkErr.insertedDocs.length
            : Number(bulkErr?.result?.nInserted) || 0;
          created += written;
          if (bulkErr?.writeErrors?.length) {
            for (const we of bulkErr.writeErrors.slice(0, 20)) {
              errors.push({
                row: "?",
                error: we?.errmsg || we?.err?.message || "Insert failed",
              });
            }
          } else if (!written) {
            throw bulkErr;
          }
        }
      }
      await refreshProductRatings([...touchedProducts]);
    }

    await logActivity({
      user: user.userId,
      userName: user.name || "Admin",
      action: `Reviews CSV import: ${created} created, ${errors.length} errors`,
      resource: "Review",
      details: { created, errors: errors.length },
      type: "create",
      ip: requestIp(request),
    });

    return NextResponse.json({
      success: true,
      created,
      updated: 0,
      errors: errors.slice(0, 50),
      errorCount: errors.length,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Review CSV import failed." },
      { status: 500 }
    );
  }
}
