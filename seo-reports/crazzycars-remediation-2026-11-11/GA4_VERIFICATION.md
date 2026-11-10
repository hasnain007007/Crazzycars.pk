# GA4_VERIFICATION

**Status:** **Present but unverified** (ecommerce E2E / realtime not confirmed).

## Live settings (read-only `/api/settings`, 2026-11-11)

| Item | Result |
| --- | --- |
| `seo.googleAnalyticsId` | **Present** — pattern `G-…` (masked in this report; value is public in page settings) |
| Google Tag Manager container | **NONE** in settings |
| Facebook Pixel | Present (separate from GA4) |
| Duplicate GTM + gtag | **No GTM** found — single GA path via settings |

## Implementation locations

| Piece | File |
| --- | --- |
| gtag bootstrap | `storecraft-store/components/store/AnalyticsScripts.jsx` — loads when `settings.seo.googleAnalyticsId` set |
| Helpers | `storecraft-store/lib/ga4.js` — currency **PKR**, no PII |
| `view_item` | `ProductDetailMedico.jsx` |
| `add_to_cart` | cart actions via `ga4AddToCart` |
| `begin_checkout` | `CheckoutView.jsx` |
| `purchase` | `CheckoutSuccessView.jsx` — once per order/session |

## Events present in code

- `view_item`, `add_to_cart`, `begin_checkout`, `purchase` (deduped)

## Events not found as dedicated helpers

- `view_item_list` / `select_item` / `remove_from_cart` / `view_cart` / `add_shipping_info` / `add_payment_info` / `refund`

## Verdict for preflight

| Classification | Applies? |
| --- | --- |
| Present and verified | No — no GA4 DebugView / purchase hit confirmed |
| **Present but unverified** | **Yes** |
| Missing | No |
| Blocked by access | Partial — Measurement ID readable via public settings; admin property ownership not verified |

**No new tracking installed this session.** Uncommitted `AnalyticsScripts.jsx` edits are excluded from RC.
