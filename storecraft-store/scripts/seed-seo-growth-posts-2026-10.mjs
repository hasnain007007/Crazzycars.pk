/**
 * Seed Pakistan SEO growth blog posts (idempotent by slug).
 *
 *   cd storecraft-store && node --env-file=.env.local scripts/seed-seo-growth-posts-2026-10.mjs
 */
import mongoose from "mongoose";
import BlogPost from "../lib/models/BlogPost.model.js";

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!uri) {
  console.error("Missing MONGODB_URI");
  process.exit(1);
}

const POSTS = [
  {
    title: "Body Kit Price in Pakistan 2026",
    slug: "body-kit-price-in-pakistan-2026",
    excerpt:
      "What a Civic, Corolla or City body kit costs in Pakistan in 2026 — piece-by-piece ranges, bulky shipping, and how to avoid fitment mistakes.",
    categories: ["Buying Guides", "Body Kits"],
    tags: ["body kit price pakistan", "civic body kit", "corolla body kit", "2026"],
    seo: {
      metaTitle: "Body Kit Price in Pakistan 2026 | CrazzyCars.pk",
      metaDescription:
        "2026 body kit price guide for Pakistan: Civic, Corolla & City ranges, COD shipping, and fitment tips from CrazzyCars.pk.",
    },
    content: `<p>Looking up <strong>body kit price in Pakistan 2026</strong>? Prices move with ABS vs fiberglass, paint, and whether you want a full 4-piece set or just a front splitter. At <a href="https://crazzycars.pk/categories/body-kits">CrazzyCars.pk body kits</a>, we list generation years on every product so you are not guessing Reborn vs Civic X.</p>
<h2>Typical 2026 price bands (PKR)</h2>
<ul>
<li><strong>Front splitter / lip:</strong> often from ~Rs. 4,000–12,000 depending on material</li>
<li><strong>Side skirts (pair):</strong> commonly mid four figures to low five figures</li>
<li><strong>Full body kit (4 pcs):</strong> usually five figures — confirm the exact SKU page for live sale price</li>
</ul>
<p>Bulky kits ship with a higher courier floor (see checkout). Browse by car: <a href="https://crazzycars.pk/cars/honda-civic-reborn-2006-2012">Civic Reborn</a>, <a href="https://crazzycars.pk/cars">Shop by Car</a>.</p>
<h2>How to order without fitment drama</h2>
<p>Send make / model / year on WhatsApp <strong>03284010007</strong> with the product link. Cash on Delivery is available nationwide after confirmation.</p>`,
  },
  {
    title: "7D vs 9D vs TPE Floor Mats — Which Should You Buy in Pakistan?",
    slug: "7d-vs-9d-vs-tpe-floor-mats-pakistan",
    excerpt:
      "A practical comparison of 7D, 9D and TPE floor mats for Pakistani heat, dust and monsoon — plus when each style is worth the money.",
    categories: ["Buying Guides", "Floor Mats"],
    tags: ["7d floor mats", "9d floor mats", "tpe mats pakistan", "car mats"],
    seo: {
      metaTitle: "7D vs 9D vs TPE Floor Mats Pakistan | CrazzyCars.pk",
      metaDescription:
        "Compare 7D, 9D and TPE car floor mats for Pakistan weather. Fitment, cleaning, and COD ordering tips from CrazzyCars.pk.",
    },
    content: `<p>Searching <strong>7D vs 9D vs TPE floor mats</strong> in Pakistan? All three protect carpet, but they feel different underfoot and clean differently in monsoon dust.</p>
<h2>Quick comparison</h2>
<ul>
<li><strong>7D:</strong> custom-cut look, diamond stitching aesthetic, good all-rounder for daily drivers</li>
<li><strong>9D:</strong> usually higher wall / more coverage around the footwell — popular for muddy monsoon weeks</li>
<li><strong>TPE:</strong> rubber-like, wipe-clean, strong for heat and spills; less “carpeted” feel</li>
</ul>
<p>Shop current stock in <a href="https://crazzycars.pk/categories/floor-mats">floor mats</a> and match your car years on the product page. Need help choosing for a Corolla or Civic? Message WhatsApp <strong>03284010007</strong>.</p>`,
  },
  {
    title: "Honda City 2021 Modification Cost in Pakistan",
    slug: "honda-city-2021-modification-cost-pakistan",
    excerpt:
      "Realistic modification budget for a Honda City 2021 in Pakistan — carbon trim, LEDs, mats and kits — with links to fitment-checked parts.",
    categories: ["Buying Guides", "Honda City"],
    tags: ["honda city 2021", "modification cost", "city aspire accessories"],
    seo: {
      metaTitle: "Honda City 2021 Modification Cost Pakistan | CrazzyCars.pk",
      metaDescription:
        "Honda City 2021 modification cost guide for Pakistan: trim, lighting, mats and more — with COD parts from CrazzyCars.pk.",
    },
    content: `<p>Planning a <strong>Honda City 2021 modification</strong> budget? Start with peel-and-stick interior carbon and mats before jumping to painted body kits — you get a big visual upgrade for less risk.</p>
<h2>Sample budget building blocks</h2>
<ul>
<li>Interior carbon trims / gear surrounds — often low four figures per piece</li>
<li>LED upgrades — confirm socket type before ordering</li>
<li>Floor mats — 7D/9D/TPE options in our <a href="https://crazzycars.pk/categories/floor-mats">mats category</a></li>
</ul>
<p>See everything we stock for your generation on <a href="https://crazzycars.pk/cars">Shop by Car</a> (filter Honda City) and product pages with year tables. Order with Cash on Delivery via <a href="https://crazzycars.pk">CrazzyCars.pk</a> or WhatsApp <strong>03284010007</strong>.</p>`,
  },
];

await mongoose.connect(uri);
const now = new Date();
let upserted = 0;
for (const post of POSTS) {
  const existing = await BlogPost.findOne({ slug: post.slug }).select("_id status").lean();
  if (existing) {
    console.log("exists", post.slug, existing.status);
    continue;
  }
  await BlogPost.create({
    ...post,
    status: "published",
    publishedAt: now,
    contentUpdatedAt: now,
    author: { name: "CrazzyCars.pk" },
    readTime: 5,
    allowComments: true,
    isFeatured: true,
  });
  upserted += 1;
  console.log("created", post.slug);
}
console.log("done upserted=", upserted);
await mongoose.disconnect();
