/**
 * Seed sample blog posts.
 * Usage: node scripts/seed-blog.mjs
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import BlogPost from "../lib/models/BlogPost.model.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI in .env.local");
  process.exit(1);
}

const posts = [
  {
    title: "How to Care for Your Body Piercing Jewelry",
    slug: "how-to-care-for-body-piercing-jewelry",
    categories: ["Jewelry Care"],
    status: "published",
    publishedAt: new Date(),
    readTime: 3,
    isFeatured: false,
    excerpt:
      "Proper care keeps your piercing jewelry looking new and prevents irritation. Learn the best practices for cleaning and maintaining your body jewelry.",
    content: `<h2>Why Jewelry Care Matters</h2>
<p>Body piercing jewelry requires special care to keep it looking beautiful and to prevent skin irritation. Whether you wear surgical steel, titanium, or gold pieces, proper maintenance extends the life of your jewelry.</p>
<h2>Daily Cleaning Routine</h2>
<p>Clean your jewelry daily with a mild soap and warm water. Avoid harsh chemicals that can damage the metal or irritate your skin.</p>
<h3>Steps for Cleaning:</h3>
<ul>
<li>Remove jewelry carefully</li>
<li>Rinse with warm water</li>
<li>Apply mild soap and gently scrub</li>
<li>Rinse thoroughly</li>
<li>Dry with a clean cloth</li>
</ul>
<h2>Storage Tips</h2>
<p>Store your jewelry in a clean, dry place away from moisture and direct sunlight. Use a jewelry box or soft pouch to prevent scratches.</p>`,
    author: {
      name: `${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'} Team`,
      bio: "Expert body piercing jewelry specialists",
    },
    tags: ["care", "hygiene", "surgical steel", "maintenance"],
    seo: {
      metaTitle: `How to Care for Body Piercing Jewelry | ${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'}`,
      metaDescription:
        "Learn how to properly clean and maintain your body piercing jewelry for longevity and skin safety.",
    },
  },
  {
    title: "The Complete Guide to Nose Ring Gauges",
    slug: "complete-guide-nose-ring-gauges",
    categories: ["Piercing Tips"],
    status: "published",
    publishedAt: new Date(Date.now() - 86400000),
    readTime: 5,
    isFeatured: false,
    excerpt:
      "Understanding gauge sizes is essential for choosing the right nose ring. This guide explains everything you need to know about piercing gauges.",
    content: `<h2>What is a Gauge?</h2>
<p>In body piercing, gauge refers to the thickness of the jewelry. The higher the gauge number, the thinner the jewelry. Standard nose piercings typically use 18G or 20G jewelry.</p>
<h2>Common Nose Ring Gauges</h2>
<table>
<tr><th>Gauge</th><th>Diameter</th><th>Best For</th></tr>
<tr><td>20G</td><td>0.8mm</td><td>Fresh piercings</td></tr>
<tr><td>18G</td><td>1.0mm</td><td>Standard piercings</td></tr>
<tr><td>16G</td><td>1.2mm</td><td>Stretched piercings</td></tr>
</table>
<h2>How to Choose the Right Gauge</h2>
<p>Always consult with your piercer before changing gauge sizes. Changing to a larger gauge too quickly can cause tearing and discomfort.</p>
<h2>Materials Matter</h2>
<p>Always choose implant-grade materials like surgical steel (316L), titanium (ASTM F136), or solid gold for the safest experience.</p>`,
    author: {
      name: `${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'} Team`,
      bio: "Expert body piercing jewelry specialists",
    },
    tags: ["gauge", "nose ring", "sizing", "guide"],
    seo: {
      metaTitle: `Complete Guide to Nose Ring Gauges | ${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'}`,
      metaDescription:
        "Everything you need to know about nose ring gauge sizes, from 20G to 14G and how to choose the right size.",
    },
  },
  {
    title: "Top 5 Body Piercing Jewelry Trends 2026",
    slug: "top-5-body-piercing-jewelry-trends-2026",
    categories: ["Style Guide"],
    status: "published",
    publishedAt: new Date(Date.now() - 172800000),
    readTime: 4,
    isFeatured: true,
    excerpt:
      "From minimalist titanium pieces to bold statement jewelry, discover the hottest body piercing trends taking over 2026.",
    content: `<h2>2026 is the Year of Self-Expression</h2>
<p>Body piercing jewelry has never been more diverse and exciting. This year brings a mix of minimalist elegance and bold statement pieces that celebrate individuality.</p>
<h2>Trend 1: Titanium Everything</h2>
<p>Titanium continues to dominate in 2026. Its lightweight nature, hypoallergenic properties, and stunning anodized color options make it the go-to choice for fashion-forward piercers.</p>
<h2>Trend 2: Constellation Ear Stacks</h2>
<p>Multiple ear piercings arranged in constellation patterns are incredibly popular. Mix and match different sized studs and hoops to create your unique star map.</p>
<h2>Trend 3: Opal and Gemstone Accents</h2>
<p>Natural opals and colorful gemstone ends add a luxurious touch to any piercing. These pieces catch the light beautifully and add a pop of color.</p>
<h2>Trend 4: Dainty Septum Rings</h2>
<p>Delicate septum clicker rings with subtle gem details are having a major moment. They`re elegant enough for any occasion.</p>
<h2>Trend 5: Mixed Metals</h2>
<p>Gone are the days of matching metals. Mixing gold, silver, and rose gold creates an eclectic, curated look that feels personal and unique.</p>`,
    author: {
      name: `${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'} Team`,
      bio: "Expert body piercing jewelry specialists",
    },
    tags: ["trends", "style", "2026", "titanium", "fashion"],
    seo: {
      metaTitle: `Top 5 Body Piercing Jewelry Trends 2026 | ${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'}`,
      metaDescription:
        "Discover the hottest body piercing jewelry trends of 2026 including titanium pieces, constellation ear stacks, and opal accents.",
    },
  },
];

async function main() {
  await mongoose.connect(MONGODB_URI, {
    autoIndex: true,
  });

  for (const postData of posts) {
    const existing = await BlogPost.findOne({
      slug: postData.slug,
    });
    if (existing) {
      console.log("Skipping existing post:", postData.slug);
      continue;
    }
    const post = new BlogPost(postData);
    await post.save();
    console.log("Created post:", post.title);
  }

  console.log("Blog seeding complete!");
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
