# Website issues fix — handoff (2026-11-05)

## Status legend
- **Implemented locally** — code/migrations in repo
- **Verified locally** — tests / dry-run / apply on `sialkot_motorsports`
- **Verified live** — not claimed unless measured against crazzycars.pk after deploy

## Architecture (confirmed)
- Next.js storefront (`storecraft-store`) + admin (`storecraft-admin`)
- MongoDB; Coolify deploys `vps-test` → crazzycars.pk
- Canonical money/policy: `config/store-policy.js` + `config/checkout-money.js` + `lib/storePolicyCopy.js`
- Local `.env.local` points at **`sialkot_motorsports`** (not live `crazzycars_motorsports`)

## Implemented fixes

### 1–2. Shipping / COD / payment unification
| Change | Files |
|--------|--------|
| Advance page: body kits = full prepaid (not “higher advance”); no unconditional fitment refund | `storePolicyCopy.js` |
| Sanitize CMS advance messages (fitment refund + legacy “pay delivery charges”) | `storePolicyCopy.js`, `normalizeStoreSettings.js`, `freeDelivery.js`, `Settings.model.js` |
| COD / WhyChooseUs / Checkout advance copy aligned | `cash-on-delivery/page.jsx`, `WhyChooseUs.jsx`, `CheckoutView.jsx` |
| Urdu banner no longer promises fitment refund | `storePolicyCopy.js` |
| Admin defaults: booking from Rs. 300 (not 250) | `storecraft-admin/lib/storePolicyDefaults.js` |
| Checkout flat fee fallback uses `STORE_POLICY` | `CheckoutView.jsx` |
| Render-time blog scrub for flat-250 / wrong COD tiers / change-of-mind exchange | `scrubPolicyConflictCopy.js` → `sanitizeBlogHtml` |
| Blog meta overrides for policy posts | `app/blogs/[slug]/page.jsx` |

**Financial calculations unchanged** (tiers already 300/600/1000; shipping 250/500; prepaid 4%; body-kit COD ban). Copy and CMS defaults brought in line.

### 3. Returns / fitment
- Returns policy page already correct; advance FAQ/deduction copy now matches it.
- Blog scrub rewrites “change-of-mind = exchange only” at render time until Mongo apply on live.

### 4. Vehicle labels
- `/cars` and Shop-by-Vehicle no longer show nickname/gen alone (`Classic`, `7th Gen`, `E140`…).
- Helper: `vehicleCardModelLabel()` in `carCatalogDisplay.js`
- DB `displayName` values were already complete; UI was the bug.

### 5. Category misassignment
- Interior door panel products were also in exterior child `door-handle-covers`.
- Migration removes that link; keeps interior + carbon categories.
- **Applied on `sialkot_motorsports`**. **Not applied on live `crazzycars_motorsports`.**

### 6. Product details / variants (ambient lights + shared PDP)
- Scrub stale “fitment fields” boilerplate at serialize time.
- Pcs variant pack note + missing-spec callout (no fabricated dimensions/wiring).
- **Missing merchant data (flagged):** connection type, exact dimensions, per-piece bill of materials, electrical requirements for ambient lights.

### 7. Homepage readability + placeholders
- BrandHero H1: `#F8FAFC` + shadow (was `#111` on dark hero).
- Emoji car placeholders → neutral SVG / gradient fallback (`VehicleImageFallback.jsx`).

### 8. Duplicate Prius meta
- Code: skip generic DB metas; prefer `carPageMeta` (XW20 vs XW30).
- Migration updates `vehicles.metaDescription` — **applied on sialkot**; **pending on live**.

### 9. Technical SEO
- Preserved structured data / robots / sitemaps; no broad robots.txt changes.
- Policy blogs still exist live; render scrub + meta overrides fix conflicting claims without requiring immediate Mongo write.

## Migrations
Script: `scripts/migrations/2026-11-05-policy-content-and-categories.mjs`

```bash
# dry-run (default)
node scripts/migrations/2026-11-05-policy-content-and-categories.mjs

# apply (explicit)
node scripts/migrations/2026-11-05-policy-content-and-categories.mjs --apply
# optional: --uri='mongodb+srv://…/crazzycars_motorsports'
```

| Target | Status |
|--------|--------|
| `sialkot_motorsports` | **Applied** (Prius metas, 2 category fixes, Settings advance message) |
| Policy blogs on sialkot | Missing (live-only content) |
| `crazzycars_motorsports` (live) | **Not applied** (per task: no destructive prod data writes) |

**Rollback (categories):** re-add `door-handle-covers` ObjectId to product.categories for the two slugs listed in the dry-run report.  
**Rollback (Prius/settings):** restore previous `metaDescription` / `advancePaymentMessage` from backup or prior values in the dry-run JSON.

## Tests run (verified locally)
```
node --import ./tests/alias-loader.mjs --test \
  tests/cod-booking-advance.test.js \
  tests/policy-consistency.test.js \
  tests/store-policy.test.ts \
  tests/shipping-advance.test.js \
  tests/cod-eligibility.test.ts
→ 33 pass, 0 fail

node storecraft-store/scripts/check-policy-literals.mjs
→ Policy literal guard passed.
```

New: `tests/policy-consistency.test.js` (COD boundaries, bulky shipping, body-kit COD, prepaid 4%, advance scrub, vehicle labels, blog scrub).

## Unresolved / business notes
1. **Live Mongo blogs** (`delivery-charges-…`, `car-accessories-returns-…`) still need `--apply` against `crazzycars_motorsports` for durable HTML (render scrub covers HTML until then).
2. **Ambient lights** still lack verified connection/dimension/BOM data — merchant must complete in admin.
3. **Vehicle images:** 13 vehicles without images use neutral fallback (no invented photos).
4. No genuine checkout math conflict found vs published shipping/returns policy; prepaid remains **4%** (test previously wrongly expected 5%).

## Deploy / rollback
1. Merge/push `vps-test` → Coolify auto-deploys storefront (code fixes go live).
2. After deploy, optionally run migration `--apply` with live URI for blogs + Prius + categories + settings (authorize separately).
3. Code rollback: `git revert` the ship commit on `vps-test`.
4. Data rollback: see migration section above.

## Screenshots
Not captured in this run (no browser session opened for visual QA). After deploy, re-check homepage H1 contrast at 375 / 768 / 1440 and `/cars` labels.
