# Design refresh report — CrazzyCars.pk storefront

**Branch:** `vps-test`  
**Commits:** `b91424d`, `e9076c9`, `43513e7`  
**Date:** 2026-10-21  

## What changed (by area)

### 1. Type system + surfaces (`globals.css`)
- Kept **Rajdhani** (headings) + **Inter** (body/price) — no third family.
- Added tokens: `--text-xs…3xl`, `--space-*`, `--radius-card` / `--radius-btn`, `--shadow-card` / `--shadow-card-hover`.
- Headings and nav: sentence/title case, no wide letter-spacing / shouting capitals.
- Removed `Bebas Neue` from the heading stack.

### 2. Header (`StoreHeader.jsx`)
- Nav links: normal tracking, no uppercase utility.
- “Shop by category” sentence case; min 44px tap height.

### 3. Announcement / hero / trust
- **Announcement bar** still owns COD booking + 5% prepaid (unchanged copy helper).
- **Hero rail removed** (empty trust list) so COD/prepaid is not repeated under the hero.
- Hero CTA labels: ALL-CAPS CMS strings softened to sentence case; CSS `text-transform: none`.
- **StatsBar** now uses `homepageTrustStripItems()` only: COD Nationwide · Lahore ETA · WhatsApp · 7-day return if defective/wrong (no inventable product counts).

### 4. Filter by car (`ShopByCar.jsx` + CSS)
- Placeholders: Make / Model / Year; button “Filter”.
- Options keep natural case; card uses shared radius/shadow tokens.

### 5. Product cards
- Title clamp **2 lines**; equal card heights; `object-fit: contain` on square media.
- Desktop-only subtle hover lift.

### 6. Product page (`ProductDetailMedico.jsx`)
- Order: name → rating (only if reviews) → price → short description → stock / fit / sold → variants/add-ons → qty + Add to cart + Buy now → car tools row → delivery.
- Removed top “No reviews yet…” (reviews section lower down still owns empty state).
- “See it on your car” + “Try it on your car photo” grouped side-by-side on `sm+`.
- Kept Total line when add-ons exist (it can differ from base price).

### 7. Category / shop / footer
- Cards inherit the shared card system.
- Footer: no structural change; global type tokens apply.
- Shop toolbar classes left intact (behaviour unchanged).

## Screenshots

Local after changes (390×844 and 1440×900), no horizontal scroll on any listed route:

`backups/design-refresh-2026-10/screenshots/`

| Page | Phone | Desktop |
|------|-------|---------|
| Home | `phone_home.png` | `desktop_home.png` |
| Shop | `phone_shop.png` | `desktop_shop.png` |
| Categories | `phone_categories.png` | `desktop_categories.png` |
| LED Lighting | `phone_categories_led-lighting.png` | `desktop_categories_led-lighting.png` |
| Front splitter PDP | `phone_car-front-bumper-splitter-abs-plastic-3pcs.png` | `desktop_car-front-bumper-splitter-abs-plastic-3pcs.png` |
| Fog LED PDP | `phone_universal-lime-green-fog-light-led-h11-pair.png` | `desktop_universal-lime-green-fog-light-led-h11-pair.png` |
| Corolla vehicle | `phone_cars_toyota-corolla-e170-2014-2026.png` | `desktop_cars_toyota-corolla-e170-2014-2026.png` |
| Cart | `phone_cart.png` | `desktop_cart.png` |
| Checkout | `phone_checkout.png` | `desktop_checkout.png` |

## LCP

| Surface | Before (live, pre-push) | After (local rebuild) |
|---------|-------------------------|------------------------|
| Home (phone) | Measured at push time — see live note below | LCP API often 0 in headless; TTFB ~390ms local |
| PDP splitter | — | TTFB ~65ms local |

**Live after deploy (`d126844` on Coolify):** phone home LCP entry sometimes unavailable via Performance API in headless Chrome; visual load is healthy. No horizontal scroll on home/shop. Trust strip live: `COD Nationwide · 2–3 Days to Lahore · WhatsApp Support · 7-day Return if defective/wrong`. Hero rail count = 0.

## Protection checks (local)

| Check | Result |
|-------|--------|
| See it on your car opens (front splitter) | Pass — button present; dialog showed Corolla/Civic chips |
| Escape closes viewer | Pass |
| Try it on your car photo button present | Pass |
| Fog LED: no See/Try buttons | Pass (0 / 0) |
| Rear splitter: no Try button | Pass |
| Trust strip true signals | Pass |
| Hero rail gone | Pass |
| Tests: only 3 known SEO failures | Pass |
| Suites: admin-cod, meta-capi, try-on-style, vehicle-year-overlap | Pass (8/8) |
| `git diff origin/vps-test -- storecraft-admin` | Empty |

**Live post-deploy (2026-10-21):**
- See it on your car: opens (Civic chip text present); Escape closes.
- Try it on your car photo: opens (“Take or choose…”).
- Fog LED: no See/Try. Rear splitter: no Try.
- `/api/fits?...ativus...&vehicle=honda-civic-rebirth...` → `{"fits":false}`.
- “Shop by category” + “Filter by car” sentence case on desktop.

**Judgement — local cart:** empty `/cart` can 308 to `/shop` on local Mongo; not a design regression.

## Judgement calls

1. **Kept Rajdhani** instead of swapping display fonts — safer LCP, already loaded.
2. **StatsBar ignores CMS product-count stats** — brief asked for true signals only; inventable “425+ products” removed.
3. **Hero rail emptied** rather than reworded — announcement + StatsBar already cover trust/COD.
4. **Did not rewrite designed hero artwork** — admin-controlled image banners stay; CTA casing only.
5. **Left SaleSection / FlashSale shouting styles** — secondary surfaces; avoiding a wide behavioural rewrite.
6. **Kept add-on “Total:” line** — it updates with add-ons and can differ from the main price row.
7. **Did not touch** middleware, redirects, Meta/CAPI, try-on draw logic, LocalMediaImg, policy money strings, admin.

## Intentionally not changed

- Pricing, cart APIs, checkout, COD/advance helpers.
- URLs, SEO titles/meta/JSON-LD, sitemaps, robots.
- Admin app (zero diff).
- Meta Pixel / CAPI event IDs and queue.
- On-car / try-on feature logic (classes only on buttons).
