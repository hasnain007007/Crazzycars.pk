# D2 — L1 SEO re-apply dry-run (NO APPLY)

**When:** 2026-10-28T22:49:01Z
**GRANTED:** empty → dry-run only. Token needed: `L1`.
**Depends:** D1 apply skipped (dry-run only) — L1 may proceed when granted (explicitly allowed).
**Source:** `seo-reports/fix-all-1029/L1-dry-run-m4b-reapply.md` (migration path absent; this is the in-repo dry-run).
**Fingerprint:** `84143ac0cb2c3085`. Fresh mongodump + scratch restore-test required before any write.

## Door-handle (DO NOT CHANGE)

- Live title: `Corolla X Door Handle Panels 2014–2026 Set of 4 | CrazzyCars.pk` (63 chars)
- Live H1: `Toyota Corolla X Carbon Fiber Interior Door Handle Panels 2014–2026 (Set of 4)`
- Already Set of 4 @ Rs. 5,999 per prior GRANTED — **skip all fields** for this slug in L1.

## Live spot-check (before → proposed after from L1 dry-run)

| Path | Live title (len) | Live meta len | Note |
|------|------------------|--------------:|------|
| `/toyota-corolla-grande-steering-wheel-trim-in-carbon-fiber-multimedia` | Corolla Grande Steering Wheel Trim (Carbon Look) (48) | 131 | proposed≈`Corolla Grande Steering Wheel Trim (Carbon Look)` |
| `/toyota-corolla-gli-xli-2009-2014-multimedia-steering-wheel-audio-control-buttons` | Corolla GLi/XLi 2009–2014 Steering Audio Control Buttons (56) | 149 | spot-check |
| `/funny-window-hand-gesture-led-light` | Funny Hand Gesture LED Light for Car Rear Window (48) | 153 | spot-check |
| `/toyota-corolla-2009-2026-carbon-steering-monogram-abs` | Toyota Corolla Steering Monogram – Carbon Style 2009–2026 (57) | 154 | spot-check |
| `/car-front-bumper-splitter-abs-plastic-3pcs` | Batman Style Front Bumper Splitter 3PCS – Universal Fit (55) | 153 | proposed≈`Batman Style Front Bumper Splitter 3PCS – Universal Fit` |
| `/toyota-aqua-2012-2015-complete-body-kit` | Toyota Aqua 2012–2015 Body Kit Price in Pakistan (48) | 149 | spot-check |
| `/toyota-corolla-2015-2026-rs-style-trunk-spoiler-abs` | Toyota Corolla RS Style Trunk Spoiler ABS | Sialkot Motorsports (63) | 144 | spot-check |
| `/honda-city-new-model-trunk-lip-spoiler-2021-2026` | Honda City 2021–2026 RS Trunk Lip Spoiler | CrazzyCars.pk (57) | 155 | spot-check |
| `/deepal-s05-batman-style-side-mirror-covers` | Deepal S05 Batman Side Mirror Covers Price in Pakistan (54) | 147 | spot-check |
| `/car-heads-up-display-hud` | Heads Up Display Pakistan | Car HUD | CrazzyCars.pk (51) | 148 | proposed≈`Car HUD Heads Up Display Price in Pakistan | CrazzyCars.pk` |
| `/toyota-corolla-2012-top-ac-panel` | Corolla Top AC Panel Trim 2008–2013 | Sialkot Motorsports (57) | 164 | spot-check |
| `/honda-city-2021-2026-carbon-fiber-gear-knob` | ERROR HTTP Error 404: Not Found | — | — |
| `/changan-oshan-x7-batman-style-side-mirror-covers` | Changan Oshan X7 Batman Style Side Mirror | Sialkot Motorsports (63) | 124 | spot-check |
| `/categories/splitters-side-skirts` | Car Side Skirts, Front Splitters | CrazzyCars.pk (48) | 145 | spot-check |
| `/categories/interior-lights` | Car Interior Lights Price in Pakistan | CrazzyCars.pk (53) | 145 | spot-check |
| `/cars/suzuki-alto-2020-present` | Alto Accessories Pakistan | Body Kit, Spoiler (45) | 140 | spot-check |
| `/cars/honda-civic-x-2016-2021` | Civic X Accessories Pakistan | Interior, Spoiler (48) | 145 | spot-check |
| `/cars/toyota-yaris-2020-present` | Yaris Accessories Pakistan | Body Kit, Spoiler (46) | 142 | spot-check |

## Planned ops when `GRANTED: L1`

| Bucket | Count | Action |
|--------|------:|--------|
| products SEO `$set` | ~13 | field-level; skip if live already equals after or live newer |
| categories `$set` | 6 | same |
| vehicles `$set` | 5+ | same; Alto may also need code `carPageMeta` |
| membership `$pull`/`$addToSet` | 4 | fitment script ops |
| door-handle | 0 | **skip** (already Set of 4 / 5999) |

## Rollback

```bash
# mongorestore pre-L1 archive for products/categories/vehicles only
# or field $set from before-values JSON recorded at apply
```

## APPLY STATUS

**BLOCKED — GRANTED does not include L1.** Live unchanged.
