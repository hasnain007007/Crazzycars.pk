import { test } from "node:test";
import assert from "node:assert/strict";

await import("./admin-alias-loader.mjs");
const { airbillFieldsFromOrder, buildStoreAirbillsPdf } = await import("../storecraft-admin/lib/runcourierLabelPdf.js");
const { buildPostexCreatePayload, parsePostexOrderDetail } = await import("../storecraft-admin/lib/postex.js");

const names = [
  "Universal 3-Piece Front Bumper Splitter Ground Style ABS",
  "Car Rear Bumper Splitter Cut Style Universal Lip",
  "Gloss Black Side Skirts ABS Plastic",
  "Universal Rear Diffuser Carbon Look 4 Fin",
  "Side Mirror Batman Covers Gloss Black Pair",
  "Universal Spoiler Wing Gloss Black",
  "Carbon Fiber Door Handle Panels Set of 4 for Corolla",
  "LED Footwell Ambient Light Kit RGB App Control",
];
const order = {
  orderNumber: "ORD-TEST-0430",
  courier: "Postex",
  shippingAddress: { name: "Test", phone: "03001234567", addressLine1: "House 9", city: "Islamabad" },
  items: names.map((name) => ({ name, quantity: 1 })),
};

test("airbill prints the booked PostEx shipment type (was always Normal)", async () => {
  assert.equal(airbillFieldsFromOrder(order, { trackingNumber: "T1", orderType: "Replacement" }).services, "Replacement");
  assert.equal(airbillFieldsFromOrder(order, { trackingNumber: "T1" }).services, "Normal");
  const built = await buildStoreAirbillsPdf([
    { fields: airbillFieldsFromOrder(order, { trackingNumber: "T1", orderType: "Replacement" }) },
  ]);
  assert.ok(built.success && built.pdf);
});

test("order details keep whole item names and say how many more", () => {
  const f = airbillFieldsFromOrder(order, { trackingNumber: "T1" });
  assert.equal(f.pieces, "8");
  assert.match(f.product, /\+\d more$/);
  const shown = (f.product.match(/1x /g) || []).length;
  const more = Number(f.product.match(/\+(\d) more$/)[1]);
  assert.equal(shown + more, 8);
  for (const part of f.product.replace(/ \+\d more$/, "").split(", ")) {
    assert.ok(names.includes(part.slice(3)), `cut item name: ${part}`);
  }
});

test("PostEx payload keeps the chosen type; track parser exposes PostEx orderType", () => {
  const p = buildPostexCreatePayload(order, { courier: {} }, { type: "Replacement" });
  assert.equal(p.orderType, "Replacement");
  assert.equal(buildPostexCreatePayload(order, { courier: {} }, { type: "bogus" }).orderType, "Normal");
  const t = parsePostexOrderDetail({ dist: { trackingNumber: "T1", orderType: "Replacement", transactionStatus: "Unbooked" } }, "T1");
  assert.equal(t.orderType, "Replacement");
});
