/**
 * Regression: PostEx city resolver must not book wrong cities from street noise.
 *
 * Run (from repo root; avoids Next `@/` import in postex.js):
 *   node -e "$(cat storecraft-admin/scripts/test-postex-city-resolve.mjs)"
 * Or paste into a vm harness that loads the resolver block from lib/postex.js.
 *
 * Critical case: ORD-2026-00678 — "Hayat medicos near mcb bank katlang" must not → TANK.
 */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(__dirname, "../lib/postex.js"), "utf8");
const start = src.indexOf("const CITY_STOPWORDS");
const end = src.indexOf("let merchantAddressCache");
assert.ok(start > 0 && end > start, "resolver block not found in postex.js");
const block = src.slice(start, end).replace(/^export /gm, "");
const mod = { exports: {} };
vm.runInNewContext(
  `${block}\nmodule.exports = { resolvePostexCityName, POSTEX_CITY_PERSIST_REASONS };`,
  { module: mod, exports: mod.exports, console }
);
const { resolvePostexCityName, POSTEX_CITY_PERSIST_REASONS } = mod.exports;

const cities = [
  "TANK",
  "MARDAN",
  "LAHORE",
  "KARACHI",
  "GUJRANWALA",
  "SWABI",
  "CHARSADDA",
  "NOWSHERA",
  "PESHAWAR",
  "MATORE",
  "PATRAK",
  "UMAR KOT",
  "FATEH JANG",
  "ATTOCK",
  "BAGH (AJK)",
];

function check(name, input, extras, expectMatched, expectOk = true) {
  const r = resolvePostexCityName(input, cities, extras || {});
  assert.equal(r.ok, expectOk, `${name}: ok expected ${expectOk}, got ${r.ok} (${r.reason}→${r.matched})`);
  if (expectMatched) {
    assert.equal(
      String(r.matched || "").toUpperCase(),
      String(expectMatched).toUpperCase(),
      `${name}: matched expected ${expectMatched}, got ${r.matched} (${r.reason})`
    );
  } else {
    assert.equal(r.matched, "", `${name}: expected no match, got ${r.matched}`);
  }
  console.log("OK", name, "→", r.matched || "(none)", r.reason);
}

// ORD-2026-00678 regression: street "bank" must NEVER become TANK.
check(
  "katlang+bank street not tank",
  "Katlang",
  { street: "Hayat medicos near mcb bank katlang" },
  "MARDAN"
);
check("katlang alone aliases to mardan", "Katlang", {}, "MARDAN");
check("explicit tank still works", "Tank", { street: "some street" }, "TANK");
check("park street must not become PATRAK", "Unknownville", { street: "near the park main road" }, "", false);
check("store street must not become MATORE", "Somewhere", { street: "ali store block 2" }, "", false);
check(
  "embedded fateh jang in street still works",
  "",
  { street: "Tehsil Fateh Jang village X" },
  "FATEH JANG"
);
check("bagh exact", "Bagh", {}, "BAGH (AJK)");

assert.equal(POSTEX_CITY_PERSIST_REASONS.has("EXACT"), true);
assert.equal(POSTEX_CITY_PERSIST_REASONS.has("FUZZY"), false);
assert.equal(POSTEX_CITY_PERSIST_REASONS.has("CONTAINS"), false);

console.log("\nAll PostEx city resolve regressions passed.");
