# Payment details missing — investigation (read-only)

**Branch:** `fix/payment-details-1029`  
**Fingerprint:** `84143ac0cb2c3085`  
**GRANTED:** (none) — stop for **GO PAYMENT-DETAILS**

Account numbers / IBANs below are **last-4 only**. Full values are in live Mongo `settings` and were **not** printed here.

---

## 1. Where details are stored

| Location | Path / field |
|---|---|
| **Live Mongo (source of truth)** | DB `sialkot_motorsports` → collection `settings` (singleton) → `pakistaniPaymentMethods.{jazzcash,easypaisa,bankTransfer,meezan,hbl,ubl}` with `enabled`, `label`, `accountNumber`, `accountName`/`accountTitle`, `iban`, `bankName` |
| Model | `storecraft-store/lib/models/Settings.model.js` → `pakistaniPaymentMethods` |
| Defaults (empty) | `storecraft-store/lib/pakistaniPaymentMethods.js` → `DEFAULT_PAKISTANI_PAYMENT_METHODS` |
| Advance page (SSR) | `storecraft-store/app/advance-payment/page.jsx` → `loadAccounts()` → `buildStoreSettingsPayload` + `toPublicClientSettings({ includePaymentAccounts: true })` |
| Checkout (client) | `storecraft-store/components/store/CheckoutView.jsx` → `GET /api/settings?payments=1` then `pakistaniPaymentInstructions()` |
| Settings API | `storecraft-store/app/api/settings/route.js` (`payments=1` unlocks account fields; otherwise redacted) |
| Redaction helper | `storecraft-store/lib/normalizeStoreSettings.js` → `redactPakistaniPaymentAccounts` / `toPublicClientSettings` |
| Payload builder (crash site) | `storecraft-store/lib/normalizeStoreSettings.js` ~L398: `g.address?.trim()` |
| Email templates | `storecraft-store/lib/email.js` (reads same `pakistaniPaymentMethods`) |
| Policy copy / safety text | `storecraft-store/lib/storePolicyCopy.js` → `advancePaymentCopy().safety` (“Send payments only to the accounts on this page…”) |
| QR config (optional) | `storecraft-store/config/payment-qr` |
| Contact constants (not account numbers) | `storecraft-store/config/store-policy.js` → `STORE_CONTACT` |
| Admin seed/script (historical) | `scripts/move-meezan-payment-details.mjs` (moves Alfalah→Meezan; contains fallbacks — do not re-run blindly) |
| Env | **No** account numbers in env |

---

## 2. Live DB vs backups (masked)

### Live `sialkot_motorsports.settings` (still has numbers)

| Method | enabled | title / name | account last4 | IBAN last4 |
|---|---|---|---|---|
| JazzCash | true | Sialkot Motorsports | `****7799` (len 11) | empty |
| Easypaisa | true | (empty) | **empty** | empty |
| Bank Alfalah | true | Sialkot Motorsports | `****4815` (len 15) | `****4815` (len 24) |
| Meezan Bank | true | Hussnian Kamran | `****7081` (len 15) | `****7081` (len 24) |
| HBL / UBL | false | — | empty | empty |

Also live: `storePayment.flatDeliveryCharge=250`, `advancePaymentAmount=250`, prepaid discount **2%** on, `general.storeName=Sialkot Motorsports`, phone/WhatsApp last4 `0007`.

### `general.address` (the break)

Live and Oct 28 archives: **`{ "city": "Gujranwala" }` (object)**.  
Schema expects a **string**. `buildStoreSettingsPayload` calls `.trim()` → **`TypeError: $.address?.trim is not a function`**.

### Archives checked (settings-only restore to scratch, then dropped)

| Source | address | Jazz last4 | Alfalah last4 | Meezan last4 | Easypaisa |
|---|---|---|---|---|---|
| `/data/crazzycars-mongo-backups/nightly/sialkot-20261028T222002Z.archive` | object `{city}` | 7799 | 4815 | 7081 | empty |
| `/data/crazzycars/mongo/finish-granted-20261028T221900Z.archive` | same | 7799 | 4815 | 7081 | empty |
| `/data/crazzycars-mongo-backups/db-finish-r4-…/sialkot_motorsports.archive.gz` | same | (same pattern) | | | empty |
| `/data/crazzycars/mongo/sialkot_motorsports.archive` | not a valid mongodump archive (gzip of other format) | — | — | — | — |

### `crazzycars_local_real` (Mac docker `crazzycars-mongo-local-verify`)

