#!/usr/bin/env node
/**
 * Phase 1A — create -800.webp / -1200.webp beside product masters.
 * - Never modifies/deletes originals
 * - Never upscales
 * - Idempotent (skips existing variants)
 * - Only masters in /media/products over 300 KB
 * - CSV log: source vs variant sizes
 *
 * Usage (on VPS, media at /app/media or MEDIA_ROOT):
 *   node ops/scripts/generate-product-image-variants.mjs
 *   node ops/scripts/generate-product-image-variants.mjs --dry-run
 */
import { createWriteStream } from "fs";
import { access, readdir, stat, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRY = process.argv.includes("--dry-run");
const QUALITY = 80;
// Default 0 = every product master (srcset always needs -800/-1200).
// Set MIN_MASTER_BYTES=307200 to only process heavy files.
const MIN_MASTER_BYTES = Number(process.env.MIN_MASTER_BYTES || 0);
const VARIANTS = [
  { kind: "800", maxWidth: 800 },
  { kind: "1200", maxWidth: 1200 },
];

const MEDIA_ROOT = process.env.MEDIA_ROOT || "/app/media";
const PRODUCTS = path.join(MEDIA_ROOT, "products");
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const CSV_OUT =
  process.env.VARIANT_CSV ||
  path.join("/tmp", `product-variants-${stamp}.csv`);

const DERIV_RE = /-(400|sm|800|1200|full)\.(webp|jpe?g|png|gif|avif)$/i;
const MASTER_EXT = /\.(webp|jpe?g|png|gif|avif)$/i;

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

function isMasterName(name) {
  if (!MASTER_EXT.test(name)) return false;
  if (DERIV_RE.test(name)) return false;
  return true;
}

async function main() {
  const sharp = (await import("sharp")).default;
  const entries = await readdir(PRODUCTS);
  const masters = [];
  for (const name of entries) {
    if (!isMasterName(name)) continue;
    const abs = path.join(PRODUCTS, name);
    let st;
    try {
      st = await stat(abs);
    } catch {
      continue;
    }
    if (!st.isFile() || st.size < MIN_MASTER_BYTES) continue;
    masters.push({ name, abs, size: st.size });
  }
  masters.sort((a, b) => b.size - a.size);

  const rows = [
    "path,source_bytes,source_kb,width,height,variant,variant_path,variant_bytes,variant_kb,action,note",
  ];
  let built = 0;
  let skipped = 0;
  let failed = 0;

  console.log(
    JSON.stringify({
      mediaRoot: MEDIA_ROOT,
      products: PRODUCTS,
      mastersOver300kb: masters.length,
      dryRun: DRY,
      csv: CSV_OUT,
      quality: QUALITY,
    })
  );

  for (const m of masters) {
    let meta;
    try {
      meta = await sharp(m.abs, { failOn: "none" }).metadata();
    } catch (err) {
      failed += 1;
      rows.push(
        [
          `/media/products/${m.name}`,
          m.size,
          (m.size / 1024).toFixed(1),
          "",
          "",
          "",
          "",
          "",
          "",
          "fail_meta",
          String(err?.message || err).replace(/,/g, ";"),
        ].join(",")
      );
      continue;
    }
    const srcW = Number(meta.width) || 0;
    const srcH = Number(meta.height) || 0;
    const stem = m.name.replace(MASTER_EXT, "");

    for (const { kind, maxWidth } of VARIANTS) {
      const outName = `${stem}-${kind}.webp`;
      const outAbs = path.join(PRODUCTS, outName);
      const relOut = `/media/products/${outName}`;
      if (await exists(outAbs)) {
        const ost = await stat(outAbs);
        skipped += 1;
        rows.push(
          [
            `/media/products/${m.name}`,
            m.size,
            (m.size / 1024).toFixed(1),
            srcW,
            srcH,
            kind,
            relOut,
            ost.size,
            (ost.size / 1024).toFixed(1),
            "skip_exists",
            "",
          ].join(",")
        );
        continue;
      }

      if (DRY) {
        built += 1;
        rows.push(
          [
            `/media/products/${m.name}`,
            m.size,
            (m.size / 1024).toFixed(1),
            srcW,
            srcH,
            kind,
            relOut,
            "",
            "",
            "would_build",
            srcW && srcW <= maxWidth ? "no_upscale_native_width" : "",
          ].join(",")
        );
        continue;
      }

      try {
        const targetW =
          srcW > 0 ? Math.min(srcW, maxWidth) : maxWidth;
        // withoutEnlargement: never upscale; if already narrower, keep native width.
        await sharp(m.abs, { failOn: "none" })
          .rotate()
          .resize({
            width: targetW,
            withoutEnlargement: true,
            fit: "inside",
          })
          .webp({ quality: QUALITY, effort: 4 })
          .toFile(outAbs);
        const ost = await stat(outAbs);
        built += 1;
        rows.push(
          [
            `/media/products/${m.name}`,
            m.size,
            (m.size / 1024).toFixed(1),
            srcW,
            srcH,
            kind,
            relOut,
            ost.size,
            (ost.size / 1024).toFixed(1),
            "built",
            `targetW=${targetW}`,
          ].join(",")
        );
        if (built % 50 === 0) {
          console.log(JSON.stringify({ progress: built, skipped, failed }));
        }
      } catch (err) {
        failed += 1;
        rows.push(
          [
            `/media/products/${m.name}`,
            m.size,
            (m.size / 1024).toFixed(1),
            srcW,
            srcH,
            kind,
            relOut,
            "",
            "",
            "fail",
            String(err?.message || err).replace(/,/g, ";"),
          ].join(",")
        );
      }
    }
  }

  await writeFile(CSV_OUT, rows.join("\n") + "\n", "utf8");
  // also copy beside media for persistence
  const persistCsv = path.join(
    MEDIA_ROOT,
    `_reports`,
    `product-variants-${stamp}.csv`
  );
  try {
    const { mkdir } = await import("fs/promises");
    await mkdir(path.dirname(persistCsv), { recursive: true });
    await writeFile(persistCsv, rows.join("\n") + "\n", "utf8");
  } catch {
    /* /tmp csv is enough */
  }

  console.log(
    JSON.stringify({
      done: true,
      built,
      skipped,
      failed,
      csv: CSV_OUT,
      persistCsv,
    })
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
