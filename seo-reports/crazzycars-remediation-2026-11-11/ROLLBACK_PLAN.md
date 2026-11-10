# ROLLBACK_PLAN

## Application-only rollback

1. Redeploy previous known-good storefront image/commit (e.g. `0df2d2f` / `67bef50` era) via Coolify previous deployment.
2. Do not touch Mongo if only code filters were deployed.
3. Verify Swift hub, Splitters hub, PDP, health.

## If DB migration was applied (future)

1. Restore `vehicleCompatibility` / `compatibleVehicles` / `categories` from pre-apply JSON backup for touched slugs.
2. Revalidate Next.js cache / wait ISR (600s) or call revalidate webhook.
3. Confirm Alto returns on Swift **only if** intentionally rolled back (normally keep data fix).

## Do not

- Drop collections  
- Restore entire DB from unrelated merchant dumps  
- Force-push git history  
