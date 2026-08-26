# Security audit — crazzycars.pk

**Scope:** `storecraft-store` (crazzycars.pk) and `storecraft-admin` (admin.crazzycars.pk)  
**Repo:** `https://github.com/hasnain007007/Crazzycars.pk.git` · branch `vps-test`  
**Method:** read-only code review + live **header** fetches. No login attempts, no production exploits, no destructive tests.  
**Date:** 27 Aug 2026  

**This pass applied only:** extra open-redirect guards (`://` / `\\`) and removal of the hardcoded seed password from source. Everything else waits for your prioritization.

---

## How to read this

| Severity | Meaning |
|---|---|
| **CRITICAL** | Actively exploitable with real customer/business impact. Fix first, with confirmation. |
| **HIGH** | Real vulnerability. Fix soon. |
| **MEDIUM** | Worth fixing; lower urgency. |
| **LOW** | Best-practice improvement, not a current customer-facing hole. |

---

## CRITICAL

### C1. PayPal capture can mark any order paid

**Where:** `storecraft-store/app/api/payment/paypal/capture-order/route.js`  
**Status:** confirmed in code. Not executed against production.

`POST /api/payment/paypal/capture-order` is **unauthenticated**. After PayPal reports `COMPLETED`, the handler `$set`s `paymentStatus: "paid"` on whatever `orderId` the client sent. It does **not** check:

- that PayPal `custom_id` / `invoice_id` matches `orderId`
- that captured amount equals `order.pricing.total`
- that the caller owns the order

`create-order` already writes `custom_id: oid` and charges `order.pricing.total`. Capture ignores both. Stripe’s mark-paid path **does** bind PaymentIntent metadata to the order — this PayPal path does not.

**Realistic abuse (description only):** complete a small PayPal payment, then send that PayPal order id together with a victim store order id. The victim COD/unpaid order is marked paid and moved to `processing`.

**Live caveat:** if PayPal `clientId`/`clientSecret` are empty, PayPal token fetch fails and the endpoint cannot complete a capture. The bug is still in the live code path and becomes fully weaponized the moment PayPal keys are saved. Checkout still accepts `paymentMethod: "paypal"`.

**Proposed fix:** after capture, load the store order; require `captureData.purchase_units[0].custom_id === orderId`; require captured amount == `order.pricing.total` (currency-aware); reject mismatch with 403; do not update on failure. Optionally require the order’s `payment.paypalOrderId` to match. Same binding Stripe already uses.

---

## HIGH

### H1. Admin APIs accept a storefront customer JWT

**Where:** `storecraft-admin/lib/auth.js` (`verifyToken`), `storecraft-admin/lib/getRequestUser.js`, `storecraft-admin/proxy.js`  
**Status:** confirmed in code.

Store and admin share `JWT_SECRET`. Store tokens include `type: "store_customer"`. Admin login tokens have **no** `type`. Admin verification checks signature only.

Cookies have different names (`customer_token` vs `admin_token`) and live on different hosts, so this is **not** automatic cross-subdomain leakage. A registered customer can still copy their own JWT (browser DevTools) and send it as `admin_token` to `admin.crazzycars.pk`. Missing `role` normalizes to **`viewer`**.

Viewer can already `GET` orders, customers, and settings (see H2). Combined with H2 this is payment-secret disclosure, not just a catalog peek.

**Proposed fix:** admin tokens `type: "admin"` (or `aud: "admin"`). Reject any other type in `verifyToken` / `getRequestUser` / `proxy.js`. Prefer a **separate** `ADMIN_JWT_SECRET`.

### H2. Settings GET returns payment secrets to any logged-in admin

**Where:** `storecraft-admin/app/api/settings/route.js` GET (auth only; no `canManageSettings`)  
**Schema:** `Settings.model.js` — `payment.stripe.secretKey`, `payment.stripe.webhookSecret`, `payment.paypal.clientSecret`. `sanitizeSettingsDocument` does **not** strip secrets.

Any valid admin JWT, including a viewer and a customer JWT from H1, receives the full settings document.

**Proposed fix:** GET settings requires `canManageSettings`, **or** redacts secret fields for everyone except owner. Never send `secretKey` / `clientSecret` / `webhookSecret` to the browser unless the settings form actually needs to edit them (prefer write-only “leave blank to keep”).

### H3. Cloudinary upload signature issued to any authenticated admin

**Where:** `storecraft-admin/app/api/upload-signature/route.js`  
**Status:** JWT required; **no** `canManageCatalog` / `canManageContent`.

Response includes Cloudinary `signature`, `timestamp`, `apiKey`, and `cloudName`. A viewer (or H1 customer JWT) can upload into the signed folder.

