/**
 * GET /api/mobile/v1/home
 * Same primary catalog sections as the website homepage:
 * - hotDeals → fetchHotDealsServer (same as /api/products/deals)
 * - bestSellers → fetchBestSellersServer (featured / isFeatured flag)
 * - brands → homepageSettings.brands (BrandCarousel source; car-make names)
 * - flashSaleEndTime → homepageSettings.flashSaleEndTime (FlashSale countdown; null if unset)
 *
 * Also returns banners, categories, newArrivals, recentBlogs for the app shell.
 * `featured` is kept as an alias of bestSellers for older clients.
 *
 * Query: segment=car|bike (default car). The car home is unchanged apart from limiting new
 * arrivals and categories to cars; the bike home builds every section from bike products.
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Banner from "@/lib/models/Banner.model";
import Product from "@/lib/models/Product.model";
import Category from "@/lib/models/Category.model";
import BlogPost from "@/lib/models/BlogPost.model";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { normalizeHomepageSettings } from "@/lib/defaultHomepageSettings";
import { fetchBestSellersServer } from "@/lib/serverBestSellers";
import { fetchHotDealsServer } from "@/lib/serverHotDeals";
import { serializeStoreProductSummary } from "@/lib/storeSerialize";
import { STOREFRONT_PRODUCT_FILTER } from "@/lib/productVisibility";
import { absoluteMediaUrl } from "@/lib/mobile/absoluteMediaUrl";
import { parseSegment, segmentFilter } from "@/lib/segment";
import { getCategoryIdsWithProducts } from "@/lib/storeCategoryData";

const SUMMARY_FIELDS =
  "name slug media pricing inventory featured newArrival categories simpleVariations variationCombinations codEnabled isBulky";

/** Bike store sections straight from bike products (the car helpers rank the car catalog). */
async function bikeSections() {
  const base = { ...STOREFRONT_PRODUCT_FILTER, segment: "bike" };
  const find = (extra, sort) =>
    Product.find({ ...base, ...extra }).select(SUMMARY_FIELDS).sort(sort).limit(24).lean();
  const [featured, deals] = await Promise.all([
    find({ $or: [{ featured: true }, { isFeatured: true }] }, { updatedAt: -1 }),
    find({ "pricing.salePrice": { $gt: 0 } }, { updatedAt: -1 }),
  ]);
  return {
    bestSellers: featured.map((p) => serializeStoreProductSummary(p)),
    hotDeals: deals.map((p) => serializeStoreProductSummary(p)),
  };
}

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    await dbConnect();
    const segment = parseSegment(new URL(request.url).searchParams.get("segment")) || "car";
    const isBike = segment === "bike";

    const settingsDoc =
      (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean()) ||
      (await Settings.findOne({}).lean());
    const homepage = normalizeHomepageSettings(settingsDoc?.homepageSettings);

    let [
      banners,
      bestSellers,
      hotDeals,
      newArrivalsRaw,
      categoriesRaw,
      blogPosts,
    ] = await Promise.all([
      Banner.find({ status: "active" }).sort({ sortOrder: 1, createdAt: -1 }).lean(),
      isBike ? null : fetchBestSellersServer({ limit: 24 }),
      isBike ? null : fetchHotDealsServer({ filter: "all", limit: 24 }),
      Product.find({ ...STOREFRONT_PRODUCT_FILTER, ...segmentFilter(segment), newArrival: true })
        .select(SUMMARY_FIELDS)
        .populate("categories", "name slug")
        .limit(12)
        .lean(),
      Category.find({
        status: "active",
        ...segmentFilter(segment),
        $or: [{ parentCategory: null }, { parentCategory: { $exists: false } }],
      })
        .select("name slug image")
        .limit(12)
        .lean(),
      BlogPost.find({ status: "published" })
        .select("title slug excerpt featuredImage publishedAt readTime isFeatured")
        .sort({ publishedAt: -1 })
        .limit(3)
        .lean(),
    ]);

    if (isBike) {
      ({ bestSellers, hotDeals } = await bikeSections());
      // New store: hide categories that have no products yet (no empty pages from the home grid).
      const withProducts = await getCategoryIdsWithProducts();
      categoriesRaw = categoriesRaw.filter((c) => withProducts.has(String(c._id)));
    }

    const brands = (isBike ? [] : homepage.brands || [])
      .filter((b) => b && b.isActive !== false && String(b.name || "").trim())
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((b, i) => ({
        name: String(b.name).trim(),
        slug: String(b.slug || b.name || "")
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "-"),
        isActive: true,
        order: Number.isFinite(Number(b.order)) ? Number(b.order) : i,
      }));

    const flashSaleEndTime = homepage.flashSaleEndTime
      ? new Date(homepage.flashSaleEndTime).toISOString()
      : null;

    return NextResponse.json({
      banners: banners.map((b) => ({
        id: String(b._id),
        title: b.content?.heading?.text || b.name || b.title || "",
        subtitle: b.content?.subheading?.text || b.subtitle || "",
        image: absoluteMediaUrl(
          b.background?.mobileImage?.url ||
            b.background?.image?.url ||
            b.image?.url ||
            b.imageUrl ||
            b.image ||
            ""
        ),
        link:
          b.targetUrl ||
          b.content?.buttons?.[0]?.url ||
          b.link ||
          b.href ||
          b.url ||
          "",
        cta: b.content?.buttons?.[0]?.text || b.cta || b.ctaText || "",
        isActive: b.status === "active",
      })),
      hotDeals: {
        title: homepage.hotDeals?.title || homepage.sectionTitles?.hotDeals || "Hot Deals",
        subtitle: homepage.hotDeals?.subtitle || "",
        products: hotDeals,
        /** Flash-sale countdown end from homepage settings (same field FlashSale.jsx uses). */
        flashSaleEndTime,
      },
      bestSellers: {
        title: homepage.bestSellers?.title || homepage.sectionTitles?.bestSellers || "Best Sellers",
        products: bestSellers,
      },
      brands: {
        title: homepage.sectionTitles?.brands || "Trusted Brands",
        items: brands,
      },
      flashSaleEndTime,
      /** @deprecated alias — same list as bestSellers.products (featured flag). */
      featured: bestSellers,
      newArrivals: newArrivalsRaw.map((p) => serializeStoreProductSummary(p)),
      categories: categoriesRaw.map((c) => ({
        id: String(c._id),
        name: c.name,
        slug: c.slug,
        image: absoluteMediaUrl(c.image?.url || c.image || ""),
      })),
      recentBlogs: blogPosts.map((b) => ({
        id: String(b._id),
        title: b.title,
        slug: b.slug,
        excerpt: String(b.excerpt || "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 160),
        image: absoluteMediaUrl(b.featuredImage),
        publishedAt: b.publishedAt,
        readTime: b.readTime || null,
      })),
    });
  } catch (err) {
    console.error("[mobile/home]", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to load home." } },
      { status: 500 }
    );
  }
}
