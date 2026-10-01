# Content + backlinks — Phase 1 (audit + proposal)

**Date:** 2026-10-02  
**Status:** Scoping only — **no content writes, no outreach executed.**  
**Context:** Category-level SEO closed at **29/30** active non-parent leaves (Batches 1–4). This phase is the next lever: informational content + off-page signals.

Two lanes are kept separate below:

| Lane | What it is |
|------|------------|
| **Part A — Content** | Executable end-to-end from repo + VPS Mongo (topics, gaps, internal links). |
| **Part B — Backlinks / off-page** | Split into **executable here** vs **manual business workstream**. |

**Data sources used:** VPS Mongo `blogposts` (23 published), live Googlebot fetches (sitemap, homepage JSON-LD, sample category/blog HTML), prior keyword docs (`docs/keyword-strategy-phase1-audit.md`, Phase 3 proposal, Batches 1–4).  
**Not available from this environment:** Google Search Console API / Search Analytics, GA4 Reporting API (client ecommerce helpers exist; no service-account pull). Pageview numbers below are **Mongo `views` only** — treat as a weak engagement proxy, not GA4.

---

## Part A — Content gap audit

### A1. Live published posts (23)

Sorted by `publishedAt` desc. `views` = Mongo counter (newer Sep–Oct posts sit at **0** — counter likely unused/unwired for those; older Feb/Jan posts have non-zero counts).

| # | Published | Slug | Title (short) | Categories | Views | In-body internal links (content HTML) |
|---|-----------|------|---------------|------------|------:|----------------------------------------|
| 1 | 2026-10-01 | `suzuki-swift-carbon-door-handle-covers-pakistan` | Swift carbon door handles | Guides, Exterior, Suzuki | 0 | 1× `/products/…` |
| 2 | 2026-09-29 | `push-start-cover-carbon-key-fob-accessories-pakistan` | Push start / key fob | Guides, Interior | 0 | 3× product |
| 3 | 2026-09-27 | `car-door-welcome-logo-lights-pakistan-guide` | Door welcome logo lights | Guides, Lighting | 0 | 1× product |
| 4 | 2026-09-25 | `honda-city-2021-2026-carbon-interior-upgrades-pakistan` | City 2021–2026 carbon interior | Guides, Interior, Honda City | 0 | 3× product |
| 5 | 2026-09-23 | `trunk-lip-spoiler-buying-guide-pakistan-alsvin-city-corolla` | Trunk lip spoiler guide | Guides, Exterior | 0 | 2× product |
| 6 | 2026-09-21 | `batman-style-side-mirror-covers-pakistan-fitment-guide` | Batman mirrors Sportage/Oshan/Deepal | Guides, Exterior, SUV | 0 | 3× product |
| 7 | 2026-09-19 | `toyota-corolla-rgb-bumper-neon-mirror-lights-pakistan` | Corolla RGB bumper + neon mirrors | Guides, Lighting, Toyota Corolla | 0 | 6× product (dupes) |
| 8 | 2026-09-18 | `honda-civic-11th-gen-carbon-fiber-interior-kit-pakistan-guide` | Civic 11th gen carbon interior | Guides, Interior, Honda Civic | 0 | 5+ product + `/blogs` |
| 9 | 2026-02-24 | `car-perfume-air-freshener-guide` | Perfume / air freshener | Guides, Interior | **1,519** | 1× `/categories/fragrances` |
| 10 | 2026-02-19 | `best-body-kit-styles-toyota-corolla-pakistan` | Corolla body kit styles | Guides, Exterior | **7,710** | 1× `/categories/body-kits-extensions` |
| 11 | 2026-02-17 | `cod-vs-online-payment-car-accessories-pakistan` | COD vs online payment | Guides | **2,592** | 1× `/shipping-policy` (no `/cash-on-delivery`) |
| 12 | 2026-02-12 | `side-mirror-covers-carbon-fiber-accents-guide` | Mirror covers + carbon honesty | Guides, Exterior | **4,290** | 1× `/categories/side-mirror-covers` |
| 13 | 2026-02-10 | `car-care-101-essential-products-pakistan` | Car care 101 | Guides | **6,642** | 1× `/categories/car-care-safety` |
| 14 | 2026-02-05 | `dash-cameras-pakistan-why-every-driver-needs-one` | Dash cams | Guides | **4,595** | 1× `/categories/dash-cameras` |
| 15 | 2026-02-03 | `are-aftermarket-car-accessories-safe` | Aftermarket safety | Guides | **281** | **0** |
| 16 | 2026-01-29 | `honda-civic-accessories-guide-every-generation` | Civic every generation | Guides, Exterior | **2,278** | 1× `/cars/honda-civic-x-2016-2021` |
| 17 | 2026-01-27 | `led-ambient-lighting-car-buyer-guide` | LED ambient lighting | Guides, Interior | **3,578** | 1× `/categories/led-lighting` |
| 18 | 2026-01-22 | `how-to-choose-right-front-grille` | Front grille chooser | Guides, Exterior | **825** | 1× `/categories/front-grilles` |
| 19 | 2026-01-20 | `best-floor-mats-pakistani-weather-guide` | Floor mats weather | Guides, Interior | **491** | 1× `/categories/floor-mats` |
| 20 | 2026-01-15 | `protect-car-interior-from-pakistan-heat` | Heat / sun protection | Guides, Interior | **2,413** | 1× `/categories/sun-shades` |
| 21 | 2026-01-13 | `seat-covers-buying-guide-pakistan-climate` | Seat covers climate | Guides, Interior | **3,579** | 1× `/categories/seat-covers` |
| 22 | 2026-01-08 | `toyota-yaris-vs-honda-city-best-accessories` | Yaris vs City accessories | Guides, Exterior | **2,164** | 2× `/cars/…` |
| 23 | 2026-01-06 | `exhaust-tips-systems-sound-performance` | Exhaust tips honesty | Guides, Exterior | **7,700** | 1× `/categories/exhaust-systems-tips` |

