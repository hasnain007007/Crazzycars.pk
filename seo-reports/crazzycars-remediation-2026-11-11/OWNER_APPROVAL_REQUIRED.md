# OWNER_APPROVAL_REQUIRED

**Do not deploy or write production MongoDB until you reply with explicit approval of the items below.**

## Decision requested

**Recommendation: CONDITIONAL GO** for code release of SHA `f3e050c2ce4cd1d55ae494e4d9e313d57c888672` after you confirm:

1. **Release SHA** — Approve deploy of exactly `f3e050c` (or state a different SHA).  
2. **Target** — Confirm live storefront is still CrazzyCars / Coolify `crazzycars-store` / DB `crazzycars_motorsports` with fingerprint **`187aad8c44fe3a84`** (re-check at deploy time).  
3. **Migrations** — Approve or defer M1–M4 in `MIGRATION_REVIEW.md` as a **separate** step (recommended after code is live).  
4. **GA4** — Acknowledge measurement ID is **present but unverified** (settings `G-…`, no GTM); no new tags without a further ask.  
5. **Known test debt** — Accept 3 pre-existing unit failures (returnPolicy JSON-LD, `/collections/home` redirect, HUD product redirect null) unrelated to this RC.

## What is already done (no approval needed)

- Fitment model-conflict + Splitters name-guard in code  
- Fake purchase toast removed  
- HUD category URL redirects  
- Dry-run documentation and regression report  
- Local fingerprint gate refuses non-prod DB

## What approval unlocks

| Approval text (example) | Effect |
| --- | --- |
| `GO deploy f3e050c only` | Merge/push to deploy branch; Coolify storefront rebuild; **no Mongo writes** |
| `GO deploy f3e050c + migrate M1-M4` | Deploy then apply four product updates with abort-on-mismatch |
| `NO GO` | Hold; branch remains off production |

## Immediate rollback trigger list

See `ROLLBACK_PLAN.md` — empty Swift/Splitters shelves, health fail, checkout 5xx, or collateral on other VPS apps.

## Contact package

- `RELEASE_PREFLIGHT.md`  
- `REGRESSION_RESULTS.md`  
- `MIGRATION_REVIEW.md`  
- `DEPLOYMENT_PLAN.md`  
- `ROLLBACK_PLAN.md`  
- This file  
