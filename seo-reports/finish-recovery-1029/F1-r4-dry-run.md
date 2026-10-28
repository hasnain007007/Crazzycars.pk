# F1 — R4 restore dry-run (NO APPLY)

**GRANTED:** empty → blocked for writes. Fingerprint for later apply: `84143ac0cb2c3085`.

Live baseline: products **410**, blogs **18**, categories **84**, vehicles **68**, orders **603**, customers **342**.

## Pre-checks (a)–(e)

### (a) Insert-only; door-handle clash
- Insert only when **both** `_id` and `slug` absent on live.
- Door-handle slug exists live `_id` `6aca877d…` (Set of 2). Source `_id` `6aca8810…` (Set of 4) → **SKIP insert**; keep live.
- 20 blog slugs absent → insert-ok (when granted).
- 66 product slugs absent in local_real; **21 active** candidates (see below).

### (b) Prices / stock
- Candidates are insert-only (no live doc) → source pricing/stock used as initial.
- No live-newer conflict on those slugs.
- Door-handle: keep live pricing (4490/5490) / stock qty 25 — never overwrite from source.

### (c) Empty / broken main images
- Source marks `media.images` present for all 21 active, but **every** referenced file returns **HTTP 404** on live; files also absent under `media-import`.
- Per rules: **do not publish**. On apply: insert as `status: "draft"` (or skip) until owner media copied and image URL returns 200.
- 44 inactive + 1 draft: skip unless separate GO.

### (d) Demo / test data
- No slug/name matched demo|test|profit|sample|placeholder among missing products.
- Orders/customers: never restore from archive (live newer).

### (e) Sitemap gate
- Draft/inactive products stay out of product sitemap until active **and** main image 200.
- Blogs: only activate after featuredImage URL returns 200 (prefer existing `/media/products/…` that already 200).

## Planned ops when `GRANTED: R4` (after mongodump + scratch restore-test)

| Op | Count | Notes |
|----|------:|-------|
| insert blogposts | 20 | Remap featuredImage to 200 URLs first |
| insert products | 0–21 | **draft only** until media 200; else skip |
| `$set` SEO | 13p+6c+8v | from apply scripts |
| fitment `$pull`/`$addToSet` | ≤9 | live `_id`s |
| `$set` media.images | 2 | m5 emptied SKUs (files on disk 200) |
| media copy | batman if missing | never overwrite |

## Rollback

```bash
# Reverse inserts by _id/slug delete ONLY if owner explicitly allows deletes —
# preferred: keep inserts as draft and $set status, or restore pre-flight archive for touched collections only:
# docker exec sialkot-mongo mongorestore --archive=/backup/recovery-r4-<STAMP>.archive \
#   --nsInclude='sialkot_motorsports.blogposts' --nsInclude='sialkot_motorsports.products' 
# (coordinate carefully — avoid clobbering orders)
```

Field `$set` rollback: restore from before-values JSON recorded at apply time.

## APPLY STATUS

**BLOCKED — GRANTED does not include R4.**  
Also blocked for active product publish until owner supplies product image files (all 21 image URLs 404).

## Before → after (this step)

410p/18b → unchanged (dry-run).
