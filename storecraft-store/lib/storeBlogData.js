import BlogPost from "@/lib/models/BlogPost.model";
import "@/lib/models/Product.model";
import { sanitizeBlogHtml } from "@/lib/sanitizeHtml";

function mapListPost(p) {
  return {
    id: p._id.toString(),
    title: p.title,
    slug: p.slug,
    excerpt: String(p.excerpt || p.content || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160),
    featuredImage: p.featuredImage || { url: "", altText: "" },
    publishedAt: p.publishedAt || p.createdAt,
    categories: p.categories || [],
    tags: p.tags || [],
    readTime: p.readTime || 1,
    views: p.views || 0,
    isFeatured: Boolean(p.isFeatured),
    author: p.author || { name: "" },
  };
}

export async function loadBlogIndexBootstrap({ page = 1, limit = 12 } = {}) {
  const safeLimit = Math.min(24, Math.max(1, Number(limit) || 12));
  const safePage = Math.max(1, Number(page) || 1);
  const skip = (safePage - 1) * safeLimit;
  const listFilter = { status: "published" };
  const [rows, total, recentRows, allRows] = await Promise.all([
    BlogPost.find(listFilter)
      .select("title slug excerpt content featuredImage publishedAt createdAt categories tags readTime views isFeatured author")
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    BlogPost.countDocuments(listFilter),
    BlogPost.find({ status: "published" })
      .select("title slug excerpt featuredImage publishedAt readTime categories author")
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(5)
      .lean(),
    BlogPost.find({ status: "published" })
      .select("title slug excerpt content featuredImage publishedAt categories tags readTime views author")
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(100)
      .lean(),
  ]);

  const posts = rows.map(mapListPost);
  const recent = recentRows.map(mapListPost);
  const allPosts = allRows.map(mapListPost);

  return {
    posts,
    pages: Math.ceil(total / safeLimit) || 1,
    total,
    recent,
    allPosts,
  };
}

export async function loadBlogPostPageData(slugStr) {
  const [post, relatedRows, recentRows, allRows] = await Promise.all([
    BlogPost.findOneAndUpdate({ slug: slugStr, status: "published" }, { $inc: { views: 1 } }, { new: true })
      .select(
        "title slug excerpt content featuredImage publishedAt createdAt categories tags readTime views author relatedProducts seo status"
      )
      .populate("relatedProducts", "name slug media pricing inventory")
      .lean(),
    BlogPost.find({ status: "published" })
      .select("title slug featuredImage publishedAt readTime")
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(4)
      .lean(),
    BlogPost.find({ status: "published" })
      .select("title slug excerpt content featuredImage publishedAt categories tags readTime views author")
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(5)
      .lean(),
    BlogPost.find({ status: "published" })
      .select("title slug excerpt content featuredImage publishedAt categories tags readTime views author")
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(100)
      .lean(),
  ]);

  if (!post) return null;

  const mappedPost = {
    id: post._id.toString(),
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt || "",
    content: sanitizeBlogHtml(post.content),
    featuredImage: post.featuredImage || { url: "", altText: "" },
    publishedAt: post.publishedAt || post.createdAt,
    categories: post.categories || [],
    tags: post.tags || [],
    readTime: post.readTime || 1,
    views: post.views || 0,
    author: post.author || { name: "" },
    relatedProducts: post.relatedProducts || [],
    seo: post.seo || {},
  };

  const relatedPosts = relatedRows
    .filter((r) => String(r.slug) !== slugStr)
    .map((p) => ({
      id: p._id.toString(),
      title: p.title,
      slug: p.slug,
      featuredImage: p.featuredImage || { url: "", altText: "" },
      publishedAt: p.publishedAt || p.createdAt,
      readTime: p.readTime || 1,
    }));

  const recent = recentRows.map(mapListPost);
  const allPosts = allRows.map(mapListPost);

  return { post: mappedPost, relatedPosts, recent, allPosts };
}
