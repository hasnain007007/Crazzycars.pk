# Timestamp repair — categories + other collections (2026-10-29/30)

**Live DB:** `crazzycars_motorsports` FP `187aad8c44fe3a84`  
**Cause:** same two-brand object-spread / `walk()` that wiped Product `createdAt` (~00:27–00:45 UTC 29 Oct).

## Scan (pre-repair)

| Collection | total | bad createdAt | bad updatedAt | notes |
|------------|------:|--------------:|--------------:|-------|
| categories | 84 | **74** | 0 | CSV import failing |
| pages | 4 | **4** | **4** | |
| blogposts | 38 | **38** | **27** | also `publishedAt` {}, `contentUpdatedAt` {}, `viewsAutoIncrease.lastAppliedAt` {} |
| settings | 1 | **1** | **1** | only timestamps; no other empty `{}` fields |
| products | 430 | 0 | 0 | already repaired |
| reviews | 1175 | 0 | 0 | clean |
| banners | 4 | 0 | 0 | clean |
| carcatalogs | 15 | 0 | 0 | models content intact; no nested timestamps |
| vehicles | 68 | 0 | 0 | clean |

## Code

- `storecraft-admin/app/api/categories/csv/route.js` — strip `createdAt`/`updatedAt`/`__v`; repair before save (same as products `277cc54`)
- `scripts/mongo/repair-collection-timestamps.mongosh.js` — multi-collection dry-run / apply from `_id.getTimestamp()`

## Apply log

| Mode | categories | pages | blogposts | settings | products |
|------|------------|-------|-----------|----------|----------|
| DRY_RUN wouldFix | 74 | 4 | 38 | 1 | 0 |
| APPLY fixed | **74** | **4** | **38** | **1** | 0 |

Blog extra fields repaired from `_id.getTimestamp()` when `{}`: `publishedAt` 38, `contentUpdatedAt` 27, `viewsAutoIncrease.lastAppliedAt` 15.

**Verify:** all listed collections `createdAt`/`updatedAt` Date; blog empty `{}` dates = 0; slugs intact (84/4/38).

**Backups:** post-apply `/data/crazzycars/mongo/post-collection-timestamp-repair-*`. Pre-`{}` copies also under `/tmp/two-brand-run/backups/` (29 Oct). Pre-repair dump dir only captured `settings` (mongodump single `--collection` limit).
