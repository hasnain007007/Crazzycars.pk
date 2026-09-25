/**
 * Shared SocialPost JSON shape for admin UI + APIs.
 */

function platformsToList(platforms) {
  const list = [];
  if (platforms?.facebook) list.push("fb");
  if (platforms?.instagram) list.push("ig");
  if (platforms?.tiktok) list.push("tiktok");
  return list;
}

function platformsFromInput(input) {
  if (Array.isArray(input)) {
    const set = new Set(input.map((x) => String(x).toLowerCase()));
    return {
      facebook: set.has("fb") || set.has("facebook"),
      instagram: set.has("ig") || set.has("instagram"),
      tiktok: set.has("tiktok") || set.has("tt"),
    };
  }
  if (input && typeof input === "object") {
    return {
      facebook: input.facebook !== false,
      instagram: input.instagram !== false,
      tiktok: Boolean(input.tiktok),
    };
  }
  return { facebook: true, instagram: true, tiktok: false };
}

function uiStatus(status) {
  const s = String(status || "draft");
  if (s === "publishing") return "posting";
  if (s === "published") return "posted";
  return s;
}

export function serializeSocialPost(doc) {
  if (!doc) return null;
  const o = typeof doc.toObject === "function" ? doc.toObject() : doc;
  const platforms = o.platforms || {};
  const platformList = [];
  if (platforms.facebook) platformList.push("fb");
  if (platforms.instagram) platformList.push("ig");
  if (platforms.tiktok) platformList.push("tiktok");

  const hashtagList =
    Array.isArray(o.hashtagList) && o.hashtagList.length
      ? o.hashtagList
      : String(o.hashtags?.instagram || "")
          .split(/\s+/)
          .filter(Boolean);

  return {
    id: String(o._id),
    title: o.title || o.headline || "",
    headline: o.headline || o.title || "",
    postCode: o.postCode || "",
    weekStart: o.weekStart || null,
    product: o.product ? String(o.product) : null,
    productUrl: o.productUrl || "",
    productSnapshot: o.productSnapshot || {},
    scheduledAt: o.scheduledAt || null,
    platforms,
    platformList,
    postType: o.postType || (o.images?.length > 1 ? "carousel" : "single"),
    images: (o.images || []).map((img, i) => ({
      url: img.url || "",
      path: img.path || "",
      order: img.order ?? i,
      width: img.width || 0,
      height: img.height || 0,
      originalName: img.originalName || "",
    })),
    caption: o.caption || o.captions?.instagram || "",
    captionTiktok: o.captionTiktok || o.captions?.tiktok || "",
    captions: o.captions || {},
    hashtags: o.hashtags || {},
    hashtagList,
    firstComment: o.firstComment || "",
    addFooter: o.addFooter !== false,
    status: uiStatus(o.status),
    statusRaw: o.status,
    results: {
      fb: o.results?.facebook || {},
      ig: o.results?.instagram || {},
      tiktok: o.results?.tiktok || {},
      facebook: o.results?.facebook || {},
      instagram: o.results?.instagram || {},
    },
    attempts: o.attempts || 0,
    lastError: o.lastError || "",
    logs: o.logs || [],
    weekPackId: o.weekPackId || "",
    importBatchId: o.importBatchId ? String(o.importBatchId) : null,
    notes: o.notes || "",
    nextRetryAt: o.nextRetryAt || null,
    createdBy: o.createdBy ? String(o.createdBy) : null,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

export { platformsFromInput, platformsToList, uiStatus };
