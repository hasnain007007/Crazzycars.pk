# RELEASE_GATE — CONDITIONAL GO → GO (code-only)

**Date:** 2026-11-11  
**Branch:** `fix/crazzycars-seo-aeo-geo-2026-11-11`  
**Previous RC:** `f3e050c` (superseded by this gate commit)  
**Rollback:** `0df2d2f`

## Test fixes (three prior failures)

| Failure | Verdict | Action |
| --- | --- | --- |
| JSON-LD `hasMerchantReturnPolicy` | Pre-existing stale assertion — PDP Offer **must** emit FreeReturn (S8/C11) | Updated test to assert policy fields |
| `/collections/home` → `/` | Pre-existing intentional Shopify home alias | Allow `/` only for home sources; assert `/collections/home` → `/` |
| HUD slug `resolveProductRedirectPath` null | Pre-existing intentional — exact live slug defers to DB page redirect | Updated test; added deleted-path HUD category coverage |

## Suite results (this gate)

```
146 pass / 0 fail
```

Includes prior preflight batch + `release-gate-commerce.test.mjs` + checkout/COD/policy/prepaid suites.

## Commerce / mobile fixtures

| Area | Result |
| --- | --- |
| Mobile navigation contract | **PASS** (StoreHeader drawer + destinations) |
| Variant price selection | **PASS** |
| Add-to-cart / qty / subtotal | **PASS** |
| Shipping 250/500 | **PASS** |
| COD advance tiers 300/600/1000 | **PASS** |
| Prepaid 4% + order total | **PASS** |
| Body-kit COD block message | **PASS** (characterization aligned) |
| Real orders / live payments | **NOT_TESTED** (forbidden) |

## P0 code verification

| P0 | Status |
| --- | --- |
| Alto-on-Swift filter | Wired in `vehiclePageData` + unit PASS |
| Splitters name guard | Wired in `storeCategoryData` + unit PASS |
| Fake purchase toast | Unmounted from `ProductDetailMedico` + unit PASS |
| HUD category → PDP | `deletedUrlRedirects` + unit PASS |

## Build

`storecraft-store` `npm run build` — **PASS** (exit 0).

## Not in this release

- Mongo M1–M4  
- GA4 changes  
- Uncommitted `AnalyticsScripts.jsx`  

## Recommendation

**GO — READY FOR OWNER DEPLOYMENT APPROVAL** (code-only of the new tip SHA).  
Owner must name the exact SHA. Do not deploy until that reply.
