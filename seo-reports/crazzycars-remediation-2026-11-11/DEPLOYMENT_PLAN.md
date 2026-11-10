# DEPLOYMENT_PLAN

**Status:** AWAITING OWNER APPROVAL — do not deploy yet.  
**Candidate SHA:** `f3e050c2ce4cd1d55ae494e4d9e313d57c888672`  
**Branch:** `fix/crazzycars-seo-aeo-geo-2026-11-11`

## 1. Exact candidate commit

`f3e050c` (includes `77b2d96` fitment/toast, `27898ca` HUD redirects, `d853595` audit, `f3e050c` docs).

## 2. Deployment method

1. Owner approves this SHA by name.  
2. Merge or fast-forward into authorised deploy branch (`vps-test` historically).  
3. Push to `origin` so Coolify / storefront webhook builds **crazzycars-store** only.  
4. Do **not** push unrelated branches; do **not** force-push.  
5. Exclude uncommitted `AnalyticsScripts.jsx` / `.gitignore`.

Alternative: cherry-pick the 4 commits onto a clean `vps-test` checkout if merge noise appears.

## 3. Services affected

| Service | Action |
| --- | --- |
| `crazzycars-store` (storefront) | Rebuild / redeploy |
| `crazzycars-admin` | **No change required** (optional noop) |
| MongoDB | **No write** in code-only deploy |
| OPA / other merchants | **Do not restart** |
| Shared reverse proxy | No config change |

## 4. Expected downtime

Typically **< 2 minutes** rolling container replace (historical Coolify behaviour). Soft ISR pages refresh within `revalidate` windows (vehicle/category ~600s).

## 5. Health checks (post-deploy)

```text
GET https://crazzycars.pk/api/health          → ok, db ok
GET https://admin.crazzycars.pk/api/health   → ok
GET https://crazzycars.pk/                   → 200
```

## 6. Rollback

See `ROLLBACK_PLAN.md` — redeploy previous tip `0df2d2f` (or prior Coolify image).

## 7. Previous healthy commit

`0df2d2f` on `origin/vps-test` (controlled SEO release docs tip; includes `67bef50` storefront behaviour).

## 8. Post-deploy smoke tests

1. `/cars/suzuki-swift-2025-present` — Alto SKU **absent**; Swift key cover / mirrors **present**  
2. `/categories/splitters-side-skirts` — steering trim + ducktail **absent**; genuine splitters **present**  
3. Any PDP — no fake purchase toast  
4. `/cars/toyota-aqua-2012-present` (if listed) — Corolla monogram **absent**  
5. `/categories/car-hud` — **308/301** → `/car-heads-up-display-hud` **200**  
6. Cart drawer / checkout page load  
7. `seo-verify` sample C1/C21 if time permits  

## 9. Monitoring

- Coolify / container logs for Next build errors  
- `/api/health` for 5–10 minutes  
- No spike in 5xx on storefront  

## 10. Immediate rollback conditions

- Health `db` not ok  
- Checkout page 5xx  
- Swift hub empty (filter too aggressive)  
- Splitters shelf empty  
- Unrelated merchant apps impacted  

## Sequencing vs Mongo

**Recommended:** Deploy code first → verify hub filters → then separate GO for `MIGRATION_REVIEW.md` M1–M4.  
Code filters remain as defence-in-depth after data cleanup.
