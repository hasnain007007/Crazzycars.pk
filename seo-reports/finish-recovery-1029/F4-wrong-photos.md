# F4 — Wrong / empty photos (read-only + hide proposal)

No guessing competitor or unrelated SKU photos. Fingerprint writes only if later granted with R4 (image `$set` / hide).

## Product report

| product | current image | best candidate from recovery | correct? | action |
|---------|---------------|------------------------------|----------|--------|
| honda-vezel-2013-2018-fog-lamps-drl-cover-hd011-l2 | `/media/products/osram-projector-lights-3-colour-premium-quality-1-fcc6deaa81.webp` (wrong SKU) | none safe on disk (m5 skipped) | **no** | **Hide photo**; Needs owner |
| toyota-corolla-2014-2026-side-mirror-led-indicators | `media.images: []` (empty) | `/media/products/…-side-mirror-led-indicators-5-32aa522429.webp` (200, m5) | yes if re-applied | `$set` images when R4 |
| toyota-corolla-2008-2010-diamond-style-chrome-front-grille | `media.images: []` | `/media/products/…-front-chrome-grilles-set-unpainted-steel-1-3d2a57629c.webp` (200) | closest grille-family | `$set` when R4 |
| toyota-corolla-2015-2026-rgb-side-style | `…rgb-side-style-and-back-bumper-light-1-d5bba4e978.webp` | same | ok | none |
| deepal-s05-batman-style-side-mirror-covers | own deepal media paths | batman backup copies | ok | none |
| changan-oshan-x7-batman-style-side-mirror-covers | own oshan media paths | batman backup | ok | none |

Audit doc `claude/migration-image-data-audit-2026-10-28.md` still missing from repo — remaining “8 wrong-photo” SKUs not fully named beyond m5/batman/vezel. Live also has **65** products with empty main image (mostly key covers) → treat as Needs owner / hide empty.

## Hide proposal (vezel) — dry-run only

```js
// Prefer empty gallery over wrong image (storefront should not render broken/wrong)
db.products.updateOne(
  { slug: "honda-vezel-2013-2018-fog-lamps-drl-cover-hd011-l2" },
  { $set: { "media.images": [] } }  // or flag hideMainImage if schema supports
);
```

Not applied (no GRANTED for photo hide; can piggyback R4 if owner adds).

## Needs a photo from owner

1. Honda Vezel 2013–2018 Fog Lamps DRL Cover HD011-L2 (correct fog/DRL photo)
2. All **21** missing active products’ main images (source URLs 404; not on server)
3. ~65 live products with empty `media.images` (key-cover cohort etc.)
4. Optional: better seat-cover hero for seat-covers blog (currently dash-mat stand-in)
