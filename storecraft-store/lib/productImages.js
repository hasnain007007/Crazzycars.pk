/**
 * Single source of truth for product image URLs used by JSON-LD, cards, and feeds.
 * Prefer live /media URLs; never emit empty when Mongo still has usable media.
 */

import { getSiteUrl } from "./siteUrl.js";

const DEAD_CLOUDINARY_RE = /res\.cloudinary\.com|dquier8fv/i;

function siteOrigin() {
  return String(getSiteUrl() || "https://crazzycars.pk").replace(/\/+$/, "");
}

export function isDeadRemoteImageUrl(url) {
  return DEAD_CLOUDINARY_RE.test(String(url || ""));
}

/** Normalize a media row or string into an absolute https URL (or ""). */
export function absolutizeProductImageUrl(raw, siteUrl = siteOrigin()) {
  let href = String(typeof raw === "string" ? raw : raw?.url || "").trim();
  if (!href) return "";
  if (isDeadRemoteImageUrl(href)) return "";
  if (href.startsWith("//")) href = `https:${href}`;
  else if (href.startsWith("/")) href = `${siteUrl}${href}`;
  else if (!/^https?:\/\//i.test(href)) return "";
  return href;
}

function collectRawImages(product) {
  const out = [];
  const push = (raw) => {
    if (raw == null || raw === "") return;
    out.push(raw);
  };
  const media = Array.isArray(product?.media?.images) ? product.media.images : [];
  // Main first
  const sorted = [...media].sort((a, b) => Number(Boolean(b?.isMain)) - Number(Boolean(a?.isMain)));
  for (const img of sorted) push(img);
  for (const img of product?.images || []) push(img);
  if (product?.image) push(product.image);
  return out;
}

/**
 * Ordered absolute image URLs for Product JSON-LD / OG / cards.
 * Skips dead Cloudinary hosts. Never returns [] when local /media exists.
 */
export function resolveProductImageUrls(product, { siteUrl } = {}) {
  const site = siteUrl || siteOrigin();
  const urls = [];
  for (const item of collectRawImages(product)) {
    const abs = absolutizeProductImageUrl(item, site);
    if (abs && !urls.includes(abs)) urls.push(abs);
  }
  return urls;
}

export function resolvePrimaryProductImageUrl(product, opts) {
  return resolveProductImageUrls(product, opts)[0] || "";
}

const PLACEHOLDER_IMAGE_RE = /-placeholder(\.|\-sm\.|\-md\.|\-lg\.)/i;

/** True when the product has at least one non-placeholder photo for schema/sitemap. */
export function productHasRealImage(product) {
  const media = Array.isArray(product?.media?.images) ? product.media.images : [];
  if (media.some((im) => im?.isPlaceholder === true)) {
    const real = media.filter((im) => im?.isPlaceholder !== true && String(im?.url || "").trim());
    if (!real.length) return false;
  }
  const urls = resolveProductImageUrls(product);
  if (!urls.length) return false;
  return urls.some((u) => !PLACEHOLDER_IMAGE_RE.test(u));
}

/** True when seo.canonical points at a different host than this storefront. */
export function productHasExternalCanonical(product, siteUrl = siteOrigin()) {
  const raw = String(product?.seo?.canonical || product?.canonical || "").trim();
  if (!raw || !/^https?:\/\//i.test(raw)) return false;
  try {
    const canonHost = new URL(raw).hostname.replace(/^www\./, "").toLowerCase();
    const siteHost = new URL(siteUrl).hostname.replace(/^www\./, "").toLowerCase();
    return Boolean(canonHost && siteHost && canonHost !== siteHost);
  } catch {
    return false;
  }
}
