/**
 * Guards d61e26d regressions: spec tables kept, XSS stripped, Delivery & Returns
 * template leak scrubbed, footer "once seeded" copy never reappears in sanitize path.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  sanitizeProductHtml,
  sanitizePageHtml,
  sanitizeBlogHtml,
  sanitizeCategoryHtml,
  toPlainTextWithTableSeparators,
} from "../lib/sanitizeHtml.js";
import { scrubStaleProductBoilerplate } from "../lib/scrubPolicyConflictCopy.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const table = `<div data-cc-spec="1"><h2>Specifications</h2><table><tbody>
<tr><th>Product</th><td>Honda City Modulo Kit</td></tr>
<tr><th>Fits</th><td>Honda City 2021–2025</td></tr>
</tbody></table></div>`;

// Product + CMS/blog keep spec tables (d61e26d). Category HTML is prose/FAQ only.
for (const [name, fn] of [
  ["sanitizeProductHtml", sanitizeProductHtml],
  ["sanitizePageHtml", sanitizePageHtml],
  ["sanitizeBlogHtml", sanitizeBlogHtml],
]) {
  const clean = fn(table);
  assert.match(clean, /<table>/i, `${name} keeps table`);
  assert.match(clean, /<th>/i, `${name} keeps th`);
  assert.match(clean, /Honda City Modulo Kit/, `${name} keeps cell text`);
  assert.equal(/data-cc-spec/i.test(clean), false, `${name} strips data-*`);
  assert.equal(/<script/i.test(fn(`<p>x<script>alert(1)</script></p>`)), false, `${name} strips script`);
}
{
  const cat = sanitizeCategoryHtml(`<p>Lead</p><script>x</script><h3>Q?</h3><p>A.</p>`);
  assert.match(cat, /Lead/);
  assert.equal(/<script/i.test(cat), false);
  assert.match(cat, /<h3>/i);
}

const xss = sanitizeProductHtml(
  `<table><tr><th onclick="alert(1)">A</th><td><a href="javascript:alert(1)">B</a></td></tr></table>`
);
assert.equal(/onclick/i.test(xss), false);
assert.equal(/javascript:/i.test(xss), false);

const plain = toPlainTextWithTableSeparators(table);
assert.match(plain, /Product:\s*Honda City Modulo Kit/);

// Template leak scrub — use the same shared-catalogue markers as d61e26d.
const leak = scrubStaleProductBoilerplate(`
<p>Upgrade your ride with the Foo Mat. Designed for a precise fit and finished to a quality standard, it installs easily and holds up to daily use in Pakistani conditions.</p>
<h3>Key Features</h3>
<ul>
<li><p>Quality materials with listed fitment for your model</p></li>
<li><p>Easy installation with no cutting or drilling</p></li>
<li><p>Durable, easy to clean and built for daily use</p></li>
<li><p>Backed by CrazzyCars nationwide Cash on Delivery</p></li>
</ul>
<table><tbody>
<tr><th>Product</th><td>Foo Mat</td></tr>
<tr><th>Item code</th><td>CC-INT-123</td></tr>
<tr><th>Payment</th><td>Cash on Delivery. Booking advance Rs 300 / 600 / 1,000 by order total, deducted from your COD total.</td></tr>
<tr><th>Delivery charge</th><td>Rs 300 per order</td></tr>
<tr><th>Delivery time</th><td>Lahore 2–3 business days; other cities confirmed at checkout. Dispatched from Gujranwala.</td></tr>
<tr><th>Returns</th><td>Within 7 days if the item arrives defective or is the wrong item (full refund). Change of mind is not accepted.</td></tr>
</tbody></table>
`);
assert.match(leak, /Foo Mat/);
assert.match(leak, /CC-INT-123/);
assert.doesNotMatch(leak, /Designed for a precise fit/i);
assert.doesNotMatch(leak, /Key Features/i);
assert.doesNotMatch(leak, /<th>\s*Payment\s*<\/th>/i);
assert.doesNotMatch(leak, /Dispatched from Gujranwala/i);

// Footer must not ship the empty-seed placeholder (d61e26d).
const footerSrc = readFileSync(
  join(root, "components/store/FooterCategoriesColumn.jsx"),
  "utf8"
);
assert.equal(/once seeded/i.test(footerSrc), false, "FooterCategoriesColumn must not say once seeded");

// Client HTML views must not import sanitize-html / sanitizeHtml helpers.
for (const rel of [
  "components/store/PageView.jsx",
  "components/store/BlogPostView.jsx",
  "components/store/CategoryPageChrome.jsx",
]) {
  const src = readFileSync(join(root, rel), "utf8");
  assert.equal(
    /from ["']@\/lib\/sanitizeHtml["']|from ["']sanitize-html["']/.test(src),
    false,
    `${rel} must not import sanitize helpers (server-only)`
  );
}

console.log("sanitize-ssr-regressions.test.mjs: ok");
