# REGRESSION_RESULTS — 11 November 2026

**Release candidate:** `f3e050c`  
**Re-run:** preflight session (node test runner + live HTTP)

```bash
node --import ./tests/alias-loader.mjs --test \
  tests/fitment-model-conflict.test.mjs \
  tests/fitment-generation.test.js \
  tests/product-slug-redirects.test.ts \
  tests/seo-fixes-2026-10-31.test.mjs \
  tests/soft-404.test.ts \
  tests/car-fit-selector.test.mjs \
  tests/seo-redirects-2026-10.test.ts \
  tests/store-policy.test.ts \
  tests/cod-eligibility.test.ts \
  tests/product-jsonld.test.ts \
  tests/meta-capi-pixel-id.test.mjs \
  tests/media-alt-guard.test.ts
```

## Unit / library

| Suite | Result | Notes |
| --- | --- | --- |
| Fitment model conflict (P0) | **PASS** 10/10 | Alto/Swift, Splitters, Revo alias, monogram conflict |
| Overall batch | **69 PASS / 3 FAIL / 72 total** | |

### Failures (pre-existing vs `origin/vps-test` — RC did not introduce)

| Test | Actual | Assessment |
| --- | --- | --- |
| `product-jsonld` shoppable Product | Expects `hasMerchantReturnPolicy === undefined`; code emits FreeReturn | Stale assertion — **not RC** |
| `buildLegacyRedirects` no `/` destinations | `/collections/home` → `/` | Pre-existing map — **not RC** |
| `resolveProductRedirectPath(car-heads-up-display-hud)` | Returns `null` for live slug | Intentional — **not caused by HUD category redirects** |

## Area matrix

| Area | Result | Evidence |
| --- | --- | --- |
| Homepage | **PASS** | Live HTTP 200 |
| Shop | **PASS** | Live HTTP 200 |
| Category pages | **PASS** | Splitters 200; soft-404 unit PASS |
| Vehicle pages | **PASS** (HTTP) / **PASS** (unit filter) | Swift 200; Alto still live until deploy; unit excludes Alto |
| Product pages | **PASS** | Flat PDP 200; toast unmounted in RC code |
| Search / filtering | **PASS** | `/search?q=swift` → 308 `/shop?q=swift` |
| Cart | **PASS** | `/cart` 308 → `/shop` (existing) |
| Checkout page load | **PASS** | HTTP 200 |
| Checkout calculations | **NOT_TESTED** | No order placement |
| COD rules | **PASS** | Unit batch |
| Shipping charges | **PASS** | Policy / JSON-LD bulky cases in batch |
| Product variants | **NOT_TESTED** | Needs interactive UI |
| Redirects | **PASS** (map) / **FAIL** 2 stale tests | HUD category still live **404** until deploy |
| Canonicals | **PASS** (spot) | `/products/…` → flat 308 |
| Sitemap | **PASS** | `/sitemap.xml` 200; 547 URLs inventoried earlier |
| Structured data | **PASS** (spot / prior audit) | Product/Collection present |
| Mobile navigation | **NOT_TESTED** | No device lab this run |
| Fitment P0 logic | **PASS** | Dedicated suite 10/10 |
| Fake social proof scan | **PASS** | Toast/LiveView unmounted; no imports |
| Store health | **PASS** | `/api/health` ok |
| Admin health | **PASS** | ok |
| Build | **PASS** | Prior `npm run build` on RC |
| Real orders / payments | **NOT_TESTED** | Intentionally skipped |

## Live P0 HTML (production **before** RC deploy)

| Check | Observed |
| --- | --- |
| Swift hub contains Alto slug | **Yes** (expected until code/DB fix live) |
| Splitters contains steering-trim / ducktail | **Yes** (expected until deploy) |
| Monogram VC Aqua/Vitz/Yaris | **Yes** via API |

## P0 filter self-check (local unit)

```
Swift hub rejects: alto-660cc… only
Swift hub keeps: key cover, 2025 mirrors, universal splitter, mats
Monogram conflict: Aqua/Vitz/Yaris YES; Corolla NO
Splitters rejects: steering trim, ducktail; keeps side splitter SKUs
```
