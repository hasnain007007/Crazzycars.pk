# STATUS — Product `createdAt: {}` + CSV import + SEO / missing report

**Date:** 2026-10-29  
**Live DB:** `crazzycars_motorsports` FP `187aad8c44fe3a84`  
**Pre-repair dump:** `/data/crazzycars/mongo/pre-timestamp-repair-20261029T221954Z/products.archive.gz`

---

## 1. What wrote `createdAt: {}`

**Window:** 2026-10-29 **00:27 → 00:45 UTC** (two-brand migration on CrazzyCars).

| Evidence | Detail |
|----------|--------|
| Backup before copy apply | `…/crazzycars-copy-2026-10-29T00-27-04-520Z/products.json` — **430/430** valid `createdAt` |
| Backup before intro-v2 apply | `…/crazzycars-intro-v2-2026-10-29T00-45-05-279Z/products.json` — **409** already `createdAt: {}` |
| Same night | `two-brand-scrub-settings.mjs` uses `{ ...doc }` / `walk()` which turns `Date` → `{}` on settings/banners/pages/**blogposts**/**categories** (confirmed empty dates there too) |

**Root bug pattern:** object-spread / recursive `walk()` on BSON documents treats `Date` as a plain object (`{...date}` → `{}`), then `replaceOne` persists it.

Products were corrupted in the same window (409 shared-catalog rows). **21** products kept valid dates (still good in the 00:45 backup); they match `_id.getTimestamp()`.

---

## 2. Timestamp migration (done)

| Mode | badCreated | badUpdated | fixed |
|------|------------|------------|-------|
| DRY_RUN | 409 | 0 | 0 |
| APPLY | 409 | 0 | **409** |

**Verify:** `createdAt` Date = **430/430**, empty `{}` = **0**.  
Script: `scripts/mongo/repair-product-timestamps.mongosh.js` (sets from `_id.getTimestamp()` only).  
Prices / stock / slugs / SEO **unchanged**.

---

## 3. CSV importer fix (code → deploy)

`storecraft-admin/app/api/products/csv/route.js`:

- Ignores `createdAt` / `updatedAt` / `__v` from CSV rows  
- On update, repairs invalid `createdAt` from ObjectId before `save()`  
- On create, never passes client timestamps  

Failure mode was mongoose cast on **already-corrupt** DB values during `existing.save()`, not only CSV columns.

---

## 4. SEO overwrite (~300 titles / ~409 descriptions) — report only

**Not restored** (await owner GO).

| Field | Pattern | Count (live) | Writer |
|-------|---------|--------------|--------|
| `seo.metaTitle` | `{Name} \| CrazzyCars` (often truncated ~70) | **305** end with `\| CrazzyCars`; more truncated | `two-brand-crazzycars-copy.mjs` (~00:27) |
| `seo.metaDescription` | `{Name}. Details on CrazzyCars.` | **409** | `two-brand-crazzycars-intro-v2.mjs` (~00:45) |

Pre-rewrite SEO still in backups under `/tmp/two-brand-run/backups/crazzycars-copy-…` and `crazzycars-intro-v2-…`.

---

## 5. “54 products disappeared” — report only (no recreate)

**Not deleted from live DB.** Live still **430** products (410 on 28 Oct + **20** R4 draft inserts).  
Legacy vs live slug sets nearly identical (4 each side).

What changed for storefront/SEO visibility:

| Metric | Value |
|--------|------:|
| Product sitemap URLs now | **360** |
| `seo.excludeFromSitemap` | 43 |
| draft | 26 |
| inactive | 5 |
| active + not excluded from listings | 361 |

**~54 drop from product sitemap** ≈ previously indexed actives that are now draft / `excludeFromSitemap` / inactive (R4 holds + listing flags), **not** hard deletes.  
Oct 26 sitemap index total was 584; today sum of child sitemaps ≈ 508 (products 360 + blogs 32 + cars 59 + categories 36 + pages 21).

Recovery R1 also noted **66** slugs only in Mac `crazzycars_local_real` (21 active / 44 inactive) vs old live 410 — separate from the sitemap hide; R4 restored 20 of the active gap as **drafts**.

---

## 6. Deploy (confirmed)

| Item | Value |
|------|-------|
| Commit | `277cc54` on `vps-test` |
| Images | `crazzycars-admin:277cc54` + `crazzycars-store:277cc54` (tagged `:live`) |
| Health | admin `/login` 200, `/api/health` 200; store `/api/health` 200 |
| DB post-deploy | `createdAt` empty `{}` = **0**; Date = **430/430** |

Deployed via `/data/crazzycars/scripts/deploy-vps-test.sh` `FORCE=1` (Coolify UI remains Homefy-only; crazzycars uses hand-run containers + poller).
