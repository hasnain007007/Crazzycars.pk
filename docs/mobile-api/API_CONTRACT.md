# CrazzyCars.pk — Mobile API Contract (Phase 0 Discovery)

**Date:** 2026-10-04  
**Source of truth:** `CCSMS/storecraft-store` (live store https://crazzycars.pk)  
**Scope:** Read-only discovery. No website code was changed for this phase.  
**Admin app** (`storecraft-admin`) is out of scope for the customer mobile app except as shared MongoDB.

**Follow-up:** Phase 0.5 plan → [`WEB_CHANGES_PLAN.md`](./WEB_CHANGES_PLAN.md) (awaiting **"approved"**).  
Decisions locked: Bearer+cookie, email/password, tracking both ways, wishlist local-only, bundle `pk.crazzycars.app`. See [`OPEN_QUESTIONS.md`](./OPEN_QUESTIONS.md).

---

## Verdict: **C — Mix**

A usable public JSON API already exists for catalog, checkout, shipping, content, and cookie-based customer auth. Several mobile-critical capabilities are missing or unsuitable as-is (Bearer tokens, account deletion, wishlist sync, push devices, order lookup by orderNumber+phone, cart quote with bulky floor, force-update/maintenance config, Idempotency-Key).

| Classification | Meaning |
|----------------|---------|
| **A** | Ready to call from native app as-is |
| **Needs work** | Exists but cookie-only / incomplete / wrong shape for mobile |
| **Missing** | Must be added in Phase 0.5 (after approval) |

---

## 1. Data stack

| Layer | Technology |
|-------|------------|
| Storefront | Next.js App Router (`storecraft-store`) |
| Admin | Next.js (`storecraft-admin`) — not used by mobile customers |
| Database | **MongoDB** via **Mongoose** (`lib/db.js` → `MONGODB_URI`) |
| Images | **Cloudinary** (env `CLOUDINARY_*` / `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`) |
| Email | Resend |
| Auth | **JWT** signed with `JWT_SECRET`, stored in **httpOnly cookie** (`customer_token`) |
| Hosting | Coolify on VPS (`crazzycars.pk`) |

### How the website gets data

**Both patterns:**

1. **Server Components → direct Mongo** — homepage, PDP (`/[slug]`), categories, cars, blogs SSR loaders.
2. **Client → `/api/*` JSON** — checkout, auth, coupon, shipping calculate, contact, cart sync, product suggest, category tree, settings, tracking.

There is **no** Supabase/Firebase/Prisma. All storefront API routes live under `storecraft-store/app/api/**`.

---

## 2. Common response / error shapes

Most routes:

```ts
// success
{ success: true, ...payload }

// error
{ success: false, error: string }
```

Rate-limited routes (checkout, contact, login, reviews, tracking) may add:

```ts
{ success: false, error: string, code?: "RATE_LIMITED", retryAfterSeconds?: number }
// HTTP 429 + Retry-After header
```

`POST /api/shipping/calculate` returns the quote object directly (still includes `success`).

**There is no unified `{ error: { code, message, fields? } }` envelope today.**

---

## 3. Endpoints the web uses (by domain)

Base URL (production): `https://crazzycars.pk`  
All paths below are relative to that host.

### 3.1 Products — **A** (usable)

#### `GET /api/products`

| | |
|--|--|
| Auth | None |
| Query | `q`, `category` (slug), `sort` (`newest` \| `price-asc` \| `price-desc` \| `name` \| `featured` \| `popular` \| `rating`), `page`, `limit` (1–500, default 12), `countOnly=true`, `minPrice`, `maxPrice`, `minDiscount`, `brand`, `inStock`, `outOfStock`, `carMake`/`make`, `carModel`/`model`, `carGeneration`, `carYear`/`year`, `featured`, `newArrival`/`new`, `sale`/`deals` |
| Success | `{ success, products: StoreProductSummary[], total, page, totalPages }` or `{ success, count }` |
| Notes | Vehicle filter is make/model/generation/year — **not** a single `vehicle` slug. Cars PLP on web uses SSR + Vehicle docs. |

#### `GET /api/products/[slug]`

| | |
|--|--|
| Auth | None |
| Success | `{ success, product: StoreProductDetail }` |
| Errors | 400 missing slug · 404 · 500 |

#### `GET /api/products/deals`

| | |
|--|--|
| Query | `filter` (`all` \| `under1000` \| `under700` \| `under_1500` \| `under:N` \| `fiftyoff` \| `flash`), `limit` |
| Success | `{ success, products, total }` |
| Notes | Products with `isDeal: true`. Flash filter exists; **countdown end time** comes from Settings `homepageSettings.flashSaleEndTime` / product `saleSchedule.endDate`, not this list response. |

#### `GET /api/products/fitment`

| | |
|--|--|
| Query | `make` **required**, `model`, `year`, `variant`, `limit` (≤100) |
| Success | `{ success, make, model, year, variant, count, products }` |

#### `GET /api/products/suggest`

| | |
|--|--|
| Query | `q` (min 2 chars), `limit` (≤12) |
| Success | `{ success, products: [{ id, name, slug, image, price, regularPrice, salePrice }], total, hasMore, mode }` |

**`StoreProductSummary` (key fields):**  
`id`, `name`, `slug`, `articleNo`, `shortDescription`, `image`, `images[]`, `media`, `price`, `regularPrice`, `salePrice`, `compareAt`, `saleSchedule`, `isOnSale`, `featured`, `newArrival`, `brand`, `sku`, `codEnabled`, `isBulky`, `advancePercentRequired`, `categories[]`, `tags`, `inStock`, `stock`/`quantity`/`quantityAvailable`, `inventory`, `requiresOptions`, ratings fields.

**`StoreProductDetail` adds:** HTML description, variants / combinations / simpleVariations, images/videos, features, specs, addOns, recommendedProducts, fitment (`compatibleCars`, `vehicleCompatibility`, `isUniversal`), shipping weight fields, SEO, etc.

---

### 3.2 Categories — **A**

| Method / path | Auth | Notes |
|---------------|------|-------|
| `GET /api/categories` | none | Query: `tree`, `featured`, `showInFooter`, `showOnHomepage`. Returns flats with `productCount > 0`. |
| `GET /api/categories/[slug]` | none | Category + subcategories + products + breadcrumbs. |
| `GET /api/categories/tree` | none | Nested tree for mega-menu. Cache header `X-Category-Tree-Cache`. |

---

### 3.3 Vehicles / car catalog — **A**

| Method / path | Auth | Notes |
|---------------|------|-------|
| `GET /api/vehicles` | none | All active Vehicle docs. |
| `GET /api/vehicles/[slug]` | none | One generation (slug like `toyota-corolla-e170-2014-2026`). |
| `GET /api/vehicles/makes` | none | `string[]` makes. |
| `GET /api/vehicles/models?make=` | none | Models for make. |
| `GET /api/vehicles/generations?make=&model=` | none | Generation Vehicle docs. |
| `GET /api/vehicles/find` | none | Query `catalogSlug` **or** `make`+`model` (+ optional `year`). |
| `GET /api/car-catalog` | none | Makes, `carData`, `popular`, `quickPills`, `vehicles`. `?popular=true` returns popular only. Fallback payload on DB error. |

**Vehicle fields:** `make`, `model`, `generation`, `displayName`, `yearFrom`, `yearTo`, `slug`, `catalogModelSlug`, `image`, SEO fields, `sortOrder`, `isActive`.

---

### 3.4 Homepage / banners / settings — **A** (partial)

| Method / path | Auth | Purpose |
|---------------|------|---------|
| `GET /api/homepage` | none | Banners by placement, featured, newArrivals, categories, blogPosts. |
| `GET /api/banners` | none | `hero_slider`, `promo_strip`, `promo_card`, `popup_banner`, `all`. |
| `GET /api/featured-media` | none | Instagram-style media strip. |
| `GET /api/settings` | none | Public client settings (no payment secrets): contact, appearance, checkout, WhatsApp, payment method flags, homepageSettings (incl. flash sale end), etc. |
| `GET /api/store/shipping-banner` | none | Delivery fee copy, city ETA bands, zones summary. |

**Web homepage SSR** does **not** call `/api/homepage`; it uses server lib loaders (`fetchHotDealsServer`, `fetchBestSellersServer`, `getHeroSlides`, car catalog, category tree). The HTTP route is still a valid JSON source for mobile.

**Hot deals / flash countdown:**  
- Hot deals products: deals API / SSR hot-deals loader.  
- Flash sale end: Settings `homepageSettings.flashSaleEndTime` (+ `flashSaleEnabled`).  
- Per-product sale countdown: `product.saleSchedule.endDate`.

---

### 3.5 Cart — **Needs work**

| Method / path | Auth | Purpose |
|---------------|------|---------|
| `POST /api/cart/sync` | none | Abandoned-cart sync: `{ sessionId, items[], customer?, path? }` → `{ success, status, recoveryToken?, itemCount?, subtotal? }`. |
| `GET /api/cart/recover?token=` | none | Recover abandoned cart items. |

**No** `POST /cart/quote` that returns validated line prices + stock + bulky-aware delivery in one call. Web cart is **client-local** (localStorage); totals are recomputed at checkout / shipping calculate.

---

### 3.6 Shipping / coupon — **A** (with caveats)

#### `GET|POST /api/shipping/calculate`

| | |
|--|--|
| Input | `province`/`state`, `city`, `total`/`orderSubtotal`, `totalWeight`, `country` (default Pakistan) |
| Output | `{ success, zoneName, shippingCost, rate, estimatedDays, … }` |
| Caveat | Uses zone quote with **regular floor (Rs.250)**. Does **not** apply bulky floor (Rs.500). Checkout path applies bulky via `applyShippingRules`. |

#### `GET /api/shipping-estimate` / `GET /api/store/shipping-estimate`

Weight/city based rates. Same caveat: no bulky flag.

#### `POST /api/coupon/validate`

| | |
|--|--|
| Body | `{ code, orderAmount, categoryIds?: string[] }` |
| Success | `{ success: true, valid: boolean, discount: number, message: string }` |

---

### 3.7 Checkout / orders — **A** (guest OK) + gaps

#### `POST /api/checkout`

| | |
|--|--|
| Auth | None (guest OK; may attach/create Customer by email/phone) |
| Rate | 5 / 10 min per email+IP |
| Idempotency | **None** — no `Idempotency-Key` header today |
| Body (required) | `items[]` (each needs `productId`; qty 1–99), `customer.name`, `customer.phone` (PK mobile), `shippingAddress.street|line1`, `.city`, `.state|province` |
| Body (optional) | `customer.email`, address `street2`/`area`/`zip`, `paymentMethod` (default `cod`), `couponCode`, cart recovery fields, Meta attribution `meta` |
| Success | `{ success, orderId, orderNumber, accessToken, metaPurchaseEventId, total, paymentStatus, order }` |
| Errors | 400 validation/stock/payment · 403 inactive · 409 stock race · 429 · 500 |

Server **recalculates** prices, coupon, shipping (with bulky floor), COD advance. Client totals are not trusted.

#### `GET /api/orders/[id]/public?t=`

Guest success page. Requires `t` = `publicAccessToken`. Does **not** return phone/full address.

#### Logged-in orders

| Method / path | Auth |
|---------------|------|
| `GET /api/customer/orders` | Cookie JWT |
| `GET /api/customer/orders/[id]` | Cookie JWT |

---

### 3.8 Order tracking — **Needs work** for app plan

| Method / path | Auth | Reality |
|---------------|------|---------|
| `GET /api/tracking?trackingNumber=` | none (30/min/IP) | Courier tracking by **shipment tracking number** (PostEx / Run Courier), **not** orderNumber + phone. |

Web UI: `/track-order` asks for **tracking number**.  
**Missing:** `GET` by `orderNumber` + `phone` (proposed in Phase 0.5).

---

### 3.9 Auth — **Needs work** for native

| Method / path | Body / notes | Token delivery |
|---------------|--------------|----------------|
| `POST /api/customer/register` | `{ firstName, lastName, email, password, phone }` (password ≥ 6) | Sets httpOnly cookie `customer_token`. **No token in JSON.** |
| `POST /api/customer/login` | `{ email, password }` | Same cookie JWT, 30d. **No token in JSON.** |
| `POST /api/customer/logout` | — | Clears cookies |
| `GET /api/customer/me` | — | Cookie required |
| `PUT /api/customer/profile` | `{ firstName?, lastName?, phone?, password? }` | Cookie |
| `POST /api/customer/forgot-password` | email | Always `{ success: true }` (no enum) |
| `POST /api/customer/reset-password` | `{ token, password }` | — |
| Addresses | `GET/POST /api/customer/addresses`, `PUT/DELETE .../[id]` | Cookie |

Deprecated aliases: `/api/account/*` → customer equivalents.

**JWT claims:** `{ customerId, email, type: "store_customer", sub }` signed with `JWT_SECRET`, expiry `30d`.

**Readers accept cookies only** (`lib/customerAuthServer.js`). **No `Authorization: Bearer` support.**

**Can existing auth issue tokens for mobile?**  
JWT is already created server-side, but it is **cookie-bound**. Native apps need API changes: return access/refresh tokens in JSON **and** accept Bearer (or keep refresh cookie strategy unsuitable for SecureStore). There is **no refresh-token rotation** today (single 30d JWT).

**Missing for stores:** `DELETE /me` account deletion endpoint.

---

### 3.10 Wishlist — **Missing** (API)

| Layer | Status |
|-------|--------|
| Client | **localStorage** key `sialkot_wishlist` — `{ id, slug, name, image, price }` |
| DB | `Customer.wishlist[]` schema exists |
| API | **None** — no GET/POST/DELETE wishlist sync. `/me` does not expose wishlist in practice for sync. |

---

### 3.11 Blog / pages / contact — **A**

| Method / path | Notes |
|---------------|-------|
| `GET /api/blog` | `page`, `limit` (≤30), `category`, `search` → posts + total + pages |
| `GET /api/blog/[slug]` | Full HTML content; increments views; relatedProducts |
| `GET /api/pages` | Nav/footer/infobar filters |
| `GET /api/pages/[slug]` | Full CMS page |
| `POST /api/contact` | `{ name, email, message, subject?, orderNumber? }` — rate limited |

---

### 3.12 Reviews — **A** (optional for v1)

| Method / path | Notes |
|---------------|-------|
| `GET /api/reviews` | By product id/slug; approved only; stats breakdown |
| `POST /api/reviews/submit` | Creates `pending`; some validation errors return 200 + `success:false` |

---

### 3.13 Other store routes (not primary for mobile v1)

`/api/health`, `/api/media/[...path]`, `/api/meta/capi`, `/api/presence`, `/api/analytics/ai-visit`, `/api/revalidate`, cron routes, debug/test email — **do not use from the app**.

---

### 3.14 Missing vs Phase 0.5 wish-list

| Proposed | Status today |
|----------|--------------|
| `GET /api/mobile/v1/config` | **Missing** (pieces in `/api/settings` + `STORE_POLICY`) |
| Unified `GET /home` | Partial: `/api/homepage` + settings + deals |
| `POST /cart/quote` (server prices + bulky shipping) | **Missing** |
| `POST /orders` + Idempotency-Key | Checkout exists; **no idempotency** |
| `GET /orders/track?orderNumber&phone` | **Missing** (courier tracking number only) |
| Auth register/login/refresh/logout JWT body | Cookie JWT only; **no refresh** |
| `DELETE /me` | **Missing** |
| Wishlist sync | **Out of scope for v1** (app local-only; no API planned) |
| `POST/DELETE /devices` push tokens | **Missing** (planned in Phase 0.5) |
| `GET /orders/track` orderNumber+phone | **Missing** (planned; courier `/api/tracking` kept) |

---

## 4. Business rules (from code)

### 4.1 Delivery charges

Source: `config/store-policy.js` + `lib/freeDelivery.js` + `lib/shippingTier.js` + checkout.

| Rule | Value |
|------|-------|
| Regular floor | **Rs.250** (`standardFeePKR`) |
| Bulky floor | **Rs.500** if any line `isBulky === true` |
| Free shipping by order value | **Disabled** (`freeDeliveryExists: false`) |
| Zone quote | `max(flat 250, zone rate)` then checkout applies `max(floor, zoneCost)` with bulky floor |

**Do not hardcode in the app for display of final totals** — call server. Estimate APIs currently omit bulky; checkout is authoritative.

### 4.2 COD

- Enabled via Settings (`storePayment.codEnabled` / `pakistaniPaymentMethods.cod.enabled`), default on.
- **Body kits** cannot use COD (`lib/codEligibility.js` — name/slug match `/body[-_\s]?kits?\b/i`, except “underbody”).
- Per-product `codEnabled !== false`.
- Stripe/PayPal rejected.
- Offline methods: `cod`, `jazzcash`, `easypaisa`, `bankTransfer`, `hbl`, `meezan`, `ubl` — enabled flags from Settings (defaults: only COD enabled).

### 4.3 Advance payment / COD advance

- Advance-method discount: Settings percent (default **3%**) on after-coupon subtotal when method is JazzCash/Easypaisa/banks.
- COD advance due: `MAX(product % advances, shipping)` — **not stacked** (`lib/productAdvance.js`). Remaining is `remainingCod`.

### 4.4 Minimum order

Settings `storePayment.minimumOrderAmount` (default **0**). Enforced **client-side only** on web checkout — **not** in `/api/checkout`. Confirm for mobile whether server should enforce (open question).

### 4.5 Coupons

`lib/couponCompute.js`: active, not expired, under usage limit, min order, optional category scope; % or fixed; round to whole rupees. Invalid coupon at checkout is **silently skipped** (not hard error).

### 4.6 Stock

`inventory.allowBackorder` opt-in. Checkout validates base / variant / combination / option stock; qty clamp 1–99; atomic decrement after create; failure → cancel order.

### 4.7 Order number

Default **`ORD-YYYY-00001`** (prefix/year/5-digit sequence from Settings). Allocated atomically.

### 4.8 Order statuses

Model enum: `pending`, `confirmed`, `processing`, `packed`, `shipped`, `delivered`, `returned`, `cancelled`, `refunded`, `disputed`.  
Checkout creates **`pending`**.  
Payment statuses: `unpaid`, `paid`, `refunded`, `partial`, `failed`.

### 4.9 Phone

`lib/customerPhone.js` `normalizePkMobile`: accept `03…`, `923…`, `3XXXXXXXXX` → normalize to `03XXXXXXXXX`; validate `/^03\d{9}$/`.

### 4.10 Currency display

Symbol `Rs.`, whole rupees, thousands separators. Web uses `Intl.NumberFormat("en-PK")`. Mobile prompt requires a **manual regex formatter** (do not rely on Intl on device).

### 4.11 Contact (confirmed policy)

From `STORE_CONTACT`: phone/WhatsApp `03284010007`, email `info@crazzycars.pk`, Gujranwala / Punjab / PK.

### 4.12 Returns (policy, for content)

7-day window; eligible defective / wrong item; change of mind not eligible; store pays return shipping for eligible returns — from `STORE_POLICY.returns`.

---

## 5. URL structure (deep links)

| Web path | Purpose |
|----------|---------|
| `/` | Home |
| `/[slug]` | **Canonical PDP** (and some CMS resolution) |
| `/shop` | Listing |
| `/sale` | Deals |
| `/search` | Search |
| `/categories`, `/categories/[slug]` | Categories |
| `/cars`, `/cars/[slug]` | Vehicle fitment PLP |
| `/blogs`, `/blogs/[slug]` | Blog (canonical); `/blog` → 308 → `/blogs` |
| `/pages/[slug]` | CMS pages |
| `/cart`, `/checkout`, `/checkout/success` | Cart/checkout |
| `/wishlist` | Local wishlist |
| `/track-order` | Courier tracking number UI |
| `/account/*` | Account (cookie-gated) |
| `/contact`, `/faq`, `/about`, policies | Content |

Canonical helpers: product → `/${slug}`; category → `/categories/${slug}`; vehicle → `/cars/${slug}`; blog → `/blogs/${slug}`.

Legacy `/products/[handle]` 308 → canonical slug.

---

## 6. Auth method summary (mobile implications)

| Question | Answer |
|----------|--------|
| Mechanism today | JWT in **httpOnly** cookie `customer_token` (legacy `store_token` accepted) |
| Token in login/register JSON? | **No** |
| Bearer header supported? | **No** |
| Refresh tokens? | **No** (single 30-day JWT) |
| Guest checkout? | **Yes** |
| Account deletion API? | **No** |
| Fit for SecureStore native auth? | **Not without Phase 0.5 API changes** |

---

## 7. What exists vs what Phase 0.5 should add

### Reusable as-is (Classification A)

- Products list/detail/deals/suggest/fitment  
- Categories + tree  
- Vehicles + car-catalog  
- Homepage / banners / settings / featured-media  
- Checkout (guest)  
- Coupon validate  
- Shipping calculate / estimates (with bulky caveat)  
- Blog + pages + contact  
- Courier tracking by tracking number  
- Public order by id + access token  
- Reviews (optional)

### Needs mobile API work (Classification C gaps)

1. **Bearer + refresh auth** (or documented cookie bridge — not recommended for native)  
2. **Account deletion** (App Store / Play requirement)  
3. **Wishlist sync** if cloud sync required  
4. **`POST /cart/quote`** wrapping existing price + stock + `applyShippingRules` (bulky)  
5. **Idempotency-Key** on order create  
6. **Order lookup** by orderNumber + phone (if product wants that UX)  
7. **Push device** register/unregister  
8. **`/config`** min app version + maintenance flag  
9. Consistent error envelope + rate limits documented for mobile clients  

**Recommendation:** Proceed to Phase 0.5 plan (`docs/WEB_CHANGES_PLAN.md`) after you approve this discovery. Do **not** invent endpoints in the app until that plan is approved.

---

## 8. Open questions

See `docs/OPEN_QUESTIONS.md`.
