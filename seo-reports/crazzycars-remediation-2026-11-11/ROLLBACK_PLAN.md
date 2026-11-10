# ROLLBACK_PLAN

## Application-only (code deploy of `f3e050c`)

1. In Coolify / deploy pipeline, redeploy previous storefront revision for **crazzycars-store only**.  
2. Target git SHA: **`0df2d2f`** (`origin/vps-test` tip before this RC).  
3. Do not restart Mongo, OPA, or other merchant apps.  
4. Verify `/api/health`, homepage, Swift hub, Splitters, checkout.  

### Git-level (if branch was merged to `vps-test`)

```bash
# On deploy machine / via PR revert — do NOT force-push main
git revert --no-edit f3e050c d853595 27898ca 77b2d96
# or redeploy 0df2d2f image tag
```

Prefer Coolify previous-deployment button over history rewrite.

## If Mongo M1–M4 were applied

1. Load `before-*.json` backups written during dry-run/apply.  
2. Restore `vehicleCompatibility.vehicles`, `compatibleVehicles`, and `categories` for:
   - `6a5d226489c0c8d16c691fb8` (Alto)
   - `6a5d227089c0c8d16c692045` (steering trim)
   - `6a5d227089c0c8d16c69204a` (ducktail)
   - `6a5d227089c0c8d16c692044` (monogram)
3. Revalidate / wait ISR.  
4. Confirm wrong hubs again show old relationships only if intentionally rolling back data (normally keep data fix even if code rolls back).

## Do not

- Drop collections  
- Restore unrelated merchant DBs  
- Force-push shared branches  
- Change firewall / DNS during rollback  
