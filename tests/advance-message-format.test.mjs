import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  collapseRepeatedCurrencyPrefix,
  fillAmountPlaceholder,
} from "../storecraft-store/lib/advanceMessageFormat.js";

describe("fillAmountPlaceholder", () => {
  it("fills bare {amount} with Rs-prefixed price", () => {
    assert.equal(
      fillAmountPlaceholder("Pay {amount} to confirm", 250),
      "Pay Rs.250 to confirm"
    );
  });

  it("does not double when template has Rs. before {amount}", () => {
    assert.equal(
      fillAmountPlaceholder("A Rs. {amount} booking amount is required", 250),
      "A Rs.250 booking amount is required"
    );
    assert.equal(
      fillAmountPlaceholder("A Rs.{amount} booking amount is required", 250),
      "A Rs.250 booking amount is required"
    );
    assert.equal(
      fillAmountPlaceholder("Pay Rs.  {amount} now", 250),
      "Pay Rs.250 now"
    );
  });

  it("does not double when template has PKR before {amount}", () => {
    assert.equal(
      fillAmountPlaceholder("Advance PKR {amount} due", 250),
      "Advance Rs.250 due"
    );
    assert.equal(
      fillAmountPlaceholder("Advance PKR{amount} due", 1250),
      "Advance Rs.1,250 due"
    );
  });

  it("collapses already-doubled Rs. prefixes defensively", () => {
    assert.equal(collapseRepeatedCurrencyPrefix("A Rs. Rs.250 booking"), "A Rs.250 booking");
    assert.equal(collapseRepeatedCurrencyPrefix("Rs.Rs.250"), "Rs.250");
    assert.equal(collapseRepeatedCurrencyPrefix("PKR PKR 250"), "PKR 250");
  });

  it("leaves a correct single prefix unchanged", () => {
    assert.equal(collapseRepeatedCurrencyPrefix("Pay Rs.250 now"), "Pay Rs.250 now");
  });
});