`POST /api/upload` is capability-gated (`canManageCatalog` | `canManageContent` | `canManageOrders`). The **signature** route is the weaker sibling.

**Proposed fix:** same capability check as `/api/upload`. Restrict signed folders.

### H4. Stored XSS on blog posts

**Where:** admin save `storecraft-admin/app/api/blog/route.js` (raw `String(body.content)`); render `storecraft-store/components/store/BlogPostView.jsx` (`dangerouslySetInnerHTML` with **no** `sanitize-html`).  
**Contrast:** product descriptions and CMS pages **are** sanitized on storefront render.

A compromised admin session, or anyone with `canManageContent`, can persist HTML that runs for every blog visitor. TipTap allows source-mode HTML, base64 images, links, YouTube.

**Proposed fix:** run the existing `sanitizePageHtml` / `sanitizeProductHtml` (or a blog-specific allowlist) on **save and render**. Disable or tightly gate source-mode HTML.

### H5. Default superadmin password was committed in git

**Where (before this pass):** `storecraft-admin/scripts/seed-admin.mjs`, `README.md` (present since commit `af77cc9`).  
**This pass:** removed from current source. Script now requires `ADMIN_SEED_PASSWORD` in `.env.local`. README no longer documents a password.

**Still true:** the old password string remains in **git history**. Anyone with repo access can recover it. History rewrite was **not** done (destructive; needs your explicit go-ahead).

**Owner must confirm (Cursor cannot login):**

1. `admin@crazzycars.pk` is **not** still using the old seed password.
2. `ceo@sms` is **not** still on the emergency temp password from the earlier density-verify incident (`docs/CLEAN-SYSTEM.md`). That string is **not** in the repo; whether production was rotated is **unconfirmed**.

If either account still uses a password that ever lived in git or in an agent transcript, treat it as compromised and rotate (human, in admin UI — Cursor will not rotate production passwords).

### H6. Next.js 16.2.4 High CVEs (do not blind-upgrade)

`npm audit --omit=dev` on both apps. Installed: `next@16.2.4`. Advisories include middleware/proxy bypasses, RSC XSS, cache poisoning, image-optimization DoS. `npm audit fix --force` would install `next@16.3.3` **outside the current range** and can break the Coolify build.

Also High (same audit): `nodemailer`, `nanoid`, `postcss`, `sharp` (store); plus `multer`, `js-cookie` (admin). Moderate: `mongoose` prototype pollution; admin `dompurify`.

**Proposed fix:** schedule a dedicated Next patch window with a staging build — do not `audit fix --force` on production tonight.

---

## MEDIUM

| ID | Finding | Where | Notes |
|---|---|---|---|
| M1 | Password-reset JWT is reusable until 1h expiry | `storecraft-store/app/api/customer/reset-password` | No `jti` / consume-on-use. |
| M2 | Admin-initiated customer reset can email the new password in plaintext | `storecraft-admin/app/api/customers/[id]/reset-password` | Send a timed link instead. |
| M3 | Logout only clears the cookie | store + admin logout routes | Stolen JWT works until expiry (30d remember-me). |
| M4 | Admin JWT `role` is not re-read from Mongo | `getRequestUser`, `auth/me` | Demotion/deactivation waits up to 30d. |
| M5 | Customer PII + spend on GET without `canManageCustomers` | `customers/[id]`, `customers/[id]/ledger` | Any logged-in admin, including viewer. |
| M6 | Invoice `unitCost` without `canViewProductCosts` | `invoices/[id]` GET | |
| M7 | Unescaped `$regex` on public blog/posts search | store `api/blog`, `api/posts` | ReDoS / regex injection. Products already use `escapeRegex()`. |
| M8 | Public draft leak | `GET /api/posts?status=draft` | Unauthenticated. Force `status: "published"`. |
| M9 | Coupon `usageLimit` is check-then-`$inc` | checkout + `couponCompute.js` | Two simultaneous checkouts can both redeem a single-use code. Use `{ usedCount: { $lt: limit } }` in the update filter. |
| M10 | Admin order/invoice stock is read-modify-write | admin `orders/route.js`, `invoices/route.js` | Race can oversell. Storefront checkout uses atomic `$inc` + `$gte`. |
| M11 | Combo rows with unset `stock` skip decrement | store checkout | Unlimited oversell on those combos. |
| M12 | Option-level stock checked but never decremented | store checkout | |
| M13 | Upload trusts client MIME; no server size cap | admin `api/upload` | Auth + capability required; Cloudinary in prod. |
| M14 | `MONGODB_URI` as Docker **build** ARG | both Dockerfiles | Runtime-only is safer. |
| M15 | Customer registration has no rate limit | `api/customer/register` | Login **is** limited (5 / 15 min / email+IP). |

