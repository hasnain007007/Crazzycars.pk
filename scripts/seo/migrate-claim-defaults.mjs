#!/usr/bin/env node
/**
 * Guarded settings migration: only rewrite known old default strings.
 * Default --dry-run. Pass --apply to write.
 * Trust badges migrate independently of tagline/shipping plan.
 */
import mongoose from "mongoose";

const OLD_TAGLINE = "The original performance-parts shop in Gujranwala";
const NEW_TAGLINE = "Car accessories shop in Gujranwala since 2023";
const OLD_SHIPPING =
  "Standard delivery is a flat Rs. 250 on every order. There is no order-value waiver for delivery.";
const NEW_SHIPPING =
  "Delivery is Rs 250, or Rs 500 if the order has bulky items. COD on eligible items with a Rs 300 / 600 / 1,000 booking advance (by order value), deducted from your total. Body kits are prepaid only.";
const OLD_BADGE = "Premium Quality";
const NEW_BADGE = "Checked for Fit and Finish";
const OLD_SUB = "Exceptional Standards";
const NEW_SUB = "Inspected before dispatch";
const OLD_SECURE = "100% Secure Checkout";
const NEW_SECURE = "Secure Checkout";

const apply = process.argv.includes("--apply");
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.log("No MONGODB_URI — printing plan only.");
  console.log({
    OLD_TAGLINE,
    NEW_TAGLINE,
    OLD_SHIPPING,
    NEW_SHIPPING,
    badgePlan: [
      `${OLD_BADGE} → ${NEW_BADGE}`,
      `${OLD_SUB} → ${NEW_SUB}`,
      `${OLD_SECURE} → ${NEW_SECURE}`,
    ],
    apply,
  });
  process.exit(0);
}

await mongoose.connect(uri);
const col = mongoose.connection.collection("settings");
const doc = await col.findOne({});
const plan = [];
const badgeChanges = [];

if (doc?.footer?.tagline === OLD_TAGLINE) plan.push("footer.tagline");
if (doc?.checkoutMessages?.shippingNote === OLD_SHIPPING) {
  plan.push("checkoutMessages.shippingNote");
}

const badges = Array.isArray(doc?.productBadges?.trustBadges)
  ? doc.productBadges.trustBadges
  : [];
const nextBadges = badges.map((b, i) => {
  const out = { ...b };
  const before = { text: out.text, subtext: out.subtext };
  if (out.text === OLD_BADGE) out.text = NEW_BADGE;
  if (out.subtext === OLD_SUB) out.subtext = NEW_SUB;
  if (out.subtext === OLD_SECURE) out.subtext = NEW_SECURE;
  if (before.text !== out.text || before.subtext !== out.subtext) {
    badgeChanges.push({ index: i, from: before, to: { text: out.text, subtext: out.subtext } });
  }
  return out;
});
if (badgeChanges.length) plan.push("productBadges.trustBadges");

console.log(
  JSON.stringify(
    {
      apply,
      dryRun: !apply,
      plan,
      badgeChanges,
      willWrite: apply && plan.length > 0,
    },
    null,
    2
  )
);

if (apply && plan.length) {
  const $set = {};
  if (plan.includes("footer.tagline")) $set["footer.tagline"] = NEW_TAGLINE;
  if (plan.includes("checkoutMessages.shippingNote")) {
    $set["checkoutMessages.shippingNote"] = NEW_SHIPPING;
  }
  if (plan.includes("productBadges.trustBadges")) {
    $set["productBadges.trustBadges"] = nextBadges;
  }
  await col.updateOne({ _id: doc._id }, { $set });
  console.log("updated", Object.keys($set));
}
await mongoose.disconnect();
