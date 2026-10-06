/**
 * Mark imported/seed reviews and recompute product ratings from genuine reviews only.
 *
 * Genuine review: status === approved, non-empty orderId, isSeed !== true.
 *
 * Marks isSeed: true when:
 *   - reviewer.email ends with @seed-top100-bestsellers-v1.local or @crazzycars.local
 *   - OR missing/empty orderId AND (source !== "customer" OR reviewer.verified)
 *
 * Usage (always dry-run first against production):
 *   node scripts/mark-seed-reviews.mjs --dry-run
 *   node scripts/mark-seed-reviews.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Review from "../lib/models/Review.model.js";
import Product from "../lib/models/Product.model.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const dryRun = process.argv.includes("--dry-run");

const SEED_EMAIL_SUFFIXES = ["@seed-top100-bestsellers-v1.local", "@crazzycars.local"];

function hasOrderId(review) {
  const oid = review?.orderId;
  return oid != null && String(oid).trim() !== "";
}

function emailMarksSeed(email) {
  const e = String(email || "").trim().toLowerCase();
  return SEED_EMAIL_SUFFIXES.some((suffix) => e.endsWith(suffix));
}

function reviewShouldBeSeed(review) {
  if (emailMarksSeed(review?.reviewer?.email)) return true;
  if (hasOrderId(review)) return false;
  const source = String(review?.source || "manual").toLowerCase();
  if (source !== "customer") return true;
  if (review?.reviewer?.verified) return true;
  return false;
}

async function recomputeGenuineRatingsForProduct(productId) {
  const reviews = await Review.find({
    product: productId,
    status: "approved",
    isSeed: { $ne: true },
    orderId: { $exists: true, $nin: [null, ""] },
  })
    .select("rating")
    .lean();

  const count = reviews.length;
  const avg =
    count > 0 ? reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / count : 0;
  const rounded = Math.round(avg * 10) / 10;

  return {
    rating: rounded,
    averageRating: rounded,
    ratingAverage: rounded,
    reviewCount: count,
    numReviews: count,
    totalReviews: count,
  };
}

async function main() {
  const { MONGODB_URI } = process.env;
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is missing in .env.local");
  }

  await mongoose.connect(MONGODB_URI, { bufferCommands: false });

  const reviews = await Review.find({}).select("_id product isSeed orderId source reviewer").lean();
  let marked = 0;
  let alreadySeed = 0;
  const touchedProducts = new Set();

  for (const review of reviews) {
    if (review.isSeed) {
      alreadySeed += 1;
      continue;
    }
    if (!reviewShouldBeSeed(review)) continue;

    marked += 1;
    touchedProducts.add(String(review.product));
    if (!dryRun) {
      await Review.updateOne({ _id: review._id }, { $set: { isSeed: true } });
    }
  }

  const productIds = [...new Set(reviews.map((r) => String(r.product)).filter(Boolean))];
  let productsUpdated = 0;

  for (const pid of productIds) {
    if (!mongoose.Types.ObjectId.isValid(pid)) continue;
    const aggregates = await recomputeGenuineRatingsForProduct(pid);
    if (!dryRun) {
      await Product.findByIdAndUpdate(pid, { $set: aggregates });
    }
    productsUpdated += 1;
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        reviewsScanned: reviews.length,
        newlyMarkedSeed: marked,
        alreadySeed,
        productsRatingRecomputed: productsUpdated,
        productsTouchedBySeedMark: touchedProducts.size,
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
