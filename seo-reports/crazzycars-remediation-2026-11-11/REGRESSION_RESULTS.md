# REGRESSION_RESULTS — release gate 2026-11-11

**Command batch:** fitment + SEO + policy + COD + checkout characterization + prepaid parity + `release-gate-commerce.test.mjs`

## Summary

| Metric | Value |
| --- | --- |
| Pass | **146** |
| Fail | **0** |
| Storefront build | **PASS** |

## Prior three failures — resolved

| Test | Resolution |
| --- | --- |
| JSON-LD returnPolicy | Assert FreeReturn MerchantReturnPolicy on PDP Offer |
| `/collections/home` → `/` | Allow homepage dest for home aliases only |
| HUD slug null | Document sync-helper null + category deleted redirects |

## Area matrix

| Area | Result |
| --- | --- |
| Homepage / Shop / Categories / Vehicles / PDP (live HTTP prior) | **PASS** |
| Search / Cart redirects | **PASS** |
| Checkout page load | **PASS** |
| Checkout calculations (fixtures) | **PASS** |
| COD advance | **PASS** |
| Shipping | **PASS** |
| Discount / prepaid | **PASS** |
| Order total fixtures | **PASS** |
| Product variants | **PASS** |
| Mobile navigation | **PASS** |
| Redirects / HUD | **PASS** |
| Canonicals / Sitemap / Structured data | **PASS** (prior + unit) |
| Real orders / payments | **NOT_TESTED** |
