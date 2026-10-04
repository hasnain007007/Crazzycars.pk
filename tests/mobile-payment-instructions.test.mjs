import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { safeEqualString } from "../storecraft-store/lib/mobile/safeEqual.js";
import {
  buildConfigPaymentMethods,
  buildOrderPaymentInstructions,
  isPaymentMethodEnabled,
} from "../storecraft-store/lib/mobile/paymentInstructions.js";

describe("safeEqualString", () => {
  it("matches equal strings", () => {
    assert.equal(safeEqualString("abc", "abc"), true);
  });
  it("rejects different strings and empties", () => {
    assert.equal(safeEqualString("abc", "abd"), false);
    assert.equal(safeEqualString("", "a"), false);
    assert.equal(safeEqualString("ab", "abc"), false);
  });
});

describe("paymentInstructions", () => {
  const settings = {
    whatsapp: { number: "03284010007" },
    storePayment: {
      advancePaymentMessageEnabled: true,
      advancePaymentAmount: 250,
      advancePaymentMessageTitle: "Confirm Your Order",
      advancePaymentMessage:
        "Pay delivery charges of {amount} and send screenshot on WhatsApp: {whatsapp}",
    },
    pakistaniPaymentMethods: {
      cod: { enabled: true, label: "Cash on Delivery" },
      bankTransfer: {
        enabled: true,
        label: "Bank Transfer",
        bankName: "Meezan",
        accountNumber: "111",
        accountTitle: "CC",
        iban: "PK00",
      },
      jazzcash: { enabled: false, label: "JazzCash" },
    },
    storefront: {
      checkoutSuccess: {
        paymentConfirmedMessage: "Send full payment screenshot to {whatsapp}.",
      },
    },
  };

  it("lists only enabled methods with details", () => {
    const { enabledPaymentMethods, whatsapp } = buildConfigPaymentMethods(settings);
    assert.equal(enabledPaymentMethods.length, 2);
    assert.ok(enabledPaymentMethods.find((m) => m.key === "bankTransfer")?.details?.accountNumber);
    assert.equal(whatsapp.waMeDigits.startsWith("92"), true);
    assert.equal(isPaymentMethodEnabled("bankTransfer", settings), true);
    assert.equal(isPaymentMethodEnabled("jazzcash", settings), false);
  });

  it("COD advance uses shipping / payment.advanceRequired", () => {
    const instr = buildOrderPaymentInstructions(
      {
        orderNumber: "AB-1",
        paymentMethod: "cod",
        pricing: { total: 1750, shippingCost: 250, subtotal: 1500, discount: 0 },
        payment: { advanceRequired: 250, remainingCod: 1500, advanceMode: "shipping" },
      },
      settings
    );
    assert.equal(instr.amountDue, 250);
    assert.equal(instr.remainingOnDelivery, 1500);
    assert.ok(instr.whatsapp.waMeUrl.includes("wa.me/"));
    assert.ok(instr.whatsapp.prefilledMessage.includes("AB-1"));
  });

  it("bankTransfer amountDue is full total", () => {
    const instr = buildOrderPaymentInstructions(
      {
        orderNumber: "AB-2",
        paymentMethod: "bankTransfer",
        pricing: { total: 45500, shippingCost: 500 },
        payment: { advanceRequired: 0, remainingCod: 0 },
      },
      settings
    );
    assert.equal(instr.amountDue, 45500);
    assert.equal(instr.remainingOnDelivery, 0);
    assert.ok(instr.accountLines.some((l) => l.label === "Account"));
  });
});
