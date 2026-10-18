/**
 * My Garage account sync — input cleaning (no Mongo required).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_GARAGE, sanitizeGarageInput } from "../storecraft-store/lib/mobile/garage.js";

describe("sanitizeGarageInput", () => {
  it("keeps valid slugs, normalises case and years", () => {
    assert.deepEqual(
      sanitizeGarageInput([
        { slug: "Toyota-Corolla-E120-2002-2008", yearStart: "2006", yearEnd: 2006, active: true },
      ]),
      [{ slug: "toyota-corolla-e120-2002-2008", yearStart: 2006, yearEnd: 2006, active: true }]
    );
  });

  it("drops junk, injection-shaped slugs and impossible years", () => {
    const out = sanitizeGarageInput([
      null,
      { slug: "" },
      { slug: { $ne: "" } },
      { slug: "bad slug!" },
      { slug: "bike-honda-cd-70", yearStart: 1800 },
    ]);
    assert.deepEqual(out, [{ slug: "bike-honda-cd-70", yearStart: null, yearEnd: null, active: false }]);
  });

  it("de-duplicates the same vehicle and year, keeps different years", () => {
    const out = sanitizeGarageInput([
      { slug: "a-b", yearStart: 2006 },
      { slug: "a-b", yearStart: 2006 },
      { slug: "a-b", yearStart: 2007 },
    ]);
    assert.equal(out.length, 2);
  });

  it("caps the list", () => {
    const many = Array.from({ length: 25 }, (_, i) => ({ slug: `v-${i}` }));
    assert.equal(sanitizeGarageInput(many).length, MAX_GARAGE);
    assert.deepEqual(sanitizeGarageInput("nope"), []);
  });
});
