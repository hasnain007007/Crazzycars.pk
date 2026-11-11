# T4 — Vehicle intro fact sources (10 of 60)

**Verdict:** Intros are **not** free-text Mongo “DB intros” in the usual CMS sense. Live hubs call `buildVehicleIntro()` in `storecraft-store/lib/seo/buildVehicleIntro.js` at request time. Production has Mongo; a previous “DATABASE: NONE” note referred to the **agent’s local** `.env`, not to how live pages render.

**Invented fitment?** **No** in the sampled 10. Years/generation come from the Vehicle document. Product counts and category names come from products returned by `loadProductsForVehicle`. Price ranges come from `getProductPriceExtent`. Policy sentences are fixed store-policy template copy (COD / delivery bands / 7-day returns) — same wording on every hub, not per-car fitment claims.

## Fact map (every sample uses the same builder)

| Sentence pattern | Source |
|---|---|
| H1 display name + year span | `vehicle.displayName`, `yearFrom`/`yearTo` |
| “Also searched as …” | `generationAliases` / `alsoKnownAsLine` (search aliases, not fitment claims) |
| “accessories price in Pakistan ranges from Rs X to Rs Y” | Live min/max of products on this hub (`priceLine`) |
| “Shop … for the YYYY–YYYY generation (Nickname)” | Vehicle years + `generation`/`nickname` |
| “This hub lists N compatible products assigned…” | `productCount` / `loadProductsForVehicle` length |
| “most stocked part families … are A, B, and C” | Category name frequencies on those products |
| “confirm … on the vehicle compatibility table” | Instructional; no specific year invented |
| COD / bulky delivery / 7-day returns | Template from store policy (not catalogue fitment) |

If `vehicle.description` is ≥80 words, that plain text is used instead (clamp 120–200 words). None of the 10 samples below used that path (all matched the template).

## Sample intros (live 2026-11-11)

See `T4-vehicle-intros-sample.json` for full extracted paragraphs.

Paths: Corolla E140, Corolla E170–E210, Yaris, Aqua, Vitz, Civic Reborn, Rebirth, Civic X, Civic 11th, City Classic.

**Flag (non-blocking):** When `generation` equals the display name (e.g. Yaris), the template repeats the name in parentheses — awkward copy, not false fitment.

**Stop condition:** No invented fitment years or false “fits all” claims in these intros. Policy boilerplate is intentional shared copy.
