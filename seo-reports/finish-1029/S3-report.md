# S3 apply report (finish-1029)

## A. Non-car legacy → 410 applied (zero clicks; not already redirecting)

| Path | Prior | Clicks | Imps | Action |
|------|-------|--------|------|--------|
| `/categories/fancy-air-fresheners` | 404 | 0 | 0 | **410** |
| `/categories/kitchen-accessories` | 404 | 0 | 0 | **410** |
| `/categories/cookware` | 404 | 0 | 0 | **410** |
| `/categories/storage-containers` | 404 | 0 | 0 | **410** |
| `/categories/cutlery-gadgets` | 404 | 0 | 1 | **410** (listed: had impressions) |
| `/categories/dining-serveware` | 404 | 0 | 0 | **410** |
| `/categories/beauty-bags` | 404 | 0 | 0 | **410** |
| `/categories/makeup-pouches` | 404 | 0 | 18 | **410** (listed: had impressions) |
| `/categories/travel-toiletry-bags` | 404 | 0 | 11 | **410** (listed: had impressions) |
| `/categories/vanity-organizer-bags` | 404 | 0 | 0 | **410** |
| `/categories/mini-handbags` | 404 | 0 | 0 | **410** |

Code: `lib/goneCategoryPaths.mjs` + middleware.

## B. Not touched (redirects or clicks)

| Path | Why |
|------|-----|
| `/categories/fragrances` | Already **308** → air-freshener; **1 click / 14 imps** — do not 410 |
| `/categories/hanging-perfumes` | Already **308** → air-freshener — do not touch redirecting legacy |

## C. Empty car categories — noindex / nav / sitemap

| Finding | Action |
|---------|--------|
| Most empty car leaf URLs already **404** + not-found **noindex** via `isEmptyCategoryTree` → `notFound()` | Already satisfied |
| Already absent from `sitemap-categories.xml` (except live shelves) | Already satisfied |
| Nav pruned via `pruneCategoryTreeWithoutProducts` / `filterLinksToLiveCategories` | Already satisfied |
| `/categories/car-care-safety` | **Skipped** — live **200** with **4 products**; stays indexable + in sitemap |
| Remaining empty car slugs from S3-list (antennas, seat-covers, dash-cameras, …) | Already 404/noindex; no code change |

## D. Everything else listed (not applied)

- Non-empty car categories and all redirecting legacy `/products/`, `/product/`, `/collections/`, `/pages/` — **untouched** per standing rules.
