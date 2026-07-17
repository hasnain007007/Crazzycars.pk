import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Banner from "@/lib/models/Banner.model";
import Product from "@/lib/models/Product.model";
import Category from "@/lib/models/Category.model";
import BlogPost from "@/lib/models/BlogPost.model";
import { serializeStoreProductSummary } from "@/lib/storeSerialize";

export async function GET() {
  try {
    await dbConnect();
    const now = new Date();

    const [banners, featuredRaw, newArrivalsRaw, categoriesRaw, blogPosts] = await Promise.all([
      Banner.find({
        status: "active",
      })
        .sort({ sortOrder: 1, createdAt: -1 })
        .lean(),
      Product.find({
        status: { $regex: /^active$/i },
        featured: true,
      })
        .select("name slug media pricing inventory featured newArrival categories simpleVariations variationCombinations variationTypes variationOptions variants")
        .populate("categories", "name slug")
        .limit(8)
        .lean(),
      Product.find({
        status: { $regex: /^active$/i },
        newArrival: true,
      })
        .select("name slug media pricing inventory featured newArrival categories simpleVariations variationCombinations variationTypes variationOptions variants")
        .populate("categories", "name slug")
        .limit(8)
        .lean(),
      Category.find({
        status: "active",
        $or: [{ parentCategory: null }, { parentCategory: { $exists: false } }],
      })
        .select("name slug image")
        .limit(8)
        .lean(),
      BlogPost.find({ status: "published" })
        .select("title slug excerpt featuredImage publishedAt readTime categories author isFeatured views")
        .sort({ publishedAt: -1, createdAt: -1 })
        .limit(3)
        .lean(),
    ]);

    const activeBanners = banners.filter((b) => {
      if (!b.schedule?.enabled) return true;
      const start = b.schedule?.startDate ? new Date(b.schedule.startDate) : null;
      const end = b.schedule?.endDate ? new Date(b.schedule.endDate) : null;
      if (start && now < start) return false;
      if (end && now > end) return false;
      return true;
    });

    const groupedBanners = {
      hero_slider: activeBanners.filter((b) => b.placement === "hero_slider"),
      promo_strip: activeBanners.filter((b) => b.placement === "promo_strip"),
      promo_card: activeBanners.filter((b) => b.placement === "promo_card"),
    };

    return NextResponse.json(
      {
        success: true,
        banners: groupedBanners,
        featured: featuredRaw.map(serializeStoreProductSummary),
        newArrivals: newArrivalsRaw.map(serializeStoreProductSummary),
        categories: categoriesRaw.map((c) => ({
          id: c._id.toString(),
          name: c.name,
          slug: c.slug,
          image: c.image?.url || "",
        })),
        blogPosts: blogPosts.map((p) => ({
          id: p._id.toString(),
          title: p.title,
          slug: p.slug,
          excerpt: p.excerpt || "",
          featuredImage: p.featuredImage || { url: "", altText: "" },
          publishedAt: p.publishedAt || p.createdAt,
          readTime: p.readTime || 1,
          categories: p.categories || [],
          author: p.author || {},
        })),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
          "CDN-Cache-Control": "public, s-maxage=120",
          "Vercel-CDN-Cache-Control": "public, s-maxage=120",
        },
      }
    );
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Homepage API failed." }, { status: 500 });
  }
}
