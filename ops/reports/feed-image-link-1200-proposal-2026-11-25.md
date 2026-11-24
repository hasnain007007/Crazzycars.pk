# Feed `image_link` → `-1200.webp` proposal (no feed change yet)

**Sample (first 200 feed items):** 107 over 1 MB · 105 PNG masters · largest 2.47 MB  
**Proposal:** point `g:image_link` at sibling `-1200.webp` when that file exists; otherwise keep master. Do **not** rewrite supplier-watermarked photos (filename/heuristic hold).

## Merchant Center rules checked

| Rule | Source | Status vs proposal |
|---|---|---|
| Max file size **16 MB** | [image_link](https://support.google.com/merchants/answer/6324350), [Image too big](https://support.google.com/merchants/answer/12473903) | Masters ≤2.5 MB already legal; 1200 variant ~150–175 KB — safer crawl/reprocess |
| Max **64 megapixels** | same | 1200px webp well under |
| Prefer **~1500×1500**; min **500×500** (enforced 2027-01-31) | [spec update 2026](https://support.google.com/merchants/answer/16989427) | Site `-1200.webp` is ~1200px — above 500; below ideal 1500 but matches existing PDP delivery |
| Formats JPEG/WebP/PNG… | image_link help | Keep WebP derivative (supported) |
| No promotional overlays / watermarks | [Image best practices](https://support.google.com/merchants/answer/18353357) | **Out of scope for this change** — do not retarget watermarked masters |

## Before / after sample (20 largest convertible)

| SKU | Before KB | After KB | After |
|---|---:|---:|---|
| CC-R3-COROLLA-E140-FRONT-SMOOTH-BLACK | 2530 | 174 | 200 |
| CC-R3-COROLLA-E140-FRONT-RED | 2455 | 161 | 200 |
| CC-R3-CIVIC-X-FRONT-RED | 2450 | 172 | 200 |
| CC-R3-COROLLA-E120-SIDE-RED | 2429 | 165 | 200 |
| CC-R3-CIVIC-11TH-SIDE-RED | 2410 | 173 | 200 |
| CC-R3-COROLLA-E120-SIDE-BLACK | 2403 | 166 | 200 |
| CC-R3-COROLLA-E140-SIDE-RED | 2396 | 156 | 200 |
| CC-R3-CIVIC-ES-SIDE-BLACK | 2385 | 167 | 200 |
| CC-R3-CIVIC-REBIRTH-SIDE-RED | 2378 | 156 | 200 |
| CC-R3-CITY-GM-FRONT-SMOOTH-BLACK | 2374 | 166 | 200 |
| CC-R3-CIVIC-X-SIDE-BLACK | 2372 | 160 | 200 |
| CC-R3-ALTO-HA36-FRONT-RED | 2363 | 159 | 200 |
| CC-R3-CIVIC-ES-SIDE-RED | 2361 | 165 | 200 |
| CC-R3-ALTO-HA36-SIDE-RED | 2361 | 168 | 200 |
| CC-R3-CITY-2021-SIDE-RED | 2358 | 165 | 200 |
| CC-R3-CIVIC-REBIRTH-SIDE-BLACK | 2346 | 146 | 200 |
| CC-R3-CIVIC-X-REAR-CUT | 2343 | 145 | 200 |
| CC-R3-CIVIC-X-SIDE-RED | 2342 | 160 | 200 |
| CC-R3-ALTO-HA36-FRONT-SMOOTH-BLACK | 2337 | 167 | 200 |
| CC-R3-CIVIC-REBIRTH-FRONT-RED | 2333 | 151 | 200 |

Full JSON: `ops/reports/feed-image-link-1200-proposal-2026-11-25.json`

**Not applied.** Awaiting approval before touching `merchantFeed.js`.
