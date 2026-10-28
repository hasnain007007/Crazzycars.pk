# S2 dry-run: old /blogs/news/* → live blog or 410

**Source:** `seo-data/Pages.csv` (GSC). Found **19** unique handles (brief said 24; `old-blog-urls.txt` was missing so derived from GSC).
**Live posts:** 18. Every 308 destination is in live `sitemap-blog.xml` and returns 200.
**Status:** GATE — awaiting exact `GO S2`. No redirects / 410s written yet.

| # | Old URL | Action | Destination | Notes |
|---|---------|--------|-------------|-------|
| 1 | `/blogs/news/best-car-accessories-for-honda-city-in-pakistan-2024` | 308 | `/blogs/toyota-yaris-vs-honda-city-best-accessories` | Honda City accessories → City vs Yaris guide (sitemap✓) |
| 2 | `/blogs/news/best-car-accessories-for-hyundai-elantra-in-pakistan-2024` | 410 | `—` | No Elantra/Hyundai blog; no clear topic match |
| 3 | `/blogs/news/best-car-accessories-for-suzuki-swift-2025-in-pakistan` | 410 | `—` | No Swift accessories blog; no clear topic match |
| 4 | `/blogs/news/best-car-accessories-for-toyota-corolla-e140-2009-2013-in-pakistan` | 308 | `/blogs/best-body-kit-styles-toyota-corolla-pakistan` | Corolla accessories → Corolla body-kit styles (sitemap✓) |
| 5 | `/blogs/news/best-car-accessories-online-pakistan-2026-complete-guide` | 410 | `—` | Generic shopper guide; no equivalent live article |
| 6 | `/blogs/news/best-honda-city-accessories-in-pakistan-complete-upgrade-guide` | 308 | `/blogs/toyota-yaris-vs-honda-city-best-accessories` | Honda City upgrade guide → City vs Yaris (sitemap✓) |
| 7 | `/blogs/news/best-suzuki-alto-accessories-in-pakistan-complete-upgrade-guide` | 410 | `—` | No Alto accessories blog; no clear topic match |
| 8 | `/blogs/news/body-kit-price-pakistan-2026-honda-civic-toyota-corolla` | 308 | `/blogs/body-kit-price-in-pakistan-2026` | Same body-kit price topic (sitemap✓) |
| 9 | `/blogs/news/brembo-caliper-covers-pakistan-review-2026` | 410 | `—` | No caliper/Brembo article |
| 10 | `/blogs/news/carbon-fiber-car-accessories-in-pakistan-complete-buyers-guide` | 308 | `/blogs/side-mirror-covers-carbon-fiber-accents-guide` | Carbon accessories → carbon accents guide (sitemap✓) |
| 11 | `/blogs/news/follow-crazzycars-pk-on-tiktok-instagram-and-facebook` | 410 | `—` | Social promo; no equivalent guide |
| 12 | `/blogs/news/funny-led-gesture-light-viral-pakistan-2026` | 308 | `/blogs/led-ambient-lighting-car-buyer-guide` | LED gesture light → LED ambient buyer guide (sitemap✓) |
| 13 | `/blogs/news/honda-civic-accessories-price-pakistan-2024` | 308 | `/blogs/honda-civic-accessories-guide-every-generation` | Civic accessories price → Civic gen guide (sitemap✓) |
| 14 | `/blogs/news/honda-civic-reborn-vs-rebirth-which-accessories-fit-which-model` | 308 | `/blogs/honda-civic-accessories-guide-every-generation` | Reborn/Rebirth fitment → Civic gen guide (sitemap✓) |
| 15 | `/blogs/news/how-to-install-batman-style-side-mirror-covers-step-by-step-guide` | 308 | `/blogs/side-mirror-covers-carbon-fiber-accents-guide` | Batman mirror install → side mirror covers guide (sitemap✓) |
| 16 | `/blogs/news/multimedia-steering-wheel-buttons-price-pakistan-2026` | 410 | `—` | No steering-button article |
| 17 | `/blogs/news/top-10-car-accessories-for-toyota-corolla-in-pakistan-2024` | 308 | `/blogs/best-body-kit-styles-toyota-corolla-pakistan` | Corolla top accessories → Corolla body-kit styles (sitemap✓) |
| 18 | `/blogs/news/top-5-car-modifications-under-pkr-5000-in-pakistan-2024` | 410 | `—` | Budget mods list; no equivalent live article |
| 19 | `/blogs/news/toyota-corolla-steering-monogram-trending-pakistan-2026` | 410 | `—` | Steering monogram product post; no clear blog match |

**308:** 10  |  **410:** 9

After GO: one redirects map (no chains); middleware/next.config; 410 for the nine unmatched topics.
