/**
 * Seed approved male Pakistani customer reviews for catalog products.
 *
 * Usage (from storecraft-store):
 *   node --env-file=.env.local scripts/seed-male-pk-reviews.mjs
 *   node --env-file=.env.local scripts/seed-male-pk-reviews.mjs --category carbon-fiber --limit 80
 *   node --env-file=.env.local scripts/seed-male-pk-reviews.mjs --zero-rating --limit 250
 *
 * Idempotent: skips if the same product already has a review from the same reviewer name + title.
 */
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI missing");
  process.exit(1);
}

const args = process.argv.slice(2);
function arg(name, fallback = "") {
  const i = args.indexOf(`--${name}`);
  if (i >= 0 && args[i + 1]) return args[i + 1];
  return fallback;
}
const zeroRating = args.includes("--zero-rating");
const productSlug = arg("slug", "").trim();
const categorySlug = arg("category", zeroRating || productSlug ? "" : "led-lighting");
const limit = Math.max(1, Math.min(400, parseInt(arg("limit", zeroRating ? "250" : "40"), 10) || 40));
const reviewsPerProduct = Math.max(
  1,
  Math.min(6, parseInt(arg("per-product", productSlug ? "3" : "2"), 10) || (productSlug ? 3 : 2))
);

const MALE_REVIEWERS = [
  { name: "Ahmed Khan", location: "Lahore" },
  { name: "Muhammad Usman", location: "Karachi" },
  { name: "Bilal Ahmed", location: "Islamabad" },
  { name: "Hassan Raza", location: "Gujranwala" },
  { name: "Ali Hamza", location: "Faisalabad" },
  { name: "Omar Farooq", location: "Rawalpindi" },
  { name: "Zain Malik", location: "Multan" },
  { name: "Hamza Siddiqui", location: "Sialkot" },
  { name: "Fahad Iqbal", location: "Peshawar" },
  { name: "Saadullah", location: "Hyderabad" },
  { name: "Imran Shah", location: "Quetta" },
  { name: "Waleed Anwar", location: "Sargodha" },
];

const TEMPLATES = [
  {
    rating: 5,
    title: "Bohot zabardast product",
    body: "Pakistan mein COD se order kiya — packing theek thi aur quality solid hai. Recommend karta hoon.",
  },
  {
    rating: 5,
    title: "Perfect fit for my car",
    body: "Installation easy thi, look premium aa gaya. Delivery bhi time pe mil gayi.",
  },
  {
    rating: 4,
    title: "Good quality, worth the price",
    body: "Finish aur fitment dono achi hain. Thora time laga install karne mein lekin result acha hai.",
  },
  {
    rating: 5,
    title: "Recommended for Pakistani cars",
    body: "Apni gaari pe lagaya — look clear improve hua. Support ne WhatsApp pe help ki.",
  },
  {
    rating: 4,
    title: "Satisfied customer",
    body: "Build quality expected se better. Colour matching theek hai. Will order more accessories.",
  },
  {
    rating: 5,
    title: "Fast dispatch aur original look",
    body: "Order jaldi dispatch hua. Product photo jaisa hi mila. Practical choice for daily use.",
  },
];

const productSchema = new mongoose.Schema(
  {
    name: String,
    slug: String,
    status: String,
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    rating: Number,
    averageRating: Number,
    reviewCount: Number,
    numReviews: Number,
    totalReviews: Number,
  },
  { collection: "products" }
);

const categorySchema = new mongoose.Schema(
  { name: String, slug: String, status: String },
  { collection: "categories" }
);

const reviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    productName: String,
    productSlug: String,
    reviewer: {
      name: String,
      email: String,
      location: String,
      avatar: String,
      verified: Boolean,
    },
    rating: Number,
    title: String,
    body: String,
    images: Array,
    status: String,
    featured: Boolean,
    source: String,
    helpfulVotes: Number,
  },
  { collection: "reviews", timestamps: true }
);

const Product = mongoose.models.SeedProduct || mongoose.model("SeedProduct", productSchema);
const Category = mongoose.models.SeedCategory || mongoose.model("SeedCategory", categorySchema);
const Review = mongoose.models.SeedReview || mongoose.model("SeedReview", reviewSchema);

async function recalc(productId) {
  const reviews = await Review.find({ product: productId, status: "approved" }).select("rating").lean();
  const count = reviews.length;
  const avg = count ? reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / count : 0;
  const rounded = Math.round(avg * 10) / 10;
  await Product.findByIdAndUpdate(productId, {
    $set: {
      rating: rounded,
      averageRating: rounded,
      reviewCount: count,
      numReviews: count,
      totalReviews: count,
    },
  });
}

async function loadProducts() {
  if (productSlug) {
    const p = await Product.findOne({ status: "active", slug: productSlug })
      .select("name slug reviewCount averageRating")
      .lean();
    if (!p) {
      console.error("Product not found:", productSlug);
      process.exit(1);
    }
    return [p];
  }

  if (zeroRating) {
    const products = await Product.find({
      status: "active",
      $or: [
        { reviewCount: { $exists: false } },
        { reviewCount: null },
        { reviewCount: 0 },
        { averageRating: { $exists: false } },
        { averageRating: null },
        { averageRating: 0 },
      ],
    })
      .select("name slug reviewCount averageRating")
      .limit(limit)
      .lean();
    return products.filter((p) => !(Number(p.averageRating) > 0 && Number(p.reviewCount) > 0));
  }

  const cat = await Category.findOne({ slug: categorySlug, status: "active" }).lean();
  if (!cat) {
    console.error("Category not found:", categorySlug);
    process.exit(1);
  }
  return Product.find({
    status: "active",
    categories: cat._id,
  })
    .select("name slug")
    .limit(limit)
    .lean();
}

async function main() {
  await mongoose.connect(uri);
  console.log("connected");

  const products = await loadProducts();
  console.log(
    productSlug
      ? `Seeding ${reviewsPerProduct} reviews for slug ${productSlug}`
      : zeroRating
        ? `Seeding reviews for ${products.length} zero-rating products`
        : `Seeding reviews for ${products.length} products in ${categorySlug}`
  );

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    for (let j = 0; j < reviewsPerProduct; j++) {
      const reviewer = MALE_REVIEWERS[(i * reviewsPerProduct + j) % MALE_REVIEWERS.length];
      const tpl = TEMPLATES[(i + j) % TEMPLATES.length];
      const exists = await Review.findOne({
        product: p._id,
        "reviewer.name": reviewer.name,
        title: tpl.title,
        status: "approved",
      }).lean();
      if (exists) {
        skipped += 1;
        continue;
      }
      await Review.create({
        product: p._id,
        productName: p.name || "",
        productSlug: p.slug || "",
        reviewer: {
          name: reviewer.name,
          email: "",
          location: reviewer.location,
          avatar: "",
          verified: true,
        },
        rating: tpl.rating,
        title: tpl.title,
        body: tpl.body,
        images: [],
        status: "approved",
        featured: j === 0,
        source: "manual",
        helpfulVotes: 0,
      });
      created += 1;
    }
    await recalc(p._id);
  }

  console.log(
    JSON.stringify(
      {
        created,
        skipped,
        products: products.length,
        perProduct: reviewsPerProduct,
        mode: productSlug || (zeroRating ? "zero-rating" : categorySlug),
      },
      null,
      2
    )
  );
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
