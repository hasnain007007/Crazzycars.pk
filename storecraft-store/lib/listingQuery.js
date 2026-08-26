/**
 * Shared listing URL helpers for /categories/[slug], /cars/[slug], /shop.
 * Server pages read searchParams; client toolbar only patches the query string.
 */
import { absoluteUrl } from "@/lib/siteUrl";
import {
  DEFAULT_LISTING_PAGE_SIZE,
  normalizeListingPageSize,
  normalizeListingSort,
  normalizeListingView,
} from "@/lib/productListing";
import { ROBOTS_INDEX_FOLLOW, ROBOTS_NOINDEX_FOLLOW } from "@/lib/seo/robotsMeta";

/** Query keys that make a listing a filtered/facet variant (noindex). `page` is allowed. */
export const LISTING_FACET_KEYS = [
  "sort",
  "q",
  "view",
  "per_page",
  "show",
  "brand",
  "make",
  "model",
  "carMake",
  "carModel",
  "carYear",
  "year",
  "min",
  "max",
  "priceFrom",
  "priceTo",
  "minPrice",
  "maxPrice",
  "inStock",
  "outOfStock",
  "sale",
  "deals",
  "category",
  "filter",
];

export function readSearchParam(sp, key) {
  if (!sp) return "";
  const v = typeof sp.get === "function" ? sp.get(key) : sp[key];
  if (Array.isArray(v)) return String(v[0] ?? "").trim();
  if (v == null) return "";
  return String(v).trim();
}

function truthyFlag(raw) {
  const v = String(raw || "").toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function parseListingSearchParams(sp) {
  return {
    sort: normalizeListingSort(readSearchParam(sp, "sort")),
    view: normalizeListingView(readSearchParam(sp, "view")),
    pageSize: normalizeListingPageSize(
      readSearchParam(sp, "per_page") || readSearchParam(sp, "show")
    ),
    page: Math.max(1, parseInt(readSearchParam(sp, "page"), 10) || 1),
    q: readSearchParam(sp, "q"),
    category: readSearchParam(sp, "category"),
    sale: truthyFlag(readSearchParam(sp, "sale")),
    deals: truthyFlag(readSearchParam(sp, "deals")),
    make: readSearchParam(sp, "make") || readSearchParam(sp, "carMake"),
    model: readSearchParam(sp, "model") || readSearchParam(sp, "carModel"),
    year: readSearchParam(sp, "year") || readSearchParam(sp, "carYear"),
    brand: readSearchParam(sp, "brand"),
    minPrice: readSearchParam(sp, "minPrice") || readSearchParam(sp, "priceFrom"),
    maxPrice: readSearchParam(sp, "maxPrice") || readSearchParam(sp, "priceTo"),
    inStock: truthyFlag(readSearchParam(sp, "inStock")),
    outOfStock: truthyFlag(readSearchParam(sp, "outOfStock")),
  };
}

export function listingHasFacets(listing) {
  if (!listing) return false;
  return Boolean(
    listing.sort !== "default" ||
      listing.view !== "grid" ||
      listing.pageSize !== DEFAULT_LISTING_PAGE_SIZE ||
      listing.q ||
      listing.category ||
      listing.sale ||
      listing.deals ||
      listing.make ||
      listing.model ||
      listing.year ||
      listing.brand ||
      listing.minPrice ||
      listing.maxPrice ||
      listing.inStock ||
      listing.outOfStock
  );
}

/** Self-referencing canonical path. Facet URLs collapse to the clean listing URL. */
export function listingCanonicalPath(pathname, listing) {
  const path = String(pathname || "/").split("?")[0] || "/";
  if (listingHasFacets(listing)) return path;
  if (listing?.page > 1) return `${path}?page=${listing.page}`;
  return path;
}

export function listingRobots(listing, { thin = false } = {}) {
  if (thin || listingHasFacets(listing)) return ROBOTS_NOINDEX_FOLLOW;
  return ROBOTS_INDEX_FOLLOW;
}

export function listingMetadata(pathname, listing, { thin = false } = {}) {
  const path = listingCanonicalPath(pathname, listing);
  return {
    robots: listingRobots(listing, { thin }),
    alternates: { canonical: absoluteUrl(path) },
  };
}

function omitDefaultUrlValue(key, val) {
  if (val == null || val === "" || val === false) return true;
  if (key === "sort" && val === "default") return true;
  if (key === "view" && val === "grid") return true;
  if (key === "per_page" && Number(val) === DEFAULT_LISTING_PAGE_SIZE) return true;
  if (key === "page" && Number(val) <= 1) return true;
  return false;
}

/** Serializable query map for client toolbar / pagination (no useSearchParams). */
export function listingToUrlState(listing) {
  if (!listing) return {};
  const state = {};
  if (listing.sort && listing.sort !== "default") state.sort = listing.sort;
  if (listing.view && listing.view !== "grid") state.view = listing.view;
  if (listing.pageSize && listing.pageSize !== DEFAULT_LISTING_PAGE_SIZE) {
    state.per_page = String(listing.pageSize);
  }
  if (listing.page > 1) state.page = String(listing.page);
  if (listing.q) state.q = listing.q;
  if (listing.category) state.category = listing.category;
  if (listing.sale) state.sale = "true";
  if (listing.deals) state.deals = "1";
  if (listing.make) state.make = listing.make;
  if (listing.model) state.model = listing.model;
  if (listing.year) state.year = listing.year;
  if (listing.brand) state.brand = listing.brand;
  if (listing.minPrice) state.minPrice = String(listing.minPrice);
  if (listing.maxPrice) state.maxPrice = String(listing.maxPrice);
  if (listing.inStock) state.inStock = "true";
  if (listing.outOfStock) state.outOfStock = "true";
  return state;
}

export function hrefFromUrlState(pathname, urlState = {}) {
  const path = String(pathname || "/").split("?")[0] || "/";
  const qs = new URLSearchParams();
  Object.entries(urlState || {}).forEach(([key, val]) => {
    if (omitDefaultUrlValue(key, val)) return;
    qs.set(key, String(val));
  });
  const s = qs.toString();
  return s ? `${path}?${s}` : path;
}

export function listingHref(pathname, listing, patch = {}, { resetPage = false } = {}) {
  const next = { ...(listing || {}), ...patch };
  if (resetPage) next.page = 1;
  return hrefFromUrlState(pathname, listingToUrlState(next));
}

export function listingPageHref(pathname, urlState, pageNum) {
  const next = { ...(urlState || {}) };
  if (pageNum <= 1) delete next.page;
  else next.page = String(pageNum);
  return hrefFromUrlState(pathname, next);
}

export function shopListingTitle(listing) {
  if (listing?.q) return `Results for “${listing.q}”`;
  if (listing?.sale || listing?.deals) return "On Sale";
  if (listing?.category === "kitchen-accessories") return "Kitchen Accessories";
  if (listing?.category === "beauty-bags") return "Beauty Bags";
  if (listing?.category === "ladies-bags") return "Ladies Bags";
  if (listing?.brand) return `${listing.brand} bags`;
  return "Shop Homefy";
}
