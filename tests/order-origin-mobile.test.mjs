import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ORIGIN_FILTER_OPTIONS,
  orderOriginLabel,
  originFilterToMongo,
} from "../storecraft-admin/lib/orderOrigin.js";

describe("admin order origin — mobile app orders", () => {
  it("labels orderSource=mobile as Mobile App even without attribution", () => {
    assert.equal(orderOriginLabel({ orderSource: "mobile" }), "Mobile App");
  });

  it("keeps web orders on attribution / Direct", () => {
    assert.equal(orderOriginLabel({ orderSource: "site" }), "Direct");
    assert.equal(
      orderOriginLabel({ orderSource: "site", attribution: { label: "Organic: Google" } }),
      "Organic: Google"
    );
  });

  it("offers a Mobile App filter that matches orderSource", () => {
    assert.ok(ORIGIN_FILTER_OPTIONS.some((o) => o.value === "mobile"));
    assert.deepEqual(originFilterToMongo("mobile"), { orderSource: "mobile" });
  });

  it("excludes mobile orders from the Direct filter", () => {
    assert.deepEqual(originFilterToMongo("direct").orderSource, { $ne: "mobile" });
  });
});