**Also scheduled (not published — do not propose duplicates):**

| Scheduled | Slug | Topic |
|-----------|------|-------|
| 2026-10-03 | `cabin-mood-lighting-usb-atmosphere-digital-eyes-pakistan` | Cabin mood / USB atmosphere lighting |
| 2026-10-05 | `match-year-variant-order-car-accessories-online-pakistan` | Match year & variant before ordering |

Sitemap-blog lists **23** `<loc>` entries — matches published count.

---

### A2. Coverage vs keyword / category work — what’s missing

Already strong informational coverage (don’t re-pitch):

- Corolla body kits · Civic gen hub · Civic 11th / City 2021 carbon interiors · Batman mirrors (Chinese/Korean SUVs) · trunk lip spoilers · Corolla RGB/neon lighting · Swift door handles · push-start/key fob · door welcome lights  
- COD vs online payment · exhaust tip honesty · perfume · floor mats · seat covers · heat · ambient LED · front grilles · dash cams · car care · aftermarket safety · Yaris vs City  

**Real buyer-intent / fitment / policy gaps** (grounded in what we sell + Batches 1–4 FAQ themes), with **no** matching published blog:

| Gap theme | Why it matters now | Overlap check |
|-----------|--------------------|---------------|
| ABS vs **real** carbon fiber (dedicated pillar) | FAQ disclosures on dozens of SKUs; only lightly treated inside the mirror-covers post | Not redundant — mirror post is styling-led, not a material SoT guide |
| Splitters & side skirts + **bulky delivery** | Dense leaf (`splitters-side-skirts`); high PDP FAQ traffic pattern; bulky fee is a real COD friction | No post; trunk-lip/spoiler posts don’t cover front aero |
| Quarter window louvers (Civic-heavy) | Covered leaf + strong sellers; install/no-drill questions recurring in FAQ copy | Civic gen guide doesn’t teach louver install |
| Door handle covers (multi-model, not Swift-only) | Covered leaf; Swift post is model-specific | Swift post ≠ category buying guide |
| Key covers / key chains | Large SKU shelf (Batch 3); button-layout fitment traps | Push-start/key-fob post is different product class |
| Dashboard mats (vehicle-specific) | Covered leaf; flat pricing FAQ; heat post points at sun shades, not dash mats | Distinct from floor mats / heat guides |
| Fog lamps & DRL covers | Covered leaf; no educational content | No overlap |
| Multimedia steering / clock-spring install | Covered leaf; “pro install?” FAQ | Not in City/Civic interior kits posts |
| Air press / window visors | **Batch 4** leaf just shipped; vehicle-specific | No post |
| Emergency chargers & air compressors | **Batch 4** `emergency-safety` / `utility` | No post |
| Returns, wrong item, exchange vs refund | Policy FAQ exists; blog silence; AEO gap called out since Phase 1 `llms.txt` note | COD post covers payment only |
| Delivery fees: regular vs bulky vs spoiler courier | Recurring FAQ; buyers surprise at checkout | Shipping-policy link only; no explainer article |
| How to read the vehicle compatibility table / Shop by Car | Fitment crisis history + mismatch backlog | **Scheduled 2026-10-05** — wait for it; don’t draft a competing post |
| LED headlights / bulbs vs decorative LED | Covered leaf; ambient post ≠ headlight buyers | Distinct intent |
| Roof spoiler vs trunk lip (fitment + bulky) | Trunk-lip post exists; roof spoilers are separate SKUs/fees | Partial — keep roof-focused if written |

