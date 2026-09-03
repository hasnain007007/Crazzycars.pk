import { productPath } from "@/lib/productPath";
import { effectiveUnitPrice, isSaleCurrentlyActive } from "@/lib/storePricing";

const GENERIC_ALTS = new Set(["", "product", "image", "photo", "img", "n/a", "na"]);
const ALT_STOP = new Set([
  "the", "and", "with", "for", "from", "style", "car", "cars", "auto",
  "premium", "quality", "pakistan", "crazzycars",
  "black", "white", "red", "blue", "green", "grey", "gray", "silver", "chrome",
  "gold", "carbon", "glossy", "matte", "matt", "fiber", "glass", "leather",
  "fabric", "vinyl", "plastic", "pair", "pack", "kits", "ultra", "super", "plus",
  "pcs", "piece", "pieces", "detail", "angle", "closeup", "zoom", "view", "shot",
  "thumb", "gallery", "main", "cover", "lifestyle", "studio",
  "plug", "play", "shop", "online", "installed", "genuine", "original",
  "compatible",
]);
const FOREIGN_SIGNAL = new Set(["dragon"]);
const MAKES = new Set([
  "honda", "toyota", "suzuki", "hyundai", "kia", "changan", "haval", "mg",
]);
const MODELS = new Set([
  "civic", "city", "corolla", "alto", "vezel", "fortuner", "hilux", "revo",
  "aqua", "prius", "vitz", "yaris", "premio", "sportage", "tucson", "elantra",
  "sonata", "picanto", "cultus", "swift", "mehran", "bolan", "jimny", "accord",
  "rebirth", "reborn", "prado",
]);

export function significantAltTokens(value) {
  return new Set(
    String(value || "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(
        (t) =>
          t.length >= 4 &&
          !ALT_STOP.has(t) &&
          !/^\d+$/.test(t) &&
          !/^[a-f0-9]{8,}$/i.test(t)
      )
  );
}

function productOwnBlob(product) {
  return `${product?.name || ""} ${product?.slug || ""} ${product?.shortDescription || ""}`.toLowerCase();
}

function ownTokens(product) {
  return new Set([
    ...significantAltTokens(product?.name),
    ...significantAltTokens(product?.slug),
    ...significantAltTokens(product?.shortDescription),
  ]);
}

/** Store listing name is "RGB Side Style"; files/copy still say dragon-style. */
function ownsDragonStyle(product) {
  const own = productOwnBlob(product);
  return own.includes("dragon") || own.includes("rgb-side-style") || /\brgb side style\b/.test(own);
}

function ownsDynamicBumper(product) {
  const own = productOwnBlob(product);
  return (
    own.includes("dynamic") ||
    own.includes("x-dynamic") ||
    own.includes("xdynamic") ||
    (own.includes("side-style") && own.includes("bumper")) ||
    (own.includes("side style") && own.includes("bumper"))
  );
}

function ownHasToken(own, t) {
  if (own.has(t)) return true;
  if (t.endsWith("s") && own.has(t.slice(0, -1))) return true;
  if (own.has(`${t}s`)) return true;
  return false;
}

function isUniversalProduct(product) {
  if (product?.isUniversal) return true;
  const blob = `${product?.name || ""} ${product?.slug || ""}`.toLowerCase();
  return /\buniversal\b/.test(blob);
}

function leftoverSkuMarker(text, product) {
  const s = String(text || "").toLowerCase();
  if (s.includes("dragon") && !ownsDragonStyle(product)) return true;
  if ((s.includes("x-dynamic") || s.includes("xdynamic")) && !ownsDynamicBumper(product)) return true;
  return false;
}

function vehicleConflict(tok, own) {
  const foreignMakes = [...tok].filter((t) => MAKES.has(t) && !ownHasToken(own, t));
  const foreignModels = [...tok].filter((t) => MODELS.has(t) && !ownHasToken(own, t));
  if (foreignMakes.length >= 2) return false;
  if (foreignModels.length) return true;
  if (foreignMakes.length === 1) return true;
  return false;
}

function looksLikeForeignProduct(tok, product) {
  const own = ownTokens(product);
  if (!tok.size || !own.size) return false;
  const allowDragon = ownsDragonStyle(product);
  for (const t of tok) {
    if (t === "dragon" && allowDragon) continue;
    if (!ownHasToken(own, t) && FOREIGN_SIGNAL.has(t)) return true;
  }
  if (isUniversalProduct(product)) return false;
  return vehicleConflict(tok, own);
}

function tokensBelongToProduct(tok, product) {
  const own = ownTokens(product);
  if (!tok.size || !own.size) return false;
  let overlap = 0;
  for (const t of tok) if (own.has(t)) overlap += 1;
  if (overlap < 2) return false;
  return !looksLikeForeignProduct(tok, product);
}

/** True when image alt is about this product, not a leftover from another SKU. */
export function altBelongsToProduct(alt, product) {
  return tokensBelongToProduct(significantAltTokens(alt), product);
}

/**
 * Drop leftover photos copied from another SKU (wrong alt and/or Cloudinary filename).
 * Keep in sync with storecraft-admin/lib/mediaAltGuard.js.
 */
export function imageBelongsToProduct(image, product) {
  const alt = typeof image === "string" ? "" : String(image?.altText || image?.alt || "").trim();
  const url = typeof image === "string" ? image : String(image?.url || "").trim();
  const last = url.split("/").pop() || "";
  const filePart = last.replace(/\.[a-z0-9]+(\?.*)?$/i, "");
  const fileTok = significantAltTokens(filePart);
  if (leftoverSkuMarker(last, product)) return false;
  if (fileTok.size && looksLikeForeignProduct(fileTok, product)) return false;
  if (fileTok.size) return true;
  if (leftoverSkuMarker(alt, product)) return false;
  if (alt && !GENERIC_ALTS.has(alt.toLowerCase()) && looksLikeForeignProduct(significantAltTokens(alt), product)) {
    return false;
  }
  return true;
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
  const media = Array.isArray(product?.media?.images) ? product.media.images : [];
  const owned = media.filter((img) => imageBelongsToProduct(img, product));
  const main = owned.find((i) => i?.isMain) || owned[0];
  if (main?.url) return String(main.url).trim();

  const rejected = new Set(
    media
      .filter((img) => !imageBelongsToProduct(img, product))
      .map((img) => String(img?.url || "").trim())
      .filter(Boolean)
  );
  const list = [];
  pushImageUrl(list, product?.image);
  for (const img of product?.images || []) pushImageUrl(list, img);
  return list.find((url) => url && !rejected.has(url) && imageBelongsToProduct({ url, altText: "" }, product)) || "";
}

function mediaImageAlt(product) {
  const media = product?.media?.images || [];
  const owned = media.filter((img) => imageBelongsToProduct(img, product));
  const main = owned.find((i) => i?.isMain) || owned[0];
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
  const raw = String(url || "").trim();
  if (!raw || raw.startsWith("/_next/image")) return false;
  // Local /media must never hit /_next/image (invalid q/w → 400, self-fetch timeouts).
  if (/crazzycars\.pk\/media\/|^\/media\//i.test(raw)) return false;
  try {
    const host = new URL(raw).hostname.replace(/^www\./, "").toLowerCase();
    return (
      host === "res.cloudinary.com" ||
      host === "cdn.shopify.com" ||
      host === "upload.wikimedia.org"
    );
  } catch {
    return false;
  }
}
