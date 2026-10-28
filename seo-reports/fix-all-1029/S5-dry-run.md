# S5 — Zero-impression blogs (dry-run only)

**Status:** dry-run. No content/DB writes. Awaiting GSC “Crawled – currently not indexed” slug list + `GO S5` for expansions.

## Method
- All `/blogs/*` URLs from `https://crazzycars.pk/sitemap-blog.xml` (18 posts).
- Impression map from `seo-data/Pages.csv` (42 `/blogs` rows; **none** have 0 impressions).
- Zero-impression = present in sitemap, **absent** from Pages.csv (treated as 0 impressions).
- Age filter: `lastmod` older than 14 days (today 2026-10-29).

## Results (3 posts)

| Path | lastmod | Word count (approx, article/main text) | Inbound internal link sources (approx) |
|------|---------|------------------------------------------|----------------------------------------|
| `/blogs/car-perfume-air-freshener-guide` | 2026-08-01 | 480 | 1 (`/blogs` index) |
| `/blogs/car-care-101-essential-products-pakistan` | 2025-05-23 | 535 | 1 (`/blogs` index) |
| `/blogs/protect-car-interior-from-pakistan-heat` | 2025-01-02 | 504 | 0 |

JSON: `seo-reports/fix-all-1029/S5-zero-impression-blogs.json`

## Notes
- All three are under 600 words — expansion candidates once GSC slugs arrive / `GO S5`.
- Do not expand until owner confirms these (or GSC crawl set) are the targets.
