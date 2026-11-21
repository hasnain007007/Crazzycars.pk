import { test } from "node:test";
import assert from "node:assert/strict";

await import("./admin-alias-loader.mjs");
const {
  matchRunCourierCity,
  matchVendorCity,
  citySpellingKey,
  pickPreferredCoveringCourier,
} = await import("../storecraft-admin/lib/runcourier.js");

// Trimmed from the live Run Courier lists (21 Nov 2026).
const combined = ["Kallar Saidan", "Kallar saydian", "Kallar Saddiyian", "Kallar Kahar", "Kalar kahar",
  "Ahmed Pur", "Hamid pur", "Rawalpindi", "Kahuta", "Gujar Khan", "Lahore", "Gujranwala", "Gujranwala Cantt", "Sahiwal"];
const leopard = ["Rawalpindi", "Kahuta", "Gujar Khan", "Lahore", "Gujranwala", "Kalar kahar"];
const mnp = ["Kallar Saidan", "Rawalpindi", "Lahore"];
const tcs = ["Kallar Saddiyian", "Kallar saydian", "Lahore"];

test("Kallar Syedan spellings reach the courier's own spelling", () => {
  for (const typed of ["Kallar Syedan", "kallar syedan", "Kallar Sayedan", "Kalar Syedan"]) {
    assert.equal(matchVendorCity(typed, mnp), "Kallar Saidan", typed);
    assert.equal(matchVendorCity(typed, tcs), "Kallar saydian", typed);
    assert.equal(matchVendorCity(typed, leopard), "", `${typed} is not on the Leopard list`);
    assert.ok(/^Kallar (Saidan|saydian|Saddiyian)$/.test(matchRunCourierCity(typed, combined)));
  }
});

test("spelling match never jumps to a different town or first letter", () => {
  assert.equal(matchRunCourierCity("Hameed Pur", combined), "Hamid pur");
  assert.equal(citySpellingKey("Ahmed Pur"), citySpellingKey("Hamid pur")); // same skeleton…
  assert.notEqual(matchRunCourierCity("Hameed Pur", combined), "Ahmed Pur"); // …but first letter guards it
  assert.equal(matchRunCourierCity("Kallar Syedan", ["Kallar Kahar"]), "Kallar Syedan"); // no false hit
});

test("existing exact / alias / Cantt behaviour unchanged", () => {
  assert.equal(matchRunCourierCity("Lahore", combined), "Lahore");
  assert.equal(matchRunCourierCity("Gujranwala", combined), "Gujranwala");
  assert.equal(matchRunCourierCity("Gujranwala Cantt", combined), "Gujranwala"); // alias: Cantt origin is disabled
  assert.equal(matchRunCourierCity("Rawalpindi", leopard), "Rawalpindi");
  assert.equal(matchRunCourierCity("Unknown Town", combined), "Unknown Town");
  assert.equal(matchRunCourierCity("Kallar Syedan", combined), "Kallar Saidan"); // alias → M&P spelling
});

test("auto-fallback prefers M&P then TCS for uncovered towns", () => {
  const pick = pickPreferredCoveringCourier([
    { vendor: "13|0", title: "TCS", city: "Kallar saydian" },
    { vendor: "10|0", title: "M&P", city: "Kallar Saidan" },
    { vendor: "6|0", title: "Trax", city: "Kallar Syedan" },
  ]);
  assert.equal(pick.title, "M&P");
  assert.equal(pick.city, "Kallar Saidan");
  assert.equal(pickPreferredCoveringCourier([]), null);
});
