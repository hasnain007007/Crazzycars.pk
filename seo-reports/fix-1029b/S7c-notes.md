# S7c — Server response / LCP (code)

## Profile (before this loop)

From S7b after: home LCP **2.9 s**, category carbon-fiber **3.2 s**, TTFB often **0.5–0.8 s**. CLS already under 0.1.

## Fixes shipped (code)

1. **ISR HTML** — `revalidate = 600` on home, categories, cars, blogs; blog views via `after()` so HTML can cache.
2. **Hot Mongo cache** — `unstable_cache` 600s on hot deals, best sellers, car catalog, blog post body, recent posts, DB blog link helpers.
3. **Indexes** — dry-run only: `S7c-indexes-dry-run.md` (needs `GO S7c-INDEXES`).
4. **Cache-Control** — `/media` origin headers + nginx/CF report in `S7c-edge-cache.md` (ops apply on VPS/CF).

## Lighthouse mobile (live after deploy `09f3d32`)

| Page | Before LCP (S7b) | After LCP | CLS | TTFB (LH) |
|------|------------------|-----------|-----|-----------|
| `/` | 2.9 s | **2.91 s** | 0.039 | ~0.17 s |
| `/categories/carbon-fiber` | 3.2 s | **3.17 s** | 0.039 | ~0.17 s |
| PDP Yaris body kit | ~2.6–3.4 s | **1.23 s** ✓ | 0.039 | ~0.18 s |
| Blog body-kit-price | — | **1.13 s** ✓ | 0.039 | ~0.16 s |

Artifacts: `seo-reports/fix-1029b/lh/S7c-{home,cat,pdp,blog}.json`

curl warm TTFB home ~0.42 s (improved vs 0.5–0.8 s cold path; still not sub-200 ms at edge without CF HTML cache).

## Targets

- **CLS &lt; 0.1:** met on all four.
- **LCP &lt; 2.5 s:** met on PDP + blog; **home/cat still ~2.9–3.2 s** (LCP image/render path; TTFB no longer the main LH bottleneck). Further gains: edge HTML cache (ops), lighter home hero, indexes (`GO S7c-INDEXES`).

## Verify

`S7c-verify.txt` — hard fails remain pre-existing catalog checks (C4–C7, C9, C10, C12, C15). C24 soft pass.
