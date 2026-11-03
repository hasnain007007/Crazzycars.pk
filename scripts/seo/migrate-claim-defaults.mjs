#!/usr/bin/env node
/**
 * Guarded settings migration: only rewrite known old default strings.
 * Default --dry-run. Pass --apply to write.
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

const apply = process.argv.includes("--apply");
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.log("No MONGODB_URI — printing plan only.");
  console.log({ OLD_TAGLINE, NEW_TAGLINE, OLD_SHIPPING, NEW_SHIPPING, apply });
  process.exit(0);
}

await mongoose.connect(uri);
const col = mongoose.connection.collection("settings");
const doc = await col.findOne({});
const plan = [];
if (doc?.footer?.tagline === OLD_TAGLINE) plan.push("footer.tagline");
if (doc?.checkoutMessages?.shippingNote === OLD_SHIPPING) plan.push("checkoutMessages.shippingNote");
console.log({ apply, plan, dryRun: !apply });
if (apply && plan.length) {
  const $set = {};
  if (plan.includes("footer.tagline")) $set["footer.tagline"] = NEW_TAGLINE;
  if (plan.includes("checkoutMessages.shippingNote")) {
    $set["checkoutMessages.shippingNote"] = NEW_SHIPPING;
  }
  // Trust badges: only rewrite exact old defaults
  if (Array.isArray(doc?.productBadges?.trustBadges)) {
    const next = doc.productBadges.trustBadges.map((b) => {
      const out = { ...b };
      if (out.text === OLD_BADGE) out.text = NEW_BADGE;
      if (out.subtext === OLD_SUB) out.subtext = NEW_SUB;
      if (out.subtext === "100% Secure Checkout") out.subtext = "Secure Checkout";
      return out;
    });
    $set["productBadges.trustBadges"] = next;
  }
  await col.updateOne({ _id: doc._id }, { $set });
  console.log("updated", Object.keys($set));
}
await mongoose.disconnect();
