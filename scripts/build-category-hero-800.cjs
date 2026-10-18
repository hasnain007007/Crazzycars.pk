/**
 * Create missing category/upload/brand *-800.webp heroes (never overwrite).
 *
 * Dry-run (default):
 *   docker exec -w /app <store-cid> node /tmp/build-category-hero-800.cjs
 *
 * Apply:
 *   docker exec -w /app <store-cid> node /tmp/build-category-hero-800.cjs --apply
 */
const fs = require("fs");
const path = require("path");
const sharp = require("/app/node_modules/sharp");

const APPLY = process.argv.includes("--apply");
const MEDIA = process.env.MEDIA_ROOT || "/app/media";
const DIRS = ["categories", "uploads", "brand"];
const EXT_RE = /\.(webp|jpe?g|png|gif|avif)$/i;
const SKIP_RE = /-(400|800)\.(webp|jpe?g|png)$/i;

function outName(filename) {
  return filename.replace(EXT_RE, "-800.webp");
}

async function processDir(dirName) {
  const dir = path.join(MEDIA, dirName);
  if (!fs.existsSync(dir)) {
    return { dir: dirName, masters: 0, wouldCreate: 0, created: 0, skippedExisting: 0, failed: 0, missing: [] };
  }
  const files = fs.readdirSync(dir).filter((n) => EXT_RE.test(n) && !SKIP_RE.test(n));
  let wouldCreate = 0;
  let created = 0;
  let skippedExisting = 0;
  let failed = 0;
  const missing = [];
  const failSamples = [];

  for (const name of files) {
    const abs = path.join(dir, name);
    const outAbs = path.join(dir, outName(name));
    if (fs.existsSync(outAbs) && fs.statSync(outAbs).size > 400) {
      skippedExisting += 1;
      continue;
    }
    missing.push(path.join(dirName, outName(name)));
    wouldCreate += 1;
    if (!APPLY) continue;
    try {
      await sharp(abs)
        .rotate()
        .resize(800, null, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 78, effort: 4 })
        .toFile(outAbs);
      created += 1;
    } catch (e) {
      failed += 1;
      if (failSamples.length < 8) {
        failSamples.push({ name, reason: String(e.message || e).slice(0, 100) });
      }
    }
  }

  return {
    dir: dirName,
    masters: files.length,
    wouldCreate,
    created,
    skippedExisting,
    failed,
    missing,
    failSamples,
  };
}

(async () => {
  const results = [];
  for (const d of DIRS) results.push(await processDir(d));
  const allMissing = results.flatMap((r) => r.missing);
  console.log(
    JSON.stringify(
      {
        apply: APPLY,
        media: MEDIA,
        missingCount: allMissing.length,
        missing: allMissing,
        results: results.map(({ missing, ...rest }) => rest),
      },
      null,
      2
    )
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
