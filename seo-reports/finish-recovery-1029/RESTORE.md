# RESTORE.md — CrazzyCars production Mongo / media

**Write fingerprint only:** `84143ac0cb2c3085` (`sialkot-mongo` / `sialkot_motorsports`).  
**Never write:** Atlas `317ae4de8eb24f84`.  
**Never** expose Mongo 27017 publicly.

## Quick facts

| Item | Value |
|------|--------|
| VPS | `179.197.250.101` |
| Mongo container | `sialkot-mongo` |
| Data volume | `sialkot-mongo-data` → `/data/db` |
| Backup bind | `/data/crazzycars/mongo` → `/backup` |
| Media | `/data/crazzycars/media` (store+admin mount) |
| Coolify | apps `crazzycars-store` / `crazzycars-admin` |

## Before any write

1. Confirm fingerprint `84143ac0cb2c3085`.
2. Owner message names the step (`GRANTED: R4`, etc.).
3. Fresh `mongodump` archive under `/data/crazzycars-mongo-backups/…`.
4. Restore-test into a **scratch** DB; verify counts.
5. Prefer field-level `$set`/`$pull`/`$addToSet` and insert-only; never replace/delete live docs.
6. Media: copy missing files only; never overwrite existing.

## Full DB rollback (nuclear)

```bash
# STOP store/admin writes if possible
STAMP=… # the known-good archive
docker exec sialkot-mongo mongorestore --drop \
  --archive=/backup/$STAMP.archive \
  --nsInclude='sialkot_motorsports.*'
# Restart store/admin; verify health + sitemap + sample PDPs
```

Prefer **not** `--drop` for partial recovery — restore to scratch and copy docs by `_id`.

## Partial content restore (preferred)

1. Export missing docs from best source (today: Mac `crazzycars_local_real`).
2. `insertOne` only if `_id` and `slug` absent on live.
3. Re-apply SEO/fitment from `backups/seo-2026-10-apply/` scripts.
4. Copy missing media; `$set` image URLs.
5. Verify: counts, 20 blogs, products, sitemap, images, `seo-verify`.

## Media-only

```bash
# copy if not exists
test -f /data/crazzycars/media/products/FOO.webp || \
  cp /path/from/backup/FOO.webp /data/crazzycars/media/products/FOO.webp
```

## After restore

- [ ] `db.products.countDocuments` / blogs
- [ ] Newest order still present (do not lose post-cut orders)
- [ ] `https://crazzycars.pk/sitemap.xml` 200
- [ ] Sample product/blog/category 200
- [ ] Image URLs 200
- [ ] Admin login + one order view

## Contacts / GO tokens

Production writes require an explicit GRANTED/GO line in the recovery STATE. Empty GRANTED = dry-run only.

## Finish-recovery GRANTED tokens (2026-10-29)

| Token | Effect |
|-------|--------|
| `R4` | Insert-only blogs/products (draft products until image 200) + SEO/fitment/image field ops |
| `DOOR-SET4` | Live door-handle → Set of 4 @ Rs. 5,999 + meta |
| `BLOG-IMAGES` | Remap 15 blog featuredImages to own-site 200 media |
| `R5-NIGHTLY-DUMP` | Enable nightly mongodump + weekly scratch restore-test |
| `R5-MEDIA-RSYNC` | Enable daily /media backup |
| `R5-HEALTH-ALERT` | Enable health count/newestCreatedAt drop alert |

Empty GRANTED = dry-run only.
