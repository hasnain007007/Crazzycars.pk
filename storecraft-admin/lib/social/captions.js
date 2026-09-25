/**
 * Caption + hashtag helpers for Meta posts.
 */

export const IG_CAPTION_MAX = 2200;
export const IG_HASHTAG_MAX = 30;

export function countHashtags(raw) {
  const s = String(raw || "");
  const matches = s.match(/#[\p{L}\p{N}_]+/gu) || s.match(/#[A-Za-z0-9_]+/g) || [];
  return matches.length;
}

export function trimHashtags(raw, max = IG_HASHTAG_MAX) {
  const text = String(raw || "").trim();
  if (!text) return { text: "", count: 0, trimmed: false };
  const tags = text.match(/#[\p{L}\p{N}_]+/gu) || text.match(/#[A-Za-z0-9_]+/g) || [];
  if (tags.length <= max) return { text, count: tags.length, trimmed: false };
  const kept = tags.slice(0, max);
  return { text: kept.join(" "), count: kept.length, trimmed: true };
}

/**
 * Build final message for a platform.
 * Empty platform caption falls back to Instagram caption.
 */
export function buildPlatformMessage(post, platform) {
  const captions = post?.captions || {};
  const hashtags = post?.hashtags || {};
  let caption = String(captions[platform] || "").trim();
  if (!caption) caption = String(captions.instagram || "").trim();

  let tagRaw = String(hashtags[platform] || "").trim();
  if (!tagRaw && platform !== "instagram") {
    tagRaw = String(hashtags.instagram || "").trim();
  }

  const warnings = [];
  let tagPart = tagRaw;
  if (platform === "instagram") {
    const { text, count, trimmed } = trimHashtags(tagRaw, IG_HASHTAG_MAX);
    tagPart = text;
    if (trimmed) {
      warnings.push(`Instagram hashtags trimmed to ${IG_HASHTAG_MAX} (had ${countHashtags(tagRaw)})`);
    } else if (count > IG_HASHTAG_MAX) {
      warnings.push(`Instagram hashtag count ${count} exceeds ${IG_HASHTAG_MAX}`);
    }
  }

  let message = caption;
  if (tagPart) message = caption ? `${caption}\n\n${tagPart}` : tagPart;

  if (platform === "instagram" && message.length > IG_CAPTION_MAX) {
    warnings.push(`Instagram caption truncated from ${message.length} to ${IG_CAPTION_MAX} chars`);
    message = message.slice(0, IG_CAPTION_MAX);
  }

  return { message, warnings };
}

export function sortedImages(post) {
  const imgs = Array.isArray(post?.images) ? [...post.images] : [];
  return imgs
    .filter((i) => i?.url)
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
}
