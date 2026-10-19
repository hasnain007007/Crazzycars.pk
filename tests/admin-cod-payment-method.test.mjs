import assert from "node:assert/strict";
import test from "node:test";
import { isCodPaymentMethod } from "../storecraft-admin/lib/pakistaniPaymentMethods.js";

test("JazzCash is not cash on delivery", () => {
  assert.equal(isCodPaymentMethod("jazzcash"), false);
  assert.equal(isCodPaymentMethod("JazzCash"), false);
});

test("COD spellings are cash on delivery", () => {
  for (const m of ["cod", "COD", "Cash on Delivery", "cash"]) assert.equal(isCodPaymentMethod(m), true, m);
});

test("prepaid methods are not COD", () => {
  for (const m of ["easypaisa", "bankTransfer", "hbl", "meezan", "ubl", "stripe", "paypal", "", null]) {
    assert.equal(isCodPaymentMethod(m), false, String(m));
  }
});
