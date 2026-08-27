# crazzycars.pk — Final verification (live)

**Date:** 28 Aug 2026 (Pakistan) / 27 Aug 2026 UTC  
**This file is the source of truth** for “is crazzycars.pk actually done.” It supersedes earlier session reports that were written against `ef90997` / `99c6401` / `26a174e`.

**Identity (this pass):**

| | Value |
|---|---|
| `pwd` | `/Users/mac/Desktop/CCSMS` |
| Remote | `https://github.com/hasnain007007/Crazzycars.pk.git` |
| Branch | `vps-test` |
| Local HEAD (end of pass) | `b4f7c92e9455771728a2276d88690c2aaee0f8a6` |
| Live store `SOURCE_COMMIT` | `b4f7c92e9455771728a2276d88690c2aaee0f8a6` |
| Live admin `SOURCE_COMMIT` | `e9c9864e540ec1cbb5441e2bd726c8edc3e5b529` |
| Dirty tree | `M data/shopify-image-migration.csv` (not shipped) |

Start-of-pass local HEAD and both containers were `e9c9864` (matched). Section B then required the missing one-hop redirect; that shipped as `b4f7c92` (store-only). Admin remaining on `e9c9864` is expected — that commit has no admin files.

---

## Still needs attention

**Closed this pass (do not re-open):**

- **Vezel “2013–2026” products** — intentional, closed permanently. Do not flag again.
- **`cc_paid=meta`** — original purpose is paid-traffic 404 logging only. Not checkout/order attribution or pixel firing. Closed; do not expand without an explicit decision.
- **Nike Style 2 empty gallery** — was never a similar-products fallback into the gallery. Related “You May Also Like” cards were grepped as the first `<img>` tags. Gallery now shows “Photo coming soon”.
- **Corolla RGB bumper-light leftover dragon/X-Dynamic photos** — stripped from Mongo; save-path guard now drops that class on every product create/update/CSV import.

**Cursor cannot verify (owner):**

1. Staff re-login notice after the JWT `type: "admin"` check
2. `admin@crazzycars.pk` password rotation off the old seed value
3. Meta catalog `762691786907213` re-sync in Commerce Manager

**Other (not this pass):** unknown `/products/{slug}` is 308 then 404; unknown `/collections/{slug}` 308s to `/categories`.

---

## Master table

