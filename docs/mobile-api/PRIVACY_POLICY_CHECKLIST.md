# Privacy policy checklist (app) — Phase 8

**Not legal advice.** This is an engineering checklist of topics the public privacy policy must cover so Play Data Safety / Apple labels stay consistent with `PRIVACY_INVENTORY.md` (mobile repo) and actual app behaviour.

## Which page is the privacy policy today?

| Item | Value |
|------|--------|
| Public URL | **`https://crazzycars.pk/privacy-policy`** |
| How it is served | CMS `pages` document with slug `privacy-policy`, rendered by the storefront `[slug]` product/CMS catch-all (footer link in `StoreFooterMedico.jsx` → `/privacy-policy`) |
| Seed / update script | `storecraft-store/scripts/seed-policy-pages.mjs` |

Update that CMS page (or replace via seed) when legal finishes copy. Related app-only deletion UX: **`/account-deletion`** (not a substitute for the privacy policy).

---

## Must-cover topics (from `PRIVACY_INVENTORY.md`)

Tick when the live privacy policy text addresses each:

- [ ] **Who we are** — Crazzycars.pk / operator contact (`info@crazzycars.pk`, WhatsApp)  
- [ ] **Data collected in the mobile app** — account (name, email, phone, password hash on server), checkout address, cart contents sent to API, garage/wishlist/recent search **on device**, pending offline checkout body on device, push token after consent, app version/platform with device register  
- [ ] **Auth tokens** — access/refresh JWTs; stored in SecureStore on device  
- [ ] **Guest orders** — local order id + access token on device for tracking  
- [ ] **What we do not collect in-app** — no card numbers, no precise location, no contacts/microphone/camera upload, no WebView password scraping  
- [ ] **Purposes** — fulfil orders, account, support, fraud prevention, optional push, optional crash reporting (Sentry)  
- [ ] **Sharing** — couriers, email provider, hosting; **server-side** Meta CAPI if enabled; no sale of personal data  
- [ ] **Analytics** — v1 app has no Meta/Firebase Analytics SDK; disclose if that changes  
- [ ] **Crash reporting** — Sentry only if DSN configured; PII scrubbing intent  
- [ ] **Retention** — orders/accounts; device tokens until unregister/logout; client caches  
- [ ] **Security** — HTTPS; SecureStore; Android backup disabled for app data  
- [ ] **Account deletion** — in-app Settings → Delete account; also `https://crazzycars.pk/account-deletion` and email requests  
- [ ] **Children** — not directed at children  
- [ ] **Contact for privacy requests** — email / contact form  
- [ ] **International / Pakistan** — processing location / hosting at a high level if legal requires  

## Consistency checks before store submit

1. Play Data Safety answers in `STORE_LISTING.md` match this policy + inventory.  
2. Apple privacy labels match.  
3. Account deletion URL works on production.  
4. Policy mentions the **app**, not website-only cookies alone.
