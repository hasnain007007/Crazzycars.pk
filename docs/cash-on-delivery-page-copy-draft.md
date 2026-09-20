# Cash on Delivery page — full copy for review (NOT LIVE)

**URL:** `/cash-on-delivery`  
**Status:** Draft for approval only. Do not publish, do not wire `/faq` / footer / `llms.txt` / checkout links until you sign off.  
**Sources:** `getFaqItems()`, `store-policy.js` / `STORE_POLICY`, `getShippingPolicySections()`, `returnsPolicyCanonical()`, `codEligibility.js` (`isBodyKitProduct` / `BODY_KIT_RE`).  
**WhatsApp:** `03284010007` (from `STORE_CONTACT`).

---

## Proposed metadata (when published)

| Field | Value |
|-------|--------|
| Path | `/cash-on-delivery` |
| `metaTitle` base (DB / page) | `Cash on Delivery (COD) in Pakistan` |
| Absolute via `buildBrandedAbsoluteTitle` | `Cash on Delivery (COD) in Pakistan \| CrazzyCars.pk` (**50 chars** — fits ≤60) |
| `metaDescription` | `Cash on Delivery nationwide at CrazzyCars.pk. Pay delivery charges in advance, then pay for your car accessories when the parcel arrives. Body kits use JazzCash, Meezan, or bank transfer — not COD.` |

FAQPage JSON-LD on publish: COD + delivery charges + delivery time + returns + fitment (exact shared answers already on `/faq` / Batch 1).

---

## Page copy (H1 → CTAs)

### H1
Cash on Delivery across Pakistan

### Intro (under H1)
Yes — Cash on Delivery is available nationwide on eligible products. For COD orders, you pay delivery charges in advance after placing your order and send the payment screenshot on WhatsApp. The product amount is collected when your order arrives.

### How COD works on CrazzyCars

1. **Place your order** on CrazzyCars.pk and choose Cash on Delivery at checkout (when the product allows it).
2. **Pay delivery charges in advance** — the rest is Cash on Delivery. Please pay delivery charges in advance. The rest is Cash on Delivery.
3. **Send your payment screenshot on WhatsApp** to **03284010007** so we can confirm delivery charges and process the order.
4. **Receive your parcel** and pay the **product amount** to the courier on delivery.

### Delivery fees

Delivery is **Rs. 250** for regular items, or **Rs. 500** when the order includes bulky items (splitters, side skirts, spoilers, floor mats, etc.). Shipping is paid in advance; the rest is Cash on Delivery. There is no order-value waiver for delivery.

Roof or trunk spoilers and Express (Daewoo) use a different courier rate shown at checkout. Express Delivery (Daewoo), where available, is hidden for body kits and stays on standard delivery.

### Delivery times

Most orders ship within 1–2 business days after payment confirmation (or COD delivery-charge confirmation).

- **Lahore:** 2–3 business days (confirmed).
- **Other cities:** delivery time will be confirmed at checkout.

### What cannot use COD

**Body kits cannot be ordered on Cash on Delivery.**

If the product name or URL includes “body kit” / “body kits” (for example a complete body kit with front splitter, side skirts, and rear lip), checkout will not offer COD. Pay the full order with **JazzCash, Meezan, or bank transfer** instead, then send your payment screenshot on WhatsApp.

**Note:** LED “underbody” light kits are **not** body kits — those can still use COD when otherwise eligible.

Some high-value or merchant-flagged items may also require advance payment; checkout shows the available methods for that product.

### Returns under COD

Returns and refunds are accepted within **7 days** for items that arrive defective or if the wrong item was shipped. In these cases, you'll receive a full refund. For change-of-mind returns, we offer an exchange for a different product or size — cash refunds are not available for change-of-mind requests.

For Cash on Delivery orders, approved full refunds are typically paid by **bank transfer or JazzCash** after we inspect the returned item. Message WhatsApp **03284010007** or email **info@crazzycars.pk** with your order number, reason, and clear photos to start a claim. See our [Returns Policy](/returns-policy) for full details.

### FAQ (on-page + JSON-LD)

**Q: Do you offer Cash on Delivery (COD) in Pakistan?**  
A: Yes. Cash on Delivery is available nationwide. For COD orders, pay delivery charges in advance after placing your order and send the payment screenshot on WhatsApp. The product amount is collected when your order arrives.

**Q: How much are delivery charges?**  
A: Delivery is Rs. 250 for regular items, or Rs. 500 when the order includes bulky items (splitters, side skirts, spoilers, floor mats, etc.). Shipping is paid in advance; the rest is Cash on Delivery. There is no order-value waiver for delivery. Roof or trunk spoilers and Express (Daewoo) use a different courier rate shown at checkout.

**Q: How long does delivery take?**  
A: Most orders ship within 1–2 business days after payment confirmation (or COD delivery-charge confirmation). Lahore: 2–3 business days (confirmed). Other cities: delivery time will be confirmed at checkout.

**Q: What is your return or exchange policy?**  
A: Returns and refunds are accepted within 7 days for items that arrive defective or if the wrong item was shipped. In these cases, you'll receive a full refund. For change-of-mind returns, we offer an exchange for a different product or size — cash refunds are not available for change-of-mind requests. See our Returns Policy page to start a claim.

**Q: How do I know if a part fits my car?**  
A: Open the product page and check vehicle fitment (make/model/years). You can also shop by car under Shop by Vehicle. If you are unsure, message us on WhatsApp with your car year and model.

**Q: Can I use COD on a body kit?**  
A: No. Products whose name or URL identify them as a body kit cannot use Cash on Delivery. Use JazzCash, Meezan, or bank transfer for those orders. Underbody LED kits are not treated as body kits.

### CTAs (copy only — wiring after approval)

- **Shop car accessories** → `/shop`
- **WhatsApp us** → `03284010007`
- **Track your order** → `/track-order`

---

## Implementation notes (after your OK)

1. New route `storecraft-store/app/cash-on-delivery/page.jsx` (static copy + FAQ JSON-LD).
2. Then wire links from `/faq`, footer Help, checkout help, and `llms.txt` key pages — **separate small commit after copy approval**.
3. Live Googlebot/Bingbot curl for title, FAQPage nesting, and body-kit wording.
