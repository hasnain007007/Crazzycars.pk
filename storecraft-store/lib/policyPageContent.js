/**
 * Live privacy / terms HTML for CMS pages — never includes "Placeholder copy".
 */
import { STORE_CONTACT } from "../config/store-policy.js";
import { COD_LINE, PREPAID_LINE } from "./paymentCopy.js";

const WA = STORE_CONTACT.whatsapp;
const EMAIL = STORE_CONTACT.email;

export const PRIVACY_POLICY_HTML = `
<h2>Privacy Policy</h2>
<p><em>Last updated: 30 October 2026</em></p>

<h3>Who we are</h3>
<p>CrazzyCars.pk (“we”, “us”) is an online car-accessories store based in Gujranwala, Punjab, Pakistan. Contact: <a href="mailto:${EMAIL}">${EMAIL}</a> · WhatsApp ${WA}.</p>

<h3>Information we collect</h3>
<ul>
  <li><strong>Order details</strong> — name, phone, email (optional), delivery address, city, province, and order contents.</li>
  <li><strong>Account details</strong> — if you register: email, password (hashed), saved addresses, and order history.</li>
  <li><strong>Communications</strong> — messages you send via the contact form, WhatsApp, or email.</li>
  <li><strong>Technical data</strong> — basic device/browser info, cookies for cart and session, and analytics/advertising pixels when enabled.</li>
</ul>

<h3>How we use your information</h3>
<ul>
  <li>To process, confirm, ship, and support your orders (including courier booking).</li>
  <li>To contact you about order status, delivery charges, or product fitment questions.</li>
  <li>To improve the storefront, prevent fraud, and measure marketing performance.</li>
  <li>We do <strong>not</strong> sell your personal data to third parties.</li>
</ul>

<h3>Sharing</h3>
<p>We share only what is needed with payment facilitators (e.g. JazzCash / bank transfer confirmation), courier partners, and infrastructure providers (hosting, email). They must use your data only to provide their service.</p>

<h3>Retention &amp; security</h3>
<p>Order records are kept as long as needed for accounting, warranty, and legal requirements. We use industry-standard safeguards; no method of transmission is 100% secure.</p>

<h3>Your choices</h3>
<p>Email or WhatsApp us to update your details, request a copy of your data, or ask us to delete an account (orders already placed may still be retained for records).</p>
`.trim();

export const TERMS_CONDITIONS_HTML = `
<h2>Terms &amp; Conditions</h2>
<p><em>Last updated: 30 October 2026</em></p>

<h3>Using this website</h3>
<p>By browsing or placing an order on CrazzyCars.pk you agree to these terms. If you do not agree, please do not use the site.</p>

<h3>Products &amp; pricing</h3>
<ul>
  <li>All prices are in Pakistani Rupees (PKR) as shown on the product page.</li>
  <li>We may correct pricing or listing errors; if we cannot fulfil an order at the listed price we will contact you.</li>
  <li>Product photos are illustrative; colour and finish may vary slightly.</li>
  <li>Vehicle fitment notes are guidance — always confirm compatibility for your exact make/model/year before ordering (WhatsApp ${WA}).</li>
</ul>

<h3>Orders &amp; payment</h3>
<ul>
  <li>An order is an offer to buy. We accept it when we confirm the order (email/WhatsApp/SMS or order status in your account).</li>
  <li>We may refuse or cancel orders that appear fraudulent, out of stock, or undeliverable.</li>
  <li><strong>Cash on Delivery</strong> — ${COD_LINE} on eligible items. Booking advance tiers are shown at checkout and deducted from your total.</li>
  <li><strong>Body kits</strong> — ${PREPAID_LINE}. Pay with JazzCash, Meezan, or bank transfer before we ship.</li>
</ul>

<h3>Accounts</h3>
<p>You are responsible for keeping your login details secure and for activity under your account.</p>

<h3>Limitation of liability</h3>
<p>To the fullest extent permitted by Pakistani law, CrazzyCars.pk is not liable for indirect or consequential losses arising from use of the site or products, beyond the amount you paid for the affected order.</p>

<h3>Changes</h3>
<p>We may update these terms; the “Last updated” date will change. Continued use of the site after changes means you accept the updated terms.</p>
`.trim();
