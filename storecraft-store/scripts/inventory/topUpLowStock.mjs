/**
 * Add stock to every low-stock product: tracked quantity at or below its low-stock threshold
 * (inventory.lowStockThreshold, default 5), including out-of-stock items. Variant combinations
 * with low stock get the same top-up.
 *
 * Usage (from storecraft-store, on the server with the production MONGODB_URI):
 *   node --env-file=.env.local scripts/inventory/topUpLowStock.mjs            # dry run: lists changes
 *   node --env-file=.env.local scripts/inventory/topUpLowStock.mjs --apply    # write + backup file
 *   node --env-file=.env.local scripts/inventory/topUpLowStock.mjs --add=500  # different amount
 *   node --env-file=.env.local scripts/inventory/topUpLowStock.mjs --restore=<backup.json>
 *
 * --apply first writes a JSON backup of every changed quantity, so --restore can undo it exactly.
 */
import fs from "node:fs";
import mongoose from "mongoose";
import Product from "../../lib/models/Product.model.js";

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const ADD = Number((args.find((a) => a.startsWith("--add=")) || "--add=1000").split("=")[1]);
const RESTORE = (args.find((a) => a.startsWith("--restore=")) || "").split("=")[1] || "";

export function lowStockChanges(products, add = 1000) {
  const changes = [];
  for (const p of products) {
    const threshold = Number(p?.inventory?.lowStockThreshold) || 5;
    const tracked = p?.inventory?.trackInventory !== false;
    const qty = Number(p?.inventory?.quantity ?? 0);
    const combos = [];
    for (const [i, c] of (p.variationCombinations || []).entries()) {
      const s = Number(c?.stock ?? 0);
      if (s <= threshold) combos.push({ index: i, from: s, to: Math.max(0, s) + add });
    }
    const productLow = tracked && qty <= threshold;
    if (productLow || combos.length) {
      changes.push({
        id: String(p._id),
        slug: p.slug,
        name: p.name,
        product: productLow ? { from: qty, to: Math.max(0, qty) + add } : null,
        combos,
      });
    }
  }
  return changes;
}

async function restore(file) {
  const rows = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const r of rows) {
    const set = {};
    if (r.product) set["inventory.quantity"] = r.product.from;
    for (const c of r.combos) set[`variationCombinations.${c.index}.stock`] = c.from;
    await Product.updateOne({ _id: r.id }, { $set: set });
  }
  console.log(`Restored ${rows.length} products from ${file}`);
}

async function main() {
  if (!MONGO_URI) throw new Error("MONGODB_URI is not set");
  if (!Number.isFinite(ADD) || ADD <= 0 || ADD > 100000) throw new Error("--add must be 1..100000");
  await mongoose.connect(MONGO_URI);
  console.log(`Database: ${mongoose.connection.db.databaseName}`);
  if (RESTORE) {
    await restore(RESTORE);
    return mongoose.disconnect();
  }

  const products = await Product.find({ status: "active" })
    .select("name slug inventory variationCombinations.stock")
    .lean();
  const changes = lowStockChanges(products, ADD);

  for (const c of changes) {
    const parts = [];
    if (c.product) parts.push(`stock ${c.product.from} → ${c.product.to}`);
    if (c.combos.length) parts.push(`${c.combos.length} variant(s) +${ADD}`);
    console.log(`  ${c.name}  (${parts.join(", ")})`);
  }
  console.log(`${changes.length} low-stock product(s) of ${products.length} active.`);

  if (!APPLY) {
    console.log("Dry run — nothing written. Re-run with --apply.");
    return mongoose.disconnect();
  }
  if (!changes.length) return mongoose.disconnect();

  const backup = `low-stock-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  fs.writeFileSync(backup, JSON.stringify(changes, null, 2));
  console.log(`Backup of previous quantities: ${backup}`);

  for (const c of changes) {
    const set = {};
    if (c.product) set["inventory.quantity"] = c.product.to;
    for (const v of c.combos) set[`variationCombinations.${v.index}.stock`] = v.to;
    await Product.updateOne({ _id: c.id }, { $set: set });
  }
  console.log(`Updated ${changes.length} product(s). Undo: --restore=${backup}`);
  await mongoose.disconnect();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
