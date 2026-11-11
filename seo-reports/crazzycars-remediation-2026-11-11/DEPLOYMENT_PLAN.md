# DEPLOYMENT_PLAN — code-only (awaiting owner SHA approval)

**Status:** READY FOR OWNER DEPLOY APPROVAL — do **not** deploy until owner names the exact SHA below.  
**Migrations M1–M4:** **NOT authorised** — do not touch MongoDB.  
**Branch:** `fix/crazzycars-seo-aeo-geo-2026-11-11`

## 1. Exact candidate commit

**Candidate:** `824799ff9989486082c03b71005e8cb3bfc3a5c7`  
Previous RC `f3e050c` is **superseded**.

**Rollback baseline:** `0df2d2f` (`origin/vps-test`).

## 2. Coolify deployment steps (storefront only)

1. Owner replies: `GO deploy <exact-sha>` (code only).  
2. On a clean checkout of the approved SHA, merge or fast-forward into the Coolify deploy branch (`vps-test` historically).  
3. `git push origin vps-test` (no force-push).  
4. Confirm Coolify rebuild starts for **`crazzycars-store` only**.  
5. If webhook does not fire within ~2 minutes, trigger redeploy for that application only.  
6. Do **not** restart Mongo, OPA, admin (unless shared build requires it), or other merchant apps.  
7. Do **not** change DNS, payment Settings, Meta Ads, or GA4 tags.

### Explicit exclusions from the release artifact

- Uncommitted `AnalyticsScripts.jsx` / `.gitignore`  
- Mongo migrations M1–M4  
- Any `.env` / credentials  

## 3. Services affected

| Service | Action |
| --- | --- |
| `crazzycars-store` | Rebuild / redeploy |
| `crazzycars-admin` | No change required |
| MongoDB | **No writes** |
| Other VPS apps | Do not restart |

## 4. Expected downtime

Typically **&lt; 2 minutes** rolling container replace.

## 5. Health checks

```text
GET https://crazzycars.pk/api/health          → ok, db ok
GET https://admin.crazzycars.pk/api/health   → ok (unchanged)
```

## 6–10. Rollback / smoke / monitoring

See `ROLLBACK_PLAN.md` and `POST_DEPLOY_VERIFICATION.md`.
