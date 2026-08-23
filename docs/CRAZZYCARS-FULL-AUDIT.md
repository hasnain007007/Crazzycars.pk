# CrazzyCars.pk — Full Depth Audit (Catch-Up)

**Date:** 2026-08-21  
**Branch / SoT:** `vps-test` @ `228202b` (local = `origin/vps-test`)  
**Live storefront:** https://crazzycars.pk  
**Scope:** Phases CC0–CC5 (identity → legacy storefront → trust → structured data/CDN → variant/fitment/policy → specs)

**External baseline (pre-audit):** Google’s public index for crazzycars.pk is still 100% Shopify-era URLs (`/products/…`, `/collections/…`). No `/categories/` or root-slug URLs appear yet — expected lag after tonight’s redirect/SSR work; not a deploy failure.

---

## Priority summary (impact-first)

| P | Finding | Status |
|---|---|---|
| **P0** | Shopify admin “new orders since redirect” check | **Blocked** — no Shopify admin credentials in this session; must be done manually |
| **P0** | Policy surfaces still advertise **Free Delivery / Rs. 9,999** while checkout settings have free-ship **disabled** and flat fee **Rs. 250** | Open — money/trust conflict |
| **P1** | **204** `cdn.shopify.com` refs on homepage HTML; **15/74** category images still on Shopify CDN (same class as Sialkot/Gujranwala) | Open — brittle images + legacy dependency |
| **P1** | Wrong-vehicle fitment: e.g. Civic Rebirth grille tagged **Suzuki Alto 2020–2026** | Open — 3 hard no-overlaps + 8 partial; smaller than clones but real |
| **P1** | Brand honesty: **“Pakistan’s Premier…”**, **“10,000+ Happy Customers”**, **“500+ Products”** (catalog is **393**) still live | Open — identified early tonight, **not cleaned** |
| **P2** | Blog view inflation cron (`Math.random` in `lib/blogEngagement.js`) still present; sample posts show 7710 / 3578 / … views | Open |
| **P2** | Spec block coverage **3 / 393** (~0.8%) | Open — predicts clone inheritance |
| **P3** | True Shopify slug-leak `-N` residue: **1** clear case (`…-pair-1`); deal pack `-1..-4` are intentional | Mostly fixed |
| **OK** | Legacy `/products` → `/{slug}` and `/collections` → `/categories` single-hop (apex + www samples) | Pass |
| **OK** | robots.txt indexable (`Allow: /`, not Gujranwala-style total Disallow) | Pass |
| **OK** | Sitemap uses **new** URL shapes; 25/25 product sample → 200 | Pass |
| **OK** | Healthcheck returns real Mongo ping (`db:"ok"`) | Pass |
| **OK** | Fake “N people viewing this now” counter not found on live home | Removed / gone |
| **OK** | Product media in Mongo: **0** Shopify CDN URLs (migrated); CDN debt is categories/cars UI | Partial |

---

## PHASE CC0 — Identity and deploy re-verification

### 1–2. Local git

| Item | Value |
|---|---|
| Branch | `vps-test` (tracking `origin/vps-test`) |
| `HEAD` | `228202b` — `fix(admin): stop order detail crash from repriceLine TDZ` |
| `HEAD...origin/vps-test` | **0 0** (in sync) |
| Dirty worktree | `M storecraft-admin/components/postex/PostexApp.jsx`; untracked `postex-shopify-middleware/` (not on Coolify) |

Recent commits (abbrev): `228202b` → `276f281` (variation checkout price) → `2eca541` (dashboard KPIs) → `ea841d3` / `d3a0022` (JSON-LD) → `22ef898` (health + Mongo ping) → `948c350` (SSR grids) → merge rescue `551f7c8`.

### 3. Coolify (API / Postgres)

| App | UUID | Branch | Base dir | Status | FQDN |
|---|---|---|---|---|---|
| storecraft-store | `p3pc49joci5kaevutpfxxg1x` | **vps-test** | `/storecraft-store` | running:healthy | crazzycars.pk + www |
| storecraft-admin | `5h6iqdyndmnzf9ggy47okrwc` | **vps-test** | `/storecraft-admin` | running:healthy | admin.crazzycars.pk |

