# R5 — Prevent a repeat (proposals; not enabled)

## How the rollback likely happened

1. **2026-10-27 VPS cutover** Hostinger `31.97.107.181` → `179.197.250.101` (documented in `/data/crazzycars/README-MIGRATE.md`).
2. Live Mongo is Docker `sialkot-mongo` with:
   - Volume **`sialkot-mongo-data`** → `/data/db` (authoritative data)
   - Bind **`/data/crazzycars/mongo`** → `/backup` (holds `sialkot_motorsports.archive`)
3. Post-cutover archive on disk is a **gzip mongodump** dated ~2026-10-27 whose *content* matches migration snapshot (~411 products / 18 blogs / orders stop Sep 29) — i.e. **not** a post–Oct-10 content-rich dump.
4. Mac `crazzycars_local_real` still holds richer catalog (476p / 35 blogs) — evidence content existed after what live retained.
5. Old VPS **unreachable** (SSH timeout) — cannot recover missed `/media/uploads` from there.
6. No evidence of restore-on-boot script in current mounts; risk is **compose/volume swap or mongorestore of an older archive** during cutover without a verified pre-cutover dump of the *rich* DB.

## Proposals (DO NOT ENABLE without owner GO)

Exact enable messages:

- `GO R5-nightly-dump`
- `GO R5-offsite`
- `GO R5-weekly-restore-test`
- `GO R5-media-rsync`
- `GO R5-health-alert`

### 1) Nightly mongodump (keep 14 days)

Cron on VPS (proposal only):

```bash
# /etc/cron.d/crazzycars-mongo-backup (DISABLED until GO)
# 15 2 * * * root /data/crazzycars/scripts/nightly-mongodump.sh
```

Script sketch: `mongodump --archive=/data/crazzycars-mongo-backups/nightly/sialkot-$STAMP.archive`, `find … -mtime +14 -delete`, log fingerprint + collection counts + newest product/blog `createdAt`.

### 2) Offsite copy

After nightly: `rclone copy` or `scp` archives to offsite bucket/second host. Never commit archives to git.

### 3) Weekly restore test

Restore latest archive into `recovery_weekly_scratch`, assert counts ≥ yesterday’s baseline file, drop scratch. Alert on fail.

### 4) rsync `/media`

Nightly `rsync -a --delete` is **dangerous**; prefer `rsync -a` **without** `--delete` to backup host, or restic. Keep 14-day snapshots.

### 5) `/api/health` enrichment + alert

Extend health to return `{ products, blogs, newestProductCreatedAt, newestBlogCreatedAt }` from Mongo (read-only). Cron compares to yesterday’s JSON; alert (email/Telegram) if product count or newest createdAt **drops**.

## Runbook

See `seo-reports/recovery-1029/RESTORE.md`.
