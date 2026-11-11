# REMEDIATION_REPORT — Stage 3 Indexing & Technical SEO

**Date:** 2026-11-11  
**Base live release:** `c98e0ad` + M1–M4 applied  
**Working branch:** `fix/crazzycars-indexing-seo-2026-11-11`  
**Scope:** Code-only SEO fixes + audits. **No deploy. No Mongo writes.**

## What was already complete (not repeated)

- Fitment P0 code + M1–M4 data  
- HUD category → PDP redirects  
- Fake purchase toast removal  
- Soft-404 empty category 410s (security-gadgets etc.)

## GSC

**Blocked by access.** Public crawl used instead — see `GSC_INDEXING_AUDIT.md`.

## Issues found & actions

| ID | Issue | Action |
| --- | --- | --- |
| SEO-S3-001 | `/categories/*?page=1` and `/cars/[slug]?page=1` return 200 duplicates | **Fixed locally** — expand S10 strip via `listingPageOneRedirect.mjs` + middleware |
| SEO-S3-002 | Dead `.atom` / `/atom` return 404 | **Fixed locally** — broader 410; preserve `/feed/*` |
| SEO-S3-003 | Tucson hybrid 2025 | **HOLD** — keep 404; no cross-gen redirect |
| SEO-S3-004 | S5 blog thin / crawled-not-indexed | **HOLD** — needs `GO S5` content/DB |
| SEO-S3-005 | Swift RS kit title vs VC years | **HOLD** — ambiguous fitment |
| SEO-S3-006 | Multi-gen Swift mats/handles | **HOLD** — ambiguous |
| SEO-S3-007 | `VEHICLE_SLUGS_MUST_404` lists audi-a5 but hub is live with products | **No change** — do not force 404 |

## Code changes

| File | Change |
| --- | --- |
| `storecraft-store/lib/listingPageOneRedirect.mjs` | **New** — page=1 eligibility + gone atom helpers |
| `storecraft-store/middleware.js` | Wire helpers |
| `tests/listing-page-one-redirect.test.mjs` | **New** regression |

## Intentionally preserved

- Legitimate 404s (Tucson hybrid, missing products)  
- Intentional 308s (collections, products→shop, deals→sale)  
- Checkout/search noindex / redirect behaviour  
- Live `/feed/products.xml`  

## Recommendation

**CONDITIONAL GO** for a code-only deploy of this branch tip after owner names the SHA.  
Does not include S5/Tucson/ambiguous fitment data changes.
