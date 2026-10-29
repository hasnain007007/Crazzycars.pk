# STATUS — DB live fingerprint correction (`fix/db-live-fp-1029`)

**Date:** 2026-10-29  
**Live write FP:** `187aad8c44fe3a84` (`crazzycars_motorsports`)  
**Legacy (no write):** `84143ac0cb2c3085` (`sialkot_motorsports`)  
**Atlas (never):** `317ae4de8eb24f84`  
**GRANTED this loop:** `BACKUP-FIX` (done). No other writes applied.

---

## 1. BACKUP-FIX — DONE

| Item | Path | Size |
|------|------|------|
| Fresh live dump (scratch-tested) | `/data/crazzycars/mongo/backup-fix-live-20261029T094231Z/crazzycars_motorsports.archive.gz` | **9.4M** |
| Nightly (ran once now) | `/data/crazzycars-mongo-backups/nightly/crazzycars-20261029T094238Z.archive.gz` | **9.3M** (9656469 B) |
| Offsite / second-disk copy | `/data/crazzycars-mongo-backups/offsite-copy/crazzycars-20261029T094238Z.archive.gz` | **9.3M** |
| Legacy final archive (labelled) | `/data/crazzycars-mongo-backups/legacy/sialkot_motorsports-LEGACY-20261029T094228Z.archive.gz` | **11M** |

**Scratch restore proof (nightly archive → scratch, then dropped):**  
`products=430` · `orders=605` · `customers=344` · `blogs=38` · `vehicles=68` · `categories=84` (95079 docs, 0 failures).

**Repointed scripts** (`/data/crazzycars/scripts/`):  
`nightly-mongodump.sh` · `weekly-restore-test.sh` · `health-catalog-alert.sh` → `LIVE_DB=crazzycars_motorsports` / FP `187aad8c44fe3a84`.  
Cron: `/etc/cron.d/crazzycars-backups` unchanged schedule.

**Container FP check (URI not printed):**  
`crazzycars-store` / `crazzycars-admin` → FP `187aad8c44fe3a84` DB `crazzycars_motorsports`  
`sialkot-store` / `sialkot-admin` → FP `84143ac0cb2c3085` DB `sialkot_motorsports`

---

## 2. Fingerprint guards / docs — UPDATED (repo + VPS README-MIGRATE)

- `scripts/mongo/prodFingerprint.mjs` — canonical live/legacy/Atlas + refuse helpers  
- `scripts/seo/apply-seo-2026-10.mjs` — writes only if FP `187aad8c…`  
- `scripts/seo/dry-run-fitment-membership-2026-10.mjs` + `.mongosh.js`  
- `storecraft-store/scripts/previewMongoGuard.mjs` — refuses live + legacy DB names/FPs  
- `scripts/ab-checkout/safe-uri.mjs`, `scripts/restore-catalog-local.sh`, tests  
- `docs/OPS-PRODUCTION-DATABASE.md`, `README.md`  
- `seo-reports/finish-recovery-1029/RESTORE.md`, `APPLY-DOOR-BLOG-R5.md`, `recovery-1029/RESTORE.md`  
- VPS `/data/crazzycars/README-MIGRATE.md`

---

## 3. Read-only live vs legacy diff

| Collection | Live | Legacy |
|------------|------|--------|
| products | **430** | 430 |
| orders | **605** | 603 |
| customers | **344** | 342 |
| blogposts | **38** | 38 |
| categories | 84 | 84 |
| vehicles | 68 | 68 |

**Orders since 2026-10-28:** live **9** · legacy **0**. Newest live: `ORD-2026-00575` (2026-10-29T06:54Z). Confirmed on live only.

**Legacy-only / legacy-newer (listed, NOT copied):**

- **orders / customers:** 0 legacy-only  
- **products (4, ~1–2s newer `updatedAt` only):**  
  `suzuki-swift-2018-2024-complete-body-kit-fibreglass`, `honda-civic-reborn-2006-2011-body-kit-d4`, `honda-civic-reborn-2006-2011-body-kit-d1`, `lion-car-dashboard-perfume-air-freshener`  
