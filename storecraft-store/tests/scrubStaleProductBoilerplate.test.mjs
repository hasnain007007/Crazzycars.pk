import assert from "node:assert/strict";
import { STORE_POLICY } from "../config/store-policy.js";
import { scrubStaleProductBoilerplate } from "../lib/scrubPolicyConflictCopy.js";

const REGULAR = STORE_POLICY.shipping.standardFeePKR;
const BULKY = STORE_POLICY.shipping.bulkyFeePKR;

const SAMPLE = `
<p data-cc-aeo="1">The Toyota Aqua 2012-2021 Velvet Dashboard Mat is sold by CrazzyCars.pk, a Gujranwala car accessories shop founded in 2023; its current price in Pakistan is on this page. Cash on Delivery across Pakistan: Rs ${REGULAR} delivery, and a Rs 300/600/1,000 advance deducted from the COD total. Confirm fitment on WhatsApp 03284010007.</p>
<div data-cc-unique="1"><p>From the Interior range.</p></div>
<p>Upgrade your ride with the Toyota Aqua 2012-2021 Velvet Dashboard Mat. Designed for a precise fit and finished to a quality standard, it installs easily and holds up to daily use in Pakistani conditions.</p>
<h3>Key Features</h3>
<ul>
<li><p>Quality materials with listed fitment for your model</p></li>
<li><p>Easy installation with no cutting or drilling</p></li>
<li><p>Durable, easy to clean and built for daily use</p></li>
<li><p>Backed by CrazzyCars nationwide Cash on Delivery</p></li>
</ul>
<table><tbody>
<tr><th>Product</th><td>Toyota Aqua 2012-2021 Velvet Dashboard Mat</td></tr>
<tr><th>Item code</th><td>CC-INT-123</td></tr>
<tr><th>Payment</th><td>Cash on Delivery. Booking advance Rs 300 / 600 / 1,000 by order total, deducted from your COD total.</td></tr>
<tr><th>Delivery charge</th><td>Rs ${REGULAR} per order (Rs ${BULKY} if the order includes bulky items)</td></tr>
<tr><th>Delivery time</th><td>Lahore 2–3 business days; other cities confirmed at checkout. Dispatched from Gujranwala.</td></tr>
<tr><th>Returns</th><td>Within ${STORE_POLICY.returns.windowDays} days if the item arrives defective or is the wrong item (full refund). Change of mind is not accepted.</td></tr>
<tr><th>Help</th><td>WhatsApp 03284010007 or visit our shop in Gujranwala</td></tr>
</tbody></table>
<div data-cc-faq="1"><h2>Frequently Asked Questions</h2><p>Shared COD FAQ.</p></div><!--/cc-faq-->
`;

const out = scrubStaleProductBoilerplate(SAMPLE);
assert.match(out, /Toyota Aqua 2012-2021 Velvet Dashboard Mat is sold by CrazzyCars\.pk/);
assert.match(out, /Item code/);
assert.match(out, /CC-INT-123/);
assert.doesNotMatch(out, /Designed for a precise fit/i);
assert.doesNotMatch(out, /Key Features/i);
assert.doesNotMatch(out, /data-cc-unique/i);
assert.doesNotMatch(out, /data-cc-faq/i);
assert.doesNotMatch(out, /Cash on Delivery across Pakistan/i);
assert.doesNotMatch(out, /Confirm fitment on WhatsApp/i);
assert.doesNotMatch(out, /<th>\s*Payment\s*<\/th>/i);
assert.doesNotMatch(out, /Dispatched from Gujranwala/i);
console.log("scrubStaleProductBoilerplate.test.mjs OK");
