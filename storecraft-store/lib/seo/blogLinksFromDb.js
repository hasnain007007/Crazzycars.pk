/**
 * DB-backed blog link helpers for S11 (merge with blogInternalLinks catalog).
 */
import { unstable_cache } from "next/cache";
import { dbConnect } from "@/lib/db";
import BlogPost from "@/lib/models/BlogPost.model";

function uniqLinks(rows, limit = 5) {
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    const href = String(r?.href || "").trim();
    if (!href.startsWith("/") || seen.has(href)) continue;
    seen.add(href);
    out.push({ href, title: String(r.title || href).trim() });
    if (out.length >= limit) break;
  }
  return out;
}

/** Published posts matching a category string (loose). */
export async function dbBlogsForCategory(categorySlug, categoryName = "", limit = 5) {
  const slug = String(categorySlug || "").trim();
  const name = String(categoryName || "").trim();
  if (!slug && !name) return [];
  return unstable_cache(
    async () => {
      try {
        await dbConnect();
        const or = [];
        if (slug) {
          or.push({ categories: slug });
          or.push({ categories: new RegExp(slug.replace(/-/g, "[- ]?"), "i") });
          or.push({ tags: new RegExp(slug.replace(/-/g, "[- ]?"), "i") });
        }
        if (name) {
          or.push({ categories: new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") });
          or.push({ title: new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") });
        }
        const posts = await BlogPost.find({ status: "published", $or: or })
          .select("title slug")
          .sort({ publishedAt: -1 })
          .limit(limit)
          .lean();
        return uniqLinks(
          posts.map((p) => ({ href: `/blogs/${p.slug}`, title: p.title })),
          limit
        );
      } catch {
        return [];
      }
    },
    ["db-blogs-cat", slug, name, String(limit)],
    { revalidate: 600, tags: ["blog:list"] }
  )();
}

/** Peer posts for Related guides (shared category/tag, else recent). */
export async function dbRelatedGuidesForBlog(post, limit = 5) {
  const slug = String(post?.slug || "").trim();
  const cats = (post?.categories || []).map((c) => String(c).trim()).filter(Boolean);
  const tags = (post?.tags || []).map((t) => String(t).trim()).filter(Boolean);
  return unstable_cache(
    async () => {
      try {
        await dbConnect();
        let posts = [];
        if (cats.length || tags.length) {
          posts = await BlogPost.find({
            status: "published",
            slug: { $ne: slug },
            $or: [
              ...(cats.length ? [{ categories: { $in: cats } }] : []),
              ...(tags.length ? [{ tags: { $in: tags } }] : []),
            ],
          })
            .select("title slug")
            .sort({ publishedAt: -1 })
            .limit(limit)
            .lean();
        }
        if (posts.length < limit) {
          const extra = await BlogPost.find({
            status: "published",
            slug: { $ne: slug, $nin: posts.map((p) => p.slug) },
          })
            .select("title slug")
            .sort({ publishedAt: -1 })
            .limit(limit - posts.length)
            .lean();
          posts = [...posts, ...extra];
        }
        return uniqLinks(
          posts.map((p) => ({ href: `/blogs/${p.slug}`, title: p.title })),
          limit
        );
      } catch {
        return [];
      }
    },
    ["db-related-blog", slug, cats.join(","), tags.join(","), String(limit)],
    { revalidate: 600, tags: ["blog:list", slug ? `blog:${slug}` : "blog:list"] }
  )();
}
