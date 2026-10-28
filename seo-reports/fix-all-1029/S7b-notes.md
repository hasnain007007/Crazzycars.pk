# S7b — Mobile LCP / CLS (code)

## Before (Lighthouse mobile, existing artifacts)

| Page | LCP | CLS | LCP element | Blocking notes |
|------|-----|-----|-------------|----------------|
| Home `/` | **3.0 s** | **0.175** | `img.brand-hero__car` `/hero/civic-night-760.webp` | TTFB ~703 ms; render delay ~502 ms; CLS dominated by `<main>` font swap (Rajdhani not preloaded). Render-blocking CSS ~35 KB (~150 ms). |
| Category `/categories/carbon-fiber` | **4.3 s** | **0.175** | Hero `img` fell back to **master** after `-800.webp` **404** | Resource load delay ~549 ms (no preload); load duration ~1.7 s on master. |
| PDP Brembo caliper covers | **9.9 s** | **0.176** | Main gallery `img` **master 1.36 MB** (`width=900`) while preload also fetched `-400.webp` | Competing image requests; LCP download ~723 ms of multi-MB master. |

Also checked: HTML home ~450 KB / cat ~246 KB / PDP ~175 KB; unused JS mostly GTM/FB (~180 KiB); Inter already `font-display: swap` + preload; Google Sans from gtag still late (~60–70 ms).

## Fixes shipped
1. **Single LCP image path** — `localMediaForWidth`: ≤480 → `-400.webp`, else → `-sm.webp` (never multi-MB master for LCP).
2. **PDP** — main viewer width 720 + aspect-ratio; preload **only** `-sm` (dropped competing srcset/preload).
3. **Category** — `categoryBannerUrl` → `-sm` (not missing `-800`); **one** `<link rel=preload>` for hero.
4. **Fonts** — Rajdhani `preload: true` + `adjustFontFallback: true` (Inter too) to cut ~0.175 CLS on `<main>`.
5. **CLS images** — logo `width`/`height`/`aspectRatio` in header (desktop + mobile nav).

`-sm.webp` confirmed live for Brembo product (~84 KB) and carbon-fiber category (~137 KB).

## After (Lighthouse mobile, live `32a609d`)

| Page | Before LCP | After LCP | Before CLS | After CLS |
|------|------------|-----------|------------|-----------|
| Home | 3.0 s | **2.9 s** | 0.175 | **0.039** ✓ |
| Category carbon-fiber | 4.3 s | **3.2 s** | 0.175 | **0.039** ✓ |
| PDP Brembo | 9.9 s | **2.6–3.4 s** (run variance) | 0.176 | **0.039** ✓ |

- **CLS target (&lt;0.1):** met on all three.
- **LCP target (&lt;2.5 s):** not fully met; PDP improved ~3–4× (LCP element is `-sm.webp` ~84 KB). Home/cat still gated by TTFB (~0.5–0.8 s).
- Artifacts: `S7b-lh-{home,cat,pdp}-after.json`

## Remaining (optional)
- Home/cat LCP &gt;2.5 s: TTFB + HTML weight (~450 KB home).
- Client product payload / JSON-LD still mention master URL (may prefetch); OG/Twitter now `-sm`.
