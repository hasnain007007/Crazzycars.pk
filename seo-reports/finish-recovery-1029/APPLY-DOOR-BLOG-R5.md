# Applied GRANTED tokens (2026-10-28/29)

**Fingerprint gate:** canonical URI sha256-16 `187aad8c44fe3a84`; writes via `docker exec sialkot-mongo` → `crazzycars_motorsports` only. Refuse `84143ac0cb2c3085` / Atlas `317ae4de8eb24f84`.  
**Dump:** `/data/crazzycars/mongo/finish-granted-20261028T221900Z.archive` (scratch restore ~108500 docs).

## DOOR-SET4 — done
- slug `toyota-corolla-x-carbon-fiber-interior-door-handle-panels-2014-2026`
- name Set of 4; sale **5999**; regular **7999**; stock qty **25** unchanged
- meta/seo + short/long/description set-of-2 → set-of-4
- Code override updated in `gscAudit2026-10.mjs` (must deploy for HTML title)

## BLOG-IMAGES — done (DB)
- 15 posts: `featuredImage.url` + `altText` remapped to own-site 200 media; content upload URLs scrubbed where matched
- ISR may still show old HTML until redeploy/revalidate

## R5-NIGHTLY-DUMP / R5-MEDIA-RSYNC / R5-HEALTH-ALERT — enabled
- Scripts: `/data/crazzycars/scripts/{nightly-mongodump,weekly-restore-test,daily-media-rsync,health-catalog-alert}.sh`
- Cron: `/etc/cron.d/crazzycars-backups`
- First nightly archive: `/data/crazzycars-mongo-backups/nightly/sialkot-20261028T222002Z.archive`
- `/api/health` now returns `catalog.products/blogs/newestProductCreatedAt` (code deploy needed)

## Rollback
```bash
# Door + blogs field rollback from dump (careful — prefer targeted $set reverse)
# Archive: /data/crazzycars/mongo/finish-granted-20261028T221900Z.archive
```
