# BLOG-POLISH APPLY — GO BLOG-POLISH

**When:** 2026-10-28T23:29Z+  
**Branch:** `fix/blog-polish-1029`  
**Fingerprint:** `84143ac0cb2c3085` (docker `sialkot-mongo` → `sialkot_motorsports`)  
**Pre-write dump:** `/data/crazzycars/mongo/blog-polish-prewrite-20261028T232913Z.archive` (11M)  
**Scratch:** 108694 docs OK → dropped (430p / 38b / 32 pub / 603o / 84c)

## Also fixed (brand root cause)

`settings.general.storeName` was still **`Sialkot Motorsports`**, which re-poisoned blog SEO/`author` after `$set`. Updated to **`CrazzyCars.pk`** (field-level `$set` on settings).

## Writes

Field-level `$set` only · **19/19 matched & modified** · **0 deletes** · slugs/URLs unchanged.

| Action | Count |
|--------|------:|
| Polish (SEO + links + brand) | 16 |
| S5 rewrite 700+ + FAQ | 3 |
| **Total** | **19** |

### S5 thin (word counts after)

| Slug | Words | FAQ |
|------|------:|----:|
| `7d-vs-9d-vs-tpe-floor-mats-pakistan` | 798 | 5 |
| `honda-city-2021-modification-cost-pakistan` | 762 | 5 |
| `body-kit-price-in-pakistan-2026` | 705 | 5 |

### Body “Sialkot Motorsports” → CrazzyCars.pk (visible text)

| Slug | Change |
|------|--------|
| `cod-vs-online-payment-car-accessories-pakistan` | `At Sialkot Motorsports, we offer` → `At CrazzyCars.pk, we offer` |
| `honda-civic-accessories-guide-every-generation` | `…photos to Sialkot Motorsports before ordering` → `…photos to CrazzyCars.pk before ordering` |
| `are-aftermarket-car-accessories-safe` | `On Sialkot Motorsports, ask on WhatsApp` → `On CrazzyCars.pk, ask on WhatsApp` |
| `honda-city-2021-modification-cost-pakistan` | Full rewrite (old body brand link removed) |
| `body-kit-price-in-pakistan-2026` | Full rewrite (old `/categories/body-kits` brand link removed) |
| All 19 | `author.name` Sialkot Motorsports → `CrazzyCars.pk` (byline + meta author) |
| settings | `general.storeName` Sialkot Motorsports → `CrazzyCars.pk` |

SEO `metaTitle` values that still said `| Sialkot Motorsports` were replaced with `| CrazzyCars.pk` on all touched posts.

### Live verify (after storeName fix + ISR cache clear)

**19/19 PASS:** HTTP 200, self-canonical, 1 H1, title ≤60 with CrazzyCars.pk, meta 140–155, ≥3 body links → 200, no article Sialkot, in `sitemap-blog.xml`, thin posts emit FAQPage.

### Flag for later rewrite (not forced to 700)

| Slug | Note |
|------|------|
| `dashboard-mats-pakistan-sun-glare-buying-guide` | ~147w after polish — priority rewrite later |
| `side-mirror-covers-carbon-fiber-accents-guide` | ~236w — expand later |
| `best-body-kit-styles-toyota-corolla-pakistan` | ~348w — consider full rewrite later |

## Rollback (field-level `$set` from before-values — **no --drop**)

Before snapshot on VPS: `/tmp/blog-polish-before-clean.json` (also `seo-reports/blog-polish-1029/before-values.json`).  
Pre-write archive: `/data/crazzycars/mongo/blog-polish-prewrite-20261028T232913Z.archive`

```bash
# On VPS — restores title/excerpt/content/seo/faq/author/contentUpdatedAt per slug from before JSON
docker cp /tmp/blog-polish-before-clean.json sialkot-mongo:/tmp/blog-polish-before-clean.json
docker exec sialkot-mongo mongosh --quiet sialkot_motorsports --eval '
const before = JSON.parse(fs.readFileSync("/tmp/blog-polish-before-clean.json","utf8"));
let n=0;
for (const d of before) {
  const set = {
    title: d.title,
    excerpt: d.excerpt,
    content: d.content,
    "seo.metaTitle": d.metaTitle,
    "seo.metaDescription": d.metaDescription,
    faq: d.faq || [],
    "author.name": "Sialkot Motorsports",
  };
  if (d.contentUpdatedAt) set.contentUpdatedAt = new Date(d.contentUpdatedAt);
  else set.contentUpdatedAt = null;
  const r = db.blogposts.updateOne({ slug: d.slug }, { $set: set });
  n += r.modifiedCount;
  print(d.slug, r.matchedCount, r.modifiedCount);
}
// optional: revert storeName only if you must undo brand fix
db.settings.updateOne({}, { $set: { "general.storeName": "Sialkot Motorsports" } });
print("modified", n);
'
# Then: docker exec crazzycars-store sh -c "rm -rf /app/.next/cache/*"; docker restart crazzycars-store
```

## Artifacts

- `before-values.json` / `before-meta.json`
- `apply-payload` source: `/tmp/blog-polish-updates.json` on apply host
- `INDEXING-LIST.md` (thin first)
