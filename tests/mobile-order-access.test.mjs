/**
 * IDOR / ownership checks for mobile order detail + list filter.
 * Same generic failure for wrong Bearer, wrong guest token, and no auth.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
register(pathToFileURL(path.join(__dirname, "../scripts/ab-checkout/alias-loader.mjs")).href);

const { canAccessMobileOrder, ownOrdersFilter } = await import(
  "../storecraft-store/lib/mobile/orderAccess.js"
);
const { serializeMobileOrderItem, serializeMobileOrderDetail } = await import(
  "../storecraft-store/lib/mobile/serializeMobileOrder.js"
);

const ORDER_A = {
  _id: "aaaaaaaaaaaaaaaaaaaaaaaa",
  orderNumber: "ORD-2026-00001",
  publicAccessToken: "token-for-order-a",
  customer: { customerId: "customer-a-id" },
  orderStatus: "pending",
  paymentStatus: "unpaid",
  paymentMethod: "cod",
  pricing: { subtotal: 1000, discount: 0, shippingCost: 250, total: 1250 },
  payment: { advanceRequired: 250, remainingCod: 1000 },
  items: [
    {
      productId: "bbbbbbbbbbbbbbbbbbbbbbbb",
      slug: "side-mirror",
      variantId: "cccccccccccccccccccccccc",
      name: "Side Mirror",
      quantity: 1,
      unitPrice: 1000,
      total: 1000,
      image: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
      variation: "Black / Left",
      selectedVariation: { label: "Black / Left", id: "cccccccccccccccccccccccc" },
    },
  ],
  timeline: [],
  shippingAddress: { city: "Lahore", state: "Punjab" },
  createdAt: new Date("2026-10-01T00:00:00.000Z"),
};

const ORDER_B = {
  ...ORDER_A,
  _id: "dddddddddddddddddddddddd",
  orderNumber: "ORD-2026-00002",
  publicAccessToken: "token-for-order-b",
  customer: { customerId: "customer-b-id" },
};

describe("canAccessMobileOrder IDOR", () => {
  it("owner Bearer can access own order", () => {
    assert.equal(canAccessMobileOrder(ORDER_A, { customerId: "customer-a-id" }), true);
  });

  it("(1) user B Bearer on user A order → denied", () => {
    assert.equal(canAccessMobileOrder(ORDER_A, { customerId: "customer-b-id" }), false);
  });

  it("(2) guest token for order A used on order B → denied", () => {
    assert.equal(
      canAccessMobileOrder(ORDER_B, { guestToken: "token-for-order-a" }),
      false
    );
  });

  it("(3) no auth and no token → denied", () => {
    assert.equal(canAccessMobileOrder(ORDER_A, {}), false);
    assert.equal(canAccessMobileOrder(ORDER_A, { guestToken: "", customerId: null }), false);
  });

  it("wrong token and missing order both fail closed (same boolean as nonexistent)", () => {
    assert.equal(canAccessMobileOrder(null, { guestToken: "token-for-order-a" }), false);
    assert.equal(canAccessMobileOrder(ORDER_A, { guestToken: "wrong-token" }), false);
    assert.equal(canAccessMobileOrder(null, { customerId: "customer-a-id" }), false);
  });

  it("correct guest token on matching order → allowed", () => {
    assert.equal(canAccessMobileOrder(ORDER_A, { guestToken: "token-for-order-a" }), true);
  });
});

describe("ownOrdersFilter", () => {
  it("scopes list to Bearer customerId only", () => {
    assert.deepEqual(ownOrdersFilter("customer-a-id"), {
      "customer.customerId": "customer-a-id",
    });
  });
});

describe("serializeMobileOrderItem", () => {
  it("includes productId, slug, variantId, variationLabel, image", () => {
    const item = serializeMobileOrderItem(ORDER_A.items[0]);
    assert.equal(item.productId, "bbbbbbbbbbbbbbbbbbbbbbbb");
    assert.equal(item.slug, "side-mirror");
    assert.equal(item.variantId, "cccccccccccccccccccccccc");
    assert.equal(item.variationLabel, "Black / Left");
    assert.ok(item.image.includes("cloudinary"));
  });

  it("detail payload uses ORD-YYYY-NNNNN style orderNumber and item fields", () => {
    const detail = serializeMobileOrderDetail(ORDER_A, {
      whatsapp: { number: "03284010007" },
      pakistaniPaymentMethods: { cod: { enabled: true, label: "Cash on Delivery" } },
      storePayment: { advancePaymentMessageEnabled: true, advancePaymentAmount: 250 },
    });
    assert.equal(detail.orderNumber, "ORD-2026-00001");
    assert.equal(detail.items[0].slug, "side-mirror");
    assert.equal(detail.items[0].variantId, "cccccccccccccccccccccccc");
    assert.equal(detail.items[0].image.length > 0, true);
  });
});
