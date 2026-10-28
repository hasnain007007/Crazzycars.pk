# R2 — Media and photos (read-only)

Live media root: `/data/crazzycars/media` (~2142 files, 178M).  
`uploads/` currently **22** files only.

## Missing `/media/uploads/*` referenced by live blogs (15)

Searched VPS `/data/crazzycars`, `/data/crazzycars-mongo-backups`, media-import — **all NOT_FOUND**.

| Blog slug | referenced file |
|-----------|-----------------|
| best-body-kit-styles-toyota-corolla-pakistan | capo9g1nksboolyvrptf-6ec493cb54.webp |
| led-ambient-lighting-car-buyer-guide | yzqwp7kg7skvdv8ug16k-593843daf3.webp |
| cod-vs-online-payment-car-accessories-pakistan | gxy81frjsdfz4xa7j6ut-6d954a6737.webp |
| honda-civic-accessories-guide-every-generation | aqktg8wxfdizpbynzonk-cc645ff8a4.webp |
| how-to-choose-right-front-grille | ammvmgnomedi2scguzob-db00e549ad.webp |
| are-aftermarket-car-accessories-safe | qq1ex7nt5bzwyh5ulkos-6e17081691.webp |
| best-floor-mats-pakistani-weather-guide | qtzlu7x0ql7kfvndaahl-f8c294020a.webp |
| seat-covers-buying-guide-pakistan-climate | krmnwrrx8jrw3fmfodnw-e413dadddc.webp |
| car-perfume-air-freshener-guide | f6cyv797tcyb39dh3ltb-11dab12a77.webp |
| exhaust-tips-systems-sound-performance | dqkao5wjtg0jrp8yk7jj-e580cfc898.webp |
| dash-cameras-pakistan-why-every-driver-needs-one | tfnm8cg5xnm6yuwbdrox-6638c1df9d.webp |
| car-care-101-essential-products-pakistan | c0cb7dr4nt6j0wpeduin-d4af43ab6e.webp |
| side-mirror-covers-carbon-fiber-accents-guide | anatwflwuu4tnbc1fpbg-2b08a28066.webp |
| toyota-yaris-vs-honda-city-best-accessories | ap3oaijbpsugs7pi5lif-e43a990045.webp |
| protect-car-interior-from-pakistan-heat | vn73md42trghhxu6wnfh-f389d4e566.webp |

Also commonly broken in SEO verifies: `c4txnxtweazpj7hdi1st-8bd8190af9-400.webp` (homepage) — **NOT_FOUND**.

**Mitigation (no binary):** `crazzycars_local_real` blog docs often point featuredImage at `/media/blogs/...` or product images that **do** exist. Prefer `$set featuredImage` to those URLs rather than copying missing uploads (until owner provides files from old Hostinger).

Audit doc `claude/migration-image-data-audit-2026-10-28.md` — **not in repo** (blocked path).

## Live products with empty main image

**65** products with `media.images` empty or no main URL (key covers, some body kits, etc.). Not all are “wrong photo”; many are blank.

## Wrong-photo / m5 + batman (8-ish tracked)

### Already applied on live (verify still correct)

From `/data/crazzycars-mongo-backups/m5-photo-fixes-20261028T131707Z/apply-report.json`:

| slug | proposed `$set` `media.images.0.url` | live now |
|------|--------------------------------------|----------|
| toyota-corolla-2014-2026-side-mirror-led-indicators | `/media/products/toyota-corolla-2014-2026-side-mirror-led-indicators-5-32aa522429.webp` | **images [] EMPTY** — re-apply needed |
| toyota-corolla-2008-2010-diamond-style-chrome-front-grille | `/media/products/toyota-corolla-2008-2011-front-chrome-grilles-set-unpainted-steel-1-3d2a57629c.webp` | **images [] EMPTY** — re-apply needed |
| toyota-corolla-2015-2026-rgb-side-style | `/media/products/toyota-corolla-rgb-side-style-and-back-bumper-light-1-d5bba4e978.webp` | OK |

### Still wrong (owner)

| slug | live url | note |
|------|----------|------|
| honda-vezel-2013-2018-fog-lamps-drl-cover-hd011-l2 | `/media/products/osram-projector-lights-3-colour-premium-quality-1-fcc6deaa81.webp` | m5 skipped; NEEDS-OWNER correct file |

### Batman mirrors (media copies exist)

Source files ready under:
`/data/crazzycars-mongo-backups/batman-mirror-photo-fix-20261028T171741Z/media/`

| source → target (copy-only if missing) |
|----------------------------------------|
| `…/deepal-s05-batman-style-side-mirror-covers-1-30f4dab0c1.webp` → `/data/crazzycars/media/products/` (same basename) |
| `…/deepal-s05-…-400.webp` → same |
| `…/changan-oshan-x7-batman-style-side-mirror-covers-1-440c0f6f8d.webp` → products/ |
| `…/changan-oshan-x7-…-400.webp` → products/ |

DB `$set` for those SKUs: point `media.images.0.url` at `/media/products/<basename>` if live still wrong (confirm at apply).

## Copy plan (copy only; never overwrite existing)

| # | source | target | status |
|---|--------|--------|--------|
| 1–4 | batman backup media/*.webp | `/data/crazzycars/media/products/<same>` | ready; skip if exists |
| 5+ | media-import pack for blank key-cover SKUs | `/data/crazzycars/media/products/` | partial; CSV marks many missing |
| blog uploads ×15 | **none found** | `/data/crazzycars/media/uploads/` | **blocked** — need old VPS/export |
| homepage `c4txnxt…` | none | uploads/ | blocked |

## Exact `$set` proposals (dry-run; apply only under GRANTED R4)

```js
// re-apply emptied m5 fixes
db.products.updateOne(
  { slug: "toyota-corolla-2014-2026-side-mirror-led-indicators" },
  { $set: { "media.images": [{ url: "/media/products/toyota-corolla-2014-2026-side-mirror-led-indicators-5-32aa522429.webp", isMain: true }] } }
);
db.products.updateOne(
  { slug: "toyota-corolla-2008-2010-diamond-style-chrome-front-grille" },
  { $set: { "media.images": [{ url: "/media/products/toyota-corolla-2008-2011-front-chrome-grilles-set-unpainted-steel-1-3d2a57629c.webp", isMain: true }] } }
);
```

Blog featuredImage remaps: use local_real values (product/blog paths that 200 on live) — list in R4 dry-run.

## HTTP spot-check (sample)

- Product images under `/media/products/` generally 200 when file exists.
- Referenced `/media/uploads/<cloudinary-hash>.webp` for the 15 blogs → expected **404**.
