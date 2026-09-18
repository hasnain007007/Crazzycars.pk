/**
 * Build missing *-400.webp thumbs for categories, products, and uploads.
 * Fixes blank Shop-by-Category circles + broken product cards after media sync.
 *
 *   docker exec -w /app <cid> node /tmp/build-all-media-thumbs-400.cjs --apply
 */
const fs = require("fs");
const path = require("path");
const sharp = require("/app/node_modules/sharp");

const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");
const MEDIA = process.env.MEDIA_ROOT || "/app/media";
const DIRS = ["categories", "products", "uploads", "blogs", "vehicles", "brand"];
const EXT_RE = /\.(webp|jpe?g|png|gif|avif)$/i;

function thumbName(filename) {
  return filename.replace(EXT_RE, "-400.webp");
}

async function processDir(dirName) {
  const dir = path.join(MEDIA, dirName);
  if (!fs.existsSync(dir)) return { dir: dirName, made: 0, skipped: 0, failed: 0, missing: 0 };
  const files = fs
    .readdirSync(dir)
    .filter((n) => EXT_RE.test(n) && !/-400\.(webp|jpe?g|png)$/i.test(n));
  let made = 0;
  let skipped = 0;
  let failed = 0;
  const failSamples = [];
  for (const name of files) {
    const abs = path.join(dir, name);
    const outAbs = path.join(dir, thumbName(name));
    if (!FORCE && fs.existsSync(outAbs) && fs.statSync(outAbs).size > 400) {
      skipped += 1;
      continue;
    }
    if (!APPLY) {
      made += 1;
      continue;
    }
    try {
      const st = fs.statSync(abs);
      if (st.size < 800) {
        failed += 1;
        if (failSamples.length < 8) failSamples.push({ name, reason: "tiny-source", size: st.size });
        continue;
      }
      await sharp(abs)
        .rotate()
        .resize(400, 400, { fit: "cover", position: "centre", withoutEnlargement: false })
        .webp({ quality: 72, effort: 4 })
        .toFile(outAbs);
      made += 1;
    } catch (e) {
      failed += 1;
      if (failSamples.length < 8) failSamples.push({ name, reason: String(e.message || e).slice(0, 80) });
    }
  }
  return { dir: dirName, files: files.length, made, skipped, failed, failSamples };
}

(async () => {
  const results = [];
  for (const d of DIRS) results.push(await processDir(d));
  console.log(JSON.stringify({ apply: APPLY, results }, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
