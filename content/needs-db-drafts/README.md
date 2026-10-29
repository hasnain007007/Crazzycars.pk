# NEEDS_DB drafts (3 posts)

These three posts were flagged `NEEDS_DB` in `content/crazzycars-blogs-REVIEW.md` because the local export/HTML backup used for the bulk rewrite did not contain them. **They do exist in production** `crazzycars_motorsports.blogposts` (exported 2026-10-29).

| Slug | Missing from REVIEW source | Present in prod DB |
|------|----------------------------|--------------------|
| `push-start-cover-carbon-key-fob-accessories-pakistan` | Full HTML in export/CSV only had ~200 chars | Yes — 2925 chars |
| `cabin-mood-lighting-usb-atmosphere-digital-eyes-pakistan` | Same | Yes — 3266 chars |
| `key-covers-key-chains-match-buttons-pakistan` | Same | Yes — 1262 chars |

## Still missing / unsure (do not invent)

- Exact product PDP URLs (current HTML links many items to `/shop` only).
- `publishedAt` is `null` on all three in Mongo — confirm publish date before JSON-LD.
- Key-covers post mentions a “year/variant matching guide scheduled for 5 October 2026” — confirm whether that post shipped; do not claim it is live without a URL.
- Civic 11th Gen 5-button fob claim and “most common return reason” language come from current DB copy only — keep or soften after owner review.
- No prices, stock, or new SKUs added in drafts.

## Draft files

- `*.source.json` — exact prod snapshot used as the only fact base.
- `*-DRAFT.md` — proposed rewrite structure using only those facts. **Not applied** to Mongo.
