/**
 * Normalize store brand vendor strings and trim stray warehouse city codes (TXR/LHR/PSH).
 *
 * Maps CRAZZYCARS.PK / CrazzyCars / crazzycars.pk → CrazzyCars.pk
 * Trailing city codes are stripped from vendor/brand and added as tag city:CODE when missing.
 *
 * Usage:
 *   node scripts/normalize-vendors.mjs --dry-run
 *   node scripts/normalize-vendors.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Product from "../lib/models/Product.model.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const dryRun = process.argv.includes("--dry-run");
const CANONICAL_VENDOR = "CrazzyCars.pk";
const CITY_CODES = new Set(["TXR", "LHR", "PSH"]);

function normalizeWhitespace(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ");
}

function isCanonicalAlias(value) {
  const compact = normalizeWhitespace(value).replace(/\./g, "").replace(/\s/g, "").toLowerCase();
  return compact === "crazzycars" || compact === "crazzycarspk";
}

function stripTrailingCityCode(value) {
  let v = normalizeWhitespace(value);
  if (!v) return { value: v, city: null };

  const onlyCity = v.match(/^(TXR|LHR|PSH)$/i);
  if (onlyCity) {
    return { value: "", city: onlyCity[1].toUpperCase() };
  }

  const suffix = v.match(/\s[-–|/]?\s*(TXR|LHR|PSH)\s*$/i);
  if (suffix) {
    v = v.slice(0, suffix.index).trim();
    return { value: v, city: suffix[1].toUpperCase() };
  }

  return { value: v, city: null };
}

function normalizeVendorField(raw) {
  const { value: afterCity, city } = stripTrailingCityCode(raw);
  let value = afterCity;
  let changed = normalizeWhitespace(raw) !== value || city != null;

  if (value && isCanonicalAlias(value)) {
    value = CANONICAL_VENDOR;
    changed = true;
  }

  if (value && /^crazzycars\.pk$/i.test(value) && value !== CANONICAL_VENDOR) {
    value = CANONICAL_VENDOR;
    changed = true;
  }

  return { value, city, changed };
}

function ensureCityTag(tags, city) {
  if (!city || !CITY_CODES.has(city)) return { tags, added: false };
  const tag = `city:${city}`;
  const list = Array.isArray(tags) ? [...tags] : [];
  if (list.some((t) => String(t).toLowerCase() === tag.toLowerCase())) {
    return { tags: list, added: false };
  }
  list.push(tag);
  return { tags: list, added: true };
}

async function main() {
  const { MONGODB_URI } = process.env;
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is missing in .env.local");
  }

  await mongoose.connect(MONGODB_URI, { bufferCommands: false });

  const products = await Product.find({})
    .select("_id vendor tags")
    .lean({ getters: false, virtuals: false });

  let vendorUpdates = 0;
  let brandUpdates = 0;
  let tagUpdates = 0;

  for (const p of products) {
    const rawVendor = p.vendor ?? "";
    const normVendor = normalizeVendorField(rawVendor);
    let tags = p.tags;
    let tagAdded = false;
    if (normVendor.city) {
      const tagResult = ensureCityTag(tags, normVendor.city);
      tags = tagResult.tags;
      tagAdded = tagResult.added;
    }

    const vendorChanged = normVendor.changed && normVendor.value !== rawVendor;
    const tagsChanged = tagAdded;

    const rawBrand = typeof p.brand === "string" ? p.brand : "";
    const normBrand = rawBrand ? normalizeVendorField(rawBrand) : { value: rawBrand, changed: false, city: null };
    const brandChanged = normBrand.changed && normBrand.value !== rawBrand;

    if (!vendorChanged && !brandChanged && !tagsChanged) continue;

    if (vendorChanged) vendorUpdates += 1;
    if (brandChanged) brandUpdates += 1;
    if (tagsChanged) tagUpdates += 1;

    const $set = {};
    if (vendorChanged) $set.vendor = normVendor.value;
    if (brandChanged) $set.brand = normBrand.value;
    if (tagsChanged) $set.tags = tags;

    if (!dryRun && Object.keys($set).length) {
      await Product.collection.updateOne({ _id: p._id }, { $set });
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        productsScanned: products.length,
        vendorFieldUpdates: vendorUpdates,
        brandFieldUpdates: brandUpdates,
        cityTagAdds: tagUpdates,
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
