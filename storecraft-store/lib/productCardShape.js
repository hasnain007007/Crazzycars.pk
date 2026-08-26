import { productPath } from "@/lib/productPath";
import { effectiveUnitPrice, isSaleCurrentlyActive } from "@/lib/storePricing";

const GENERIC_ALTS = new Set(["", "product", "image", "photo", "img", "n/a", "na"]);
const ALT_STOP = new Set([
  "the", "and", "with", "for", "from", "style", "car", "cars", "auto",
  "premium", "quality", "pakistan", "crazzycars",
]);

function significantAltTokens(value) {
  return new Set(
    String(value || "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 4 && !ALT_STOP.has(t) && !/^\d+$/.test(t))
  );
}

/** True when image alt is about this product, not a leftover from another SKU. */
export function altBelongsToProduct(alt, product) {
  const altTok = significantAltTokens(alt);
  const own = new Set([
    ...significantAltTokens(product?.name),
    ...significantAltTokens(product?.slug),
  ]);
  if (!altTok.size || !own.size) return false;
  let overlap = 0;
  for (const t of altTok) if (own.has(t)) overlap += 1;
  return overlap >= 2;
}

export function normalizeProductForCard(product) {
  if (!product) return null;
  const slug = String(product.slug || product.handle || "").trim();
  if (!slug) return null;
  const name = String(product.name || product.title || "").trim();
  if (!name) return null;
  return {
    ...product,
    id: product.id || product._id || slug,
    slug,
    name,
    href: product.href || productPath(slug),
  };
}

function pushImageUrl(list, raw) {
  const url = typeof raw === "string" ? raw.trim() : String(raw?.url || "").trim();
  if (url && !list.includes(url)) list.push(url);
}

export function getProductCardImage(product) {
  const list = [];
  pushImageUrl(list, product?.image);
  for (const img of product?.images || []) pushImageUrl(list, img);
  const media = product?.media?.images || [];
  const main = media.find((i) => i?.isMain);
  if (main) pushImageUrl(list, main);
  for (const img of media) pushImageUrl(list, img);
  return list[0] || "";
}

function mediaImageAlt(product) {
  const media = product?.media?.images || [];
  const main = media.find((i) => i?.isMain) || media[0];
  const fromMedia = String(main?.altText || "").trim();
  if (fromMedia && !GENERIC_ALTS.has(fromMedia.toLowerCase())) return fromMedia;
  const fromList = Array.isArray(product?.images)
    ? String(product.images.find((i) => i?.altText)?.altText || "").trim()
    : "";
  if (fromList && !GENERIC_ALTS.has(fromList.toLowerCase())) return fromList;
  return "";
}

export function productCardAlt(product, categoryName) {
  const fromMedia = mediaImageAlt(product);
  if (fromMedia && altBelongsToProduct(fromMedia, product)) return fromMedia;
  const name = String(product?.name || "").trim();
  const cat = String(categoryName || "").trim();
  if (name && cat) return `${name} — ${cat}`;
  if (name) return name;
  if (cat) return `${cat} for cars in Pakistan`;
  return "Car accessory in Pakistan";
}

export function getProductCardPrices(product) {
  if (product?.pricing && typeof product.pricing === "object") {
    const regular = Number(product.pricing.regularPrice) || 0;
    const onSale = isSaleCurrentlyActive(product.pricing);
    const saleRaw = Number(product.pricing.salePrice) || 0;
    const current = onSale && saleRaw > 0 ? saleRaw : effectiveUnitPrice(product) || regular;
    return {
      regular,
      sale: current,
      onSale: Boolean(onSale && regular > current && current > 0),
    };
  }

  const regular = Number(
    product?.regularPrice ?? product?.compareAtPrice ?? product?.compareAt ?? product?.price ?? 0
  );
  const salePrice = Number(product?.salePrice ?? 0);
  const price = Number(product?.price ?? 0);
  const onSale =
    Boolean(product?.isOnSale) || (salePrice > 0 && regular > 0 && salePrice < regular);
  const sale = onSale ? salePrice || price : price || regular;
  return { regular, sale, onSale: Boolean(onSale && regular > sale) };
}

export function getProductCardReviews(product) {
  const reviewCount = Number(
    product?.reviewCount ?? product?.totalReviews ?? product?.numReviews ?? product?.reviews_count ?? 0
  );
  if (!Number.isFinite(reviewCount) || reviewCount <= 0) return null;
  const rating = Number(product?.averageRating ?? product?.ratingAverage ?? product?.rating ?? 0);
  return {
    reviewCount,
    rating: Number.isFinite(rating) && rating > 0 ? rating : null,
  };
}

export function isAllowedNextImageSrc(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    return (
      host === "res.cloudinary.com" ||
      host === "cdn.shopify.com" ||
      host === "upload.wikimedia.org"
    );
  } catch {
    return false;
  }
}
