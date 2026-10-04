# Phase 0.5 — Mobile API plan (website changes)

**Status:** Awaiting your **"approved"** before any code.  
**Repo:** `CCSMS` (website)  
**Branch:** `mobile-api` (create from current `vps-test` when approved)  
**App folder:** `crazzycars-mobile/` — no Expo scaffold in this phase.

---

## Goals

Add a versioned mobile REST API under the **storefront** (`storecraft-store`) at:

```
/api/mobile/v1/*
```

that:

1. Reuses existing business logic (pricing, shipping floors, COD eligibility, coupons, stock, order allocation).
2. Adds **Bearer auth alongside** existing cookie auth — **web login/register/cookie behavior unchanged**.
3. Does not change existing website UX or existing `/api/*` response contracts used by the web.
4. Omits wishlist sync (local-only in the app for v1).

---

## Confirmed product decisions (from you)

| Topic | Decision |
|-------|----------|
| Bundle ID | `pk.crazzycars.app` |
| Auth | Email + password (same Customer accounts as web). No OTP in v1. Phone required at checkout. |
| Tracking | Keep courier tracking number API **and** add orderNumber + phone lookup. App also persists `orderId` + `accessToken` after checkout for that device. |
| Wishlist | Local-only v1 — **no** wishlist endpoints in this plan. |
| COD body kits | Surface block at cart/quote using the **server message** (same wording checkout uses today). |

---

## Non-negotiables

- **No secrets in the app.** Mobile only calls public/mobile API with user tokens.
- **Server recalculates** every price, discount, and delivery charge. Never trust client totals.
- **Do not modify** existing `/api/customer/login|register|me|…` cookie flows except optional shared helper extraction that preserves cookie behavior bit-for-bit.
- CORS: do not widen beyond what the storefront already needs; native apps do not need open CORS.
- Pagination: hard max `limit` (match existing caps where possible; products max 100 for mobile list, blog ≤30).
- Rate limit: auth, orders, contact, order-track-by-phone.
- Consistent error envelope for **new** mobile routes only (web routes stay as `{ success, error }`).

### Mobile error envelope (new routes only)

```ts
{
  error: {
    code: string;       // e.g. "VALIDATION_ERROR" | "UNAUTHORIZED" | "RATE_LIMITED" | "COD_NOT_AVAILABLE"
    message: string;    // human-readable; app may show this as-is for COD/stock
    fields?: Record<string, string>;
  }
}
```

Optional compatibility field `success: false` may be included; clients should key off HTTP status + `error.code`.

---

## Architecture

```
app/api/mobile/v1/<resource>/route.js
  → lib/mobile/* (zod parse, auth, errors, rate limit)
  → existing lib/* (quoteShipping, applyShippingRules, productAllowsCod,
     computeCouponDiscount, effectiveUnitPrice, allocateOrderNumber,
     checkout internals extracted if needed, serialize helpers)
  → Mongo models (Product, Order, Customer, Settings, …)
```

### Shared auth resolution

Extend a small helper (new `lib/mobile/auth.js` or extend `getAuthedCustomer` carefully):

1. If `Authorization: Bearer <accessJwt>` present and valid → customer.  
2. Else fall back to existing cookie `customer_token` / `store_token` (web unchanged).  

Web routes keep calling cookie-only paths **or** the dual helper with identical cookie semantics — either way, cookie login must keep working without requiring Bearer.

### Access + refresh tokens (mobile only)

| Token | Lifetime (proposed) | Storage |
|-------|---------------------|---------|
| Access JWT | **15 minutes** | Returned in JSON; app → SecureStore |
| Refresh token | **30 days**, opaque random | Returned once in JSON; app → SecureStore; **sha256 hash** in Mongo |

**Access JWT claims (proposed):**  
`{ typ: "mobile_access", type: "store_customer", sub: customerId, customerId, email }`  
Signed with existing `JWT_SECRET` (or `MOBILE_JWT_SECRET` if you prefer a separate secret — default: reuse `JWT_SECRET` to avoid new ops unless you want isolation).

**Refresh model (new):** `CustomerRefreshToken`

```ts
{
  customerId: ObjectId,
  tokenHash: string,      // sha256 hex of raw token
  expiresAt: Date,        // TTL index
  revokedAt?: Date,
  replacedByHash?: string,
  userAgent?: string,
  createdAt: Date
}
```

