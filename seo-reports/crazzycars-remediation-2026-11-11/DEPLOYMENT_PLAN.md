# DEPLOYMENT_PLAN

**Status:** AWAITING OWNER APPROVAL — do not deploy yet.

## Manifest (code-only)

1. Confirm branch `fix/crazzycars-seo-aeo-geo-2026-11-11` reviewed.
2. Merge or cherry-pick into authorised deploy branch (`vps-test` historically).
3. Push to `origin` only after approval.
4. Allow Coolify/storefront webhook to build **crazzycars-store** only.
5. Do **not** restart unrelated apps, OPA, or Mongo.
6. Do **not** run DB migrations in the same window unless separately approved.

## Pre-deploy gates

- [ ] `npm run build` in `storecraft-store`
- [ ] `node --import ./tests/alias-loader.mjs --test tests/fitment-model-conflict.test.mjs`
- [ ] Diff review excludes secrets / `.env`
- [ ] Confirm FakePurchaseToast removed from PDP
- [ ] Confirm no AnalyticsScripts unrelated change bundled unless intended

## Post-deploy checks (after GO)

- `/cars/suzuki-swift-2025-present` — Alto SKU absent  
- `/categories/splitters-side-skirts` — steering trim + ducktail absent  
- PDP — no fake purchase toast  
- `/api/health` store + admin  
- Cart + checkout smoke  
- seo-verify C1/C3/C21 sample  
