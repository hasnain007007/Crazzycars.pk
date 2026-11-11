# TEST_RESULTS — Stage 3 Indexing SEO

**Branch:** `fix/crazzycars-indexing-seo-2026-11-11`

## Unit

```bash
node --import ./tests/alias-loader.mjs --test \
  tests/listing-page-one-redirect.test.mjs \
  tests/seo-redirects-2026-10.test.ts \
  tests/soft-404.test.ts \
  tests/fitment-model-conflict.test.mjs \
  tests/release-gate-commerce.test.mjs
```

| Suite | Result |
| --- | --- |
| listing-page-one-redirect | **PASS** |
| seo-redirects-2026-10 | **PASS** |
| soft-404 | **PASS** |
| fitment-model-conflict | **PASS** |
| release-gate-commerce | **PASS** |
| **Batch** | **37/37 PASS** |

## Live (pre-deploy observation)

| Check | Result |
| --- | --- |
| Sitemap index + children | **PASS** (547 locs) |
| robots.txt | **PASS** |
| HUD / collections / shop page=1 | **PASS** live |
| Category/car `?page=1` 308 | **NOT_LIVE** until this branch deploys |
| Atom 410 | **NOT_LIVE** until deploy |
| Tucson 404 hold | **PASS** (preserved) |

## Not run

- Full storefront rebuild (optional before owner GO)  
- Real GSC API  
- Mongo writes  
