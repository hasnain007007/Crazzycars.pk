# Rollback Plan

1. Redeploy previous known-good SHA (`f6cd49c`) via `FORCE=1 deploy-vps-test.sh` after resetting `vps-test` to that commit (no force-push to main).
2. Additive Mongo fields are backward compatible — leaving them is safe; no destructive migration to reverse.
3. Cron prune only deletes `status=active AND itemCount=0` idle >48h — does not touch abandoned carts with items.
4. If beacon path misbehaves, interactive fetch sync still works; revert `cartSyncClient.js` unload branch if needed.