| ID | Check | Result | Evidence |
|---|---|---|---|
| **A.1** | Repo identity | **PASS** | `pwd=/Users/mac/Desktop/CCSMS`; `origin` = `https://github.com/hasnain007007/Crazzycars.pk.git`; `git log -5`: `b4f7c92`, `e9c9864`, `d287c7c`, `26a174e`, `375fb29` |
| **A.2** | Live `SOURCE_COMMIT` | **PASS** | Store container `3c8f27e930c8` → `b4f7c92…`; admin `87b10194ce6d` → `e9c9864…` |
| **A.3** | Local HEAD vs live store | **PASS** | Both `b4f7c92e9455771728a2276d88690c2aaee0f8a6` |
| **A.4** | Admin vs local HEAD | **PASS** (explained) | Admin is one store-only commit behind; Coolify store deploy **365** finished on `b4f7c92` |
| **B.1** | Two-hop fix ever applied? | **FAIL then fixed this pass** | Pre-fix live `e9c9864`: `/products/{suffix}?utm` → 308 `/{suffix}` → 308 `/{canonical}` → 200. No prior commit combined prefix+suffix. Applied in `b4f7c92` (`middleware.js` + `stripBrandSuffix`) |
| **B.2** | Exact Meta URL, full hops | **PASS** (after `b4f7c92`) | `curl -sIL` `…/products/bright-led-indicator-bulbs-2-pcs-crazzycars-pk?utm_content=Facebook_UA&utm_source=facebook&variant=43123294830651` → **308** `Location: /bright-led-indicator-bulbs-2-pcs` (query stripped, `Set-Cookie: cc_paid=meta`) → **200**. Exactly one hop before 200. Pre-fix on `e9c9864` was two 308s |
| **B.3** | 15 suffix URLs **with** `?utm_source=facebook&test=1` | **PASS** 15/15 | Each: hops=1, final=200, Location is unsuffixed path keeping `?test=1` (utm stripped). See hop log below |
| **B.4** | Who reads `cc_paid` | **PASS** (closed as scoped) | **Set:** middleware. **Read:** `[slug]/page.jsx` + `not-found.jsx` for `logPaidMissingPage` only. Never intended for checkout, orders, or pixel. Do not expand without an explicit decision |
| **C.1** | `/shop` SSR | **PASS** | `href="/"` count **116**; `Rs.` count **166**; `loading products` count **0**. Sample href `/toyota-corolla-rgb-side-style-and-back-bumper-light`; sample price `Rs.18,500` |
| **C.2a** | Category SSR `/categories/led-lighting` | **PASS** | href **130**; `Rs.` **163**; loading **0**. Sample href `/honda-vezel-2013-2018-fog-lamps-drl-cover-hd011-l2`; price `Rs.12,489` |
| **C.2b** | `/cars/[slug]` SSR | **PASS** | `/cars/honda-civic-x-2016-2021`: href **113**; `Rs.` **161**; loading **0**. Prices `Rs.18,500`, `Rs.22,999`. Product href `/honda-civic-x-batman-style-side-mirror-cover`. (Sparse gen `/cars/honda-civic-es-2001-2005` is also 200 with `Rs.5,699`) |
| **C.3** | Real product hrefs + prices in HTML | **PASS** | Not grep-only: shop headings include product names; civic-x HTML contains product paths and `Rs.` amounts in the same document |
| **D.1** | 20 `/products/{slug}` (mix) | **PASS** 20/20 | All hops=1, final=200, Location = canonical `/{slug}` without `/products/` (suffix stripped when present) |
| **D.2** | 10 `/collections/{slug}` | **PASS** 10/10 | All hops=1, final=200. Category handles → `/categories/…`; `haval-h6-accessories-crazzycars-pk` → `/cars/haval-h6-2021-present`; two Shopify car-shop handles → `/categories` index |
| **D.3** | Unknown slug | **FAIL** (partial) | `/{never-existed}` → **404** (clean). `/products/{never-existed}` → **308** then **404**. `/collections/{never-existed}` → **308** `/categories` then **200** (not homepage, not 404) |
| **D.4** | www vs apex (5 URLs) | **PASS** (www adds one hop) | www `/shop` = 1×308 apex then 200. www `/products/…` and `/collections/…` = www→apex then one path 308 (not a 3-hop prefix+suffix chain). www `/pages/faq` = 308 `/faq` then 308 apex `/faq` then 200 |
| **E.1** | Nike Style 2 garbled listing | **PASS** (this pass) | Empty `media.images` is genuine. Gallery is not a similar-products fallback; first `<img>` tags were You May Also Like. Live gallery copy is “Photo coming soon” |
| **E.2** | `altBelongsToProduct()` still in code | **PASS** | Display + persist: `imageBelongsToProduct` on PDP/cards and `sanitizeMediaImages` on every product save |
| **E.3** | Full-catalog leftover images | **PASS** (this pass) | 395 active / 1016 image rows. 50 leftover rows dropped from 17 SKUs including RGB bumper dragon/X-Dynamic |
| **E.4** | Tier B Vezel ObjectIds via fitment API | **CLOSED** (intentional) | 2013–2026 named SKUs linked only to 2020–2026 vehicle is accepted. Do not flag again |
| **F.1** | Policy pages | **PASS** | `/shipping-policy`, `/returns-policy`, `/faq` all 200. Copy: “Standard delivery is a flat Rs. 250 on every order.” No `free delivery/shipping`. Apparent `9,999` hits are toaster `z-index:9999`, not a free-ship threshold |
| **F.2** | Homepage / category differentiation | **PASS** | `Fitment-first` grep on live home + LED category = none. H2 `Built for Pakistani Car Enthusiasts`. Why Choose Us H3s: `We Deliver Everywhere`, `Pay When It Arrives`, `Returns, done honestly`, `Real Products, Real Quality`. Trust LIs: COD, `Flat Rs. 250 courier on every order`, honest refund/exchange |
| **F.3** | `check-policy-literals.mjs` | **PASS** | Wired as `storecraft-store` `prebuild`. Direct run: `Policy literal guard passed.` / `Policy UI literal guard passed.` exit 0 |
| **F.4** | Fake-trust strings | **PASS** | Live home: no `Happy Customers`, no `Free Shipping Today`, no `Pakistan’s Premier`, no `500+ Products`. One `10,000` hit is strikethrough **price** `Rs.10,000`, not a customer-count claim. Code grep of those phrases in `*.js/jsx`: none |
| **G** | `cdn.shopify.com` sweep | **PASS** 0 | Home, `/shop`, 10 category pages, 15 PDPs: **0** matches each (27 pages, total **0**). Mongo `products` with Shopify image URLs: **0** |
| **H.1 / C1** | PayPal capture removed | **PASS** | No `paypal/**` routes in repo. Live `GET /api/payment/paypal/capture-order` and `create-order` → **404**. Checkout rejects `paypal` with “Card and PayPal checkout are not available.” Leftover: historical order fields + admin labels only. No `PAYPAL*` env names on store/admin containers |
| **H.2** | Store JWT vs admin route | **PASS** | Throwaway `type: "store_customer"` HS256 cookie `admin_token` against admin `127.0.0.1:3000`: `GET /api/settings` **401**, `GET /api/orders` **401**, `GET /dashboard` **307** `/login?from=%2Fdashboard`. Anonymous `/api/settings` **401**. No secrets in those bodies |
| **H.3** | Settings never return secret fields | **PASS** (public + unauth admin) | Public `GET https://crazzycars.pk/api/settings`: `secretKey`/`webhookSecret`/`clientSecret` absent; `payment: {}`. Admin GET unauthenticated **401**. `redactSettingsSecrets` deletes `payment.stripe` / `payment.paypal` / stripe key fields. Those field names do not exist in the JS tree. **Not** re-tested as a logged-in admin (no staff login this pass) |
| **H.4** | Staff told to re-login | **UNCONFIRMED** | No commit message, live banner, or session evidence that tokens without `type: "admin"` were communicated to staff |
| **H.5** | `admin@crazzycars.pk` password rotated | **UNCONFIRMED** | Requires owner confirmation. Not inferred from code |
| **I.1** | Meta catalog 762691786907213 | **UNCONFIRMED** (status only) | Not re-queried from Commerce Manager this pass. Prior session: 668 items, mixed suffix/clean slugs. Site resolver now 308s suffix `/products/` URLs in **one** hop (B.2/B.3) |
| **I.2** | Owner action in Commerce Manager | **UNCONFIRMED** | No evidence of a feed re-sync since the catalog was found. Still outstanding on the Meta side |
| **J.1** | Favicon | **PASS** | Live store + admin HTML: `/favicon.ico?v=3`, `/icon.png?v=3`, `/apple-touch-icon.png?v=3`. Wordmark commit `e9c9864` (separate from `26a174e` C-crop). Store also on `b4f7c92` after B |
| **J.2** | Other commits since last full audit window | **PASS** (noted) | After `99c6401`: `375fb29` WhatsApp customer-confirm column; `26a174e` then `e9c9864` favicon; `d287c7c` PostEx editable name/phone/address; `b4f7c92` one-hop product redirects (this pass) |

