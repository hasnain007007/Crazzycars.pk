# R3 — Rebuild plan where sources are missing

## Recoverable from existing sources (high completeness)

| Item | Source | Completeness |
|------|--------|--------------|
| 20 missing blog posts (body, title, SEO, status) | `crazzycars_local_real.blogposts` | **~95%** — insert docs as-is; featuredImage may need remap to existing `/media/blogs` or product paths |
| 21 active missing products | `crazzycars_local_real.products` | **~90%** — many have empty images in source too; need media-import or owner photos |
| Oct 10 SEO after-values | `seo-apply-20261010T200917Z.txt`, `scripts/seo/apply-seo-2026-10.mjs`, L1 dry-run | **100%** field targets |
| Fitment/membership ops | `apply-fitment-membership-2026-10.mongosh.js` + before JSON | **100%** ops; must bind live `_id`s |
| m5 photo `$set`s (2 emptied) | m5 `apply-report.json` + files on disk | **100%** if product image files still on media volume |
| Batman media files | batman backup `media/` | **100%** binaries |

## Partial / alternate rebuild

| Item | How | Completeness |
|------|-----|--------------|
| Blog featured images (15 uploads) | Remap to `/media/blogs/crazzycars-pk-blog-<slug>-*.{jpg,webp}` if present on disk; else product hero used in local_real | **60–80%** visual OK, not original Cloudinary upload |
| 65 empty product mains | `crazzycars-product-images.csv` + `/data/crazzycars/media-import/` | **partial** — CSV marks many missing; key-cover cohort largely unrestorable without owner files |
| Inactive Oct 3–4 product batch (44) | local_real docs | **docs 100% / images poor** — owner decide publish |
| Door-handle Set of 4 vs 2 | L1 plan: rename+SEO keep price 4490 OR keep live Set of 2 | **needs owner GO** |
| Old VPS `31.97.107.181` media/mongo | SSH timeout — unreachable | **0%** |

## Not recoverable automatically (re-enter / provide)

| Item | Why | Owner action |
|------|-----|--------------|
| 15+ blog `/media/uploads/*` originals | Not on new VPS, backups, or Mac | Provide zip from old Hostinger / Cloudinary export |
| `c4txnxtweazpj7hdi1st-8bd8190af9-400.webp` | Missing everywhere | Re-upload homepage asset |
| honda-vezel fog/DRL correct photo | m5: no safe file on disk | Supply correct image |
| Atlas `317ae4de8eb24f84` confirmation | Not opened this run | Optional read-only URI for gap confirm (never write) |
| Orders/customers “lost” before cut | Live already newer; archive older | Nothing to restore |
| `seo-apply-20261010T200917Z` mongodump bson tree | Path noted; tree not on laptop | Optional; field backups suffice for SEO |

## Git / ISR / sitemap / HTML

| Channel | Use |
|---------|-----|
| Git history | SEO apply scripts + before JSONs; not full product catalog |
| `backups/seo-2026-10-apply/*` | SEO + fitment before |
| Next ISR `/app/.next/cache` | fetch-cache only (~2.3M) — **not** catalog restore |
| Live sitemap / API | Confirms what is currently published; cannot invent missing docs |
| Rendered HTML | Can scrape titles/descriptions for pages that still 200; useless for missing slugs (404) |

## Recommended recovery order (for R4 when GRANTED)

1. Fresh mongodump + scratch restore-test.
2. Insert-only 20 blogs from local_real (remap featuredImage if upload 404).
3. Insert-only 21 active products (skip inactive unless GO).
4. Field `$set` SEO apply-1 (13+6+8).
5. Field fitment `$pull`/`$addToSet` on live `_id`s.
6. Re-apply m5 image `$set`s + copy batman media if missing.
7. Verify sitemap/products/blogs/images; seo-verify C1–C24.
8. Leave door-handle / vezel / uploads for owner GOs.
