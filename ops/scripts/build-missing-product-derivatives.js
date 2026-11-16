/**
 * Build missing -400.webp / -sm.webp beside product masters under MEDIA_ROOT.
 * Dry-run by default. APPLY=1 to write.
 *
 * Usage (inside crazzycars-admin, MEDIA_ROOT mounted):
 *   node /app/build-missing-product-derivatives.js
 *   APPLY=1 node /app/build-missing-product-derivatives.js
 */
const fs = require("fs");
const path = require("path");

const APPLY = process.env.APPLY === "1";
const ROOT = process.env.MEDIA_ROOT || "/app/media";
const PRODUCTS = path.join(ROOT, "products");

function isMaster(name) {
  return /\.(webp|jpe?g|png|gif|avif)$/i.test(name) && !/-(400|sm|800)\./i.test(name);
}

async function main() {
  const sharp = require("sharp");
  const names = fs.readdirSync(PRODUCTS).filter(isMaster);
  const plan = [];
  for (const name of names) {
    const abs = path.join(PRODUCTS, name);
    const stem = abs.replace(/\.(webp|jpe?g|png|gif|avif)$/i, "");
    const need400 = !fs.existsSync(`${stem}-400.webp`);
    const needSm = !fs.existsSync(`${stem}-sm.webp`);
    if (!need400 && !needSm) continue;
    plan.push({ name, abs, stem, need400, needSm });
  }
  console.log(JSON.stringify({ root: PRODUCTS, missing: plan.length, apply: APPLY }, null, 2));
  if (!APPLY) {
    console.log(JSON.stringify(plan.map((p) => ({ name: p.name, need400: p.need400, needSm: p.needSm })), null, 2));
    console.log("DRY_RUN — re-run with APPLY=1 to build");
    return;
  }
  const results = [];
  for (const p of plan) {
    const built = [];
    try {
      if (p.need400) {
        await sharp(p.abs)
          .rotate()
          .resize(400, 400, { fit: "cover", position: "centre", withoutEnlargement: false })
          .webp({ quality: 72, effort: 4 })
          .toFile(`${p.stem}-400.webp`);
        built.push("400");
      }
      if (p.needSm) {
        await sharp(p.abs)
          .rotate()
          .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 80, effort: 4 })
          .toFile(`${p.stem}-sm.webp`);
        built.push("sm");
      }
      results.push({ name: p.name, status: "built", built });
    } catch (err) {
      results.push({ name: p.name, status: "error", error: String(err?.message || err) });
    }
  }
  console.log(JSON.stringify({ built: results.filter((r) => r.status === "built").length, errors: results.filter((r) => r.status === "error").length, results }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
