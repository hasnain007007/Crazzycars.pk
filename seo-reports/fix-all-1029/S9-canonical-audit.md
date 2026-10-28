# S9 Canonical audit — "Alternate page with proper canonical"

No dedicated GSC export of the 93 URLs was in-repo. Pattern audit from `seo-data/Pages.csv` (898 rows) plus live probes.

## Pattern groups (likely alternate / duplicate surfaces)

| Pattern | Count in Pages.csv | Expected canonical behaviour | Live check |
|---------|-------------------:|------------------------------|------------|
| Flat product `/slug` | 450 | Self-canonical on PDP | OK (sitemap products) |
| `/products/<handle>` | 187 | 308 → flat `/slug` | Confirmed 308 → flat (e.g. top-ac-panel) |
| `/cars/<slug>` | 64 | Self-canonical | OK |
| `/categories/<slug>` | 45 | Self-canonical | OK |
| `/collections/<handle>` | 40 | 308 → category/car/shop | Middleware `resolveCollectionRedirect` |
| `?page=N` | 39 | Listing self-canonical or intentional | **`/shop?page=2` → canonical `…/shop?page=2`, index,follow** (deliberate) |
| `/blogs/<slug>` | 21 | Self-canonical | OK |
| `/blogs/news/<handle>` | 20 | 308 (S2a subset) or 404 | S2a 10 live; rest still 404 |
| `/pages/<slug>` | 12 | 308 → clean path | next.config |
| `?variant&country&currency` | 2 | Stripped / product redirect | Middleware strip + product redirect |

## Bugs checked

1. **Canonical → redirect?** Sampled sitemap URLs (80) + C23 full pass (532): no sitemap URL redirects; self-canonical OK.
2. **Canonical → noindex?** C2/C23: no sitemap URL is noindex.
3. **`/shop?page=N`:** Self-canonical by design (`listingCanonicalPath` keeps `?page=` when not faceted). Not a bug — deliberate pagination indexing. Faceted `q/sort/filter` collapse canonical to `/shop` and noindex.

## Remaining noise (not bugs)

- GSC still lists Shopify `/products/` and `/collections/` — already one-hop 308 to live URLs; will age out.
- Untouched `/blogs/news/*` 410-candidates still 404 (S2b awaiting GO).
- `www` vs apex (1 row) — HSTS/host normalize elsewhere.

## Fixes applied this loop

- None required for canonical→redirect/noindex bugs.
- S2a removed 10 `/blogs/news` 404s via 308 (reduces alternate/not-found noise).
