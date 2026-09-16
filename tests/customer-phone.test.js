import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  guestEmailForNormalizedPhone,
  isValidPkMobile,
  normalizePkMobile,
} from "../storecraft-store/lib/customerPhone.js";

describe("normalizePkMobile", () => {
  it("normalizes common PK forms to 03XXXXXXXXX", () => {
    assert.equal(normalizePkMobile("03001234567"), "03001234567");
    assert.equal(normalizePkMobile("3001234567"), "03001234567");
    assert.equal(normalizePkMobile("923001234567"), "03001234567");
    assert.equal(normalizePkMobile("+92 300 1234567"), "03001234567");
  });

  it("rejects invalid numbers", () => {
    assert.equal(normalizePkMobile("0211234567"), "");
    assert.equal(normalizePkMobile("abc"), "");
    assert.equal(isValidPkMobile("03001234567"), true);
    assert.equal(isValidPkMobile("123"), false);
  });

  it("builds guest email", () => {
    assert.equal(guestEmailForNormalizedPhone("03001234567"), "guest+03001234567@guest.checkout");
  });
});
