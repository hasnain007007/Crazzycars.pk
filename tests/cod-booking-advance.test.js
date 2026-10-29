/**
 * COD booking advance (policy v2) + unpaid gate.
 * Run: node --import ./tests/alias-loader.mjs --test tests/cod-booking-advance.test.js
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  PREPAID_DISCOUNT_PERCENT,
  COD_ADVANCE_AMOUNT,
  COD_ADVANCE_REQUIRED,
  COD_ADVANCE_POLICY_VERSION,
} from "../storecraft-store/config/checkout-money.js";
import { computeCodAdvanceDue } from "../storecraft-store/lib/productAdvance.js";
import { productAllowsCod } from "../storecraft-store/lib/codEligibility.js";
import {
  isCodAdvanceUnpaid,
  assertCodAdvanceAllowsDispatch,
  assertCodAdvanceAllowsStatus,
} from "../storecraft-admin/lib/codAdvanceGate.js";

describe("checkout-money defaults", () => {
  it("prepaid 4% and COD booking floor 300 / policy v2", () => {
    assert.equal(PREPAID_DISCOUNT_PERCENT, 4);
    assert.equal(COD_ADVANCE_AMOUNT, 300);
    assert.equal(COD_ADVANCE_REQUIRED, true);
    assert.equal(COD_ADVANCE_POLICY_VERSION, 2);
  });
});

describe("computeCodAdvanceDue booking rule", () => {
  it("uses the order-total tier when no product %", () => {
    const due = computeCodAdvanceDue({
      items: [{ name: "Mat", unitPrice: 2000, quantity: 1, advancePercentRequired: 0 }],
      paymentMethod: "cod",
      shippingCost: 500,
      orderTotal: 2500,
      bookingEnabled: true,
      bookingAmount: 250,
    });
    assert.equal(due.mode, "booking");
    assert.equal(due.amount, 300);
    assert.equal(due.policyVersion, 2);
  });

  it("uses max(flat, product %) capped at total", () => {
    const due = computeCodAdvanceDue({
      items: [{ name: "Kit", unitPrice: 5000, quantity: 1, advancePercentRequired: 40 }],
      paymentMethod: "cod",
      shippingCost: 250,
      orderTotal: 5250,
      bookingEnabled: true,
      bookingAmount: 250,
    });
    assert.equal(due.mode, "booking");
    assert.equal(due.amount, 2000);
    assert.equal(due.maxPercent, 40);
  });

  it("caps booking advance at order total", () => {
    const due = computeCodAdvanceDue({
      items: [{ name: "Cheap", unitPrice: 100, quantity: 1, advancePercentRequired: 0 }],
      paymentMethod: "cod",
      shippingCost: 0,
      orderTotal: 100,
      bookingEnabled: true,
      bookingAmount: 250,
    });
    assert.equal(due.amount, 100);
  });

  it("legacy mode when booking disabled (old behavior)", () => {
    const due = computeCodAdvanceDue({
      items: [{ name: "Mat", unitPrice: 2000, quantity: 1, advancePercentRequired: 0 }],
      paymentMethod: "cod",
      shippingCost: 500,
      bookingEnabled: false,
      advanceMessageEnabled: true,
    });
    assert.equal(due.mode, "delivery");
    assert.equal(due.amount, 500);
    assert.equal(due.policyVersion, 1);
  });

  it("non-COD has zero advance", () => {
    const due = computeCodAdvanceDue({
      items: [{ name: "Mat", unitPrice: 2000, quantity: 1, advancePercentRequired: 50 }],
      paymentMethod: "jazzcash",
      shippingCost: 250,
      bookingEnabled: true,
      bookingAmount: 250,
    });
    assert.equal(due.amount, 0);
    assert.equal(due.mode, "none");
  });
});

describe("codAdvanceGate", () => {
  it("blocks dispatch when advance unpaid", () => {
    const order = {
      paymentStatus: "unpaid",
      payment: { advanceRequired: 250, paidAmount: 0, amount: 5000 },
    };
    assert.equal(isCodAdvanceUnpaid(order), true);
    assert.equal(assertCodAdvanceAllowsDispatch(order).ok, false);
    assert.equal(assertCodAdvanceAllowsStatus(order, "processing").ok, false);
    assert.equal(assertCodAdvanceAllowsStatus(order, "confirmed").ok, true);
  });

  it("allows dispatch/status when admin overrides unpaid advance", () => {
    const order = {
      paymentStatus: "unpaid",
      payment: { advanceRequired: 250, paidAmount: 0, amount: 5000 },
    };
    const dispatch = assertCodAdvanceAllowsDispatch(order, { allowWithoutAdvance: true });
    assert.equal(dispatch.ok, true);
    assert.equal(dispatch.overridden, true);
    const status = assertCodAdvanceAllowsStatus(order, "shipped", { allowWithoutAdvance: true });
    assert.equal(status.ok, true);
    assert.equal(status.overridden, true);
  });

  it("allows when paidAmount covers advance (does not use payment.amount)", () => {
    const order = {
      paymentStatus: "partial",
      payment: { advanceRequired: 250, paidAmount: 250, amount: 5000 },
    };
    assert.equal(isCodAdvanceUnpaid(order), false);
    assert.equal(assertCodAdvanceAllowsDispatch(order).ok, true);

    const trap = {
      paymentStatus: "unpaid",
      payment: { advanceRequired: 250, amount: 5000 },
    };
    assert.equal(isCodAdvanceUnpaid(trap), true);
  });
});

describe("COD booking tiers by order total", () => {
  const due = (total) =>
    computeCodAdvanceDue({
      items: [{ name: "Item", unitPrice: total, quantity: 1, advancePercentRequired: 0 }],
      paymentMethod: "cod",
      shippingCost: 0,
      orderTotal: total,
      bookingEnabled: true,
      bookingAmount: 250,
    }).amount;

  it("under 5,000 → 300", () => {
    assert.equal(due(1200), 300);
    assert.equal(due(4999), 300);
  });
  it("5,000 to 10,000 inclusive → 600", () => {
    assert.equal(due(5000), 600);
    assert.equal(due(9999), 600);
    assert.equal(due(10000), 600);
  });
  it("over 10,000 → 1,000", () => {
    assert.equal(due(10001), 1000);
    assert.equal(due(48000), 1000);
  });
  it("prepaid orders need no booking advance", () => {
    const d = computeCodAdvanceDue({
      items: [{ name: "Item", unitPrice: 8000, quantity: 1 }],
      paymentMethod: "jazzcash",
      orderTotal: 8000,
    });
    assert.equal(d.amount, 0);
  });
  it("body-kit cart is COD-blocked (prepaid only; no booking advance on prepaid)", () => {
    const kit = {
      name: "Honda Civic X 2016-2021 Body Kit D1",
      slug: "honda-civic-x-2016-2021-body-kit-d1",
      unitPrice: 48000,
      quantity: 1,
    };
    assert.equal(productAllowsCod(kit), false);
    // Checkout forces prepaid when any line fails productAllowsCod — advance for COD path stays unused.
    const d = computeCodAdvanceDue({
      items: [kit],
      paymentMethod: "jazzcash",
      orderTotal: 48000,
      bookingEnabled: true,
    });
    assert.equal(d.amount, 0);
  });
});
