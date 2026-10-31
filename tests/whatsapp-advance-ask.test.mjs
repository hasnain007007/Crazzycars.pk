import { test } from "node:test";
import assert from "node:assert/strict";
// Admin lib: resolve `@/` to storecraft-admin first (registered last → runs first).
await import("./admin-alias-loader.mjs");
const {
  buildAdvanceDeliveryAsk,
  buildWhatsAppMessage,
  findUnfilledPlaceholders,
  getCustomerOrderWhatsAppMessage,
} = await import("../storecraft-admin/lib/whatsappTemplates.js");

const template = "Hi {customerName}\n\n*Total:* Rs. {total}\n\n{advanceDeliveryAsk}\n\nYou can also reply: CONFIRM";
const settings = { whatsappTemplates: { customerOrderConfirmation: { enabled: true, template } } };
const base = {
  orderNumber: "ORD-2026-00577",
  paymentMethod: "cod",
  paymentStatus: "unpaid",
  pricing: { total: 4749 },
  shippingAddress: { name: "Ali", city: "Lahore" },
  items: [],
};

test("COD order with an unpaid Rs 300 booking advance asks for it with the amount", () => {
  const o = { ...base, payment: { paidAmount: 0, advanceRequired: 300, advanceMode: "booking" } };
  const ask = buildAdvanceDeliveryAsk(o);
  assert.match(ask, /Rs\. 300/);
  assert.match(ask, /Rs\. 4,449\* on delivery/);
  const msg = getCustomerOrderWhatsAppMessage(o, settings, { confirmUrl: "c", cancelUrl: "x", confirmOrderUrl: "c", cancelOrderUrl: "x" });
  assert.deepEqual(findUnfilledPlaceholders(msg), []);
});

test("no advance due → the line disappears with no blank gap or braces", () => {
  const paidAdvance = { ...base, paymentStatus: "partial", payment: { paidAmount: 300, advanceRequired: 300 } };
  assert.equal(buildAdvanceDeliveryAsk(paidAdvance), "");
  const msg = buildWhatsAppMessage(template, { customerName: "Ali", total: "4,749", advanceDeliveryAsk: "" });
  assert.equal(msg, "Hi Ali\n\n*Total:* Rs. 4,749\n\nYou can also reply: CONFIRM");
  assert.equal(buildAdvanceDeliveryAsk({ ...base, paymentStatus: "paid" }), "");
});

test("prepaid order still unpaid asks for the full amount", () => {
  assert.match(buildAdvanceDeliveryAsk({ ...base, paymentMethod: "bankTransfer" }), /Prepaid order.*Rs\. 4,749/);
});

test("unknown placeholders are reported", () => {
  assert.deepEqual(findUnfilledPlaceholders("Hi {customerName} {foo} {foo}"), ["{customerName}", "{foo}"]);
  assert.deepEqual(findUnfilledPlaceholders("price {"), []);
});
