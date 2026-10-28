# F3 — Blog featured images (DRY-RUN)

**GRANTED:** empty → no writes. Token: `BLOG-IMAGES`.  
Scope: 15 live blogs whose featuredImage points at missing `/media/uploads/*`.  
Rule: only own-site `/media/products|uploads` files that return **200**. No competitor photos.

## Table: post | missing file | new image | reason

| post | missing file | new image | reason |
|------|--------------|-----------|--------|
| best-body-kit-styles-toyota-corolla-pakistan | capo9g1nksboolyvrptf-6ec493cb54.webp | `/media/products/universal-front-splitter-spike-d5-carbon-fiber-canard-3pcs-1-b223cf18f2.webp` | body-kit / splitter family |
| led-ambient-lighting-car-buyer-guide | yzqwp7kg7skvdv8ug16k-593843daf3.webp | `/media/products/toyota-corolla-2014-2026-side-mirror-led-indicators-5-32aa522429.webp` | LED lighting |
| cod-vs-online-payment-car-accessories-pakistan | gxy81frjsdfz4xa7j6ut-6d954a6737.webp | `/media/products/honda-city-2020-2026-carbon-door-handle-cover-abs-1-7ad94ae7db.webp` | own accessories photo |
| honda-civic-accessories-guide-every-generation | aqktg8wxfdizpbynzonk-cc645ff8a4.webp | `/media/products/honda-civic-reborn-2006-2012-carbon-window-quarter-covers-pair-1-1-8dcca44d1f.webp` | Civic accessory |
| how-to-choose-right-front-grille | ammvmgnomedi2scguzob-db00e549ad.webp | `/media/products/toyota-corolla-2008-2011-front-chrome-grilles-set-unpainted-steel-1-3d2a57629c.webp` | grille SKU |
| are-aftermarket-car-accessories-safe | qq1ex7nt5bzwyh5ulkos-6e17081691.webp | `/media/products/honda-city-2020-2026-carbon-door-handle-cover-abs-1-7ad94ae7db.webp` | own accessories |
| best-floor-mats-pakistani-weather-guide | qtzlu7x0ql7kfvndaahl-f8c294020a.webp | `/media/uploads/honda-civic-2007-2011-tpe-floor-mats-premium-1-0a03fdcd53.webp` | TPE floor mats (200) |
| seat-covers-buying-guide-pakistan-climate | krmnwrrx8jrw3fmfodnw-e413dadddc.webp | `/media/products/toyota-corolla-2014-2026-velvet-dashboard-mat-2-42d6d2480a.webp` | interior; no seat-cover file confirmed |
| car-perfume-air-freshener-guide | f6cyv797tcyb39dh3ltb-11dab12a77.webp | `/media/products/lion-car-dashboard-perfume-air-freshener-crazzycars-1-ca0dfd88dd.webp` | perfume SKU on server |
| exhaust-tips-systems-sound-performance | dqkao5wjtg0jrp8yk7jj-e580cfc898.webp | `/media/products/car-modified-stainless-steel-exhaust-tip-1-8ab230af87.webp` | exhaust tip |
| dash-cameras-pakistan-why-every-driver-needs-one | tfnm8cg5xnm6yuwbdrox-6638c1df9d.webp | `/media/products/4-in-1-45w-fast-car-charger-usb-type-c-built-in-ios-android-cable-1-691e25b05f.jpg` | roadside electronics (no dashcam file) |
| car-care-101-essential-products-pakistan | c0cb7dr4nt6j0wpeduin-d4af43ab6e.webp | `/media/uploads/honda-civic-2007-2011-tpe-floor-mats-premium-1-0a03fdcd53.webp` | car-care adjacent |
| side-mirror-covers-carbon-fiber-accents-guide | anatwflwuu4tnbc1fpbg-2b08a28066.webp | `/media/products/deepal-s05-batman-style-side-mirror-covers-1-3b77ae3d91.webp` | side mirror covers |
| toyota-yaris-vs-honda-city-best-accessories | ap3oaijbpsugs7pi5lif-e43a990045.webp | `/media/products/honda-city-2020-2026-carbon-door-handle-cover-abs-1-7ad94ae7db.webp` | City accessories |
| protect-car-interior-from-pakistan-heat | vn73md42trghhxu6wnfh-f389d4e566.webp | `/media/products/toyota-corolla-2014-2026-velvet-dashboard-mat-2-42d6d2480a.webp` | dash mat / heat |

## Write plan (when granted)

```js
db.blogposts.updateOne({ slug }, { $set: {
  "featuredImage.url": NEW,
  "featuredImage.alt": descriptiveAlt,
  // also scrub content HTML img src that 404 → same NEW or remove tag
}})
```

Fingerprint + mongodump required. Inline HTML: scan `content`/`body` for `/media/uploads/` 404s and replace or strip.

## APPLY STATUS

**BLOCKED — need `GRANTED: BLOG-IMAGES`.**
