/**
 * Seed approved male Pakistani customer reviews for catalog products.
 *
 * Usage (from storecraft-store):
 *   node --env-file=.env.local scripts/seed-male-pk-reviews.mjs
 *   node --env-file=.env.local scripts/seed-male-pk-reviews.mjs --category led-lighting --limit 40
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
const categorySlug = arg("category", "led-lighting");
const limit = Math.max(1, Math.min(80, parseInt(arg("limit", "40"), 10) || 40));

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
    body: "Pakistan mein COD se order kiya — packing theek thi aur light quality solid hai. Recommend karta hoon.",
  },
  {
    rating: 5,
    title: "Perfect fit for my car",
    body: "Installation easy thi, look premium aa gaya. Delivery bhi time pe mil gayi.",
  },
  {
    rating: 4,
    title: "Good quality, worth the price",
    body: "Brightness aur finish dono achi hain. Thora time laga install karne mein lekin result acha hai.",
  },
  {
    rating: 5,
    title: "Recommended for Pakistani cars",
    body: "Apni Corolla pe lagaya — night mein clear visibility. Support ne WhatsApp pe help ki.",
  },
  {
    rating: 4,
    title: "Satisfied customer",
    body: "Build quality expected se better. Colour matching theek hai. Will order more accessories.",
  },
  {
    rating: 5,
    title: "Fast dispatch aur original look",
    body: "Order jaldi dispatch hua. Product photo jaisa hi mila. Male customers ke liye practical choice.",
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

async function main() {
  await mongoose.connect(uri);
  console.log("connected");

  const cat = await Category.findOne({ slug: categorySlug, status: "active" }).lean();
  if (!cat) {
    console.error("Category not found:", categorySlug);
    process.exit(1);
  }

  const products = await Product.find({
    status: "active",
    categories: cat._id,
  })
    .select("name slug")
    .limit(limit)
    .lean();

  console.log(`Seeding reviews for ${products.length} products in ${categorySlug}`);

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    // 2 reviews per product, different male reviewers
    for (let j = 0; j < 2; j++) {
      const reviewer = MALE_REVIEWERS[(i * 2 + j) % MALE_REVIEWERS.length];
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

  console.log(JSON.stringify({ created, skipped, products: products.length }, null, 2));
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
