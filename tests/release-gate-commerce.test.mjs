/**
 * Release-gate commerce fixtures — no live orders / payments.
 * Covers cart updates, variants, shipping, COD advance, prepaid discount, totals.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { normalizeCartItems, cartTotals } from "../storecraft-store/lib/abandonedCart.js";
import { cartShippingFeePkr, getShippingRate } from "../storecraft-store/lib/shippingFee.js";
import {
  COD_ADVANCE_TIERS,
  PREPAID_DISCOUNT_PERCENT,
  codBookingAmountForTotal,
} from "../storecraft-store/config/checkout-money.js";
import { computeCodAdvanceDue } from "../storecraft-store/lib/productAdvance.js";
import { productAllowsCod, isBodyKitProduct } from "../storecraft-store/lib/codEligibility.js";
import { PAKISTANI_PAYMENT_METHOD_KEYS } from "../storecraft-store/lib/pakistaniPaymentMethods.js";
import {
  rejectTitleModelConflicts,
  detectTitleModelConflict,
} from "../storecraft-store/lib/fitment/modelConflict.js";
import { rejectClearCategoryMisfits } from "../storecraft-store/lib/fitment/categoryMembership.js";
import { resolveDeletedPath } from "../storecraft-store/lib/deletedUrlRedirects.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

function prepaidDiscount(amountAfterCoupon, paymentMethod, percent = PREPAID_DISCOUNT_PERCENT) {
  if (!isAdvancePaymentMethod(paymentMethod)) return 0;
  return roundRupees(Math.max(0, amountAfterCoupon) * (percent / 100));
}

function orderGrandTotal({ subtotal, couponDiscount = 0, paymentMethod = "cod", shippingCost }) {
  const afterCoupon = Math.max(0, roundRupees(subtotal - couponDiscount));
  const adv = prepaidDiscount(afterCoupon, paymentMethod);
  return Math.max(0, roundRupees(afterCoupon - adv + shippingCost));
}

/** Pure variant price pick — selected variant/combo wins; else base sale/price. */
function pickVariantUnitPrice(product, { variantId, matchedCombination } = {}) {
  if (matchedCombination?.price != null) return Number(matchedCombination.price) || 0;
  if (variantId) {
    const hit = (product?.variants || []).find((v) => String(v._id) === String(variantId));
    if (hit && hit.price != null) return Number(hit.price) || 0;
  }
  return Number(product?.salePrice ?? product?.price) || 0;
}

describe("release gate — cart + variants", () => {
  it("normalizes add-to-cart payload and updates qty/subtotal", () => {
    const items = normalizeCartItems([
      { productId: "p1", name: "Key Cover", unitPrice: 1499, quantity: 1 },
      { productId: "p2", name: "Mats", price: 4999, quantity: 2, variantId: "v1", variationLabel: "Black" },
    ]);
    assert.equal(items.length, 2);
    assert.equal(items[1].variantId, "v1");
    assert.equal(items[1].variationLabel, "Black");
    assert.deepEqual(cartTotals(items), { itemCount: 3, subtotal: 1499 + 4999 * 2 });

    const bumped = normalizeCartItems([{ ...items[0], quantity: 3 }, items[1]]);
    assert.deepEqual(cartTotals(bumped), { itemCount: 5, subtotal: 1499 * 3 + 4999 * 2 });
  });

  it("selects variant / combination unit prices before cart total", () => {
    const product = {
      price: 2000,
      salePrice: 1800,
      variants: [{ _id: "var-red", price: 2100 }],
      variationCombinations: [{ id: "combo-neon", price: 8500 }],
    };
    assert.equal(pickVariantUnitPrice(product, { variantId: "var-red" }), 2100);
    assert.equal(pickVariantUnitPrice(product, { matchedCombination: { price: 8500 } }), 8500);
    assert.equal(pickVariantUnitPrice(product, {}), 1800);

    const line = normalizeCartItems([
      {
        productId: "mirror",
        name: "Side Mirror",
        unitPrice: pickVariantUnitPrice(product, { matchedCombination: { price: 8500 } }),
        quantity: 1,
        matchedCombination: { price: 8500 },
      },
    ]);
    assert.equal(cartTotals(line).subtotal, 8500);
  });
});

