# L1 / M4b dry-run — re-apply apply 1 + apply 2 + owner SEO edit

**Fingerprint for writes:** `84143ac0cb2c3085` only. Never Atlas `317ae4de8eb24f84`.  
**Hold:** wait until M4 restore plan is settled, then exact message **`GO L1`**.  
**Write style:** field-level `$set` / `$pull` / `$addToSet` only. No inserts/deletes of documents. Skip any field already equal to “after”.

## Counts (will re-check at GO)

| Bucket | Would touch | Skip (already after) |
|--------|------------:|---------------------:|
| Apply 1 products (meta/name/content) | **13** | ~0 |
| Apply 1 categories | **6** (DB fields; wire may already match code) | 0 exact DB after |
| Apply 1 vehicles | **5+** (4 DB before-match + Alto code) | City/Liana desc-only if already after |
| Apply 2 category membership | **4** products | Vehicle pulls already OK |
| Owner SEO edit (door handle) | **1** product (name + meta; not price) | — |
| Code-only (Alto `carPageMeta`) | **1** file | — |

## Fresh backup (required before GO L1 write)

```bash
# On VPS (prod mongo):
mongodump --uri="$MONGODB_URI" --db=sialkot_motorsports \
  --out=/data/crazzycars-mongo-backups/L1-m4b-$(date -u +%Y%m%dT%H%M%SZ)
```

Record path in this file when taken. Rollback = restore dump collections `products` / `categories` / `vehicles` for touched `_id`s only.

## Apply 1 — product field diffs (target after ← `PAGE_SEO_OVERRIDES` / apply log)

Script: `scripts/seo/apply-seo-2026-10.mjs` (dry-run first).

| Slug | Fields | After (abbrev) |
|------|--------|----------------|
| toyota-corolla-grande-steering-wheel-trim-in-carbon-fiber-multimedia | metaTitle, metaDescription (+ seo.*) | Corolla Grande Steering Wheel Trim (Carbon Look) |
| toyota-corolla-gli-xli-2009-2014-multimedia-steering-wheel-audio-control-buttons | metaTitle, metaDescription | Corolla GLi/XLi 2009–2014 Steering Audio Control Buttons |
| funny-window-hand-gesture-led-light | metaTitle, metaDescription | Funny Hand Gesture LED Light for Car Rear Window |
| toyota-corolla-2009-2026-carbon-steering-monogram-abs | metaTitle, metaDescription | Toyota Corolla Steering Monogram – Carbon Style 2009–2026 |
| car-front-bumper-splitter-abs-plastic-3pcs | metaTitle, metaDescription | Batman Style Front Bumper Splitter 3PCS – Universal Fit |
| toyota-aqua-2012-2015-complete-body-kit | metaTitle, metaDescription | Toyota Aqua 2012–2015 Body Kit Price in Pakistan |
| toyota-corolla-2015-2026-rs-style-trunk-spoiler-abs | metaDescription (+ title if still short) | …RS style trunk spoiler… gloss black ABS… |
| honda-city-new-model-trunk-lip-spoiler-2021-2026 | metaTitle, metaDescription | Honda City 2021–2026 RS Trunk Lip Spoiler \| CrazzyCars.pk |
| deepal-s05-batman-style-side-mirror-covers | metaTitle, metaDescription | Deepal S05 Batman Side Mirror Covers Price in Pakistan |
| car-heads-up-display-hud | metaTitle, metaDescription | Car HUD Heads Up Display Price in Pakistan \| CrazzyCars.pk |
| toyota-corolla-2012-top-ac-panel | name, metaDescription, short/longDescription, features | Butto→Button + features |
| honda-city-2021-2026-carbon-fiber-gear-knob | name | Honda City Carbon Fiber Gear Knob Cover 2021–2026 |
| changan-oshan-x7-batman-style-side-mirror-covers | shortDescription | Apply-1 long shortDescription |

Exact before→after for each field will be printed by re-running the apply script dry-run against prod (read-only) at GO time; skip if live already equals after.

## Apply 1 — vehicles / categories

Same script. Priority vehicle `$set`s (DB currently = before):

- `suzuki-alto-2020-present` → metaTitle `Suzuki Alto 2019–2026 Accessories in Pakistan | CrazzyCars.pk` + meta from gscAudit  
- `toyota-yaris-2020-present`, `suzuki-swift-2025-present`, `toyota-aqua-2012-present`, `honda-civic-x-2016-2021` as in apply log  

**Code:** update `storecraft-store/lib/seo/carPageMeta2026-10.mjs` Alto title/description to match apply after (otherwise HTML stays “2019-Present”).

## Apply 2 — membership (only failing ops)

Script: `scripts/seo/apply-fitment-membership-2026-10.mongosh.js` with `APPLY_FLAG=0` dry-run first.

| Slug | Op |
|------|-----|
| `toyota-corolla-e140-2009-2013-ducktail-trunk-spoiler` | `$pull` categories splitters; `$addToSet` spoilers |
| `toyota-corolla-2015-2026-carbon-steering-trim` | `$pull` categories splitters |
| `toyota-corolla-x-shark-fin-style-lower-panel-diffuser` | `$pull` splitters; `$addToSet` spoilers |
| `honda-civic-x-2016-2021-carbon-steering-trim-cover` | `$pull` louvers |

Vehicle pulls already OK — **skip**.

## Owner SEO edit (door handle panels)

Slug: `toyota-corolla-x-carbon-fiber-interior-door-handle-panels-2014-2026`

| Field | Live | After |
|-------|------|-------|
| name | …(Set of **2**) | …(Set of **4**) |
| metaTitle / seo.metaTitle | …Price in Pakistan (70) | Corolla X Door Handle Panels 2014–2026 Set of 4 \| CrazzyCars.pk |
| metaDescription / seo.metaDescription | set of 2 · Rs. 4,490 | set of 4 · **Rs. 4,490** (live sale; not 5,999) · COD… |

**Not touching** `pricing.*` in L1 (allow-list). If retail should be 5,999 again, that is a separate pricing GO.

## Rollback sketch

```js
// restore one product from L1 mongodump BSON / before snapshot JSON
db.products.updateOne({ _id: ObjectId("…") }, { $set: { /* before fields only */ } });
```

## Stop

Waiting for exact message: **GO L1** (after M4 settled).