---

### A3. Proposed new topics (10) — topics + angles only, **no drafts**

Each row: target intent · primary internal links · why not redundant.

| # | Working title / angle | Target query / intent | Link to (categories / products / cars / policy) | Why not redundant |
|---|----------------------|------------------------|--------------------------------------------------|-------------------|
| **T1** | ABS vs real carbon fiber: what CrazzyCars listings mean | “real carbon fiber accessories Pakistan”, “ABS carbon look vs fiber” | `/categories/carbon-fiber-accessories`, `/categories/side-mirror-covers`, sample FAQ’d ABS SKUs, link out to existing mirror-covers post as “styling” sibling | Existing mirror post touches honesty; no dedicated material SoT pillar |
| **T2** | Front splitters & side skirts in Pakistan: fit, look, and why delivery is Rs. 500 | “car splitter Pakistan”, “side skirt install”, bulky COD fee | `/categories/splitters-side-skirts`, bulky PDPs (e.g. universal splitter / Corolla canards), `/shipping-policy`, `/cash-on-delivery` | No aero/splitter post; trunk-lip is rear-only |
| **T3** | Quarter window louvers: Civic Reborn / Rebirth / Corolla fitment without drilling | “civic quarter window cover”, “louver install Pakistan” | `/categories/quarter-window-louvers`, Civic Reborn/Rebirth PDPs, `/cars/honda-civic-reborn-2006-2012`, `/cars/honda-civic-rebirth-2012-2016` | Civic gen guide doesn’t cover louvers |
| **T4** | Door handle covers buying guide (City, Civic, Corolla, Swift) | “carbon door handle covers Pakistan” | `/categories/door-handle-covers`, City/Civic/Corolla/Swift handle SKUs, Swift post as deep-dive link | Swift article is one model only |
| **T5** | Key covers & key chains: match buttons before you order | “civic key cover Pakistan”, “city key cover 3 button” | `/categories/key-covers-key-chains`, Civic/City key SKUs; cross-link push-start post | Push-start/fob post ≠ metal key shell / chain shelf |
| **T6** | Dashboard mats for Pakistani sun: velvet mats vs dash clutter | “dashboard mat Pakistan”, “corolla dash mat” | `/categories/dashboard-mats`, Corolla dash mat SKUs, heat-protection post, sun-shades (deferred leaf — honesty) | Floor-mats + heat posts don’t cover dash mats |
| **T7** | Air press / rain visors: model-specific fit for Corolla, Civic, City | “car air press Pakistan”, “window visor Civic” | `/categories/air-press`, CC-EXT-103/104/105, relevant `/cars/…` | Batch 4 leaf with zero content |
| **T8** | Roadside kit: car chargers & dual-cylinder compressors | “car air compressor Pakistan”, “45W car charger” | `/categories/emergency-safety`, `/categories/utility`, CC-0181 / compressor SKUs | New Batch 4 shelves; no guide |
| **T9** | Returns & wrong-item policy for car accessories (plain language) | “crazzycars return policy”, “wrong accessory delivered Pakistan” | `/returns-policy`, `/faq`, COD post, `/cash-on-delivery` | COD post ignores returns; Phase 1 flagged returns thinness |
| **T10** | Delivery charges explained: Rs. 250 vs bulky Rs. 500 vs spoiler courier | “crazzycars delivery charges”, “bulky item delivery Pakistan” | `/shipping-policy`, spoilers/splitters/floor-mats categories, COD + cash-on-delivery pages | No dedicated fee explainer; FAQs repeat this constantly |

