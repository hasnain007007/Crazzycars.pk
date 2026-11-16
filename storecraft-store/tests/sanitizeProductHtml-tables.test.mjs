import assert from "node:assert/strict";
import {
  sanitizeProductHtml,
  toPlainTextWithTableSeparators,
} from "../lib/sanitizeHtml.js";

const table = `<div data-cc-spec="1"><h2>Specifications</h2><table><tbody>
<tr><th>Product</th><td>Honda City Modulo Kit</td></tr>
<tr><th>Fits</th><td>Honda City 2021–2025</td></tr>
<tr><th>Material</th><td>Fibreglass</td></tr>
</tbody></table></div>`;

const clean = sanitizeProductHtml(table);
assert.match(clean, /<table>/i);
assert.match(clean, /<th>/i);
assert.match(clean, /<td>/i);
assert.match(clean, /Product/);
assert.match(clean, /Fibreglass/);
// data-* stripped (not on allowlist)
assert.equal(/data-cc-spec/i.test(clean), false);
assert.equal(/style=/i.test(clean), false);

const withScript = sanitizeProductHtml(
  `<table><tr><th onclick="alert(1)">Product</th><td><script>alert(1)</script>X</td></tr>
<tr><th>Link</th><td><a href="javascript:alert(1)">bad</a></td></tr></table>`
);
assert.equal(/<script/i.test(withScript), false);
assert.equal(/onclick/i.test(withScript), false);
assert.equal(/javascript:/i.test(withScript), false);
assert.match(withScript, /<table>/i);
assert.match(withScript, /Product/);

const plain = toPlainTextWithTableSeparators(table);
assert.match(plain, /Product:\s*Honda City Modulo Kit/);
assert.match(plain, /Fits:\s*Honda City 2021–2025/);
assert.match(plain, /Material:\s*Fibreglass/);
assert.equal(/ProductHonda/.test(plain), false);

console.log("sanitizeProductHtml-tables.test.mjs: ok");
