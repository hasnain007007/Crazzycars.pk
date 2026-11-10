# T13 — Lighthouse mobile baseline (no optimisations)

**Date:** 2026-11-10  
**Tool:** lighthouse@12.2.1, form-factor mobile, Chrome headless  
**Artefacts:** `seo-reports/lighthouse/{home,category,product,vehicle}.json`

| Template | URL | Perf | LCP | CLS | INP | TBT | Requests | Transfer |
|----------|-----|------|-----|-----|-----|-----|----------|----------|
| home | `/` | 81 | 2.0s | 0.019 | n/a* | 623ms | 84 | 1.8 MB |
| category | `/categories/interior` | 91 | 3.0s | 0.019 | n/a* | 50ms | 86 | 1.8 MB |
| product | `/byd-atto-3-2025-2026-tpe-floor-mats-premium` | 92 | 1.8s | 0.020 | n/a* | 115ms | 63 | 1.3 MB |
| vehicle | `/cars/toyota-corolla-e170-2014-2026` | 91 | 3.0s | 0.019 | n/a* | 144ms | 73 | 1.5 MB |

\* INP not emitted by this Lighthouse performance-only lab run (no interaction).

**Render-blocking resources audit:** empty on all four (score null) — no classic render-blocking CSS/JS flagged.

**Three largest transfers (typical across templates):**
1. Google Tag Manager `gtag/js` (~194 KB)
2. Meta Pixel `signals/config` (~149 KB)
3. Google Merchant / gstatic shopping script (~147 KB)

Category also loaded `/media/categories/interior-lights-…-400.webp` (~208 KB) as the largest image.

**Note:** Independent earlier sample reported ~250 subresources / ~5.7 MB on a product page; this lab run saw 63–86 requests / 1.3–1.8 MB. Do not optimise yet — baseline only.
