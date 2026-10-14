/**
 * Resize a local image to max width 1200 (WebP).
 * Usage: node scripts/resize-media-max-width.mjs <input> [output]
 * Does not upload — copy the output onto the media host when ready.
 */
import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const input = process.argv[2];
const output =
  process.argv[3] ||
  (input
    ? input.replace(/(\.\w+)$/, "-1200.webp")
    : path.join("scripts/assets", "resized-1200.webp"));

if (!input || !fs.existsSync(input)) {
  console.error("Usage: node scripts/resize-media-max-width.mjs <input> [output]");
  process.exit(1);
}

const meta = await sharp(input).metadata();
await sharp(input)
  .resize({ width: 1200, withoutEnlargement: true })
  .webp({ quality: 82 })
  .toFile(output);
const outMeta = await sharp(output).metadata();
const size = fs.statSync(output).size;
console.log(
  JSON.stringify(
    {
      input: { width: meta.width, height: meta.height },
      output: { path: output, width: outMeta.width, height: outMeta.height, bytes: size },
    },
    null,
    2
  )
);
