# Rollback Plan

## Code

- Revert the remediation RC commit(s) on `vps-test` and redeploy previous SHA (`246b6e3` / last known good).
- Or `git revert <rc-sha>` (no history rewrite).

## Database

- No writes applied in this mission — nothing to roll back in Mongo.
- If NAP Settings later applied: restore from dry-run `before` document.

## Cache

- Soft-purge CDN / Coolify app restart after rollback if HTML still shows new NAP.
