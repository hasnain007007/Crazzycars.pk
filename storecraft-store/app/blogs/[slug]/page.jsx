import { cache } from "react";
import { notFound } from "next/navigation";
import { dbConnect } from "@/lib/db";
import BlogPost from "@/lib/models/BlogPost.model";
import "@/lib/models/Product.model";
import BlogPostView from "@/components/store/BlogPostView";
import { getSiteUrl } from "@/lib/siteUrl";
import { withSafeMetadata, isNextNavigationError } from "@/lib/safeMetadata";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { sanitizeBlogHtml } from "@/lib/sanitizeHtml";
import { recordBlogPostPageView } from "@/lib/blogEngagement";
import { blogContentModifiedAt } from "@/lib/blogContentDate";
import { faqPageJsonLd } from "@/lib/seo/keywordStrategyFaqs";
import { BRAND } from "@/lib/brand";
const BASE_URL = getSiteUrl();

function withClientId(doc) {
  if (!doc || typeof doc !== "object") return doc;
  const id = doc.id || doc._id;
  return { ...doc, id: id != null ? String(id) : undefined };
}

/** Metadata-only read — must NOT increment views (metadata + page share one request). */
const loadBlogPostForMeta = cache(async (slug) => {
  try {
    await dbConnect();
    const post = await BlogPost.findOne({
      slug: String(slug),
      status: "published",
    })
      .select(
        "title slug excerpt featuredImage publishedAt contentUpdatedAt createdAt updatedAt categories tags author seo"
      )
      .lean();
    if (!post) return null;
    return withClientId(JSON.parse(JSON.stringify(post)));
  } catch (e) {
    console.error("Blog post meta load error:", e);
    return null;
  }
});

/** Real page render — increments Mongo `views` once per request. */
async function loadBlogPostAndCountView(slug) {
  try {
    await dbConnect();
    const post = await recordBlogPostPageView(BlogPost, String(slug || "").trim());
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
  const post = await loadBlogPostForMeta(slug);
  if (!post) return { title: "Blog Not Found" };
  const modified = blogContentModifiedAt(post);
  const metaTitle =
    post.seo?.metaTitle ||
    `${post.title} | ${BRAND} Blog`;
  return {
    // Absolute so the root layout does not append the store name a second time.
    title: { absolute: metaTitle },
    description: post.seo?.metaDescription || post.excerpt || post.title,
    authors: [{ name: post.author?.name || BRAND }],
    publishedTime: post.publishedAt || post.createdAt,
    modifiedTime: modified,
    alternates: {
      canonical: `${BASE_URL}/blogs/${slug}`,
    },
    openGraph: {
      title: post.seo?.metaTitle || post.title,
      description: post.seo?.metaDescription || post.excerpt || post.title,
      type: "article",
      publishedTime: post.publishedAt || post.createdAt,
      modifiedTime: modified,
      authors: [post.author?.name || BRAND],
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

    const [post, recentPosts] = await Promise.all([
      loadBlogPostAndCountView(slugStr),
      loadRecentPosts(slugStr),
    ]);

    if (!post) {
      notFound();
    }

    const articleSection = Array.isArray(post.categories)
      ? post.categories.map((c) => String(c).trim()).filter(Boolean)
      : [];
    const keywords = Array.isArray(post.tags)
      ? post.tags.map((t) => String(t).trim()).filter(Boolean)
      : [];

    const modified = blogContentModifiedAt(post);
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.excerpt || post.title,
      image: post.featuredImage?.url || "",
      datePublished: post.publishedAt || post.createdAt,
      dateModified: modified,
      author: {
        "@type": "Person",
        name: post.author?.name || BRAND,
      },
      publisher: {
        "@type": "Organization",
        name: BRAND,
        logo: {
          "@type": "ImageObject",
          url: `${BASE_URL}/logo.png`,
        },
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": `${BASE_URL}/blogs/${post.slug}`,
      },
      ...(articleSection.length ? { articleSection } : {}),
      ...(keywords.length ? { keywords: keywords.join(", ") } : {}),
    };

    const faqItems = (Array.isArray(post.faq) ? post.faq : [])
      .map((f) => ({
        question: String(f?.question || "").trim(),
        answer: String(f?.answer || "").trim(),
      }))
      .filter((f) => f.question && f.answer);
    const faqLd = faqPageJsonLd(faqItems);

    return (
      <div style={{ background: "#FFFFFF", minHeight: "100vh" }}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
        {faqLd ? (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqLd) }} />
        ) : null}
        <BlogPostView initialPost={post} initialRecent={recentPosts} />
      </div>
    );
  } catch (error) {
    if (isNextNavigationError(error)) throw error;
    console.error("Blog post page error:", error);
    throw error;
  }
}