**Rotation:** `POST /auth/refresh` with refresh token → revoke old row, issue new access + new refresh. Reuse of a revoked/rotated token → revoke all tokens for that customer (theft detection, simple).

**Logout:** revoke presented refresh token (and optionally all for customer).

**Web cookies:** continue using existing 30d `store_customer` JWT in cookie. Mobile login endpoints **do not** need to set cookies (may set them harmlessly if we share code — prefer **not** setting cookies on mobile routes to avoid confusion).

---

## New Mongo models / indexes

| Model | Purpose |
|-------|---------|
| `CustomerRefreshToken` | Hashed refresh tokens + TTL on `expiresAt` |
| `MobileDevice` | Push tokens: `{ customerId?, token, platform, appVersion, updatedAt }` unique on `token` |
| `IdempotencyKey` | `{ key, scope, requestHash?, responseStatus, responseBody, expiresAt }` TTL index (e.g. 24h) |
| Settings fields (optional) | `mobileApp: { minVersionIos, minVersionAndroid, maintenanceMode, maintenanceMessage, forceUpdateMessage, storeUrls }` — defaults safe (no force update, maintenance off) |

No change to existing Customer password/email uniqueness. Wishlist DB field left unused by mobile API.

---

## Endpoint plan

All under `/api/mobile/v1`. Skip implementing a thin wrapper only when an existing public route is already perfect **and** we document the app calling it directly. Prefer wrappers under `/mobile/v1` for a stable contract and error envelope — even if they call the same libs.

### Config & home

| Method | Path | Auth | Implementation notes |
|--------|------|------|----------------------|
| `GET` | `/config` | none | `minSupportedVersion` (ios/android), `maintenance`, contact/WhatsApp from `STORE_CONTACT` + Settings, delivery floors from `STORE_POLICY` (250/500), `codAvailable`, currency `PKR`. |
| `GET` | `/home` | none | Compose from existing homepage/banners/deals/best-sellers/car-catalog popular/settings flash end time — reuse server loaders where possible (`fetchHotDealsServer`, `fetchBestSellersServer`, `getHeroSlides`, etc.), not duplicate queries ad hoc. |

### Catalog (wrap existing serializers)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `GET` | `/categories` | none | Category tree (reuse `/api/categories/tree` logic). |
| `GET` | `/products` | none | Filters: `category`, `q`, `vehicle` (Vehicle slug → resolve make/model/years via Vehicle doc then existing product vehicle query), `minPrice`, `maxPrice`, `inStock`, `sort`, `page`, `limit` (max 100). |
| `GET` | `/products/:slug` | none | Full detail via existing product serialize. |
| `GET` | `/vehicles` | none | Makes → models/generations from car-catalog + Vehicle (same data as web selector). |

App may also call existing `/api/products/suggest` and `/api/blog/*` either via thin wrappers or documented passthrough — wrappers preferred for envelope consistency.

### Cart quote (new — critical)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `POST` | `/cart/quote` | none | Body: `{ items: [{ productId, variantId?, quantity, … }], city?, province?, couponCode?, paymentMethod? }`. |

**Server steps (reuse libs):**

1. Load products; validate active + stock (same rules as checkout).  
2. Price lines with `effectiveUnitPrice` (and variant/combination resolution shared with checkout — **extract shared function** from `checkout/route.js` if needed rather than copy-paste).  
3. Coupon via `computeCouponDiscount`.  
4. Shipping: `quoteShipping` + `applyShippingRules({ hasBulky })` so bulky floor **Rs.500** applies.  
5. **COD eligibility:** if `paymentMethod` is `cod` or omitted-as-cod default for quote flags, run `productAllowsCod` on lines. If blocked, return **400** with the **same message string checkout uses today**:

   > `Cash on Delivery is not available for: {names}. Choose advance payment instead.`

   Plus `error.code: "COD_NOT_AVAILABLE"` and optionally `codBlockedProductIds` / names for UI.  
6. Return validated line prices, stock warnings, subtotal, discount, shippingCost, total, `hasBulky`, advance preview fields if cheap to compute via `computeCodAdvanceDue` / `computeAdvancePaymentDiscount`.

**App rule:** show server `error.message` at cart level; do not invent a different body-kit string.

