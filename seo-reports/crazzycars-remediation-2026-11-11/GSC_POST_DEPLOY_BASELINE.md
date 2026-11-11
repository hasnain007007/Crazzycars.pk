# GSC_POST_DEPLOY_BASELINE — after `c98e0ad`

**Date:** 2026-11-11  
**Live API / Google Search Console property access this session:** **BLOCKED** — no Search Console MCP, no `gcloud` ADC, no authorised GSC API credentials in agent environment.

## What was checked instead

| Source | Use |
| --- | --- |
| Historical remediation `BASELINE.md` | Indexed ~634 / Not indexed ~1,030 (mission brief era) |
| `INDEXING-LIST.md` (fix-1029b / finish-1029) | Priority URL Inspection candidates |
| Live HTTP after `c98e0ad` | Confirms code-side fixes Google will eventually recrawl |

## Deployed fixes Google should eventually see

| Issue | Pre-deploy | Post-deploy live |
| --- | --- | --- |
| `/categories/car-hud` | 404 | **308 → HUD PDP 200** |
| Alto on Swift hub | Listed | **Excluded** (code filter) |
| Steering trim / ducktail on Splitters | Listed | **Excluded** |
| Fake purchase toast | Present historically | **Absent** |
| Corolla monogram on Aqua/Yaris hubs | Listed | **Excluded** |

Until M1–M4, product APIs still expose wrong VC/categories to non-hub consumers; hubs are already corrected in HTML.

## Historical / unresolved indexing problems (still open)

These remain **unresolved or only partially addressed** and are **not** fixed by M1–M4:

| Theme | Status |
| --- | --- |
| Large “Not indexed” backlog (~1k historical) | Needs fresh GSC export — access blocked here |
| Soft-404 / excluded-by-redirect inventory | Case-by-case (`ISSUES.csv` CC-P1-006) |
| Tucson hybrid 2025 held 404 | Intentional hold |
| Side-mirror dual SKUs | Intentional retain |
| Blog content batch S5 | Waiting separate GO |
| Compare-at / city-carbon publish | Waiting separate GO |
| Sitemap deep coverage vs GSC discovered URLs | Sitemap lists ~547 URLs; GSC delta unknown without API |

## Recommended owner actions in GSC (manual)

1. URL Inspection → Request indexing for:  
   - `https://crazzycars.pk/categories/car-hud` (expect redirect to HUD PDP)  
   - `https://crazzycars.pk/cars/suzuki-swift-2025-present`  
   - `https://crazzycars.pk/categories/splitters-side-skirts`  
2. Re-submit `https://crazzycars.pk/sitemap.xml`  
3. Export Coverage / Page indexing CSV for a true post-deploy baseline  
4. After M1–M4 (if approved), re-inspect the four product URLs + affected hubs

## Verdict

**GSC comparison: BLOCKED BY ACCESS.**  
Live technical fixes for HUD + hub misfits are verified over HTTP. Full Search Console delta requires owner-provided GSC export or API authorisation.
