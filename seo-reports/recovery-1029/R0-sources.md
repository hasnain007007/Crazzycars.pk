# R0 — Data sources (read-only)

Fingerprint live prod: **84143ac0cb2c3085** (`sialkot_motorsports` on VPS `sialkot-mongo`).  
Atlas **317ae4de8eb24f84**: not queried this run (no write; URI not loaded).

## Inventory

| Source | Location | Size / date | Fingerprint | Notes |
|--------|----------|-------------|-------------|-------|
| **LIVE prod** | VPS docker `sialkot-mongo` volume `sialkot-mongo-data` + bind `/data/crazzycars/mongo` | Created 2026-10-27 | `84143ac0cb2c3085` | Content products/blogs look cut at ~2026-10-10/16; orders continue to 2026-10-28 |
| **mig_compare_readonly** | Same mongo process, separate DB | — | same lineage | ≈ migration snapshot; 411 products / 18 blogs / orders stop 2026-09-29 |
| **gzip mongodump archive** | `/data/crazzycars/mongo/sialkot_motorsports.archive` (9.0M gz → 45M) | 2026-10-27 17:55Z | restored scratch `recovery_archive_r0` | Tool metadata shows server **8.0.34** (likely Atlas-era dump). Same content shape as mig_compare (411/18/408 orders) |
| **Best content source** | Mac docker `crazzycars-mongo-local-verify:27028` DB **`crazzycars_local_real`** | running 4d | local/staging copy | **476 products**, **35 blogs** — contains the 20 missing blogs + many missing products |
| **Local audit DB** | same container `crazzycars_admin_audit` | — | — | 475 products; not full blogs |
| **Oct 10 SEO dump path** | Host path recorded as `/data/crazzycars-mongo-backups/seo-apply-20261010T200917Z` (59M on Mac host) | 2026-10-10 | claimed prod FP in JSON | Dump tree not present on this Mac; **field backups** in repo `backups/seo-2026-10-apply/` |
| **m5 photo dump** | `/data/crazzycars-mongo-backups/m5-photo-fixes-20261028T131707Z/mongodump-products` | 2026-10-28 | `84143ac0cb2c3085` | products.bson count **411** + before/after JSON for 3 photo fixes |
| **batman photo fix** | `.../batman-mirror-photo-fix-20261028T171741Z/` | 2026-10-28 | — | media copies for 2 batman SKUs + before.json |
| **Media live** | `/data/crazzycars/media` | 178M, 2142 files | — | `uploads/` only 22 files |
| **Media import pack** | `/data/crazzycars/media-import/` + zip 135M | 2026-10-27 | — | 1009 image files + CSV (76 rows marked missing) |
| **Next ISR cache** | store container `/app/.next/cache` | 2.3M | — | fetch-cache only; not a catalog restore source |
| **Old store images** | `crazzycars-store:live` etc. | hours old | — | app code only |

## Live collection pulse (prod)

| Collection | Count | Newest createdAt |
|------------|------:|------------------|
| products | 410 | 2026-10-10T20:17Z |
| blogposts | 18 | 2026-10-16T20:39Z |
| categories | 84 | 2026-08-25 |
| vehicles | 68 | 2026-08-06 |
| orders | 603 | **2026-10-28T20:56Z** (live newer — keep) |
| customers | 342 | **2026-10-28T20:56Z** (live newer — keep) |
| reviews | 1175 | 2026-09-14 |

## Ranked “best source per collection”

| Collection | Best source | Why |
|------------|-------------|-----|
| **blogposts** | `crazzycars_local_real` (Mac :27028) | 35 posts; 20 slugs absent from live |
| **products (missing SKUs)** | `crazzycars_local_real` | 66 slug-only-in-local; **21** status=active car candidates |
| **products (SEO text Oct 10)** | `backups/seo-2026-10-apply/seo-backup-2026-10.json` + apply scripts | Before-values for 13 products / 6 cats / 8 vehicles (need apply “after” from scripts) |
| **products (fitment/membership)** | `fitment-membership-before-values-20261010T211824Z.json` + apply script | 9 products |
| **products (photos)** | m5 + batman backups + media-import | Partial; 65 live products still lack main URL |
| **orders / customers** | **LIVE only** | Live is strictly newer than archive/mig; never restore over live |
| **reviews / categories / vehicles shell** | LIVE ≈ archive | No gap in counts; SEO vehicle/category **text** from SEO backup |
| **media files** | `/data/crazzycars/media` + `media-import/` | 15 blog `/media/uploads/*` still missing everywhere searched |

## Blockers / gaps in R0

- Atlas FP `317ae4de8eb24f84` not opened this run (need owner URI in env for read-only confirm).
- Host dump dir `seo-apply-20261010T200917Z` bson tree missing on this laptop (path note only).
- Missing blog upload binaries not found on VPS or Desktop search.
