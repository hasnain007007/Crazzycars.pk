/**
 * GET /api/mobile/v1/catalog/home
 * Compose home screen: banners, featured products, new arrivals, categories.
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Banner from "@/lib/models/Banner.model";
import Product from "@/lib/models/Product.model";
import Category from "@/lib/models/Category.model";
import BlogPost from "@/lib/models/BlogPost.model";
import { serializeStoreProductSummary } from "@/lib/storeSerialize";
import { STOREFRONT_PRODUCT_FILTER } from "@/lib/productVisibility";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await dbConnect();

    const [banners, featuredRaw, newArrivalsRaw, categoriesRaw, blogPosts] = await Promise.all([
      Banner.find({ status: "active" }).sort({ sortOrder: 1, createdAt: -1 }).lean(),
      Product.find({ ...STOREFRONT_PRODUCT_FILTER, featured: true })
        .select("name slug media pricing inventory featured newArrival categories simpleVariations variationCombinations codEnabled isBulky")
        .populate("categories", "name slug")
        .limit(12)
        .lean(),
      Product.find({ ...STOREFRONT_PRODUCT_FILTER, newArrival: true })
        .select("name slug media pricing inventory featured newArrival categories simpleVariations variationCombinations codEnabled isBulky")
        .populate("categories", "name slug")
        .limit(12)
        .lean(),
      Category.find({ status: "active", $or: [{ parentCategory: null }, { parentCategory: { $exists: false } }] })
        .select("name slug image")
        .limit(12)
        .lean(),
      BlogPost.find({ status: "published" })
        .select("title slug excerpt featuredImage publishedAt readTime isFeatured")
        .sort({ publishedAt: -1 })
        .limit(3)
        .lean(),
    ]);

    return NextResponse.json({
      banners: banners.map((b) => ({
        id: String(b._id),
        title: b.title || "",
        subtitle: b.subtitle || "",
        image: b.image?.url || b.imageUrl || b.image || "",
        link: b.link || b.href || b.url || "",
        cta: b.cta || b.ctaText || "",
        isActive: b.status === "active",
      })),
      featured: featuredRaw.map((p) => serializeStoreProductSummary(p)),
      newArrivals: newArrivalsRaw.map((p) => serializeStoreProductSummary(p)),
      categories: categoriesRaw.map((c) => ({
        id: String(c._id),
        name: c.name,
        slug: c.slug,
        image: c.image?.url || c.image || "",
      })),
      recentBlogs: blogPosts.map((b) => ({
        id: String(b._id),
        title: b.title,
        slug: b.slug,
        excerpt: String(b.excerpt || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160),
        image: b.featuredImage || "",
        publishedAt: b.publishedAt,
        readTime: b.readTime || null,
      })),
    });
  } catch (err) {
    console.error("[mobile/catalog/home]", err);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to load home." } }, { status: 500 });
  }
}
