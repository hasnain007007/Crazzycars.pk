#!/usr/bin/env node
/**
 * Policy content + category corrections (idempotent).
 *
 * Default: dry-run (no writes).
 * Apply:   node scripts/migrations/2026-11-05-policy-content-and-categories.mjs --apply
 *
 * Targets MONGODB_URI (or --uri=…). Prefer a verified DB:
 *   - local/dev: sialkot_motorsports (from storecraft-store/.env.local)
 *   - live Coolify: crazzycars_motorsports — DO NOT --apply against production
 *     unless explicitly authorized; this task prepared the script only.
 *
 * Fixes:
 *  1) Prius duplicate metaDescription → generation-specific copy from carPageMeta
 *  2) Remove door-handle-covers from interior door-panel products (keep interior + carbon)
 *  3) Sanitize Settings.storePayment.advancePaymentMessage fitment-refund claims
 *  4) Rewrite delivery + returns policy blogs when present (content + SEO)
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { createRequire } from "module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const STORE = join(ROOT, "storecraft-store");
const requireFromStore = createRequire(join(STORE, "package.json"));
const mongoose = requireFromStore("mongoose");

const { getCarPageMeta } = await import(
  pathToFileURL(join(STORE, "lib/seo/carPageMeta2026-10.mjs")).href
);
const {
  policyBlogCanonicalMeta,
  scrubPolicyConflictHtml,
  scrubPolicyConflictPlain,
} = await import(pathToFileURL(join(STORE, "lib/scrubPolicyConflictCopy.js")).href);
const {
  defaultAdvancePaymentMessage,
  sanitizeAdvancePaymentMessage,
  returnsPolicyCanonical,
} = await import(pathToFileURL(join(STORE, "lib/storePolicyCopy.js")).href);
const { STORE_POLICY } = await import(
  pathToFileURL(join(STORE, "config/store-policy.js")).href
);
const { COD_ADVANCE_TIERS } = await import(
  pathToFileURL(join(STORE, "config/checkout-money.js")).href
);

function loadEnvUri() {
  for (const p of [
    resolve(ROOT, "storecraft-store/.env.local"),
    resolve(ROOT, ".env.local"),
    resolve(ROOT, ".env"),
  ]) {
    if (!existsSync(p)) continue;
    const raw = readFileSync(p, "utf8");
    const line = raw.split("\n").find((l) => l.startsWith("MONGODB_URI="));
    if (line) return line.slice("MONGODB_URI=".length).replace(/^["']|["']$/g, "");
  }
  return process.env.MONGODB_URI || "";
}

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const uriArg = args.find((a) => a.startsWith("--uri="))?.slice("--uri=".length);
const URI = uriArg || loadEnvUri();

function pkr(n) {
  return `Rs. ${Number(n).toLocaleString("en-PK")}`;
}

function deliveryBlogBody() {
  const regular = pkr(STORE_POLICY.shipping.standardFeePKR);
  const bulky = pkr(STORE_POLICY.shipping.bulkyFeePKR);
  const [a, b, c] = COD_ADVANCE_TIERS;
  return `<p>CrazzyCars delivery is <strong>${regular} regular</strong>, or <strong>${bulky}</strong> when the order includes bulky items (for example splitters, side skirts, spoilers, floor mats, or any product marked bulky). There is no order-value free-shipping waiver. Checkout always shows the fee before you confirm.</p>
<h2>Regular vs bulky</h2>
<ul>
  <li><strong>Regular carts</strong> — ${regular} delivery floor (or the courier zone rate if higher).</li>
  <li><strong>Bulky carts</strong> — ${bulky} delivery floor when any bulky line is in the order (not stacked per item).</li>
</ul>
<h2>COD booking advance</h2>
<p>For COD-eligible items, a booking advance is required by order total. It is <strong>deducted from your total</strong> — not an extra fee on top of delivery:</p>
<ul>
  <li>Orders under ${pkr(a.below)} — advance <strong>${pkr(a.amount)}</strong></li>
  <li>Orders ${pkr(a.below)}–${pkr(b.below - 1)} — advance <strong>${pkr(b.amount)}</strong></li>
  <li>Orders ${pkr(b.below)} and above — advance <strong>${pkr(c.amount)}</strong></li>
</ul>
<p>Body kits cannot use Cash on Delivery — pay in full (JazzCash, Meezan, or bank transfer) before we ship. Spoilers and Express (Daewoo) may show a different courier fee at checkout.</p>
<p>See the full rules on our <a href="/shipping-policy">Shipping Policy</a> and <a href="/advance-payment">Advance Payment</a> pages.</p>`;
}

function returnsBlogBody() {
  const days = STORE_POLICY.returns.windowDays;
  return `<p>${returnsPolicyCanonical()} This page is plain-language; our full policy is at <a href="/returns-policy">Returns Policy</a>.</p>
<h2>When you receive a full refund</h2>
<ul>
  <li>Item arrives defective or damaged in transit</li>
  <li>We shipped the wrong item</li>
  <li>We listed incorrect compatibility and the part cannot fit the vehicle we claimed</li>
</ul>
<p>Contact us within ${days} days of delivery with your order number and photos.</p>
<h2>Not eligible</h2>
<ul>
  <li>Change of mind, wrong colour/style preference, or ordered two styles to “decide later”</li>
  <li>Buyer-selected wrong model, year, size, or part when the listing fitment was clear</li>
  <li>Installed, modified, damaged-by-use, or missing-parts items</li>
</ul>
<h2>How to start a claim</h2>
<p>Message WhatsApp with RETURN in the first line, your order number, and clear photos. For eligible defective/wrong-item returns, the store pays return shipping per our returns policy.</p>`;
}

const INTERIOR_DOOR_SLUG_RE =
  /interior-door-(panels|handle-panels)|carbon-fiber-interior-door/i;

async function main() {
  if (!URI) {
    console.error("No MONGODB_URI. Pass --uri=… or set storecraft-store/.env.local");
    process.exit(1);
  }
  const safeUri = URI.replace(/\/\/[^@]+@/, "//***@");
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}`);
  console.log(`URI:  ${safeUri}`);

  await mongoose.connect(URI, { serverSelectionTimeoutMS: 20000 });
  const db = mongoose.connection.db;
  console.log(`DB:   ${db.databaseName}`);

  const report = { prius: [], categories: [], settings: null, blogs: [] };

  // 1) Prius metas
  for (const slug of ["toyota-prius-2004-2009", "toyota-prius-2009-2015", "toyota-prius-2016-2022"]) {
    const meta = getCarPageMeta(slug);
    const v = await db.collection("vehicles").findOne({ slug });
    if (!v) {
      report.prius.push({ slug, status: "missing" });
      continue;
    }
    const nextDesc = meta?.description || "";
    const cur = String(v.metaDescription || "");
    const change = cur !== nextDesc;
    report.prius.push({ slug, change, before: cur.slice(0, 100), after: nextDesc.slice(0, 100) });
    if (APPLY && change && nextDesc) {
      await db.collection("vehicles").updateOne(
        { _id: v._id },
        { $set: { metaDescription: nextDesc, updatedAt: new Date() } }
      );
    }
  }

  // 2) Category: interior door panels wrongly also in exterior child door-handle-covers
  const dhc = await db.collection("categories").findOne({ slug: "door-handle-covers" });
  const interior = await db.collection("categories").findOne({ slug: "interior" });
  if (dhc) {
    const products = await db
      .collection("products")
      .find({
        status: "active",
        categories: dhc._id,
        $or: [{ slug: INTERIOR_DOOR_SLUG_RE }, { name: /interior door (panel|handle panel)/i }],
      })
      .project({ slug: 1, name: 1, categories: 1 })
      .toArray();

    for (const p of products) {
      const before = (p.categories || []).map(String);
      const next = before.filter((id) => id !== String(dhc._id));
      // Ensure interior stays assigned when we remove the exterior child.
      if (interior && !next.includes(String(interior._id))) next.push(String(interior._id));
      const change = before.join(",") !== next.join(",");
      report.categories.push({
        slug: p.slug,
        name: p.name,
        change,
        remove: "door-handle-covers",
        beforeCount: before.length,
        afterCount: next.length,
      });
      if (APPLY && change) {
        await db.collection("products").updateOne(
          { _id: p._id },
          {
            $set: {
              categories: next.map((id) => new mongoose.Types.ObjectId(id)),
              updatedAt: new Date(),
            },
          }
        );
      }
    }
  } else {
    report.categories.push({ status: "door-handle-covers missing" });
  }

  // 3) Settings advance message
  const settings = await db.collection("settings").findOne({});
  if (settings?.storePayment) {
    const before = String(settings.storePayment.advancePaymentMessage || "");
    const after = sanitizeAdvancePaymentMessage(before || defaultAdvancePaymentMessage());
    report.settings = { change: before !== after, before: before.slice(0, 160), after: after.slice(0, 160) };
    if (APPLY && before !== after) {
      await db.collection("settings").updateOne(
        { _id: settings._id },
        { $set: { "storePayment.advancePaymentMessage": after, updatedAt: new Date() } }
      );
    }
  }

  // 4) Policy blogs (when present on this DB)
  for (const slug of [
    "delivery-charges-regular-vs-bulky-pakistan",
    "car-accessories-returns-wrong-item-pakistan",
  ]) {
    const post = await db.collection("blogposts").findOne({ slug });
    if (!post) {
      report.blogs.push({ slug, status: "missing-on-this-db" });
      continue;
    }
    const canon = policyBlogCanonicalMeta(slug);
    const nextContent =
      slug.startsWith("delivery") ? deliveryBlogBody() : returnsBlogBody();
    const nextSeo = {
      ...(post.seo || {}),
      metaTitle: canon.title,
      metaDescription: canon.metaDescription,
    };
    const nextExcerpt = scrubPolicyConflictPlain(canon.excerpt);
    report.blogs.push({
      slug,
      change: true,
      beforeMeta: String(post.seo?.metaDescription || post.excerpt || "").slice(0, 120),
      afterMeta: nextExcerpt.slice(0, 120),
      contentPreview: scrubPolicyConflictHtml(nextContent).slice(0, 160),
    });
    if (APPLY) {
      await db.collection("blogposts").updateOne(
        { _id: post._id },
        {
          $set: {
            content: nextContent,
            excerpt: nextExcerpt,
            seo: nextSeo,
            title: canon.title,
            updatedAt: new Date(),
          },
        }
      );
    }
  }

  console.log(JSON.stringify(report, null, 2));
  console.log(APPLY ? "\nApplied." : "\nDry-run only. Re-run with --apply to write.");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
