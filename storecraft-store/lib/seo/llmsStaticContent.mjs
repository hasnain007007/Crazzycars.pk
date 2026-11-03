/**
 * Static sections for /llms.txt (mirrors content/llms-static.md).
 * Fees come from STORE_POLICY — never hardcode Rs 250/500 here (prebuild guard).
 */
import { STORE_POLICY } from "../../config/store-policy.js";

export function buildLlmsStaticMd() {
  const std = Number(STORE_POLICY.shipping.standardFeePKR);
  const bulky = Number(STORE_POLICY.shipping.bulkyFeePKR || 500);
  return `# CrazzyCars.pk

> Online car accessories store based in Gujranwala, Pakistan. Sells exterior styling (body kits, spoilers, splitters, mirror covers), interior trims, floor mats, LED lighting and accessories for Pakistani-market cars. Prices in PKR. Ships only within Pakistan.

## Store facts

- Founded: 2023 in Gujranwala
- Delivery: Rs ${std} per order, or Rs ${bulky} if the order has bulky items
- COD on eligible items with a Rs 300 / Rs 600 / Rs 1,000 booking advance (by order value), deducted from the COD total
- Body kits are prepaid only (JazzCash, Meezan, bank transfer)
- Returns: defective or wrong item within the published returns window

## Quick answers

- Fitment: use the vehicle compatibility table on each product page
- Contact: WhatsApp 03284010007
- Shop by car: /cars · Categories: /categories · COD: /cash-on-delivery

## Key pages

- [Shop all]({{SITE}}/shop)
- [Shop by vehicle]({{SITE}}/cars)
- [Categories]({{SITE}}/categories)
- [Cash on Delivery]({{SITE}}/cash-on-delivery)
- [FAQ]({{SITE}}/faq)
- [Contact]({{SITE}}/contact)
- [Returns]({{SITE}}/returns-policy)
- [Shipping]({{SITE}}/shipping-policy)
`;
}

/** @deprecated use buildLlmsStaticMd() */
export const LLMS_STATIC_MD = buildLlmsStaticMd();