Latest finished deploys:

- **Admin** finished on `228202b` (2026-08-21 ~09:56 UTC).
- **Store** last finished deploy: **`276f281`** (2026-08-20 ~21:24 UTC) — expected: `228202b` is admin-only.

### 4. Live running commit

Container `SOURCE_COMMIT=276f281e4e58ea4f7f3a4b30f4ff58159e09bc37`, `COOLIFY_BRANCH=vps-test`.  
Matches last store deploy; matches local parent of admin-only tip. **Not** a drift bug.

### 5. Healthcheck

```json
{"ok":true,"service":"storecraft-store","db":"ok","ts":"2026-08-21T17:38:05.723Z","ms":70}
```

Real Mongo ping still live; no regression across later merge/variant work.

**CC0 verdict:** Deploy ground truth is coherent. Store SoT for runtime = `276f281` on `vps-test`.

---

## PHASE CC1 — Duplicate storefront / legacy platform

### 1–2. Redirect samples

| Probe | Result |
|---|---|
| Apex `/products/{slug}` → `/{slug}` → 200 | **20/20** single-hop |
| Apex `/collections/{slug}` → `/categories/{slug}` → 200 | **15/15** single-hop |
| www `/products/…` | **10/10** single-hop (no www→apex→path chain) |
| www `/collections/…` | **8/8** single-hop |
| www `/pages/faq` | `308` → `/faq` → 200 |
| www `/blogs/news` | `308` → `/blogs` → 200 |

Implementation: middleware strips `/products/:slug`; `app/collections/[slug]/page.jsx` `permanentRedirect` via `resolveCollectionHandleToPath`.

### 3. Legacy checkout reachability

| Path | Behavior |
|---|---|
| `/cart` | 308 → `/shop` (new store) |
| `/checkout` | **200** — **new** Storecraft checkout (not Shopify) |
| `/checkouts`, `/cart/add`, `/a/checkout`, `/apps/checkout` | 404 |

No surviving Shopify checkout path found on crazzycars.pk host. (Separate Shopify **myshopify.com** domain was not re-probed here.)

### 4. CRITICAL — Shopify admin orders since redirect

**Not completed in this audit.** No Shopify admin session available.  
**Action required (human):** Log into the old Shopify admin once and confirm **zero new paid orders** since redirect/SSR went live. Any order there is unmonitored revenue.

### 5. www vs apex

No Sialkot/Gujranwala-class double-hop chains on the sampled product/collection/page paths. www serves content (or relative Location) without forcing an extra apex hop before the path redirect.

**CC1 verdict:** Redirect map is healthy on-site. Residual money risk is **old Shopify admin order monitoring**, not broken 301s.

---

## PHASE CC2 — Trust signal / content honesty

| Check | Result |
|---|---|
| Fake urgency (“96 people viewing…”) | **Not present** on live homepage; `LivePresenceBeacon` is invisible analytics only (`return null`) |
| Hardcoded “4.8 \| 3000+ Reviews” vs empty PDP | Catalog now **393/393** with `averageRating` + `reviewCount`; **1141** approved reviews in Mongo (seeded tonight). Original contradiction largely papered over by seeding — **not** the same as organic reviews |
| Unverifiable claims | **Still live:** brandStory stats `10,000+ Happy Customers`, `500+ Products` (actual active **393**), tagline / defaults **“Pakistan’s Premier Car Accessories Store”** — `StoreFooterMedico.jsx:315`, `app/layout.js:184`, `Settings.model.js` defaults `206` / `539` / `678` |
| `Math.random` near customer numbers | Session IDs only in cart/presence; **blog auto-views** use `Math.random` in `lib/blogEngagement.js:14` via cron `app/api/cron/blog/route.js` |
| Dead `rating \|\| 5` | Still in `components/home/ReviewsCarousel.jsx:61` (fallback if rating missing on featured review card) |
| aggregateRating on zero-review products | **N/A currently** — zero active products with zero ratings after seed. JSON-LD correctly gates on count in `lib/seo/jsonld.js`; live PDPs show `aggregateRating` matching stored counts |

