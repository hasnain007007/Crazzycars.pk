# R4 — Restore dry-run (NO APPLY — GRANTED empty)

**Fingerprint required:** `84143ac0cb2c3085` only.  
**GRANTED:** (none) → stop after this plan.  
**Write style if later granted:** insert-only for missing `_id`s; field-level `$set` / `$pull` / `$addToSet` for SEO/fitment/images. **Never** `replaceOne`, **never** delete live docs, **never** overwrite existing `/media` files.

## Pre-flight (mandatory before any write)

```bash
# On VPS
FP=$(docker exec sialkot-mongo mongosh sialkot_motorsports --quiet --eval '...') # must print 84143ac0cb2c3085 via approved fingerprint script
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
OUT=/data/crazzycars-mongo-backups/recovery-r4-$STAMP
docker exec sialkot-mongo mongodump --db=sialkot_motorsports --archive=/backup/recovery-r4-$STAMP.archive
# Restore-test into scratch DB recovery_r4_scratch (drop scratch only)
docker exec sialkot-mongo mongorestore --archive=/backup/recovery-r4-$STAMP.archive --nsFrom='sialkot_motorsports.*' --nsTo='recovery_r4_scratch.*'
# Verify scratch counts ≈ live; then proceed
```

Rollback: restore archive into `sialkot_motorsports` **only for collections touched**, or reverse `$set` from before-values JSONs. Prefer field rollback over full drop.

## Order of operations

1. Scratch restore-test OK  
2. Insert **20** blogposts (skip if slug exists)  
3. Insert **21** active products (skip if slug/`_id` exists); optional draft/inactive with separate GO  
4. `$set` SEO fields — 13 products + 6 categories + 8 vehicles (skip equal)  
5. Fitment `$pull`/`$addToSet` on **live `_id`s** (9 products; re-diff)  
6. Image `$set` for 2 emptied m5 products (+ batman if needed)  
7. Copy-only missing media (batman; never overwrite)  
8. Verify (below)

## Counts (planned)

| Collection | Inserts | Field updates | Deletes |
|------------|--------:|--------------:|--------:|
| blogposts | 20 | featuredImage remap ≤15 | 0 |
| products | 21 (+0–45 inactive optional) | SEO 12–13 + fitment 9 + images 2–4 | 0 |
| categories | 0 | SEO 6 | 0 |
| vehicles | 0 | SEO 8 | 0 |
| orders/customers/reviews | 0 | 0 | 0 |

## Sample insert shapes (abbrev)

**Blog** (from local_real `_id` preserved if unused on live):

```js
db.blogposts.insertOne({ /* full doc from crazzycars_local_real for slug door-handle-covers-buying-guide-... */ })
// Guard: if (db.blogposts.findOne({slug})) skip
```

**Product** (active):

```js
db.products.insertOne({ /* full doc local_real honda-civic-2022-2026-carbon-fiber-key-fob-cover-5-button */ })
```

## Conflicts

| Conflict | Rule |
|----------|------|
| Door-handle same slug different `_id` | **Do not insert** local Set-of-4 over live; owner GO for name/SEO only |
| Live-only blogs | keep |
| Orders after cut | never touch |
| Product slug exists | skip insert; maybe field `$set` only |
| Media file exists | skip copy |

## Rollback command (after apply)

```bash
# Prefer: reverse from recorded before-values JSON for each $set
# Nuclear (last resort, owner-approved): mongorestore archive taken in pre-flight into sialkot_motorsports
# Scratch: db.getSiblingDB('recovery_r4_scratch').dropDatabase()
```

## Verify checklist (post-apply)

- [ ] products count 410→≥431 (if 21 inserted)
- [ ] blogs 18→38
- [ ] 20 blog URLs HTTP 200
- [ ] 21 product URLs HTTP 200
- [ ] sitemap 200; new URLs present
- [ ] sample images 200
- [ ] seo-verify C1–C24
- [ ] door-handle still owner-intended SKU
- [ ] order count unchanged (603+)

## APPLY STATUS

**BLOCKED — GRANTED does not include R4.**  
Exact message to unlock: `GRANTED: R4` (and decide door-handle / inactive products / uploads zip).
