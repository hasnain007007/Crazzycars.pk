import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveSeo, stripClaimWordsFromMeta } from "../lib/seo/resolveSeo.mjs";

describe("resolveSeo", () => {
  it("prefers db over override over fallback", () => {
    assert.equal(resolveSeo({ db: "A", override: "B", fallback: "C" }), "A");
    assert.equal(resolveSeo({ db: "", override: "B", fallback: "C" }), "B");
    assert.equal(resolveSeo({ db: "  ", override: "", fallback: "C" }), "C");
  });

  it("strips claim words from meta", () => {
    assert.equal(
      stripClaimWordsFromMeta("Premium Hyundai accessories OEM original"),
      "Hyundai accessories"
    );
  });
});