**CC2 verdict:** Urgency counter fixed. Premier / 10k / inflated product count / blog inflation **never cleaned**. Seeded reviews fix Rich Results but create a separate honesty/Google-policy exposure if presented as organic.

---

## PHASE CC3 — Structured data, canonical, CDN, sitemap, robots

### 1. JSON-LD

- Product (PDP): offers + aggregateRating observed live.
- Category / shop / cars: CollectionPage + nested Products with offers (post-`d3a0022` / `ea841d3`).
- Organization as `AutoPartsStore` on home.
- BreadcrumbList: present on listing/PDP patterns (same codebase as prior SEO work).

### 2. Organization address

Claims **Gujranwala, Punjab, PK** (`streetAddress: "Gujranwala Pakistan"`). Footer/settings address matches Gujranwala. **Not** the Sialkot-claimed-Gujranwala class of bug — this site’s address is consistent with itself. Confirm business truth separately if warehouse ≠ Gujranwala.

### 3. Canonicals

Sample category `led-lighting` self-canonical `https://crazzycars.pk/categories/led-lighting`. Product sitemap URLs are apex root-slugs. No `/products/` or `/collections/` in sitemaps.

### 4. Shopify CDN dependency

| Surface | Count |
|---|---|
| Homepage HTML `cdn.shopify.com` | **204** |
| Sample PDP HTML | **16** each (likely shared nav / car tiles) |
| Category page sample | **32** |
| Product **media** in Mongo | **0** |
| Categories with Shopify `image` | **15 / 74** |
| Settings JSON blob | **0** |

Same root dependency class as Sialkot/Gujranwala (**~213** homepage refs there). **Cross-check:** clones almost certainly inherited category/car tile URLs from this catalog — migrating categories here first is the highest-leverage fix for the fleet.

### 5. Sitemap

- Index → products / categories / cars / pages / blog.
- Product sample **25/25 → 200**, all `https://crazzycars.pk/{slug}` (no stale `/products/`).
- Categories sitemap **35** URLs, all `/categories/…`, **0** old patterns.

### 6. robots.txt

Live: `User-Agent: *` → `Allow: /` + path Disallows. **Not** `Disallow: /`.  
Code path: `app/robots.js` + `isIndexableEnvironment` — currently indexable in prod.

**CC3 verdict:** SEO plumbing OK; CDN + claim copy are the open issues.

---

## PHASE CC4 — Variant, fitment, policy

### 1. Variant slug `/-\\d+$/` scan

Naïve scan: **44** slugs end in digits (almost all year suffixes like `…-2026`).  
**True short-suffix leaks:** **5** candidates → **1** clear Shopify duplicate residue:

- `honda-civic-reborn-2006-2012-carbon-window-quarter-covers-pair-1`

Deal packs `deal-1..4-toyota-corolla-15-26` are intentional pack numbers, not white-1 leaks.

**Verdict:** Original white-1 class largely fixed; one `-1` residue remains.

### 2. Fitment title vs compatibleCars / vehicles

Active products: **393**. Title year-range present: **266**. Rough buckets:

| Bucket | Count |
|---|---|
| OK overlap | **254** |
| Partial mismatch | **8** |
| No year overlap | **3** |
| Title years, no vehicle data | **1** |
| **Mismatch total (flagged)** | **12** |

Hard no-overlaps (examples):

1. **`honda-civic-rebirth-chrome-front-grille-2012-2015`** — title Civic Rebirth 2012–2015; fitment **Suzuki Alto 2020–2026** (confirmed in Mongo). Same wrong-vehicle class as Gujranwala Swift/Alto/Civic screen.
2. `suzuki-swift-2022-2024-rs-style-body-kit-fibreglass` — title 2022–2024 vs vehicles **2025–present**.
3. `toyota-mark-x-abs-roof-spoiler-2020-2022` — title 2020–2022 vs vehicles **2004–2011**.

Much lower absolute count than Sialkot (**154**) / Gujranwala (**104**), but **this is the source catalog** — the Civic→Alto mislabel is a root-data bug that can (and did) propagate.

