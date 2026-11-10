import assert from "node:assert/strict";
import {
  isEmbeddedFaqHeading,
  stripEmbeddedFaqHtml,
} from "../lib/seo/stripEmbeddedFaqHtml.js";

assert.equal(isEmbeddedFaqHeading("Frequently Asked Questions"), true);
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

assert.equal(stripEmbeddedFaqHtml("<p>Only body</p>"), "<p>Only body</p>");
assert.equal(stripEmbeddedFaqHtml(""), "");

console.log("stripEmbeddedFaqHtml tests passed");
