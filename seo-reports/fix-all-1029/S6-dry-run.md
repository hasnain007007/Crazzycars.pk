# S6 — Keyword map (code shipped; DB dry-run STOP)

**Status:** Code title/meta/H1/Org alternateName applied (no GO needed). DB text still **dry-run only** — await `GO S6` for any Mongo `$set`.

## Code changes (live after deploy)
- `CATEGORY_KEYWORD_META` + `PAGE_SEO_OVERRIDES` + `CATEGORY_H1_OVERRIDES` for listed categories/cars/HUD.
- Titles ≤60; metas 140–155; keywords woven only where products appear on the page.
- Cars metadata: `PAGE_SEO_OVERRIDES` wins over DB `metaTitle` for these S6 paths.
- Organization JSON-LD: `alternateName: ["Crazy Cars", "CrazyCars.pk"]`.
- About defaults: “Crazy Cars / CrazyCars.pk” in story paragraph.

## Skipped / softened (truth check)
- Side-mirror meta: **not** Aqua/Vitz (not on category grid); uses City, BR-V, Civic, Corolla, Alto.
- Civic X: no “grill” claim (not listed); RS trunk spoiler + carbon interior + body kit kept.
- Reborn: no handbrake cover (not listed); front grill + gear knob cover kept.
- E170: no “Grande paddle shifter” (not listed); Grande carbon steering trim + RS spoiler kept.
- City 2021: paddle shifter covers (listed), not gear knob cover.
- FAQ: no new FAQ blocks added (existing true FAQs left as-is).

## DB dry-run (await GO S6) — optional sync so admin UI matches wire
Fingerprint write target `84143ac0cb2c3085` only. Fresh mongodump first.

```js
// vehicles — field-level $set metaTitle/metaDescription to match PAGE_SEO_OVERRIDES
// Example shape only; do not run without GO S6 + dump:
db.vehicles.updateOne(
  { slug: "honda-civic-x-2016-2021" },
  { $set: {
    metaTitle: "Civic X Accessories Pakistan | Interior, Spoiler",
    metaDescription: "Civic X interior, carbon fiber interior, RS trunk spoiler and body kit accessories in Pakistan. COD on eligible items nationwide from Gujranwala."
  }}
);
// …same for other S6 car slugs if admin catalog should mirror code.
```

Categories already prefer `CATEGORY_KEYWORD_META` over DB — DB sync optional.

## Not claimed (missing / wrong page)
- “batman splitter” as category title keyword — Batman Style Front Bumper Splitter exists on splitters page; mentioned only in product list, not forced into title.
- Aqua/Vitz mirror covers on `/categories/side-mirror-covers` — Aqua lives on car page; Vitz not verified on category grid.
