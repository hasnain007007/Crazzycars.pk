/**
 * Upload a hero banner image as-is (no client WebP crush) and set it on the
 * active homepage hero_slider banner.
 *
 * Usage:
 *   node --env-file=.env.local scripts/set-hero-banner.mjs /path/to/banner.png
 */
import { readFileSync } from "fs";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const Banner = require("../lib/models/Banner.model.js").default;

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node --env-file=.env.local scripts/set-hero-banner.mjs <image-path>");
  process.exit(1);
}

const cloudName =
  process.env.CLOUDINARY_CLOUD_NAME ||
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD ||
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;
const mongo = process.env.MONGODB_URI;

if (!cloudName || !apiKey || !apiSecret) {
  console.error("Missing Cloudinary credentials");
  process.exit(1);
}
if (!mongo) {
  console.error("Missing MONGODB_URI");
  process.exit(1);
}

cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

const abs = path.resolve(filePath);
const buffer = readFileSync(abs);
const ext = path.extname(abs).toLowerCase() || ".jpg";
const mime =
  ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : ext === ".gif" ? "image/gif" : "image/jpeg";

console.log("Uploading", abs, `(${buffer.length} bytes)`);

const dataUri = `data:${mime};base64,${buffer.toString("base64")}`;
const result = await cloudinary.uploader.upload(dataUri, {
  folder: "storecraft/banners",
  public_id: `homepage-hero-${Date.now()}`,
  resource_type: "image",
  overwrite: true,
  // Keep original quality — do not apply eager transforms
  quality: "auto:best",
});

console.log("Cloudinary:", {
  url: result.secure_url,
  publicId: result.public_id,
  width: result.width,
  height: result.height,
  bytes: result.bytes,
  format: result.format,
});

await mongoose.connect(mongo, { bufferCommands: false });

const banner =
  (await Banner.findOne({ placement: "hero_slider", isActive: true }).sort({ sortOrder: 1, createdAt: -1 })) ||
  (await Banner.findOne({ placement: "hero_slider" }).sort({ sortOrder: 1, createdAt: -1 }));

if (!banner) {
  console.error("No hero_slider banner found");
  await mongoose.disconnect();
  process.exit(1);
}

banner.background = banner.background || {};
banner.background.type = "image";
banner.background.image = {
  ...(banner.background.image?.toObject?.() || banner.background.image || {}),
  url: result.secure_url,
  publicId: result.public_id,
  width: result.width,
  height: result.height,
  imageName: path.basename(abs, ext),
  altText: banner.background.image?.altText || "Homefy.pk premium car accessories",
};
// Designed artwork — no HTML text overlays
if (banner.content) {
  if (banner.content.heading) banner.content.heading.text = "";
  if (banner.content.subheading) banner.content.subheading.text = "";
}
banner.imageDisplay = {
  ...(banner.imageDisplay?.toObject?.() || banner.imageDisplay || {}),
  height: "auto",
  objectFit: "contain",
  objectPosition: "center",
  hoverZoom: false,
  overlay: { enabled: false, color: "rgba(0,0,0,0.3)", opacity: 0 },
};

await banner.save();
console.log("Updated banner", banner._id.toString());
await mongoose.disconnect();
console.log("Done. Hard-refresh https://homefy.pk/");
