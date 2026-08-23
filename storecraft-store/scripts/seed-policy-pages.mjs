/**
 * Seed / update the four legal CMS policy pages + footer links + announcement.
 * Run: node storecraft-store/scripts/seed-policy-pages.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  const envPath = path.resolve(__dirname, "../.env.local");
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env)) process.env[k] = v;
  }
}

loadEnvLocal();

const FREE_DELIVERY_RS = 0; // no free-delivery waiver — flat fee only
const STANDARD_DELIVERY_RS = 250;

const PAGES = [
  {
    title: "Privacy Policy",
    slug: "privacy-policy",
    template: "policy",
    showInFooter: true,
    seo: {
      metaTitle: "Privacy Policy | Crazzycars.pk",
      metaDescription:
        "How Crazzycars.pk collects, uses, and protects your personal information when you shop for car accessories in Pakistan.",
    },
    content: `
<h2>Privacy Policy</h2>
<p><em>Last updated: 27 July 2026 · Placeholder copy for launch — final legal review pending.</em></p>

<h3>Who we are</h3>
<p>Crazzycars.pk (“we”, “us”) is an online car-accessories store based in Gujranwala, Punjab, Pakistan. Contact: <a href="mailto:info@crazzycars.pk">info@crazzycars.pk</a> · WhatsApp 03284010007.</p>

<h3>Information we collect</h3>
<ul>
  <li><strong>Order details</strong> — name, phone, email (optional), delivery address, city, province, and order contents.</li>
  <li><strong>Account details</strong> — if you register: email, password (hashed), saved addresses, and order history.</li>
  <li><strong>Communications</strong> — messages you send via the contact form, WhatsApp, or email.</li>
  <li><strong>Technical data</strong> — basic device/browser info, cookies for cart and session, and analytics/advertising pixels (e.g. Meta Pixel) when enabled.</li>
</ul>

<h3>How we use your information</h3>
<ul>
  <li>To process, confirm, ship, and support your orders (including courier booking).</li>
  <li>To contact you about order status, delivery charges, or product fitment questions.</li>
  <li>To improve the storefront, prevent fraud, and measure marketing performance.</li>
  <li>We do <strong>not</strong> sell your personal data to third parties.</li>
</ul>

<h3>Sharing</h3>
<p>We share only what is needed with payment facilitators (e.g. JazzCash / bank transfer confirmation), courier partners (e.g. PostEx), and infrastructure providers (hosting, email). They must use your data only to provide their service.</p>

<h3>Retention &amp; security</h3>
<p>Order records are kept as long as needed for accounting, warranty, and legal requirements. We use industry-standard safeguards; no method of transmission is 100% secure.</p>

<h3>Your choices</h3>
<p>Email or WhatsApp us to update your details, request a copy of your data, or ask us to delete an account (orders already placed may still be retained for records).</p>
`.trim(),
  },
  {
    title: "Terms & Conditions",
    slug: "terms-conditions",
    template: "policy",
    showInFooter: true,
    seo: {
      metaTitle: "Terms & Conditions | Crazzycars.pk",
      metaDescription: "Terms of use and ordering rules for shopping car accessories at Crazzycars.pk.",
    },
    content: `
<h2>Terms &amp; Conditions</h2>
<p><em>Last updated: 27 July 2026 · Placeholder copy for launch — final legal review pending.</em></p>

<h3>Using this website</h3>
<p>By browsing or placing an order on Crazzycars.pk you agree to these terms. If you do not agree, please do not use the site.</p>

<h3>Products &amp; pricing</h3>
<ul>
  <li>All prices are in Pakistani Rupees (PKR) and include applicable display prices shown on the product page.</li>
  <li>We may correct pricing or listing errors; if we cannot fulfil an order at the listed price we will contact you.</li>
  <li>Product photos are illustrative; colour and finish may vary slightly.</li>
  <li>Vehicle fitment notes are guidance — always confirm compatibility for your exact make/model/year before ordering.</li>
</ul>

<h3>Orders</h3>
<ul>
  <li>An order is an offer to buy. We accept it when we confirm the order (email/WhatsApp/SMS or order status in your account).</li>
  <li>We may refuse or cancel orders that appear fraudulent, out of stock, or undeliverable.</li>
  <li><strong>Cash on Delivery (COD)</strong> is available on eligible orders. Delivery charges may need to be paid in advance as shown at checkout.</li>
  <li>Advance payment methods (JazzCash, bank transfer, Meezan, etc.) may include a discount when shown at checkout.</li>
</ul>

<h3>Accounts</h3>
<p>You are responsible for keeping your login details secure and for activity under your account.</p>

<h3>Limitation of liability</h3>
<p>To the fullest extent permitted by Pakistani law, Crazzycars.pk is not liable for indirect or consequential losses arising from use of the site or products, beyond the amount you paid for the affected order.</p>

<h3>Changes</h3>
<p>We may update these terms; the “Last updated” date will change. Continued use of the site after changes means you accept the updated terms.</p>
`.trim(),
  },
  {
    title: "Shipping Policy",
    slug: "shipping-policy",
    template: "policy",
    showInFooter: true,
    seo: {
      metaTitle: "Shipping Policy | Crazzycars.pk",
      metaDescription: `Delivery timeframes, charges, and free delivery on orders over Rs. ${FREE_DELIVERY_RS.toLocaleString("en-PK")} at Crazzycars.pk.`,
    },
    content: `
<h2>Shipping Policy</h2>
<p><em>Last updated: 27 July 2026 · Placeholder copy for launch — final legal review pending.</em></p>

<h3>Where we deliver</h3>
<p>We deliver nationwide across Pakistan through our courier partners (including PostEx where available).</p>

<h3>Delivery timeframes</h3>
<ul>
  <li><strong>Major cities:</strong> typically 2–3 business days after dispatch.</li>
  <li><strong>Other areas:</strong> typically 3–5 business days after dispatch.</li>
  <li>Remote locations may take longer. Weekends and public holidays can add delay.</li>
</ul>

<h3>Delivery charges</h3>
<p>Standard delivery is a flat Rs. ${STANDARD_DELIVERY_RS} on every order. There is no order-value waiver for delivery. Exact charges are always shown before you place the order.</p>

<h3>Cash on Delivery</h3>
<p>For COD orders, we may ask you to pay the delivery charge in advance (via JazzCash / bank transfer) to confirm the order. Product payment remains cash on delivery unless you choose an advance payment method.</p>

<h3>Tracking</h3>
<p>Once shipped, use <a href="/track-order">Track Order</a> with your courier tracking number. You can also contact us on WhatsApp with your order number.</p>
`.trim(),
  },
  {
    title: "Returns Policy",
    slug: "returns-policy",
    template: "policy",
    showInFooter: true,
    seo: {
      metaTitle: "Returns & Refunds | Crazzycars.pk",
      metaDescription: "Return and refund conditions for COD car accessories orders at Crazzycars.pk.",
    },
    content: `
<h2>Returns &amp; Refunds</h2>
<p><em>Last updated: 27 July 2026 · Placeholder copy for launch — final legal review pending.</em></p>

<h3>7-day return window</h3>
<p>If an item arrives damaged, defective, or not as described, contact us within <strong>7 days of delivery</strong> with photos and your order number. We will arrange a replacement or refund as appropriate.</p>

<h3>Change of mind</h3>
<p>Unused items in original packaging may be accepted for return within 7 days at our discretion. Return courier fees are usually paid by the customer unless we shipped the wrong item.</p>

<h3>What cannot be returned</h3>
<ul>
  <li>Items that have been installed, modified, or show signs of use (unless faulty).</li>
  <li>Opened consumables (e.g. fragrances, cleaning chemicals) for hygiene reasons.</li>
  <li>Custom-cut or special-order fitment parts once work has started.</li>
</ul>

<h3>COD refunds</h3>
<p>For Cash on Delivery orders, approved refunds are typically issued via bank transfer or JazzCash to the account details you provide — please allow a few business days after we receive the returned item.</p>

<h3>How to start a return</h3>
<p>WhatsApp <strong>03284010007</strong> or email <a href="mailto:info@crazzycars.pk">info@crazzycars.pk</a> with: order number, product name, reason, and clear photos. Do not refuse the parcel at the door without contacting us first if you need help with fitment.</p>
`.trim(),
  },
];

const LEGAL_FOOTER_LINKS = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms & Conditions", href: "/terms-conditions" },
  { label: "Shipping Policy", href: "/shipping-policy" },
  { label: "Returns Policy", href: "/returns-policy" },
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI missing in storecraft-store/.env.local");

  await mongoose.connect(uri, { bufferCommands: false });
  const db = mongoose.connection.db;

  for (const page of PAGES) {
    const result = await db.collection("pages").updateOne(
      { slug: page.slug },
      {
        $set: {
          ...page,
          status: "published",
          showInNav: false,
          showInInfoBar: true,
          sortOrder: 100,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
    console.log(
      `page ${page.slug}: ${result.upsertedCount ? "created" : "updated"} (${result.matchedCount} matched)`
    );
  }

  const settings =
    (await db.collection("settings").findOne({ singletonKey: "store_settings" })) ||
    (await db.collection("settings").findOne({}));

  if (!settings?._id) {
    console.warn("No settings document found — footer/announcement not updated");
  } else {
    const footer = settings.footer || {};
    const existingCare = Array.isArray(footer.customerCareLinks) ? footer.customerCareLinks : [];
    const withoutLegal = existingCare.filter(
      (l) => !LEGAL_FOOTER_LINKS.some((x) => x.href === l.href || x.label === l.label)
    );
    const customerCareLinks = [
      ...withoutLegal,
      ...LEGAL_FOOTER_LINKS,
    ];

    const bar = settings.announcementBar || {};
    const items = Array.isArray(bar.items) ? bar.items : [];
    const nextItems = items.map((item) => {
      const text = String(item.text || "");
      const link = String(item.link || "");
      if (link.includes("shipping-policy") || /free delivery/i.test(text)) {
        return {
          ...item,
          text: text.replace(/Rs\.?\s*2,?999/gi, `Rs. ${FREE_DELIVERY_RS.toLocaleString("en-PK")}`),
          link: "/shipping-policy",
          enabled: item.enabled !== false,
        };
      }
      return item;
    });

    // Ensure a delivery-fee announcement with working shipping-policy link
    if (!nextItems.some((i) => String(i.link || "").includes("shipping-policy"))) {
      nextItems.push({
        text: `Delivery Rs. ${STANDARD_DELIVERY_RS}`,
        link: "/shipping-policy",
        enabled: true,
      });
    }

    await db.collection("settings").updateOne(
      { _id: settings._id },
      {
        $set: {
          "footer.customerCareLinks": customerCareLinks,
          "announcementBar.items": nextItems,
          "announcementBar.enabled": bar.enabled !== false,
          "checkoutMessages.shippingNote": `Standard delivery is a flat Rs. ${STANDARD_DELIVERY_RS} on every order. There is no order-value waiver for delivery.`,
          updatedAt: new Date(),
        },
      }
    );
    console.log("settings: footer legal links + announcement shipping-policy link updated");
  }

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch(async (e) => {
  console.error(e);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
