/**
 * Prepaid quote totals must match createStoreOrder totals for every payment method.
 * Pure formula — mirrors freeDelivery.computeAdvancePaymentDiscount + order money math.
 * Does not import @/ modules (plain node:test).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PAKISTANI_PAYMENT_METHOD_KEYS } from "../storecraft-store/lib/pakistaniPaymentMethods.js";

function roundRupees(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

function isAdvancePaymentMethod(method) {
  const id = String(method || "cod").trim();
  if (!id || id.toLowerCase() === "cod") return false;
  if (id === "stripe" || id === "paypal") return false;
  return PAKISTANI_PAYMENT_METHOD_KEYS.includes(id);
}

/** Mirrors lib/freeDelivery.computeAdvancePaymentDiscount */
function computeAdvancePaymentDiscount({ amountAfterCoupon, paymentMethod, storePayment }) {
  const enabled = storePayment?.advancePaymentDiscountEnabled !== false;
  const percent = Math.min(
    100,
    Math.max(0, Number(storePayment?.advancePaymentDiscountPercent) || 3),
  );
  if (!enabled) return { discount: 0, percent: 0, applied: false };
  if (!isAdvancePaymentMethod(paymentMethod)) {
    return { discount: 0, percent, applied: false };
  }
  const base = Math.max(0, Number(amountAfterCoupon) || 0);
  const discount = roundRupees(base * (percent / 100));
  return { discount, percent, applied: discount > 0 };
}

/**
 * Mobile quote money (after this fix) — same sequence as createStoreOrder:
 * coupon → advance discount → shipping on afterDiscounts → total.
 */
function quoteTotal({ subtotal, couponDiscount, paymentMethod, storePayment, shippingCost }) {
  const afterCoupon = Math.max(0, roundRupees(subtotal - couponDiscount));
  const adv = computeAdvancePaymentDiscount({
    amountAfterCoupon: afterCoupon,
    paymentMethod,
    storePayment,
  });
  const afterDiscounts = Math.max(0, roundRupees(afterCoupon - adv.discount));
  return {
    afterCoupon,
    advancePaymentDiscount: adv.discount,
    advancePaymentDiscountPercent: adv.percent,
    advancePaymentDiscountLabel:
      adv.discount > 0 ? `Advance payment (${adv.percent}% off)` : "",
    afterDiscounts,
    total: Math.max(0, roundRupees(afterDiscounts + shippingCost)),
  };
}

/** createStoreOrder money: discount = coupon + advance; total = subtotal - discount + shipping */
function orderTotal({ subtotal, couponDiscount, paymentMethod, storePayment, shippingCost }) {
  const afterCoupon = Math.max(0, roundRupees(subtotal - couponDiscount));
  const adv = computeAdvancePaymentDiscount({
    amountAfterCoupon: afterCoupon,
    paymentMethod,
    storePayment,
  });
  const discount = Math.max(0, roundRupees(couponDiscount + adv.discount));
  return {
    advancePaymentDiscount: adv.discount,
    total: Math.max(0, roundRupees(subtotal - discount + shippingCost)),
  };
}

const STORE_5PCT = {
  advancePaymentDiscountEnabled: true,
  advancePaymentDiscountPercent: 5,
};

describe("mobile quote prepaid parity vs order total", () => {
  const cases = [
    { name: "body kit light ship", subtotal: 10999, coupon: 0, shipping: 500 },
    { name: "with coupon", subtotal: 10999, coupon: 200, shipping: 500 },
    { name: "regular COD ship", subtotal: 2499, coupon: 0, shipping: 250 },
    { name: "zero shipping edge", subtotal: 1000, coupon: 0, shipping: 0 },
  ];

  for (const paymentMethod of PAKISTANI_PAYMENT_METHOD_KEYS) {
    for (const c of cases) {
      it(`${paymentMethod}: quote.total === order.total (${c.name})`, () => {
        const q = quoteTotal({
          subtotal: c.subtotal,
          couponDiscount: c.coupon,
          paymentMethod,
          storePayment: STORE_5PCT,
          shippingCost: c.shipping,
        });
        const o = orderTotal({
          subtotal: c.subtotal,
          couponDiscount: c.coupon,
          paymentMethod,
          storePayment: STORE_5PCT,
          shippingCost: c.shipping,
        });
        assert.equal(q.total, o.total);
        assert.equal(q.advancePaymentDiscount, o.advancePaymentDiscount);
      });
    }
  }

  it("bankTransfer body-kit matches the reported 11499 → 10949 bug case", () => {
    // Before fix: quote total ignored 5% prepaid → 10999+500=11499
    // Order charged: 10999 - 550 + 500 = 10949
    const q = quoteTotal({
      subtotal: 10999,
      couponDiscount: 0,
      paymentMethod: "bankTransfer",
      storePayment: STORE_5PCT,
      shippingCost: 500,
    });
    assert.equal(q.advancePaymentDiscount, 550);
    assert.equal(q.advancePaymentDiscountLabel, "Advance payment (5% off)");
    assert.equal(q.total, 10949);
    assert.notEqual(q.total, 11499);
  });

  it("COD never applies prepaid discount", () => {
    const q = quoteTotal({
      subtotal: 10999,
      couponDiscount: 0,
      paymentMethod: "cod",
      storePayment: STORE_5PCT,
      shippingCost: 500,
    });
    assert.equal(q.advancePaymentDiscount, 0);
    assert.equal(q.advancePaymentDiscountLabel, "");
    assert.equal(q.total, 11499);
  });

  it("disabled advancePaymentDiscount leaves prepaid totals unchanged", () => {
    const q = quoteTotal({
      subtotal: 10999,
      couponDiscount: 0,
      paymentMethod: "bankTransfer",
      storePayment: {
        advancePaymentDiscountEnabled: false,
        advancePaymentDiscountPercent: 5,
      },
      shippingCost: 500,
    });
    assert.equal(q.advancePaymentDiscount, 0);
    assert.equal(q.total, 11499);
  });
});
