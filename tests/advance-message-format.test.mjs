import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  collapseRepeatedCurrencyPrefix,
  fillAmountPlaceholder,
} from "../storecraft-store/lib/advanceMessageFormat.js";

describe("fillAmountPlaceholder", () => {
  it("fills bare {amount} with Rs-prefixed price", () => {
    assert.equal(
      fillAmountPlaceholder("Pay {amount} to confirm", 300),
      "Pay Rs.300 to confirm"
    );
  });

  it("does not double when template has Rs. before {amount}", () => {
    assert.equal(
      fillAmountPlaceholder("A Rs. {amount} booking amount is required", 300),
      "A Rs.300 booking amount is required"
    );
    assert.equal(
      fillAmountPlaceholder("A Rs.{amount} booking amount is required", 300),
      "A Rs.300 booking amount is required"
    );
    assert.equal(
      fillAmountPlaceholder("Pay Rs.  {amount} now", 300),
      "Pay Rs.300 now"
    );
  });

  it("does not double when template has PKR before {amount}", () => {
    assert.equal(
      fillAmountPlaceholder("Advance PKR {amount} due", 300),
      "Advance Rs.300 due"
    );
    assert.equal(
      fillAmountPlaceholder("Advance PKR{amount} due", 1300),
      "Advance Rs.1,300 due"
    );
  });

  it("collapses already-doubled Rs. prefixes defensively", () => {
    assert.equal(collapseRepeatedCurrencyPrefix("A Rs. Rs.300 booking"), "A Rs.300 booking");
    assert.equal(collapseRepeatedCurrencyPrefix("Rs.Rs.300"), "Rs.300");
    assert.equal(collapseRepeatedCurrencyPrefix("PKR PKR 300"), "PKR 300");
  });

  it("leaves a correct single prefix unchanged", () => {
    assert.equal(collapseRepeatedCurrencyPrefix("Pay Rs.300 now"), "Pay Rs.300 now");
  });
});
