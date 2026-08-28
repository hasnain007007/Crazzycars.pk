/** Shared product listing toolbar / view / sort / page-size config. */

export const DEFAULT_LISTING_PAGE_SIZE = 40;

export const LISTING_PAGE_SIZES = [16, 24, 32, 40, 48];

export const LISTING_VIEWS = [
  { id: "grid", label: "Large grid", cols: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" },
  { id: "grid-dense", label: "Dense grid", cols: "grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6" },
  { id: "list", label: "List", cols: "grid-cols-1" },
  { id: "detail", label: "Detailed list", cols: "grid-cols-1" },
];

export const LISTING_SORT_OPTIONS = [
  { value: "default", label: "Default sorting", api: "newest" },
  { value: "popular", label: "Sort by popularity", api: "popular" },
  { value: "rating", label: "Sort by average rating", api: "rating" },
  { value: "latest", label: "Sort by latest", api: "newest" },
  { value: "price-asc", label: "Sort by price: low to high", api: "price-asc" },
  { value: "price-desc", label: "Sort by price: high to low", api: "price-desc" },
];

export function normalizeListingView(raw) {
  const id = String(raw || "").trim();
  return LISTING_VIEWS.some((v) => v.id === id) ? id : "grid";
}

export function normalizeListingSort(raw) {
  const id = String(raw || "").trim();
  return LISTING_SORT_OPTIONS.some((o) => o.value === id) ? id : "default";
}

export function normalizeListingPageSize(raw, fallback = DEFAULT_LISTING_PAGE_SIZE) {
  const n = parseInt(raw, 10);
  if (LISTING_PAGE_SIZES.includes(n)) return n;
  return fallback;
}

export function listingSortToApi(sortValue) {
  const opt = LISTING_SORT_OPTIONS.find((o) => o.value === sortValue);
  return opt?.api || "newest";
}

/** Mongo sort for listing pages — matches /api/products field sorts. */
export function listingMongoSortSpec(sortValue) {
  switch (normalizeListingSort(sortValue)) {
    case "price-asc":
      return { "pricing.regularPrice": 1 };
    case "price-desc":
      return { "pricing.regularPrice": -1 };
    case "popular":
      return { reviewCount: -1, createdAt: -1 };
    case "rating":
      return { averageRating: -1, reviewCount: -1, createdAt: -1 };
    default:
      return { createdAt: -1 };
  }
}

export function sortProductsClient(products, sortValue) {
  const rows = [...(products || [])];
  const priceOf = (p) => {
    const regular = Number(p.pricing?.regularPrice ?? p.regularPrice ?? p.price ?? 0);
    const sale = Number(p.pricing?.salePrice ?? p.salePrice ?? 0);
    return sale > 0 && sale < regular ? sale : regular;
  };
  const ratingOf = (p) =>
    Number(p.averageRating ?? p.ratingAverage ?? p.rating ?? 0);
  const reviewsOf = (p) => Number(p.reviewCount ?? p.totalReviews ?? p.numReviews ?? 0);

  switch (sortValue) {
    case "price-asc":
      rows.sort((a, b) => priceOf(a) - priceOf(b));
      break;
    case "price-desc":
      rows.sort((a, b) => priceOf(b) - priceOf(a));
      break;
    case "popular":
      rows.sort((a, b) => reviewsOf(b) - reviewsOf(a) || ratingOf(b) - ratingOf(a));
      break;
    case "rating":
      rows.sort((a, b) => ratingOf(b) - ratingOf(a) || reviewsOf(b) - reviewsOf(a));
      break;
    case "latest":
      rows.sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      break;
    case "default":
    default:
      rows.sort((a, b) => {
        const fa = a.featured ? 1 : 0;
        const fb = b.featured ? 1 : 0;
        if (fb !== fa) return fb - fa;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
      break;
  }
  return rows;
}

export function formatShowingLabel({ total, page, pageSize, loading = false }) {
  if (loading || total === -1) return "Searching…";
  const t = Number(total) || 0;
  if (t <= 0) return "No results";
  if (t <= pageSize) return `Showing all ${t} results`;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, t);
  return `Showing ${from}–${to} of ${t} results`;
}

export function pageWindow(page, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const out = new Set([1, totalPages, page - 1, page, page + 1, page - 2, page + 2]);
  return [...out].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
}
