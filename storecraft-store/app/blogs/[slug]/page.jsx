import { notFound } from "next/navigation";
import { dbConnect } from "@/lib/db";
import BlogPost from "@/lib/models/BlogPost.model";
import "@/lib/models/Product.model";
import BlogPostView from "@/components/store/BlogPostView";
import { getSiteUrl } from "@/lib/siteUrl";
import { withSafeMetadata, isNextNavigationError } from "@/lib/safeMetadata";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { sanitizeBlogHtml } from "@/lib/sanitizeHtml";
const BASE_URL = getSiteUrl();

function withClientId(doc) {
  if (!doc || typeof doc !== "object") return doc;
  const id = doc.id || doc._id;
  return { ...doc, id: id != null ? String(id) : undefined };
}

async function loadBlogPost(slug) {
  try {
    await dbConnect();
    const post = await BlogPost.findOne({
      slug: String(slug),
      status: "published",
    })
      .populate("relatedProducts", "name slug media pricing inventory")
      .lean();
    if (!post) return null;
    const plain = JSON.parse(JSON.stringify(post));
    return withClientId({ ...plain, content: sanitizeBlogHtml(plain.content) });
  } catch (e) {
    console.error("Blog post load error:", e);
    return null;
  }
}

async function loadRecentPosts(excludeSlug) {
  try {
    await dbConnect();
    const posts = await BlogPost.find({
      status: "published",
      slug: { $ne: String(excludeSlug) },
    })
      .select("title slug featuredImage publishedAt readTime categories")
      .sort({ publishedAt: -1 })
      .limit(3)
      .lean();
    const raw = JSON.parse(JSON.stringify(posts));
    return raw.map((p) => withClientId(p));
  } catch (e) {
    return [];
  }
}

export const generateMetadata = withSafeMetadata(async function blogPostMetadata({ params }) {
  const { slug } = await params;
  const post = await loadBlogPost(slug);
  if (!post) return { title: "Blog Not Found" };
  const metaTitle =
    post.seo?.metaTitle ||
    `${post.title} | ${process.env.NEXT_PUBLIC_STORE_NAME || "Crazzycars.pk"} Blog`;
  return {
    // Absolute so the root layout does not append the store name a second time.
    title: { absolute: metaTitle },
    description: post.seo?.metaDescription || post.excerpt || post.title,
    authors: [{ name: post.author?.name || process.env.NEXT_PUBLIC_STORE_NAME || "Crazzycars.pk" }],
    publishedTime: post.createdAt,
    modifiedTime: post.updatedAt,
    alternates: {
      canonical: `${BASE_URL}/blogs/${slug}`,
    },
    openGraph: {
      title: post.seo?.metaTitle || post.title,
      description: post.seo?.metaDescription || post.excerpt || post.title,
      type: "article",
      publishedTime: post.createdAt,
      modifiedTime: post.updatedAt,
      authors: [post.author?.name || `${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'}`],
      images: post.featuredImage?.url ? [{ url: post.featuredImage.url }] : [],
      url: `${BASE_URL}/blogs/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: post.seo?.metaTitle || post.title,
      description: post.seo?.metaDescription || post.excerpt || post.title,
      images: post.featuredImage?.url ? [post.featuredImage.url] : [],
    },
  };
});

export const dynamic = "force-dynamic";

export default async function BlogPostPage({ params }) {
  try {
    const { slug } = await params;

    if (!slug) {
      notFound();
    }

    const slugStr = String(slug).trim();
    if (!slugStr) {
      notFound();
    }

    const [post, recentPosts] = await Promise.all([loadBlogPost(slugStr), loadRecentPosts(slugStr)]);

    if (!post) {
      notFound();
    }

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.excerpt || post.title,
      image: post.featuredImage?.url || "",
      datePublished: post.createdAt,
      dateModified: post.updatedAt,
      author: {
        "@type": "Person",
        name: post.author?.name || `${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'}`,
      },
      publisher: {
        "@type": "Organization",
        name: `${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'}`,
        logo: {
          "@type": "ImageObject",
          url: `${BASE_URL}/logo.png`,
        },
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": `${BASE_URL}/blogs/${post.slug}`,
      },
    };

    return (
      <div style={{ background: "#FFFFFF", minHeight: "100vh" }}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
        <BlogPostView initialPost={post} initialRecent={recentPosts} />
      </div>
    );
  } catch (error) {
    if (isNextNavigationError(error)) throw error;
    console.error("Blog post page error:", error);
    throw error;
  }
}
