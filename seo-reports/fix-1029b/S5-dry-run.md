# S5 — Blog rewrites (DRY-RUN ONLY — no DB writes)

**Awaiting exact message: `GO S5`**

Fingerprint for writes (later): `84143ac0cb2c3085` only · never Atlas `317ae4de8eb24f84`.  
Apply with field-level `$set` on `blogposts` after fresh mongodump. No replaces/deletes.

## Scope

### Priority (GSC crawled-not-indexed)

| Slug | Current ~words (page) | Proposed |
|------|----------------------|----------|
| `/blogs/body-kit-price-in-pakistan-2026` | ~540 | 700+ body + FAQ schema + 4–6 links |
| `/blogs/honda-city-2021-modification-cost-pakistan` | ~490 | same |
| `/blogs/7d-vs-9d-vs-tpe-floor-mats-pakistan` | ~495 | same |

### Second priority (same treatment)

| Slug | Note |
|------|------|
| `/blogs/car-perfume-air-freshener-guide` | Page already ~760 words — still refresh FAQ + contextual links + tighten title/meta |
| `/blogs/car-care-101-essential-products-pakistan` | ~800 words — refresh FAQ/links |
| `/blogs/protect-car-interior-from-pakistan-heat` | ~780 words — refresh FAQ/links |

---

## 1) body-kit-price-in-pakistan-2026

**Proposed title (≤60):** `Body Kit Price in Pakistan 2026 Guide`  
**Proposed meta (140–155):** `Compare 2026 body kit prices in Pakistan for Civic, Corolla, City and Yaris. Live PKR from CrazzyCars kits, fitment tips and COD notes.`

**H1:** Body Kit Price in Pakistan 2026  
**H2s:** What a body kit includes · Live PKR examples on CrazzyCars · Civic vs Corolla vs City · Fibreglass vs ABS · Fitment and shipping · When COD applies

**Live prices to cite (from site today):**
- Yaris complete kit: **Rs 10,999** → `/toyota-yaris-2020-2021-complete-body-kit`
- Corolla TRD-style D7: **Rs 12,999** → `/toyota-corolla-2018-2021-trd-style-body-kit-d7-4pcs`
- Honda City Modulo-style: **Rs 13,999** → `/honda-city-2021-2025-modulo-style-body-kit-fibreglass`
- Category range on `/categories/body-kits-extensions`: about **Rs 5,499–37,999** (label as listing range)

**Contextual links (4–6):**
1. `/categories/body-kits-extensions`
2. `/categories/spoilers-diffusers`
3. `/cars/honda-civic-x-2016-2021`
4. `/cars/toyota-corolla-e170-2014-2026`
5. `/toyota-yaris-2020-2021-complete-body-kit`
6. `/honda-city-2021-2025-modulo-style-body-kit-fibreglass`

**FAQ (FAQPage):**
1. How much does a full body kit cost in Pakistan in 2026? → Cite live examples above; note paint/install separate.
2. Do kits fit my exact year? → Link car pages; check product fitment.
3. Fibreglass or ABS? → Trade-offs; site lists fibreglass kits for many models.
4. Is COD available on bulky kits? → Site policy: many kits need advance/bank; confirm on PDP.
5. Can I buy only a splitter? → Link `/categories/splitters-side-skirts`.

**$set fields (after GO):** `title`, `seo.metaTitle`, `seo.metaDescription`, `content` (HTML), `excerpt`, `faq[]`, `contentUpdatedAt`, `categories`/`tags` if needed.

---

## 2) honda-city-2021-modification-cost-pakistan

**Title:** `Honda City 2021 Modification Cost Guide`  
**Meta:** `Honda City 2021–2026 mod cost in Pakistan: body kits, mats, carbon trim and paddles with live PKR on CrazzyCars and COD notes.`

**H1:** Honda City 2021 Modification Cost in Pakistan  
**H2s:** Budget tiers · Body kits · Interior (mats, carbon) · Lighting and mirrors · Sample cart totals · Fitment for 2021–present

**Live prices:**
- City Modulo body kit: **Rs 13,999**
- City TPE mats: **Rs 7,799** → `/honda-city-2021-2026-tpe-floor-mats-premium`
- Paddle shifters: **Rs 4,999** → `/honda-city-2021-2026-carbon-fiber-steering-wheel-paddle-shifters-pair`

