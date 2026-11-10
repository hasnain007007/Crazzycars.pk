# ENVIRONMENT — CrazzyCars.pk remediation

**Date:** 2026-11-11  
**Branch:** `fix/crazzycars-seo-aeo-geo-2026-11-11`  
**Base commit:** `0df2d2fedc628a6bba7d91e96b95b618050725af` (`vps-test` tip at branch create)

## Repository

| Item | Verified value |
| --- | --- |
| Layout | Monorepo `CCSMS` |
| Storefront | `storecraft-store` — **Next.js 16.3.8**, React 19.2.4, App Router |
| Admin | `storecraft-admin` — Next.js 16.3.8 |
| Mobile API | `CCSMS-mobile-api` (sibling / copy — not primary storefront) |
| DB | MongoDB via Mongoose |
| Package manager | npm |
| Node (local agent) | v24.11.1 |

## Source of truth

| Concern | Source |
| --- | --- |
| Product metadata | Mongo `Product` (`storecraft-store/lib/models/Product.model.js`) |
| Categories | Mongo `Category` + `product.categories[]` |
| Vehicles / generations | Mongo `Vehicle` + Car Catalog |
| Fitment | Preferred: `compatibleVehicles` ObjectIds; also `vehicleCompatibility.vehicles[]`, legacy `compatibleCars` |
| Redirects | `deletedUrlRedirects.mjs`, `vehicleSlugRedirects.mjs`, `oldBlogNewsRedirects.mjs`, `next.config.mjs`, middleware |
| Canonical / metadata | Page `generateMetadata` + SEO libs under `lib/seo/` |
| Sitemaps | `app/sitemap*.xml` + `lib/sitemap/entries.js` |
| Robots | `app/robots.txt/route` |
| Structured data | `lib/seo/jsonld.js` |
| Policy / COD / shipping copy | `config/store-policy.js` + `lib/storePolicyCopy.js` |
| Images | Local `/media` (+ Cloudinary env present in local `.env.local` — do not treat as live proof) |

## Live application (read-only probes)

- Store health: `https://crazzycars.pk/api/health` → `ok`, catalog products **430**, blogs **38**
- Public list API total: **399** (`/api/products`) — gap vs 430 = drafts / inactive / listing exclusions (expected discrepancy class)
- Admin health: `https://admin.crazzycars.pk/api/health` → `ok`
- Preferred host in use: `https://crazzycars.pk` (non-www)

## Local Mongo fingerprint (agent machine)

- `storecraft-store/.env.local` URI fingerprints to **Atlas `317ae4de8eb24f84` / `sialkot_motorsports`**
- Live production fingerprint gate remains **`187aad8c44fe3a84` / `crazzycars_motorsports`**
- **No production writes from this environment.**

## Deployment

- GitHub `origin` repo: `hasnain007007/Crazzycars.pk`
- Branch historically auto-deployed: `vps-test` (Coolify / VPS)
- **This remediation branch must NOT be deployed without owner approval** (mission §1.1 / §7).

## Build / test commands

```bash
cd storecraft-store && npm run build
node --import ./tests/alias-loader.mjs --test tests/fitment-model-conflict.test.mjs
node scripts/seo/audit-fitment-category-live.mjs
node scripts/seo-verify.mjs --base https://crazzycars.pk --checks C1,C3,C4,C18,C19,C21
```
