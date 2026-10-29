# RESTORE.md — CrazzyCars production Mongo / media

**Write fingerprint only:** `187aad8c44fe3a84` (`sialkot-mongo` / `crazzycars_motorsports`).  
**Do not write:** legacy `84143ac0cb2c3085` (`sialkot_motorsports`).  
**Never write:** Atlas `317ae4de8eb24f84`.  
**Never** expose Mongo 27017 publicly. Never print connection strings.

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

1. Confirm fingerprint `187aad8c44fe3a84`.
2. Owner message names the step (`GRANTED: R4`, etc.).
3. Fresh `mongodump` archive under `/data/crazzycars-mongo-backups/…`.
4. Restore-test into a **scratch** DB; verify counts.
5. Prefer field-level `$set`/`$pull`/`$addToSet` and insert-only; never replace/delete live docs.
6. Media: copy missing files only; never overwrite existing.

## Full DB rollback (nuclear)

```bash
# STOP store/admin writes if possible
STAMP=… # the known-good archive
docker exec sialkot-mongo mongorestore --gzip --drop \
  --archive=/path/to/crazzycars-$STAMP.archive.gz \
  --nsInclude='crazzycars_motorsports.*'
# Restart crazzycars-store / crazzycars-admin; verify health + sitemap + sample PDPs
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
