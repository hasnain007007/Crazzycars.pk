# OWNER_APPROVAL_REQUIRED

**Do not deploy until you reply with the exact SHA below.**

## Decision requested

**Recommendation: GO — READY FOR OWNER DEPLOYMENT APPROVAL** (code-only).

1. Approve deploy of exact SHA **`824799ff9989486082c03b71005e8cb3bfc3a5c7`**.  
   - Do **not** use superseded `f3e050c`.  
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
