/**
 * Link-preview cards (1200×630 JPEG) for WhatsApp / Facebook / X.
 *
 *   /og/p/<product-slug>.jpg     product: photo + name + price + COD/delivery
 *   /og/c/<category-slug>.jpg    category: title + 3 real product photos
 *   /og/car/<vehicle-slug>.jpg   car hub: car name + 3 fitted product photos
 *
 * Only real catalogue slugs render (no free-text input), so the domain cannot be
 * used to mint arbitrary images. Unknown slugs 302 to the static fallback image.
 */
import { dbConnect } from "@/lib/db";
import Product from "@/lib/models/Product.model";
import Category from "@/lib/models/Category.model";
import { displayProductName } from "@/lib/displayProductName";
import { effectiveUnitPrice } from "@/lib/storePricing";
import { productAllowsCod } from "@/lib/codEligibility";
import { resolvePrimaryProductImageUrl, productHasRealImage } from "@/lib/productImages";
import { loadStoreCategoryDetail } from "@/lib/storeCategoryData";
import { loadProductsForVehicle, loadVehicleBySlug } from "@/lib/vehiclePageData";
import { PRODUCT_H1_OVERRIDES } from "@/lib/seo/gscAudit2026-10.mjs";
import { FALLBACK_OG_IMAGE_PATH } from "@/lib/pageMetadata";
import { absoluteUrl } from "@/lib/siteUrl";
import { CollectionCard, ProductCard, photoDataUri, renderOgJpeg } from "@/lib/ogCard";

const CACHE = new Map();
const TTL_MS = 6 * 60 * 60 * 1000;
const MAX_ENTRIES = 300;

function cacheGet(key) {
  const hit = CACHE.get(key);
  if (!hit) return null;
  if (Date.now() - hit.t > TTL_MS) {
    CACHE.delete(key);
    return null;
  }
  return hit.buf;
}

function cacheSet(key, buf) {
  if (CACHE.size >= MAX_ENTRIES) CACHE.delete(CACHE.keys().next().value);
  CACHE.set(key, { buf, t: Date.now() });
}

function jpegResponse(buf) {
  return new Response(buf, {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(buf.length),
      "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}

function imageOf(p) {
  return p?.image || p?.images?.[0] || resolvePrimaryProductImageUrl(p) || "";
}

/** COD badge for a set of products — never claim COD for prepaid-only shelves. */
function codMode(products) {
  const allowed = products.filter((p) => productAllowsCod(p)).length;
  if (!allowed) return "none";
  return allowed === products.length ? "all" : "some";
}

/** First `n` products whose photo actually loads. */
async function firstPhotos(products, sizes) {
  const out = [];
  for (const p of products) {
    if (out.length >= sizes.length) break;
    const src = imageOf(p);
    if (!src || /-placeholder/i.test(src)) continue;
    const uri = await photoDataUri(src, sizes[out.length]);
    if (uri) out.push(uri);
  }
  while (out.length < sizes.length) out.push(null);
  return out;
}

async function productCard(slug) {
  const p = await Product.findOne({ slug, status: "active", securityHold: { $ne: true } })
    .select("name slug media pricing codEligible codEnabled categories tags isBodyKit")
    .populate("categories", "name slug")
    .lean();
  if (!p || !productHasRealImage(p)) return null;
  const price = effectiveUnitPrice(p);
  const regular = Number(p.pricing?.regularPrice) || 0;
  const photo = await photoDataUri(resolvePrimaryProductImageUrl(p), 600);
  return ProductCard({
    name: PRODUCT_H1_OVERRIDES[slug] || displayProductName(p.name),
    price,
    regular: regular > price ? regular : 0,
    photo,
    cod: productAllowsCod(p),
  });
}

async function categoryCard(slug) {
  const detail = await loadStoreCategoryDetail(slug, { limit: 48 });
  const name = String(detail?.category?.name || "").trim();
  const products = detail?.products || [];
  if (!name || !products.length) return null;
  const count = Number(detail.productCount) || products.length;
  return CollectionCard({
    kicker: "Shop by category",
    title: name,
    sub: `${count} products with prices in Pakistan`,
    photos: await firstPhotos(products, [392, 188, 188]),
    // Body-kit shelves are prepaid even if a summary row lacks category data.
    cod: /body-?kit/.test(slug) ? "none" : codMode(products),
  });
}

async function carCard(slug) {
  const vehicle = await loadVehicleBySlug(slug);
  if (!vehicle || String(vehicle.slug) !== slug) return null;
  // Same cap as the car page metadata, so the count matches the hub.
  const products = await loadProductsForVehicle(vehicle, { limit: 500 });
  if (!products.length) return null;
  return CollectionCard({
    kicker: "Accessories for",
    title: String(vehicle.displayName || "").trim() || slug,
    sub: `${products.length} accessories that fit your car`,
    photos: await firstPhotos(products, [392, 188, 188]),
    cod: codMode(products),
  });
}

/**
 * Site card — the default share image (homepage, shop, blogs, city pages).
 * Rendered from live data; /og/default-1200x630.jpg is only the emergency fallback.
 */
const SITE_HERO_CATEGORY = "body-kits-extensions"; // CrazzyCars-plated Elantra kit photo
// First two fill the small tiles; the rest are backups if a photo is missing.
const SITE_PHOTO_SLUGS = [
  "honda-civic-x-batman-style-side-mirror-cover",
  "osram-projector-lights-3-colour-premium-quality",
  "2pcs-front-bumper-lip-splitter-chin-spoiler-for-honda-civic-11th-gen-2022-2026-gloss-black",
  "toyota-yaris-2020-2021-complete-body-kit",
];

async function siteCard(slug) {
  if (slug !== "home") return null;
  const [cat, rows] = await Promise.all([
    Category.findOne({ slug: SITE_HERO_CATEGORY }).select("image").lean(),
    Product.find({ slug: { $in: SITE_PHOTO_SLUGS }, status: "active" }).select("slug media").lean(),
  ]);
  const ordered = SITE_PHOTO_SLUGS.map((s) => rows.find((r) => r.slug === s)).filter(Boolean);
  const sources = [cat?.image?.url ? { image: cat.image.url } : null, ...ordered].filter(Boolean);
  return CollectionCard({
    kicker: "Gaari wohi, andaz naya",
    title: "Car Accessories in Pakistan",
    sub: "Body kits, LED lights, carbon fiber and interior — fitted to your car",
    photos: await firstPhotos(sources, [392, 188, 188]),
    cod: "some",
  });
}

const BUILDERS = { p: productCard, c: categoryCard, car: carCard, site: siteCard };

export async function GET(_request, { params }) {
  const { kind, slug: rawSlug } = await params;
  const slug = String(rawSlug || "")
    .replace(/\.jpe?g$/i, "")
    .trim()
    .toLowerCase();
  const build = BUILDERS[kind];
  const fallback = () => Response.redirect(absoluteUrl(FALLBACK_OG_IMAGE_PATH), 302);
  if (!build || !slug || !/^[a-z0-9-]{1,160}$/.test(slug)) return fallback();

  const key = `${kind}/${slug}`;
  const cached = cacheGet(key);
  if (cached) return jpegResponse(cached);

  try {
    await dbConnect();
    const element = await build(slug);
    if (!element) return fallback();
    const buf = await renderOgJpeg(element);
    cacheSet(key, buf);
    return jpegResponse(buf);
  } catch (err) {
    console.error("[og card]", key, err?.message || err);
    return fallback();
  }
}
