# OWNER_APPROVAL_REQUIRED

**Do not deploy until you reply with the exact SHA below.**

## Decision requested

**Recommendation: GO — READY FOR OWNER DEPLOYMENT APPROVAL** (code-only).

1. Approve deploy of the **exact tip SHA** recorded in git after the release-gate commit (see agent final message / `git rev-parse` on `fix/crazzycars-seo-aeo-geo-2026-11-11`).  
   - Do **not** use superseded `f3e050c` once the gate commit exists.  
2. Confirm target: Coolify **`crazzycars-store` only**; rollback available at `0df2d2f`.  
3. Confirm **Mongo M1–M4 remain deferred** (no DB writes).  
4. Confirm no GA4 / payment / Meta Ads / DNS changes.

## Approval phrases

| Reply | Effect |
| --- | --- |
| `GO deploy <sha>` | Merge/push to deploy branch; storefront rebuild only |
| `NO GO` | Hold |

## Immediate rollback

`ROLLBACK_PLAN.md` → redeploy `0df2d2f` if commerce or health regresses.