### Orders

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `POST` | `/orders` | optional Bearer | Create order. Requires header `Idempotency-Key`. Reuse checkout core (extract `createStoreOrder(input)` from current `POST /api/checkout` so web route becomes a thin adapter **with identical behavior**). Guest OK. |
| `GET` | `/orders/track` | none | Query: `orderNumber` + `phone`. Rate-limited. Generic errors. Minimal payload. |
| *(existing)* | `GET /api/tracking?trackingNumber=` | none | **Keep as-is**; app calls this for courier number. Document in contract; optional thin alias `GET /mobile/v1/tracking?trackingNumber=`. |
| *(existing)* | `GET /api/orders/[id]/public?t=` | none | App uses after checkout with saved `orderId` + `accessToken`. Optional alias under mobile. |

**Idempotency:** On `POST /orders`, look up key; if same key + same request hash → return stored response; if same key + different body → `409`; new key → process, store response, TTL 24h.

**`GET /orders/track` security:**

- Normalize phone with `normalizePkMobile`.  
- Find order by `orderNumber` + matching customer/shipping phone.  
- Rate limit (e.g. 10 / 15 min / IP).  
- Always generic failure: `"Order not found"` (no hint which field failed).  
- Return minimal: `orderNumber`, `orderStatus`, `paymentStatus`, `createdAt`, high-level timeline labels, courier/tracking number **if present**, **no** full address, **no** email, **no** item prices beyond optional item count/names if needed for UX — prefer status + tracking only.

### Auth (mobile)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `POST` | `/auth/register` | none | Same fields as web: `firstName`, `lastName`, `email`, `password`, `phone`. Same validation/bcrypt. Returns `{ customer, accessToken, refreshToken, expiresIn }` — **does not replace** web cookie register. |
| `POST` | `/auth/login` | none | Email + password. Rate-limited like web login. Returns tokens + customer. |
| `POST` | `/auth/refresh` | none | Body `{ refreshToken }`. Rotate. |
| `POST` | `/auth/logout` | Bearer or refresh body | Revoke refresh. |
| `GET` | `/me` | Bearer | Profile + addresses (reuse serialize). |
| `PATCH` | `/me` | Bearer | Update profile (map to existing profile update rules). |
| `DELETE` | `/me` | Bearer | **Account deletion:** soft-deactivate `isActive: false`, revoke all refresh tokens, clear push devices, anonymize PII fields as agreed (see open questions if any left). Orders retained for ops (standard ecommerce). Document exact behavior in store listing. |

**Web `/api/customer/*` left unchanged** (still cookie JWT only).

### Devices (push)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `POST` | `/devices` | Bearer preferred; allow guest with device-only token for pre-login? | **v1:** require Bearer after login; also allow unauthenticated register with `{ token, platform, appVersion }` storing `customerId: null`, then attach on login if same token. Simplest v1: **require auth**. Confirm at implementation if guest push needed — default **auth required**. |
| `DELETE` | `/devices` | Bearer | Body/query `token` — unregister. |

### Content

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `GET` | `/blogs` | none | Wrap blog list. |
| `GET` | `/blogs/:slug` | none | Wrap blog detail. |
| `GET` | `/pages/:slug` | none | Wrap pages. |
| `POST` | `/contact` | none | Wrap contact + rate limit. |

### Explicitly **out of scope** for this plan

- Wishlist GET/POST/DELETE and server merge  
- OTP / phone login  
- Changing web checkout UI  
- Widening CORS for browsers  
- Admin APIs  

---

## Checkout extraction (web behavior preserved)

Refactor plan (behavior-neutral):

1. Move order-creation body of `app/api/checkout/route.js` into e.g. `lib/checkout/createStoreOrder.js` exporting a pure-ish function returning `{ ok, status, body }` or throwing typed errors.  
2. Web `POST /api/checkout` calls it and returns the **exact same JSON** as today.  
3. Mobile `POST /orders` calls it, maps errors to mobile envelope, handles Idempotency-Key, accepts Bearer customer id when present.  

Regression check: web checkout success/error shapes and status codes unchanged (manual smoke + existing tests if any).

---

## Files expected to add/touch (when approved)

**Add (illustrative):**

