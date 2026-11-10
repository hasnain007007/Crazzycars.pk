# BASELINE — 11 November 2026

## Git

- Branch: `fix/crazzycars-seo-aeo-geo-2026-11-11`
- Commit at start: `0df2d2f`
- Prior controlled SEO release: `67bef50` (DEPLOYED — VERIFIED) — see `seo-reports/2026-11-11-controlled-release-report.md`

## Historical GSC (investigation leads only)

- 3 Aug–2 Nov 2026: 1,242 clicks / 24,788 impressions / 5.01% CTR / ~12.17 avg position
- Indexed 634 / Not indexed 1,030 (historical reasons table retained in mission brief)

## Fresh public observations — verification status

| # | Observation | Live verification 2026-11-11 | Status |
| --- | --- | --- | --- |
| 1 | Alto fender on Swift 2025 page | **Confirmed** — `/2-pcs-set-alto-660cc-…` listed on `/cars/suzuki-swift-2025-present`. API VC rows include both Alto **and** Swift 2025–2026. | VERIFIED_ISSUE (P0) |
| 2 | 2022–2024 products on Swift 2025 | **Confirmed** several titles (door handles, TPE mats, dashboard mat, RS body kit). Door handles VC includes both gens (possible multi-gen). Body kit title 2022–2024 but VC only 2025–2026 (**title/VC conflict**). | MIXED — incorrect + ambiguous |
| 3 | Splitters contains steering trim + ducktail | **Confirmed** — both listed under `/categories/splitters-side-skirts`; categories arrays include that slug. | VERIFIED_ISSUE (P0/P1) |
| 4 | Vehicle boilerplate | Partially addressed by prior T5/T1; C19 still 11/20 fail live. | OPEN (P2) |
| 5 | Product counts / routes changed | Health 430 vs list API 399 vs shop “Showing 1…” UI — investigate pagination copy separately. | INVESTIGATING |
| 6 | `/products` → `/shop` | **Confirmed** 308 → `/shop` | ALREADY_FIXED / intentional |
| 7 | Homepage payment/COD updated | Policy sourced from `store-policy` — treat checkout as authority if conflict. | VERIFY in Phase F |
| 8 | Review counts | Product cards show stars; schema/review source needs Phase G check (customer-sourced Review model exists). | INVESTIGATING |
| 9 | Shop ~399 products | List API total **399** | VERIFIED |
| 10 | GA4 / ecommerce tracking | Present in `AnalyticsScripts.jsx` — full event matrix Phase I | PENDING |

## Pre-existing SEO live (post 67bef50)

- C1/C3/C4/C18/C21: PASS
- C19: 11/20 fail, sharedBlocks=13
- Oshan alias: 308 → canonical
- Tucson hybrid 2025: 404 (held)
- Side-mirror SKUs both 200 (distinct)

## Uncommitted workspace noise (not part of remediation)

- `AnalyticsScripts.jsx` (thank-you Pixel defer change) — left untouched
- `.gitignore` local edit — left untouched
- Large untracked backup / OPA / image dirs — ignored