- **blogposts (11, legacy `updatedAt` today while live older):**  
  `toyota-corolla-rgb-bumper-neon-mirror-lights-pakistan`, `batman-style-side-mirror-covers-pakistan-fitment-guide`, `trunk-lip-spoiler-buying-guide-pakistan-alsvin-city-corolla`, `car-door-welcome-logo-lights-pakistan-guide`, `suzuki-swift-carbon-door-handle-covers-pakistan`, `car-accessories-returns-wrong-item-pakistan`, `delivery-charges-regular-vs-bulky-pakistan`, `front-splitters-side-skirts-buying-guide-pakistan`, `quarter-window-louvers-civic-corolla-fitment-pakistan`, `door-handle-covers-buying-guide-pakistan-city-civic-corolla`, `car-chargers-air-compressors-roadside-pakistan`  
  *(Likely writes via still-running `sialkot-admin` / wrong target — reinforces STOP-LEGACY.)*  
- **settings:** 37 field diffs; legacy still branded “Sialkot Motorsports”; **live** `general.storeName=CrazzyCars`, live `/Sialkot/i` string walk = **0 hits**.

Artifacts: `seo-reports/db-live-fp-1029/db-diff.json`, `BRAND-TEXT-dry-run.json`, summaries.

---

## 4. STOP-LEGACY — PROPOSAL ONLY (wait `GO STOP-LEGACY`)

**Still depends on `sialkot-store` / `sialkot-admin`:**

| Dependency | Detail |
|------------|--------|
| Traefik | `/data/coolify/proxy/dynamic/sialkot.yml` → `sialkotmotorsports.com` / `www` / `admin.sialkotmotorsports.com` |
| Containers | `sialkot-store` Up · `sialkot-admin` Up (healthy) — both on FP `84143ac0…` |
| Cron | Nightly/weekly/health already on live DB; **no** cron still dumps sialkot DB |
| Webhooks | PostEx/etc. should hit `crazzycars.pk` / Coolify live apps — confirm no leftover sialkot webhook URLs in courier dashboards |
| Bookmarks | `admin.sialkotmotorsports.com` still 307→login (do not use) |
| Admin users | Same emails on both DBs; legacy display names still “Sialkot Motorsports” |
| Mongo | Keep `sialkot-mongo` running (hosts **live** DB too) |

**Commands to stop without deleting data (do not run until GO):**

```bash
docker stop sialkot-store sialkot-admin
# optional Coolify: disable/stop those apps in UI — do NOT delete volumes or sialkot-mongo
# optional: rename Traefik file aside (keeps file):
#   mv /data/coolify/proxy/dynamic/sialkot.yml /data/coolify/proxy/dynamic/sialkot.yml.disabled
```

Does **not** drop `sialkot_motorsports` or remove legacy archive.

---

## 5. Dry-runs on LIVE (await GO each) — no applies

| Token | Count / notes | Artifact |
|-------|---------------|----------|
| **BRAND-TEXT** | **93** `$set` ops, all `vehicles.metaTitle` (Sialkot→CrazzyCars.pk). products/categories/blogs/settings live: **0** Sialkot hits | `BRAND-TEXT-dry-run.json` |
| **PHOTO-FIX** | sharedFileGroups **7**; mainMismatchCount **2** (alto steering panel; vezel fog cover) | `photo-fix-summary.json` |
| **L1** | Door already Set of 4 @ 5999/7999 on live; `needsBrandText: false` — re-check apply-seo at GO | `l1-summary.json` |
| **L2** | Low-CTR titles: re-run apply-seo dry-run against live at GO (430 products / 84 cats) | `l2-summary.json` |

---

## 6. Admin

- **In use for live:** `https://admin.crazzycars.pk` → FP `187aad8c…` / `crazzycars_motorsports` (307→`/login`).  
- Storefront `https://crazzycars.pk` healthy; brand text shows CrazzyCars.  
- Payment settings previously applied on live (prepaid 4% + Easypaisa) appear via live admin/store pair.  
- **Still up (legacy):** `admin.sialkotmotorsports.com` → `sialkot-admin` / wrong DB — stop after `GO STOP-LEGACY`.

**Owner reminders:**

1. **Change the admin password** (live `admin.crazzycars.pk` owners: `admin@crazzycars.pk` / `ceo@sms`).  
2. **Make the GitHub repo private** — currently **`hasnain007007/Crazzycars.pk` = PUBLIC**.

---

## Next tokens (send exactly)

```
GO STOP-LEGACY
GO BRAND-TEXT
GO PHOTO-FIX
GO L1
GO L2
```

Empty GRANTED / no GO = dry-run only. Atlas never. Never print connection strings.
