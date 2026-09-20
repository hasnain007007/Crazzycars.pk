# Cash on Delivery landing — outline only (Phase 4)

**URL (proposed):** `/cash-on-delivery`  
**Status:** Outline approved. **Do not publish full page copy** until a separate written-content review.

## Sections (copy sources — draft later)

1. **Hero** — “Cash on Delivery across Pakistan” + short line from `getFaqItems` COD answer.
2. **How COD works on CrazzyCars** (steps): place order → pay **delivery charges in advance** → send screenshot on WhatsApp (`03284010007`) → receive parcel → pay product amount to courier. Source: `shippingAdvanceBannerEn()` + COD FAQ.
3. **Delivery fees (factual)** — Rs. 250 regular / Rs. 500 bulky carts; no order-value free shipping (`STORE_POLICY.shipping`). Bulky = fee mechanic, not a merchandising pitch.
4. **ETAs** — Lahore 2–3 business days; other cities confirmed at checkout.
5. **What cannot use COD** — reuse body-kit COD restriction language already in `storePolicyCopy` (body kits → JazzCash/Meezan/bank).
6. **Returns under COD** — refunds for defective/wrong item typically JazzCash/bank after inspection (`returnsPolicyCanonical`).
7. **FAQ block** — embed same FAQPage subset (COD, fees, returns, fitment).
8. **CTA** — Shop / WhatsApp / Track Order.

## SEO (when built)

- `metaTitle` e.g. `Cash on Delivery (COD) in Pakistan | CrazzyCars` ≤60 (via `buildBrandedAbsoluteTitle`)
- meta from COD FAQ sentence
- Internal links: from `/faq`, checkout help, `llms.txt`, footer Help — **after** page exists

## Not in this pass

- No route, no page component, no footer link, no `llms.txt` key-page link until content is reviewed and approved.
