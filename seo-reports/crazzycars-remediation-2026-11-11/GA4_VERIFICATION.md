# GA4_VERIFICATION

**Status:** PARTIAL — code inventory complete; live Measurement ID not printed (settings DB).

## Implementation locations

| Piece | File |
| --- | --- |
| gtag bootstrap | `storecraft-store/components/store/AnalyticsScripts.jsx` — loads when `settings.seo.googleAnalyticsId` set |
| Helpers | `storecraft-store/lib/ga4.js` — currency **PKR**, no PII |
| view_item | `ProductDetailMedico.jsx` (once per product view) |
| add_to_cart | cart actions via `ga4AddToCart` |
| begin_checkout | `CheckoutView.jsx` |
| purchase | `CheckoutSuccessView.jsx` — once per order/session |

## Events present in code

- `view_item` — yes  
- `add_to_cart` — yes  
- `begin_checkout` — yes  
- `purchase` — yes (deduped)  

## Events not found as dedicated helpers

- `view_item_list` / `select_item`  
- `remove_from_cart` / `view_cart`  
- `add_shipping_info` / `add_payment_info`  
- `refund`  

## Safety notes

- Item IDs prefer `articleNo` / SKU.
- Purchase uses real order totals.
- Meta Pixel is separate (`lib/metaPixel.js`) — do not conflate with organic.

## BLOCKED for live property confirmation

Need read-only access to admin Settings → `seo.googleAnalyticsId` (or owner-provided Measurement ID) without committing secrets. Local `.env` is not authoritative for production GA4.