describe("release gate — shipping / COD / discount / totals", () => {
  it("shipping: standard 250, bulky/body-kit 500", () => {
    assert.equal(getShippingRate({ name: "Key Cover" }), 250);
    assert.equal(getShippingRate({ name: "Full Body Kit Fibreglass", isBulky: true }), 500);
    assert.equal(
      cartShippingFeePkr([{ name: "Key Cover" }, { name: "RS Body Kit Fibreglass" }]),
      500
    );
  });

  it("COD advance tiers 300 / 600 / 1000 by order total", () => {
    assert.equal(codBookingAmountForTotal(2499), 300);
    assert.equal(codBookingAmountForTotal(5000), 600);
    assert.equal(codBookingAmountForTotal(9999), 600);
    assert.equal(codBookingAmountForTotal(10000), 1000);
    assert.equal(COD_ADVANCE_TIERS.length, 3);
  });

  it("computeCodAdvanceDue booking rule uses tier and product % max", () => {
    const low = computeCodAdvanceDue({
      items: [{ name: "Trim", unitPrice: 2000, quantity: 1 }],
      paymentMethod: "cod",
      shippingCost: 250,
      orderTotal: 2250,
      bookingEnabled: true,
    });
    assert.equal(low.amount, 300);

    const pct = computeCodAdvanceDue({
      items: [{ name: "Kit", unitPrice: 5000, quantity: 1, advancePercentRequired: 40 }],
      paymentMethod: "cod",
      shippingCost: 250,
      orderTotal: 5250,
      bookingEnabled: true,
    });
    assert.equal(pct.amount, 2000);
  });

  it("body kits block COD", () => {
    assert.equal(isBodyKitProduct({ name: "Swift RS Body Kit" }), true);
    assert.equal(productAllowsCod({ name: "Swift RS Body Kit", codEnabled: true }), false);
  });

  it("prepaid 4% discount + order total (COD vs JazzCash)", () => {
    const subtotal = 10000;
    const shipping = 250;
    assert.equal(orderGrandTotal({ subtotal, paymentMethod: "cod", shippingCost: shipping }), 10250);
    assert.equal(
      orderGrandTotal({ subtotal, paymentMethod: "jazzcash", shippingCost: shipping }),
      10000 - 400 + 250
    );
    assert.equal(
      orderGrandTotal({
        subtotal,
        couponDiscount: 500,
        paymentMethod: "bankTransfer",
        shippingCost: 500,
      }),
      9500 - 380 + 500
    );
  });
});

describe("release gate — mobile navigation contract", () => {
  it("StoreHeader keeps mobile drawer + required destinations", () => {
    const src = readFileSync(
      path.join(__dirname, "../storecraft-store/components/store/StoreHeader.jsx"),
      "utf8"
    );
    assert.match(src, /store-mobile-nav/);
    assert.match(src, /store-mobile-nav__links/);
    assert.match(src, /label: "Shop", href: "\/shop"/);
    assert.match(src, /label: "Categories", href: "\/categories"/);
    assert.match(src, /href: "\/shop\?deals=1"/);
    assert.match(src, /href: "\/track-order"/);
    assert.match(src, /href: "\/blogs"/);
    assert.match(src, /href="\/wishlist"/);
    assert.match(src, /accountHref/);
    assert.match(src, /Lock body scroll while the full-screen mobile nav is open/);
  });
});

describe("release gate — P0 fitment/toast/HUD still wired", () => {
  it("Alto rejected on Swift; monogram conflicts Aqua; Splitters rejects ducktail", () => {
    const swift = { make: "Suzuki", model: "Swift", slug: "suzuki-swift-2025-present" };
    const aqua = { make: "Toyota", model: "Aqua", slug: "toyota-aqua-2012-present" };
    const { kept } = rejectTitleModelConflicts(
      [
        { slug: "alto-fender", name: "Alto 660cc Side Fender Indicator" },
        { slug: "swift-key", name: "Suzuki Swift Metal Key Cover" },
      ],
      swift
    );
    assert.deepEqual(
      kept.map((p) => p.slug),
      ["swift-key"]
    );
    assert.equal(
      detectTitleModelConflict(
        { name: "Toyota Corolla Carbon Steering Monogram" },
        aqua
      ).conflict,
      true
    );
    const { kept: shelf } = rejectClearCategoryMisfits(
      [
        { slug: "steering-trim", name: "Corolla Carbon Steering Trim" },
        { slug: "ducktail", name: "Corolla Ducktail Trunk Spoiler" },
        { slug: "side-splitter", name: "Universal Side Splitter Skirt" },
      ],
      "splitters-side-skirts"
    );
    assert.deepEqual(
      shelf.map((p) => p.slug),
      ["side-splitter"]
    );
  });

  it("FakePurchaseToast is unmounted from PDP; HUD category redirects", () => {
    const pdp = readFileSync(
      path.join(__dirname, "../storecraft-store/components/store/ProductDetailMedico.jsx"),
      "utf8"
    );
    assert.doesNotMatch(pdp, /<FakePurchaseToast/);
    assert.doesNotMatch(pdp, /<ProductLiveView/);
    assert.match(pdp, /FakePurchaseToast removed/);
    assert.equal(resolveDeletedPath("/categories/car-hud"), "/car-heads-up-display-hud");
  });
});
