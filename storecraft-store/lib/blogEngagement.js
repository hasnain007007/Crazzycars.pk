/**
 * Blog scheduled-publish + real page-view helpers (storefront).
 * Fake / auto-inflated view counts are not used.
 */

/**
 * Publish due scheduled posts (optional slug filter).
 * @returns {Promise<number>} count published
 */
export async function publishDueScheduledPosts(BlogPost, { slug } = {}) {
  const now = new Date();
  const filter = {
    status: "scheduled",
    scheduledAt: { $lte: now },
  };
  if (slug) filter.slug = String(slug);

  const docs = await BlogPost.find(filter);
  for (const doc of docs) {
    doc.status = "published";
    if (!doc.publishedAt) doc.publishedAt = doc.scheduledAt || now;
    await doc.save();
  }
  return docs.length;
}

/**
 * Record a real page view for a published post.
 * Also promotes a due scheduled post matching this slug first.
 */
export async function recordBlogPostPageView(BlogPost, slugStr) {
  const slug = String(slugStr || "").trim();
  if (!slug) return null;

  await publishDueScheduledPosts(BlogPost, { slug });

  const existing = await BlogPost.findOne({ slug, status: "published" }).select("_id");
  if (!existing) return null;

  return BlogPost.findOneAndUpdate(
    { _id: existing._id, status: "published" },
    { $inc: { views: 1 } },
    { new: true }
  )
    .select(
      "title slug excerpt content featuredImage publishedAt createdAt updatedAt categories tags readTime views author relatedProducts seo status"
    )
    .populate("relatedProducts", "name slug media pricing inventory")
    .lean();
}