**Links:**
1. `/cars/honda-city-2021-present`
2. `/categories/body-kits-extensions`
3. `/honda-city-2021-2025-modulo-style-body-kit-fibreglass`
4. `/honda-city-2021-2026-tpe-floor-mats-premium`
5. `/honda-city-2021-2026-carbon-fiber-steering-wheel-paddle-shifters-pair`
6. `/categories/side-mirror-covers`

**FAQ:** cost of a starter mod pack · does 2021 City share parts with classic City · paint cost not included · COD on City kits · where to check fitment years

---

## 3) 7d-vs-9d-vs-tpe-floor-mats-pakistan

**Title:** `7D vs 9D vs TPE Floor Mats Pakistan`  
**Meta:** `7D, 9D and TPE car mats compared for Pakistan heat, dust and spills. See live TPE prices on CrazzyCars and pick by fitment.`

**H1:** 7D vs 9D vs TPE Floor Mats in Pakistan  
**H2s:** Material differences · Heat and odour · Cleaning · What CrazzyCars stocks (TPE) · Model-specific fit · Buying checklist

**Live prices:** City TPE mats **Rs 7,799**; category listings also show **Rs 4,599–11,199** band on `/categories/floor-mats`.  
**Do not claim 7D/9D SKUs** if not in sitemap — compare conceptually; push TPE products that exist.

**Links:**
1. `/categories/floor-mats`
2. `/honda-city-2021-2026-tpe-floor-mats-premium`
3. `/honda-civic-2016-2021-tpe-floor-mats-premium`
4. `/toyota-corolla-2014-2026-tpe-floor-mats-premium`
5. `/toyota-yaris-2020-2026-tpe-floor-mats-premium`
6. `/blogs/best-floor-mats-pakistani-weather-guide`

**FAQ:** TPE vs PVC smell in heat · custom vs universal · front-only vs full set · COD · how to measure footwell

---

## 4) car-perfume-air-freshener-guide (2nd)

**Title:** `Car Perfume & Air Freshener Guide PK`  
**Meta:** `Hanging cards, dashboard gels and vent clips compared for Pakistan cars. See live fresheners on CrazzyCars with COD on light items.`

**Live:** `/x-card-car-hanging-air-freshener-perfume` (listing ~Rs 149–199 band on page); `/lion-car-dashboard-perfume-air-freshener-crazzycars` (~Rs 1,199–1,499).  
**Links:** `/categories/air-freshener-decoration`, those two PDPs, `/categories/interior`, `/blogs/protect-car-interior-from-pakistan-heat`  
**FAQ:** 5 questions on longevity, heat, kids/pets, overpowering scent, COD.

---

## 5) car-care-101-essential-products-pakistan (2nd)

**Title:** `Car Care Essentials in Pakistan`  
**Meta:** `Essential car care for Pakistani roads: interior protect, mats, shades and cleaning — with category links on CrazzyCars.pk.`

**Links:** `/categories/car-care-cleaning`, `/categories/car-care-safety`, `/categories/floor-mats`, `/categories/sun-shades`, `/blogs/protect-car-interior-from-pakistan-heat`  
Only cite product PKR if a matching PDP is linked after price check at apply time.

---

## 6) protect-car-interior-from-pakistan-heat (2nd)

**Title:** `Protect Car Interior from Pakistan Heat`  
**Meta:** `Beat dashboard cracking and fade: sun shades, mats and vent habits for Pakistan summers, with live shade and mat links.`

**Live:** sun shade `/universal-car-umbrella-windshield-protector-sun-shade` **Rs 1,799**  
**Links:** that PDP, `/categories/sun-shades`, `/categories/dashboard-mats`, `/categories/floor-mats`, `/blogs/car-perfume-air-freshener-guide`

---

## Apply plan (after `GO S5`)

1. Fresh `mongodump` of FP `84143ac0cb2c3085`.
2. Dry-run mongosh `$set` preview printed to `seo-reports/fix-1029b/S5-apply-preview.json`.
3. Field-level `$set` only on the six `slug`s above (content, seo, faq, contentUpdatedAt).
4. Purge/revalidate blog tags; re-run `seo-verify`; submit INDEXING-LIST URLs in GSC.

**STOP — no DB write until `GO S5`.**
