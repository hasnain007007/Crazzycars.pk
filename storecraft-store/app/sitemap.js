import { dbConnect } from "@/lib/db";
import Product from "@/lib/models/Product.model";
import Category from "@/lib/models/Category.model";
import BlogPost from "@/lib/models/BlogPost.model";
import { getSiteUrl, isIndexableEnvironment } from "@/lib/siteUrl";

export default async function sitemap() {
  if (!isIndexableEnvironment()) return [];
  const BASE_URL = getSiteUrl();
  const now = new Date().toISOString();

  const staticPages = [
    {
      url: `${BASE_URL}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/shop`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/products`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/categories`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/blogs`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/sale`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  try {
    await dbConnect();

    const products = await Product.find({
      status: "active",
    })
      .select("slug updatedAt")
      .lean();

    const productPages = products.map((p) => ({
      url: `${BASE_URL}/${p.slug}`,
      lastModified: p.updatedAt || now,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    const categories = await Category.find({
      status: "active",
    })
      .select("slug updatedAt")
      .lean();

    const categoryPages = categories.map((c) => ({
      url: `${BASE_URL}/categories/${c.slug}`,
      lastModified: c.updatedAt || now,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    const blogs = await BlogPost.find({
      status: "published",
    })
      .select("slug updatedAt")
      .lean();

    const blogPages = blogs.map((b) => ({
      url: `${BASE_URL}/blogs/${b.slug}`,
      lastModified: b.updatedAt || now,
      changeFrequency: "monthly",
      priority: 0.6,
    }));

    return [...staticPages, ...productPages, ...categoryPages, ...blogPages];
  } catch (e) {
    console.error("Sitemap error:", e);
    return staticPages;
  }
}
