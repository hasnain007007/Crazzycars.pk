/**
 * Local fixtures for PayPal capture binding — no live PayPal calls, no real orders.
 */
import { assertPayPalMatchesOrder } from "../lib/paypalCaptureBind.js";

const ORDER_ID = "6a5ea46e086726a54a15136e";
const storeOrder = { pricing: { total: 14500 } };

function paypalOrder({ customId, amount, captured }) {
  return {
    id: "PP-TEST",
    status: "COMPLETED",
    purchase_units: [
      {
        custom_id: customId,
        amount: { currency_code: "PKR", value: amount },
        payments: captured
          ? { captures: [{ amount: { currency_code: "PKR", value: captured } }] }
          : undefined,
      },
    ],
  };
}

const cases = [
  {
    name: "missing custom_id",
    paypal: paypalOrder({ customId: "", amount: "14500.00" }),
    expectOk: false,
  },
  {
    name: "mismatched custom_id",
    paypal: paypalOrder({ customId: "aaaaaaaaaaaaaaaaaaaaaaaa", amount: "14500.00" }),
    expectOk: false,
  },
  {
    name: "amount mismatch",
    paypal: paypalOrder({ customId: ORDER_ID, amount: "1.00" }),
    expectOk: false,
  },
  {
    name: "matching custom_id and amount",
    paypal: paypalOrder({ customId: ORDER_ID, amount: "14500.00" }),
    expectOk: true,
  },
  {
    name: "matching via capture amount",
    paypal: paypalOrder({ customId: ORDER_ID, amount: "14500.00", captured: "14500.00" }),
    expectOk: true,
  },
];

let failed = 0;
for (const c of cases) {
  const result = assertPayPalMatchesOrder(c.paypal, storeOrder, ORDER_ID);
  const ok = result.ok === c.expectOk;
  if (!ok) {
    failed += 1;
    console.error("FAIL", c.name, result);
  } else {
    console.log("ok", c.name, result.ok ? "accept" : `reject ${result.status}`);
  }
}

if (failed) {
  process.exit(1);
}
console.log("all paypal capture bind fixtures passed");
