import { dbConnect } from "@/lib/db";
import Product from "@/lib/models/Product.model";
import Category from "@/lib/models/Category.model";
import Vehicle from "@/lib/models/Vehicle.model";
import Page from "@/lib/models/Page.model";
import BlogPost from "@/lib/models/BlogPost.model";
import { absoluteUrl } from "@/lib/siteUrl";
import { MAX_SITEMAP_URLS } from "@/lib/sitemap/xml";
import { getCategoryIdsWithProducts } from "@/lib/storeCategoryData";

/** Static storefront routes (no query strings, no redirect aliases). */
const STATIC_PAGE_PATHS = [
  "/",
  "/shop",
  "/categories",
  "/cars",
  "/sale",
  "/blogs",
  "/faq",
  "/contact",
  "/about",
  "/shipping-policy",
  "/returns-policy",
];

const RESERVED_PAGE_SLUGS = new Set([
  "shop",
  "sale",
  "categories",
  "cars",
  "blogs",
  "blog",
  "faq",
  "contact",
  "about",
  "about-us",
  "cart",
  "checkout",
  "account",
  "api",
  "feed",
  "search",
  "wishlist",
  "compare",
  "track-order",
  "order-confirmation",
  "products",
  "collections",
  "posts",
  "pages",
  "shipping-policy",
  "returns-policy",
]);

async function categoryIdsWithProducts() {
  return getCategoryIdsWithProducts();
}

async function vehicleIdsWithProducts() {
  const rows = await Product.aggregate([
    {
      $match: {
        status: "active",
        compatibleVehicles: { $exists: true, $type: "array", $ne: [] },
      },
    },
    { $unwind: "$compatibleVehicles" },
    { $group: { _id: "$compatibleVehicles" } },
  ]);
  return new Set(rows.map((r) => String(r._id)));
}

function toEntry(headers, path, lastmod, changefreq, priority) {
  return {
    loc: absoluteUrl(path, { headers }),
    lastmod: lastmod || undefined,
    changefreq,
    priority,
  };
}

function paginateEntries(entries, chunkIndex = 0) {
  const start = chunkIndex * MAX_SITEMAP_URLS;
  return entries.slice(start, start + MAX_SITEMAP_URLS);
}

export async function fetchSitemapContext(headers) {
  // absoluteUrl("/") returns origin with a trailing slash; strip it so
  // `${siteUrl}/sitemap-*.xml` does not become `https://host//sitemap-*.xml`.
  const siteUrl = absoluteUrl("/", { headers }).replace(/\/+$/, "");

  await dbConnect();

  const [products, categories, vehicles, withProducts, vehiclesWithProducts, cmsPages, blogPosts] =
    await Promise.all([
      Product.find({ status: "active" }).select("slug updatedAt").lean(),
      Category.find({ status: "active" }).select("slug updatedAt _id").lean(),
      Vehicle.find({ isActive: true }).select("slug updatedAt _id").lean(),
      categoryIdsWithProducts(),
      vehicleIdsWithProducts(),
      Page.find({ status: "published" }).select("slug updatedAt").lean(),
      BlogPost.find({ status: "published" }).select("slug updatedAt publishedAt").lean(),
    ]);

  const productSlugSet = new Set(
    products.map((p) => String(p.slug || "").toLowerCase()).filter(Boolean)
  );

  const productEntries = products
    .filter((p) => p.slug)
    .map((p) => toEntry(headers, `/${p.slug}`, p.updatedAt, "weekly", 0.7));

  const categoryEntries = categories
    .filter((c) => c.slug && withProducts.has(String(c._id)))
    .map((c) => toEntry(headers, `/categories/${c.slug}`, c.updatedAt, "weekly", 0.8));

  const carEntries = vehicles
    .filter((v) => v.slug && vehiclesWithProducts.has(String(v._id)))
    .map((v) => toEntry(headers, `/cars/${v.slug}`, v.updatedAt, "weekly", 0.8));

  const staticPageEntries = STATIC_PAGE_PATHS.map((path) =>
    toEntry(headers, path, null, path === "/" ? "daily" : "weekly", path === "/" ? 1 : 0.8)
  );

  const cmsPageEntries = cmsPages
    .filter((page) => {
      const slug = String(page.slug || "").trim().toLowerCase();
      return slug && !RESERVED_PAGE_SLUGS.has(slug) && !productSlugSet.has(slug);
    })
    .map((page) => toEntry(headers, `/${page.slug}`, page.updatedAt, "monthly", 0.5));

  const pageEntries = [...staticPageEntries, ...cmsPageEntries];

  const blogEntries = blogPosts
    .filter((post) => post.slug)
    .map((post) =>
      toEntry(headers, `/blogs/${post.slug}`, post.updatedAt || post.publishedAt, "weekly", 0.6)
    );

  return {
    siteUrl,
    entries: {
      products: productEntries,
      categories: categoryEntries,
      cars: carEntries,
      pages: pageEntries,
      blog: blogEntries,
    },
  };
}

export async function getProductSitemapEntries(headers, _siteId, chunkIndex = 0) {
  const ctx = await fetchSitemapContext(headers);
  return paginateEntries(ctx.entries.products, chunkIndex);
}

export async function getCategorySitemapEntries(headers, _siteId, chunkIndex = 0) {
  const ctx = await fetchSitemapContext(headers);
  return paginateEntries(ctx.entries.categories, chunkIndex);
}

export async function getCarSitemapEntries(headers, _siteId, chunkIndex = 0) {
  const ctx = await fetchSitemapContext(headers);
  return paginateEntries(ctx.entries.cars, chunkIndex);
}

export async function getPageSitemapEntries(headers, _siteId, chunkIndex = 0) {
  const ctx = await fetchSitemapContext(headers);
  return paginateEntries(ctx.entries.pages, chunkIndex);
}

export async function getBlogSitemapEntries(headers, _siteId, chunkIndex = 0) {
  const ctx = await fetchSitemapContext(headers);
  return paginateEntries(ctx.entries.blog, chunkIndex);
}

export async function getSitemapIndexEntries(headers) {
  const ctx = await fetchSitemapContext(headers);
  const { siteUrl, entries } = ctx;

  const childSpecs = [
    { id: "products", entries: entries.products },
    { id: "categories", entries: entries.categories },
    { id: "cars", entries: entries.cars },
    { id: "pages", entries: entries.pages },
    { id: "blog", entries: entries.blog },
  ];

  return childSpecs
    .filter((spec) => spec.entries.length > 0)
    .flatMap((spec) => {
      const chunks = Math.ceil(spec.entries.length / MAX_SITEMAP_URLS) || 1;
      const lastmod = spec.entries.reduce((max, e) => {
        if (!e.lastmod) return max;
        const d = e.lastmod instanceof Date ? e.lastmod : new Date(e.lastmod);
        if (Number.isNaN(d.getTime())) return max;
        return !max || d > max ? d : max;
      }, null);

      if (chunks <= 1) {
        return [{ loc: `${siteUrl}/sitemap-${spec.id}.xml`, lastmod }];
      }
      return Array.from({ length: chunks }, (_, i) => ({
        loc: `${siteUrl}/sitemap-${spec.id}-${i + 1}.xml`,
        lastmod,
      }));
    });
}