```
storecraft-store/app/api/mobile/v1/config/route.js
storecraft-store/app/api/mobile/v1/home/route.js
storecraft-store/app/api/mobile/v1/categories/route.js
storecraft-store/app/api/mobile/v1/products/route.js
storecraft-store/app/api/mobile/v1/products/[slug]/route.js
storecraft-store/app/api/mobile/v1/vehicles/route.js
storecraft-store/app/api/mobile/v1/cart/quote/route.js
storecraft-store/app/api/mobile/v1/orders/route.js
storecraft-store/app/api/mobile/v1/orders/track/route.js
storecraft-store/app/api/mobile/v1/auth/register/route.js
storecraft-store/app/api/mobile/v1/auth/login/route.js
storecraft-store/app/api/mobile/v1/auth/refresh/route.js
storecraft-store/app/api/mobile/v1/auth/logout/route.js
storecraft-store/app/api/mobile/v1/me/route.js
storecraft-store/app/api/mobile/v1/devices/route.js
storecraft-store/app/api/mobile/v1/blogs/route.js
storecraft-store/app/api/mobile/v1/blogs/[slug]/route.js
storecraft-store/app/api/mobile/v1/pages/[slug]/route.js
storecraft-store/app/api/mobile/v1/contact/route.js
storecraft-store/lib/mobile/errors.js
storecraft-store/lib/mobile/auth.js
storecraft-store/lib/mobile/tokens.js
storecraft-store/lib/mobile/validate.js
storecraft-store/lib/mobile/idempotency.js
storecraft-store/lib/checkout/createStoreOrder.js   # extracted
storecraft-store/lib/models/CustomerRefreshToken.model.js
storecraft-store/lib/models/MobileDevice.model.js
storecraft-store/lib/models/IdempotencyKey.model.js
```

**Touch carefully:**

- `app/api/checkout/route.js` — thin wrapper only  
- `lib/customerAuthServer.js` or parallel mobile auth — dual Bearer+cookie for mobile routes  
- `lib/models/Settings.model.js` — optional `mobileApp` block  
- Storefront `README.md` — short “Mobile API” section  

**Do not touch:** storefront cart UI, wishlist pages, cookie login UI, admin app (except shared models if models live only in store — keep models in storecraft-store).

---

## App-side notes (not website code; for later phases)

- Persist after successful place-order: `orderId`, `accessToken`, `orderNumber` (SecureStore or encrypted prefs).  
- Deep-link / success screen: prefer local tokens → `GET /api/orders/:id/public?t=`.  
- Guest tracking: courier number **or** orderNumber+phone.  
- Cart: call `POST /cart/quote` when items/city/payment change; display COD block from `error.message`.  
- Wishlist: AsyncStorage only; remove Phase 5 sync/merge work.  
- Bundle ID: `pk.crazzycars.app`.

---

## Verification (after implementation, before merge)

1. `npm run build` (or project’s CI build) in `storecraft-store` succeeds.  
2. Manual smoke: web login/register/checkout still cookie-based and unchanged.  
3. Manual: mobile login returns tokens; `/me` with Bearer works; cookie `/api/customer/me` still works in browser.  
4. Quote with body kit + COD → `COD_NOT_AVAILABLE` + exact message.  
5. Quote with bulky item → shipping ≥ 500.  
6. Double `POST /orders` with same Idempotency-Key → one order.  
7. Track by orderNumber+wrong phone → generic not found.  
8. `DELETE /me` deactivates account; refresh fails.  
9. Update `crazzycars-mobile/docs/API_CONTRACT.md` with final mobile v1 shapes.

---

## README blurb (to add when coding)

Short section in `storecraft-store/README.md`:

- Base path `/api/mobile/v1`  
- Auth: Bearer access + refresh rotation  
- Web cookie auth unchanged  
- Point to this plan / contract  

---

## Implementation order (when approved)

1. Create branch `mobile-api`.  
2. Shared mobile helpers + models (errors, tokens, idempotency, devices).  
3. Extract `createStoreOrder` + keep web checkout green.  
4. Auth + `/me` (+ delete).  
5. `/cart/quote` + `/orders` + `/orders/track`.  
6. Catalog/home/config/content wrappers.  
7. Devices.  
8. Docs + build verify.  
9. **STOP** for your review before Phase 1 Expo scaffold (or continue if you say so).

---

## Risks

| Risk | Mitigation |
|------|------------|
| Checkout extraction regresses web | Thin adapter; no response shape changes; smoke test COD + stock + coupon |
| Refresh token theft | Hash at rest; rotate; reuse ⇒ revoke family |
| Dual auth bugs | Mobile routes use dual helper; web routes keep cookie path |
| Estimate vs quote mismatch | App uses only `/cart/quote` for money; web estimate APIs left alone |

---

## Approval gate

Reply **`approved`** to authorize implementation on branch `mobile-api` exactly as above.  
Any change to scope (e.g. guest push without login, separate JWT secret, anonymization details for `DELETE /me`) should be stated with that approval.