**Hold / do not queue yet:** “Match year & variant…” — already **scheduled 2026-10-05**. Review that draft first; only commission a follow-up if it misses Shop-by-Car / VC-table screenshots.

**Optional 11–12 (lower priority):** fog/DRL covers chooser; multimedia steering install risks; LED headlight bulbs vs projectors — only if T1–T10 are approved and capacity remains.

---

### A4. Internal-linking audit

#### Blog → category / product / cars (content body)

| Pattern | Finding |
|---------|---------|
| Older 2026-01/02 guides | Usually **one** crawlable `/categories/{leaf}` link — good baseline |
| Sep–Oct “conversion” posts | Almost exclusively `/products/{slug}` (resolves 200 → root PDP). **Almost zero** links to FAQ-covered category money pages or `/cars/…` |
| `/cars/` links | Rare: Civic gen guide, Yaris vs City only |
| COD post | Links shipping-policy; **does not** link `/cash-on-delivery` (live 200) or returns |
| Aftermarket safety | **Zero** internal links |
| `relatedProducts` in Mongo | Populated on several Sep–Oct posts and **loaded in** `blogs/[slug]/page.jsx` — but **`BlogPostView` never renders them** → silent equity leak |

#### Category / product → blog

| Surface | Finding |
|---------|---------|
| Sampled FAQ-covered categories (`side-mirror-covers`, `floor-mats`, `body-kits-extensions`, `exhaust-systems-tips`, `hanging-perfumes`, `carbon-fiber-accessories`) | **0** crawlable `/blogs/{slug}` links in page HTML (footer may say “Blog” as a hub only) |
| PDPs | No “related guides” module observed in this audit pass |

#### Easy wins (no new articles required)

1. **Wire `relatedProducts` UI** on blog templates (data already there).  
2. On Sep–Oct posts: add 1–2 links each to the matching **Batch 1–4 category** (+ `/cars/` when VC-specific).  
3. Category “Related guide” strip (or footer module) for obvious pairs:

| Category | Guide to surface |
|----------|------------------|
| `side-mirror-covers` | Batman fitment + carbon accents guides |
| `body-kits-extensions` | Corolla body kit guide |
| `exhaust-systems-tips` | Exhaust tips honesty |
| `floor-mats` | Weather mats guide |
| `fragrances` / `hanging-perfumes` / `air-freshener-decoration` | Perfume guide |
| `carbon-fiber-accessories` | Mirror accents guide → later T1 |
| `led-lighting` / `interior-lights` | Ambient LED guide |
| `front-grilles` | Grille chooser |
| `car-care-cleaning` / `car-care-safety` | Car care 101 |
| `door-handle-covers` | Swift post (until T4 exists) |

4. COD post → `/cash-on-delivery` + `/faq` + `/returns-policy`.  
5. Aftermarket safety → `/faq` + 1–2 high-trust categories.

---

## Part B — Backlink / off-page audit

### B1. Executable from here

#### Backlink / GSC data

| Check | Result |
|-------|--------|
| GSC API / Search Analytics credentials in store or admin `.env.local` | **Not present** (no `SEARCH_CONSOLE` / webmasters service account vars found) |
| Live inbound link graph | **Cannot pull** from this environment |
| Broken-backlink recovery (404/redirect targets) | **Blocked** without GSC “Links” export or a third-party crawl |

**Ask for (manual):** GSC → Links → External → export, or grant read-only Search Console API. Then we can diff against live 200/301/404.

#### Technical foundation (live-checked 2026-10-02)

| Item | Status |
|------|--------|
| Sitemap index | Fresh; includes products, categories, cars, pages, blog |
| Batch 4 categories in `sitemap-categories.xml` | **All 6 present** (`emergency-safety`, `hanging-perfumes`, `utility`, `air-press`, `exhaust-systems-tips`, `car-care-cleaning`) |
| Blog sitemap | 23 posts |
| Canonical on blogs | `/blogs/{slug}` absolute (code) |
| Organization JSON-LD (home) | `AutoPartsStore` present: name, url, logo (`/og-image.jpg` **200**), email, phone, Gujranwala address, `sameAs` FB/IG/TikTok |
| LocalBusiness | Emitted as **`AutoPartsStore`** (subtype of LocalBusiness family) — OK for directories; not a separate `LocalBusiness` node |
| sameAs quality | Facebook URL is a **share** link (`/share/1EDTxnjBzS/`) — weaker than a stable page URL for knowledge panels |
| streetAddress | Literal “Gujranwala, Punjab, Pakistan” — coarse; fine for areaServed PK, weak for precise NAP citations |
| `/products/` blog hrefs | Resolve **200** to root PDPs (not soft-404s) |