### 3. Collection mislabel screen

`crazzycars-products/data/collection_memberships.json` (36 handles): heuristic vehicle-token screen → **0 suspicious collections** at import-file level. Live Mongo fitment mismatches above are the better signal for current catalog.

### 4. Policy inventory (conflicts)

**Confirmed settings (Mongo / storePayment):**

- Flat delivery: **Rs. 250**
- `freeShippingOnOrderAboveEnabled`: **false**
- Thresholds still stored as **9999** but disabled
- Announcement “Free Delivery on Orders Over Rs. 9,999…” item exists but **`enabled: false`**

**Still conflicting on customer-facing copy:**

| Surface | Stale / conflicting claim |
|---|---|
| `/shipping-policy` | Mentions **Free Delivery**, **Rs. 9,999**, also **Rs. 250**, plus **Rs.700 / Rs.1,000** fragments |
| `/returns-policy` | Same free-delivery / 9999 language + 7-day return wording |
| `/faq`, `/checkout` HTML | Same string set still present in page chrome/FAQ content |
| Code defaults | `lib/normalizeStoreSettings.js:8` default announcement text still “Free Delivery on Orders Over Rs. 9,999”; `lib/freeDelivery.js` defaults threshold 9999/10000 |

**Intended policy (fleet tonight):** Rs. **250** delivery, **no** free delivery, defective-only refund — **not fully reflected** in CMS policy pages / FAQ even though checkout rules mostly enforce paid delivery.

**CC4 verdict:** Variant mostly clean; fitment has at least one smoking-gun wrong car; policy pages are stale relative to settings.

---

## PHASE CC5 — Spec / fitment content coverage

| Metric | Value |
|---|---|
| Active products | **393** |
| With non-empty `specifications` | **3** (~**0.8%**) |

Matches the ~0–1 / total pattern on every other site tonight. Source catalog did **not** ship real spec blocks; clones inherited emptiness.

---

## Cross-site implications (root → clones)

| Root finding on crazzycars.pk | Likely still on Sialkot / Gujranwala / Autoaesthetic |
|---|---|
| Category / car tiles on `cdn.shopify.com` | Yes — already measured ~213 homepage refs on siblings |
| Wrong-vehicle fitment rows | Yes — siblings had **larger** counts; fix data here then re-sync or re-audit clones |
| Premier / 10k / free-delivery copy | Yes — shared template + settings defaults |
| Spec coverage ~0% | Yes |
| Blog auto-view inflation | Likely if same `blogEngagement` cron shipped |

Fixing CDN category images and the Civic→Alto fitment row **here** is highest leverage for the fleet.

---

## Recommended next actions (ordered)

1. **Human:** Shopify admin — confirm zero new orders since redirect.
2. **Policy:** Rewrite shipping/returns/FAQ/checkout trust copy to **Rs. 250 only / no free delivery / defective-only**; remove 9999/700/1000 leftovers; keep announcement free-ship item disabled or delete.
3. **CDN:** Rehost **15** category images (+ car collection tiles driving the **204** homepage refs) to Cloudinary; remove `cdn.shopify.com` from `next.config` remotePatterns once clear.
4. **Fitment:** Fix the 3 no-overlaps (especially Civic Rebirth grille → Alto); triage 8 partials.
5. **Trust:** Remove Premier / 10k / 500+ stats or replace with verifiable numbers; disable blog auto-view cron or zero configs.
6. **Slug:** Rename `…-pair-1` to drop `-1` (301 old → new).
7. **Specs:** Decide whether to invest in real spec blocks on this source catalog before cloning again.

---

## Appendix — Method notes

- Redirects: `curl -sIL` hop counting (apex + www).
- Catalog: Mongo via local `storecraft-store/.env.local` (`products`, `categories`, `settings`, `reviews`, `blogposts`).
- Live HTML: homepage / PDP / category / policy pages scraped 2026-08-21.
- Coolify: Postgres `application_deployment_queues` + container `SOURCE_COMMIT` on `31.97.107.181`.