---

## LOW

| ID | Finding | Notes |
|---|---|---|
| L1 | CSP is clickjacking-only | Live: `frame-ancestors 'self'; base-uri 'self'; object-src 'none'; upgrade-insecure-requests`. No `script-src`. |
| L2 | Admin logout cookie clear omits `secure` / `sameSite` | Login sets them. |
| L3 | `waActionToken` falls back to `JWT_SECRET` then `""` | Verify already fails if key is empty. Prefer fail-closed + dedicated `WA_ACTION_SECRET`. |
| L4 | Public `/api/health` | Store + admin; small fingerprint. |
| L5 | Admin has no IP allowlist | Separate subdomain + JWT + login rate limit. Expected; report only. |
| L6 | Residual `localStorage.getItem("authToken")` in some admin components | Cookie is httpOnly; leftover XSS surface if ever populated. |
| L7 | `canEditPricing` never checked server-side | Dead capability; catalog edits use `canManageCatalog`. |
| L8 | Featured-media PATCH spreads body | Mongoose schema limits impact. |
| L9 | `ShopifyProductView` renders unsanitized HTML | Only if that view is still routed. |
| L10 | Category coupons discount **full** cart subtotal | Generosity, not amount injection. |
| L11 | Customer password minimum is 6 characters | |
| L12 | Login rate limiter fails **open** on DB errors | By comment/design. |

---

## Confirmed OK (SEC0–SEC4)

| Check | Result |
|---|---|
| Open redirect (`/login?from=`, `/account/login?redirect=`) | **Already blocked** (`must start with /`, reject `//`). Extra reject of `://` and `\\` added this pass. External `https://evil.com` cannot be the post-login target. |
| Hardcoded `JWT_SECRET \|\| "default-secret"` | **Not present.** Login fails closed if unset. |
| Login brute-force | **Present** on store + admin login (5 failures / 15 minutes, email+IP). No separate account-lockout field. |
| Forgot-password user enumeration | **Mitigated** (always `success: true`). |
| Storefront order IDOR | **Mitigated** — queries include `customer.customerId`. Guest public route needs `publicAccessToken`. |
| Staff PATCHing `role: "owner"` | **Mitigated** — `canManageUsers` + `ASSIGNABLE_ROLES`; cannot self-promote. |
| Mass assignment on order/product/customer updates | **Mitigated** — allowlisted fields. Shipping address update cannot sneak `paymentStatus`. |
| Checkout price tampering | **Mitigated** — `effectiveUnitPrice()` from DB; client `unitPrice` / `shippingCost` / totals ignored. |
| Customer self-marking COD paid | **Mitigated** on Stripe PUT; no customer PATCH. PayPal capture is the exception (C1). |
| CORS `*` on auth/orders | **Not present.** Admin CORS is a single storefront origin. Store APIs send no CORS headers. |
| `.env` / `.env.local` in git | **Never committed.** Templates only. |
| Live security headers | HSTS (`max-age=63072000; includeSubDomains; preload`), `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, partial CSP — both `crazzycars.pk` and `admin.crazzycars.pk/login`. |
| Admin panel | `admin.crazzycars.pk` only. Storefront `/admin` is 404. Unauthenticated `/` → 307 `/login`. No IP allowlist. |

Cookie flags (login set): `httpOnly`, `sameSite=lax`, `secure` when `NODE_ENV === production`. Sessions expire (`30d` store; admin 30d remember-me or 1d). Logout is cookie-clear only (M3).

---

## Owner-only (cannot be closed in this repo)

1. **Confirm `ceo@sms` password** was changed after the density-verify incident. Cursor will not attempt that login.
2. **Confirm `admin@crazzycars.pk`** is not the old README seed password.
3. **Old Shopify admin** stray/unprocessed orders — still needs a human login on the legacy Shopify account. No credentials here.
4. Decide whether to **rewrite git history** to purge the old seed password (BFG / `git filter-repo`). Do not force-push `main`; `vps-test` rewrite would still need an explicit, informed decision.

---

## Proposed fix order (waiting on you)

1. **C1** PayPal capture binding (amount + `custom_id`).
2. **H1** Admin JWT `type` / separate secret.
3. **H2** Redact settings secrets; gate GET.
4. **H3** Capability-gate upload-signature.
5. **H4** Sanitize blog HTML on save and render.
6. **H5** Owner confirms password rotation; optional history purge.
7. **H6** Planned Next.js 16.3.x upgrade in a dedicated deploy.
8. Medium pack: consume-once reset tokens, coupon atomic usage, posts `status=published`, `escapeRegex` on blog search, atomic admin stock.

Do not treat anything in this list as done until it is patched **and** live-verified with `SOURCE_COMMIT`.
