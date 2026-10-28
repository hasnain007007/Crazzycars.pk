# F2 — Door-handle Set of 4 (DRY-RUN)

**GRANTED:** empty → no writes. Token needed: `DOOR-SET4`.  
Slug (unchanged): `toyota-corolla-x-carbon-fiber-interior-door-handle-panels-2014-2026`  
Live `_id`: `6aca877dc7b9bcec06c09a32` · status active · stock qty **25** (keep).

## Before → after (proposed `$set` only)

| Field | Before (live) | After |
|-------|---------------|-------|
| name | …(Set of **2**) | …(Set of **4**) |
| pricing.salePrice | 4490 | **5999** |
| pricing.regularPrice | 5490 | **7999** (align with local_real Set of 4; confirm at GO) |
| metaTitle / seo.metaTitle | …Price in Pakistan (set of 2) | Corolla X Door Handle Panels 2014–2026 Set of 4 \| CrazzyCars.pk |
| metaDescription / seo.metaDescription | set of 2 · Rs. 4,490 | set of 4 · Rs. **5,999** · COD… |
| media altText | Set of 2 | Set of 4 |
| inventory.quantity | 25 | **25** (unchanged) |
| slug / URL | same | same |
| variants | none / unchanged | unchanged |

JSON-LD: storefront derives offer from `pricing` + name — no separate code hardcode found required beyond DB fields (confirm ProductDetail schema uses DB). Bundle text in DB description fields: `$set` if copy mentions “set of 2”.

## Guards
- Fresh mongodump + fingerprint `84143ac0cb2c3085` before write.
- Never insert local `_id` `6aca8810…`.
- Never replace document.

## APPLY STATUS

**BLOCKED — need `GRANTED: DOOR-SET4`.**