- `general.address` = **string** `"Gujranwala, Punjab, Pakistan"`
- JazzCash / Alfalah / Meezan: **disabled, no account numbers**
- Prepaid discount: **5%** (live is 2%)
- **Not** a source for restoring account numbers

### How they “disappeared”

**Payment fields were not wiped.** Display broke because:

1. `settings.general.address` is an object (present in live + all Oct 28 dumps checked).
2. `buildStoreSettingsPayload` assumes a string and throws on `.trim()`.
3. `/advance-payment` catches that in `loadAccounts()` → renders empty list + muted “shown at checkout…”.
4. Safety copy still says “Send payments only to the accounts **on this page**” → contradiction.
5. Checkout loads accounts via `/api/settings?payments=1`, which returns **500** with the same error → client never gets numbers (layout settings redact them by design since audit/redact work).

No evidence of a payment-field rollback in Oct 28 dumps. Earliest VPS dumps available for this check are **2026-10-28**; object address already present then. `crazzycars_local_real` has healthy string address but empty payment methods.

**Easypaisa account number:** empty in live and every archive checked — **do not invent**. Confirm with owner before any `$set`.

---

## 3. Restore plan (after GO PAYMENT-DETAILS)

1. Fresh `mongodump` of `sialkot_motorsports` → archive under `/data/crazzycars/mongo/`; scratch `mongorestore` smoke test; keep dump.
2. **Code (required):** harden `buildStoreSettingsPayload` so `general.address` object/null never throws (coerce to string / use `addressLocality`). Fix advance-payment empty-state copy so it does not claim “accounts on this page” when `accounts.length === 0`.
3. **DB `$set` (field-level, only after GO):**
   - `general.address` → string `"Gujranwala, Punjab, Pakistan"` (matches admin sanitize canonical; live object is the bug).
   - Optionally brand titles: JazzCash `accountName` / Alfalah `accountTitle` `Sialkot Motorsports` → `CrazzyCars.pk` (or leave for BRAND-TEXT token).
   - **Do not** `$set` accountNumber/iban unless a last4 mismatch is found after verify — live already has 7799 / 4815 / 7081.
   - Easypaisa: **skip** unless you supply the number.
4. Deploy store image; purge/wait cache (`revalidate=60`).
5. Verify live (no order):
   - `/advance-payment` SSR HTML contains Account title / number / IBAN text (not only JS).
   - `GET /api/settings?payments=1` → 200 with methods (chat/logs: last4 only).
   - Checkout payment step shows lines after choosing JazzCash / Alfalah / Meezan.

---

## 4. Page + checkout wording

| Place | Current | Fix |
|---|---|---|
| Empty accounts branch | “Account details are shown at checkout…” | OK as fallback **only if** accounts empty |
| `c.safety` always | “Send payments only to the accounts **on this page**” | After accounts load: keep; if empty: point to checkout / WhatsApp — no false claim |
| Checkout | Instructions omit numbers when API 500 | Fixed by address coerce + API 200 |

---

## 5. Other settings since ~Oct 10 (live vs newest known)

| setting | live value | newest known | source |
|---|---|---|---|
| JazzCash account | enabled, last4 `7799`, title Sialkot Motorsports | same last4 | live = Oct 28 dumps |
| Alfalah account | enabled, last4 `4815`, IBAN last4 `4815` | same | live = Oct 28 dumps |
| Meezan account | enabled, last4 `7081`, title Hussnian Kamran | same | live = Oct 28 dumps |
| Easypaisa account | enabled, **empty number** | empty | live + Oct 28 dumps + local_real |
| `general.address` | object `{city:Gujranwala}` **(broken)** | string on local_real | local_real / sanitize canonical string |
| `general.storeName` | Sialkot Motorsports | Crazzycars.pk | local_real |
| Delivery flat | 250 | 250 | live = local_real = policy |
| COD booking advance | 250 | 250 | live = local_real |
| Prepaid discount % | **2** | **5** | local_real newer intent? confirm |
| Phone / WhatsApp | last4 `0007` | last4 `0007` | live ≈ STORE_CONTACT |
| Announcement bar | enabled, **empty text** | enabled empty | live |
| Footer text | empty | empty | live |
| Coupons | 0 docs | 0 | live + local_real |
| Social `sameAs` | undefined | — | live |
| Policy HTML in settings | shipping/return/privacy flags false / about empty | copy mostly from `storePolicyCopy.js` code | code vs DB |

---

## Tokens

Reply **`GO PAYMENT-DETAILS`** to apply code harden + address `$set` + verify.  
Do **not** invent Easypaisa. Brand title rename can ride along or wait for **BRAND-TEXT**.
