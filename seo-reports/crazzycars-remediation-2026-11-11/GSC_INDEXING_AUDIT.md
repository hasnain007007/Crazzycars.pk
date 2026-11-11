# GSC_INDEXING_AUDIT — Stage 3 (2026-11-11)

## Access

| Channel | Result |
| --- | --- |
| Search Console MCP / API | **Unavailable** — no GSC tools, no `gcloud` ADC |
| Authorised GSC export in workspace | **Not found** |
| Public crawl of crazzycars.pk | **Completed** (this session) |

**Therefore:** findings below are **observed crawl / HTTP evidence**, not live GSC “Page indexing” reason codes. Historical GSC numbers (Indexed ~634 / Not indexed ~1,030) remain unverified against today’s property.

## Live technical baseline (post `c98e0ad` + M1–M4)

| Surface | Result |
| --- | --- |
| `robots.txt` | 200 — Allow `/`; Disallow account/checkout/cart/search facets |
| `sitemap.xml` | 200 index → 5 children |
| Products / categories / cars / pages / blog sitemaps | 399 / 36 / 60 / 21 / 31 locs (**547** URLs) |
| www → apex | 301 → `https://crazzycars.pk/` |
| http → https | 301 |
| HUD category | 308 → HUD PDP (fixed in `c98e0ad`) |
| Fitment hubs | Alto/Splitters/monogram corrected in HTML + Mongo |

## Observed crawl issues vs intentional

| URL / pattern | Live | Classification |
| --- | --- | --- |
| `/categories/*?page=1`, `/cars/[slug]?page=1` | **200** (canonical clean; no 308) | **BUG** — duplicate URL; local fix implemented |
| `/shop?page=1`, `/blogs?page=1`, `/cars?page=1` | 308 clean | Already OK |
| `/shop?page=2` | 200 `noindex,follow` | Intentional |
| `/categories/car-hud` | 308 → HUD PDP | Fixed live |
| `/cars/tucson-hybrid-2025-nx4` | **404** | **HOLD** — intentional |
| `/blogs.atom`, `/categories/*.atom`, `/atom` | 404 | Soft-gone → local **410** fix |
| `/feed/products.xml` | 200 | Keep |
| `/collections/*` legacy | 308 to shop/category/home | Intentional |
| Checkout | `noindex,nofollow` | Intentional |
| Search / cart | 308 away | Intentional |

## Historical GSC themes still open (unverified today)

1. Large not-indexed backlog  
2. Soft 404 / crawled-not-indexed blogs (S5 content pack still awaiting `GO S5`)  
3. Redirect / alternate-canonical noise from `page=1` category/car hubs  
4. Dead atom/feed URLs returning 404 instead of 410  

## Owner action when GSC available

1. Export Page indexing CSV  
2. Diff against `INDEXABILITY_AUDIT.csv`  
3. Request indexing for Swift hub, Splitters, Spoilers, HUD PDP, S5 blogs after content GO  