#### Already-linkable assets (worth pointing outreach at once human outreach starts)

| Asset | URL | Why linkable |
|-------|-----|--------------|
| COD vs online payment guide | `/blogs/cod-vs-online-payment-car-accessories-pakistan` | Rare honest PK ecommerce payment explainer; pairs with `/cash-on-delivery` |
| COD landing | `/cash-on-delivery` | Policy + commercial landing |
| Exhaust tips honesty | `/blogs/exhaust-tips-systems-sound-performance` | Myth-busting; earns citations vs sales fluff |
| Carbon accents / material honesty | `/blogs/side-mirror-covers-carbon-fiber-accents-guide` | Trust content; precursor to T1 |
| Civic generation accessories | `/blogs/honda-civic-accessories-guide-every-generation` | Evergreen fitment hub |
| Corolla body kit guide | `/blogs/best-body-kit-styles-toyota-corolla-pakistan` | Highest Mongo views in set |
| FAQ / shipping / returns | `/faq`, `/shipping-policy`, `/returns-policy` | Citation targets for forums |

---

### B2. Not executable here — manual outreach opportunity list

Do **not** script, scrape, or auto-submit. Prioritized for a human with business email:

| Priority | Opportunity | Why it fits CrazzyCars | Notes |
|----------|-------------|------------------------|-------|
| 1 | **Supplier / brand reciprocal links** (packaging vendors, ABS trim suppliers, LED importers you already buy from) | Highest close rate; natural “authorized retailer / stockist” language | Ask for a text link to category or Civic/Corolla guide — not homepage only |
| 2 | **Pakistani auto forums / FB groups** (Civic Club PK, Corolla forums, PakWheels threads — *participation*, not spam) | Fitment questions match your guides | Answer with expertise; link the generation/COD/exhaust posts when relevant |
| 3 | **PakWheels marketplace / community profile** (business listing if eligible) | Dominant PK automotive attention | Listing + occasional guide shares; follow their rules |
| 4 | **Local business / Gujranwala directories** (Google Business Profile if not fully optimized; select PK business dirs with real moderation) | NAP + AutoPartsStore schema already exist | Fix Facebook `sameAs` to canonical page URL first |
| 5 | **Complementary non-competing merchants** (detailing chemical brands, tint shops, PPF installers — link exchange for care/heat guides) | Your car-care + heat content is useful to them | Reciprocal only where audiences overlap |
| 6 | **Urdu/English auto blogs & YouTubers** (spoiler/body-kit/Civic build channels) — guest tip or product-loan for review | Visual categories (Batman mirrors, spoilers, RGB) travel well | Needs sample budget + human relationship |
| 7 | **University / campus motor clubs** (NUST, UET, GIKI etc.) sponsorship pages | Small but real do-follow club sites | Local brand story (Gujranwala) helps |
| 8 | Avoid / deprioritize | Mass “SEO directory” blasts, PBNs, paid link farms | Wrong risk profile for a COD-trust brand |

---

## Recommended sequence (still proposal — no writes)

1. **Internal-link patch pass** (relatedProducts UI + category↔guide strips + COD→`/cash-on-delivery`) — highest ROI per hour; no new articles.  
2. Approve **T1–T10** topic list (or subset); then exact outlines/copy in a later gate (same as Batches 1–4).  
3. Let **scheduled** year/variant post publish (Oct 5); audit it before commissioning a duplicate.  
4. Human: export GSC external links → return here for broken-backlink triage.  
5. Human: pick 1–2 outreach rows from B2 (likely supplier reciprocal + PakWheels/profile hygiene).

---

## Ask

Reply with what to scope next, e.g.:

- `Internal links only`  
- `Topics: T1 T2 T9 T10` (then exact outlines)  
- `Provide GSC export` (when ready)  

**No blog drafts or live content writes until that sign-off.**
