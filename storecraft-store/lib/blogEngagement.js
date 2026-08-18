/**
 * Blog view inflation + scheduled publish helpers (storefront).
 */

function clampInt(value, fallback, min = 0, max = 1_000_000) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function randomInRange(min, max) {
  const lo = clampInt(min, 0);
  const hi = Math.max(lo, clampInt(max, lo));
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

/**
 * Catch up auto-increase intervals since lastAppliedAt.
 * Caps at 48 intervals so a long outage cannot spike millions of views.
 */
export function computeAutoViewDelta(config, lastAppliedAt, now = new Date()) {
  if (!config?.enabled) {
    return { delta: 0, appliedAt: lastAppliedAt || null, touched: false };
  }

  const everyMinutes = clampInt(config.everyMinutes, 60, 1, 24 * 60);
  const minPer = clampInt(config.minPerInterval, 1, 0, 10_000);
  const maxPer = clampInt(config.maxPerInterval, Math.max(minPer, 3), minPer, 10_000);
  const intervalMs = everyMinutes * 60 * 1000;

  const start = lastAppliedAt ? new Date(lastAppliedAt) : null;
  if (!start || Number.isNaN(start.getTime())) {
    return { delta: 0, appliedAt: now, touched: true };
  }

  const elapsed = now.getTime() - start.getTime();
  let intervals = Math.floor(elapsed / intervalMs);
  if (intervals <= 0) {
    return { delta: 0, appliedAt: start, touched: false };
  }
  intervals = Math.min(intervals, 48);

  let delta = 0;
  for (let i = 0; i < intervals; i += 1) {
    delta += randomInRange(minPer, maxPer);
  }

  return {
    delta,
    appliedAt: new Date(start.getTime() + intervals * intervalMs),
    touched: true,
  };
}

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
 * Apply auto-increase across published posts (cron).
 */
export async function applyAutoViewsToAll(BlogPost, { limit = 200 } = {}) {
  const now = new Date();
  const posts = await BlogPost.find({
    status: "published",
    "viewsAutoIncrease.enabled": true,
  })
    .select("_id views viewsAutoIncrease")
    .limit(limit);

  let updated = 0;
  let viewsAdded = 0;

  for (const post of posts) {
    const { delta, appliedAt, touched } = computeAutoViewDelta(
      post.viewsAutoIncrease,
      post.viewsAutoIncrease?.lastAppliedAt,
      now
    );
    if (!touched) continue;
    post.viewsAutoIncrease = post.viewsAutoIncrease || {};
    post.viewsAutoIncrease.lastAppliedAt = appliedAt;
    if (delta > 0) {
      post.views = Number(post.views || 0) + delta;
      viewsAdded += delta;
    }
    post.markModified("viewsAutoIncrease");
    await post.save();
    updated += 1;
  }

  return { updated, viewsAdded };
}

/**
 * Record a real page view (+ optional auto-increase catch-up) for a published post.
 * Also promotes a due scheduled post matching this slug first.
 */
export async function recordBlogPostPageView(BlogPost, slugStr) {
  const slug = String(slugStr || "").trim();
  if (!slug) return null;

  await publishDueScheduledPosts(BlogPost, { slug });

  const existing = await BlogPost.findOne({ slug, status: "published" }).select(
    "_id views viewsAutoIncrease"
  );
  if (!existing) return null;

  const now = new Date();
  const { delta, appliedAt, touched } = computeAutoViewDelta(
    existing.viewsAutoIncrease,
    existing.viewsAutoIncrease?.lastAppliedAt,
    now
  );

  const update = { $inc: { views: 1 + (delta || 0) } };
  if (touched) {
    update.$set = {
      "viewsAutoIncrease.lastAppliedAt": appliedAt,
    };
  }

  return BlogPost.findOneAndUpdate({ _id: existing._id, status: "published" }, update, {
    new: true,
  })
    .select(
      "title slug excerpt content featuredImage publishedAt createdAt updatedAt categories tags readTime views author relatedProducts seo status"
    )
    .populate("relatedProducts", "name slug media pricing inventory")
    .lean();
}
