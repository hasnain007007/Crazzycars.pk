# Open questions — CrazzyCars mobile

---

## Confirmed (2026-10-04)

| # | Topic | Decision |
|---|-------|----------|
| 1 | Bundle / package ID | **`pk.crazzycars.app`** confirmed |
| 2 | API approach | Versioned `/api/mobile/v1/*` on branch **`mobile-api`**. Bearer **added alongside** cookie auth (web unchanged). Rotating refresh tokens hashed in Mongo. Reuse checkout/shipping/pricing. Idempotency keys + TTL. Account deletion + push devices. **Plan written; wait for "approved" before code.** |
| 3 | Tracking | **Both:** existing courier tracking number **and** new orderNumber+phone (rate-limited, generic errors, minimal data). App also saves `orderId` + `accessToken` locally after checkout. |
| 4 | Login | **Email + password** (same web accounts). Phone required at checkout. **No OTP in v1.** |
| 5 | Wishlist | **Local-only for v1.** No wishlist API; no server-merge in Phase 5. |
| Extra | Body-kit COD | Surface at cart via `/cart/quote` using **server message** (same as checkout). |

Also confirmed from code (unchanged):

- Contact / WhatsApp: `03284010007`  
- Email: `info@crazzycars.pk`  
- Delivery floors: Rs.250 / Rs.500 bulky; no free-shipping threshold  
- Currency: PKR `Rs.` whole rupees  

---

## Still open (can answer with Phase 0.5 approval or later)

1. **`DELETE /me` anonymization** — Soft-deactivate + revoke tokens + clear devices is planned. Confirm whether to blank email/phone/addresses or keep email hashed/retained for order history linkage.  
2. **Push before login** — Plan default: device register **requires Bearer**. Need guest/pre-login push?  
3. **JWT secret** — Reuse `JWT_SECRET` vs new `MOBILE_JWT_SECRET`.  
4. **Production API base** — Assume `https://crazzycars.pk` for `EXPO_PUBLIC_API_BASE_URL`.  
5. **Sentry / Meta / Firebase** timing and who provides credentials/files.  
6. **Final app icon / splash** vs placeholders from `storecraft-store/public/`.  
7. **Associated domains** — when to host `assetlinks.json` / `apple-app-site-association`.  
8. **Minimum order** — Settings value currently UI-only on web; enforce in mobile `/orders`?  
9. **v1 payment methods** — COD + any methods enabled in Settings, or COD-only UI regardless?
