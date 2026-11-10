# T10d — Non-car homeware / beauty line (report only)

**Date:** 2026-11-10  
**DB:** No local `MONGODB_URI` — live HTTP only.  
**Action taken:** NONE.

## Categories

| Path | Live status | Notes |
| --- | --- | --- |
| /categories/cookware | 410 | Already in `goneCategoryPaths.mjs` |
| /categories/kitchen-accessories | 410 | Same |
| /categories/dining-serveware | 410 | Same |
| /categories/cutlery-gadgets | 410 | Same |
| /categories/storage-containers | 410 | Same |
| /categories/travel-toiletry-bags | 410 | Same |
| /categories/beauty-bags | 410 | Same |
| /categories/makeup-pouches | 410 | Same |
| /categories/mini-handbags | 410 | Same |
| /categories/back-neck-care | →410 after T9 commit | Added to gone list |

## Products (sample probe)

All listed product slugs return **404** (not 410), e.g. `wooden-serving-tray`, kitchen and beauty bag SKUs from the audit list.

**Inconsistency:** categories often 410; product PDPs 404.

**Owner question:** Was the homeware/beauty line deliberately dropped, or is this data loss?  
If deliberately dropped → follow-up is serve **410** consistently for all product paths in that line (needs GO + DB confirmation of last-seen dates).
