import assert from "node:assert/strict";
import {
  isEmbeddedFaqHeading,
  stripEmbeddedFaqHtml,
} from "../lib/seo/stripEmbeddedFaqHtml.js";

assert.equal(isEmbeddedFaqHeading("Frequently Asked Questions"), true);
assert.equal(isEmbeddedFaqHeading("frequently asked questions"), true);
assert.equal(isEmbeddedFaqHeading("  Frequently   Asked  Questions  "), true);
assert.equal(isEmbeddedFaqHeading("FAQ"), true);
assert.equal(isEmbeddedFaqHeading("Specifications"), false);

const sample = `<p>Intro</p>
<h2>Frequently Asked Questions</h2>
<h3>Does it fit?</h3>
<p>Check the table.</p>
<h2>Care</h2>
<p>Wipe clean.</p>`;

assert.equal(
  stripEmbeddedFaqHtml(sample),
  `<p>Intro</p>
<h2>Care</h2>
<p>Wipe clean.</p>`
);

// Case + whitespace + h3 FAQ heading
const h3Case = `<p>Body</p><h3>frequently   asked questions</h3><p>Q1</p><h2>Specs</h2><p>X</p>`;
assert.equal(
  stripEmbeddedFaqHtml(h3Case),
  `<p>Body</p><h2>Specs</h2><p>X</p>`
);

// Two FAQ blocks (the live PDP failure mode)
const double = `<p>Intro</p>
<h2>Frequently Asked Questions</h2>
<h3>Q1</h3><p>A1</p>
<h2>Related</h2><p>Links</p>
<h2>Frequently Asked Questions</h2>
<h3>Q2</h3><p>A2</p>`;
const out = stripEmbeddedFaqHtml(double);
assert.equal(/frequently\s+asked\s+questions/i.test(out), false);
assert.match(out, /Related/);
assert.match(out, /Intro/);

assert.equal(stripEmbeddedFaqHtml("<p>Only body</p>"), "<p>Only body</p>");
assert.equal(stripEmbeddedFaqHtml(""), "");

console.log("stripEmbeddedFaqHtml tests passed");
