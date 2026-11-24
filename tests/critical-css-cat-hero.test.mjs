import { test } from "node:test";
import assert from "node:assert/strict";
import { CRITICAL_CSS } from "../storecraft-store/lib/criticalCss.js";

test("critical CSS reserves category hero visual (CLS)", () => {
  assert.match(CRITICAL_CSS, /\.cat-hero\{/);
  assert.match(CRITICAL_CSS, /\.cat-hero__visual-frame\{[^}]*aspect-ratio:16\/11/);
  assert.match(CRITICAL_CSS, /\.cat-hero__brand-logo/);
  assert.match(CRITICAL_CSS, /contain:layout style/);
});