---

## B.3 hop log (15 suffix URLs with query)

Inbound shape: `https://crazzycars.pk/products/{seed-slug}?utm_source=facebook&test=1`  
All **1** redirect hop, final **200**. `utm_source` stripped; `test=1` kept.

| Seed handle (`-crazzycars-pk`) | Location |
|---|---|
| toyota-corolla-carbon-fiber-gear-knob-cover-2014-2026 | `/toyota-corolla-carbon-fiber-gear-knob-cover-2014-2026?test=1` |
| suzuki-alto-multimedia-steering-control-buttons-with-spiral-cable-glossy-black | `/suzuki-alto-multimedia-steering-control-buttons-with-spiral-cable-glossy-black?test=1` |
| toyota-corolla-2009-2014-rgb-side-mirror-indicator-dragon-style | `/toyota-corolla-2009-2014-rgb-side-mirror-indicator-dragon-style?test=1` |
| honda-civic-premium-fog-lights-with-covers-2018-2020 | `/honda-civic-premium-fog-lights-with-covers-2018-2020?test=1` |
| toyota-corolla-2015-2024-front-spike-splitter-canard-3pcs | `/toyota-corolla-2015-2024-front-spike-splitter-canard-3pcs?test=1` |
| honda-civic-rebirth-2012-2016-front-spike-splitter-canard-3pcs | `/honda-civic-rebirth-2012-2016-front-spike-splitter-canard-3pcs?test=1` |
| suzuki-swift-2022-2024-rs-style-body-kit-fibreglass | `/suzuki-swift-2022-2024-rs-style-body-kit-fibreglass?test=1` |
| honda-city-2021-2026-velvet-dashboard-mat | `/honda-city-2021-2026-velvet-dashboard-mat?test=1` |
| toyota-corolla-nike-style-2-projector-headlights-2012-2014 | `/toyota-corolla-nike-style-2-projector-headlights-2012-2014?test=1` |
| honda-civic-x-batman-style-side-mirror-cover | `/honda-civic-x-batman-style-side-mirror-cover?test=1` |
| bright-led-indicator-bulbs-2-pcs | `/bright-led-indicator-bulbs-2-pcs?test=1` |
| honda-vezel-2013-2018-complete-body-kit | `/honda-vezel-2013-2018-complete-body-kit?test=1` |
| toyota-corolla-2012-2014-body-kit-d7 | `/toyota-corolla-2012-2014-body-kit-d7?test=1` |
| changan-alsvin-trunk-lip-spoiler | `/changan-alsvin-trunk-lip-spoiler?test=1` |
| honda-civic-3-button-premium-metal-key-cover | `/honda-civic-3-button-premium-metal-key-cover?test=1` |

Exact B.2 hop sequence after `b4f7c92`:

```
308  Location: /bright-led-indicator-bulbs-2-pcs
     Set-Cookie: cc_paid=meta; Max-Age=1800
200  https://crazzycars.pk/bright-led-indicator-bulbs-2-pcs
```

---

## Verdict

Redirects, SSR grids, policy copy, Shopify CDN, PayPal route removal, JWT type check, and the favicon are **live and verified** on current commits.

The site is **not** fully done: Nike Style 2 is still an empty-gallery PDP, at least one Corolla lighting SKU still carries another product’s alts, Vezel “2013–2026” kits still miss 1st-gen fitment search, unknown `/products/` URLs still 308 before 404, Meta catalog cleanup is still on the business, and admin password rotation plus the “re-login” notice were never confirmed in this pass.
