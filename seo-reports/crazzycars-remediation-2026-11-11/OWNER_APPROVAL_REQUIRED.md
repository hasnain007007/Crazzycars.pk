# OWNER_APPROVAL_REQUIRED — Stage 3 Indexing SEO

## Recommendation

# **CONDITIONAL GO**

Code-only deploy of branch `fix/crazzycars-indexing-seo-2026-11-11` (exact tip SHA in agent message / `git rev-parse`) after you name it.

### Included if you say `GO deploy <sha>`

1. Expand `?page=1` → 308 for `/categories/*`, `/cars/*`, `/sale` (plus existing shop/blogs/cars index).  
2. Broader **410** for dead `.atom` / `/atom` / `.rss` (keeps `/feed/*` live).

### Not included (separate GO)

| Item | Phrase when ready |
| --- | --- |
| S5 blog rewrites | `GO S5` |
| Tucson hybrid 2025 hub | Evidence + explicit redirect/create GO |
| Swift body-kit year / multi-gen mats | Fitment evidence + migrate GO |
| GSC API export analysis | Provide GSC access or CSV |

### Forbidden without ask

- Mongo writes beyond already-applied M1–M4  
- Price/image/inventory/checkout changes  
- Force 404 on live Audi A5 hub  

## Deploy constraint

Do **not** merge to `vps-test` / Coolify until you approve the exact SHA. Autodeploy would ship storefront middleware changes.
