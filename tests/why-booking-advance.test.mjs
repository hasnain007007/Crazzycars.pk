import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../storecraft-store/components/store/WhyBookingAdvance.jsx", import.meta.url), "utf8");
const read = (p) => readFileSync(new URL(`../storecraft-store/${p}`, import.meta.url), "utf8");

test("booking-advance amounts come from COD_ADVANCE_TIERS, never hard-coded", () => {
  assert.match(src, /COD_ADVANCE_TIERS\[0\]\.amount/);
  assert.match(src, /codAdvanceTierList\(\)/);
  assert.doesNotMatch(src, /Rs\.? ?(300|600|1,?000)\b/, "no literal advance amounts in the copy");
});

test("explanation is bilingual: English + Urdu (rtl)", () => {
  assert.match(src, /Why we ask for a small booking advance/);
  assert.match(src, /lang="ur" dir="rtl"/);
  assert.match(src, /بُکنگ ایڈوانس/);
  assert.match(src, /not an extra charge/);
});

test("shown on the founder page and the How to pay page", () => {
  assert.match(read("app/founder/page.jsx"), /<WhyBookingAdvance/);
  assert.match(read("app/advance-payment/page.jsx"), /<WhyBookingAdvance/);
});
