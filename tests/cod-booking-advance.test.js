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
import {
  isCodAdvanceUnpaid,
  assertCodAdvanceAllowsDispatch,
  assertCodAdvanceAllowsStatus,
} from "../storecraft-admin/lib/codAdvanceGate.js";

describe("checkout-money defaults", () => {
  it("prepaid 5% and COD booking floor 250 / policy v2", () => {
    assert.equal(PREPAID_DISCOUNT_PERCENT, 5);
    assert.equal(COD_ADVANCE_AMOUNT, 250);
    assert.equal(COD_ADVANCE_REQUIRED, true);
    assert.equal(COD_ADVANCE_POLICY_VERSION, 2);
  });
});

describe("computeCodAdvanceDue booking rule", () => {
  it("uses flat 250 when no product %", () => {
    const due = computeCodAdvanceDue({
      items: [{ name: "Mat", unitPrice: 2000, quantity: 1, advancePercentRequired: 0 }],
      paymentMethod: "cod",
      shippingCost: 500,
      orderTotal: 2500,
      bookingEnabled: true,
      bookingAmount: 250,
    });
    assert.equal(due.mode, "booking");
    assert.equal(due.amount, 250);
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
