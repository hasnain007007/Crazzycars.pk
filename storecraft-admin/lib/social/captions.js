/**
 * Caption + hashtag helpers + buildCaption (preview + publishers).
 */
import SocialSettings, { DEFAULT_FOOTER } from "@/lib/models/SocialSettings.model";

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

export function normalizeHashtag(tag) {
  let t = String(tag || "").trim();
  if (!t) return "";
  if (!t.startsWith("#")) t = `#${t}`;
  return t.replace(/\s+/g, "");
}

export function normalizeHashtagList(input) {
  const raw = Array.isArray(input)
    ? input.join(" ")
    : String(input || "").replace(/,/g, " ");
  const parts = raw.split(/\s+/).map(normalizeHashtag).filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const p of parts) {
    const key = p.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

function platformKey(platform) {
  const p = String(platform || "").toLowerCase();
  if (p === "fb" || p === "facebook") return "facebook";
  if (p === "ig" || p === "instagram") return "instagram";
  if (p === "tt" || p === "tiktok") return "tiktok";
  return p;
}

/**
 * Resolve effective settings for caption building (plain object, no secrets).
 */
export function resolveCaptionSettings(settingsDoc) {
  const s = settingsDoc || {};
  return {
    footerText: String(s.footerText || DEFAULT_FOOTER),
    alwaysHashtag: normalizeHashtag(s.alwaysHashtag || "#crazzycarspk") || "#crazzycarspk",
    hashtagLimits: {
      ig: Number(s.hashtagLimits?.ig) || 30,
      fb: Number(s.hashtagLimits?.fb) || 5,
      tiktok: Number(s.hashtagLimits?.tiktok) || 5,
    },
  };
}

export async function loadCaptionSettings() {
  try {
    const doc = await SocialSettings.getOrCreate();
    return resolveCaptionSettings(doc);
  } catch {
    return resolveCaptionSettings(null);
  }
}

function buildFooter(footerTemplate, productUrl, captionBody) {
  const tpl = String(footerTemplate || DEFAULT_FOOTER);
  const url = String(productUrl || "").trim();
  const body = String(captionBody || "");
  const alreadyHasWa = /0328\s*4010007/.test(body);

  let lines = tpl.split("\n");
  if (!url) {
    lines = lines.filter((l) => !/\{productUrl\}/.test(l) && !/🛒\s*Order:/i.test(l));
  } else {
    lines = lines.map((l) => l.replace(/\{productUrl\}/g, url));
  }
  if (alreadyHasWa) {
    lines = lines.filter((l) => !/0328\s*4010007/.test(l) && !/WhatsApp/i.test(l));
  }
  return lines.join("\n").trim();
}

function tagsForPlatform(tags, platform, settings) {
  const limits = settings.hashtagLimits || { ig: 30, fb: 5, tiktok: 5 };
  const always = settings.alwaysHashtag || "#crazzycarspk";
  let list = normalizeHashtagList(tags);
  if (!list.some((t) => t.toLowerCase() === always.toLowerCase())) {
    list = [always, ...list];
  }
  const key = platformKey(platform);
  const max = key === "instagram" ? limits.ig : key === "tiktok" ? limits.tiktok : limits.fb;
  const trimmed = list.length > max;
  return { text: list.slice(0, max).join(" "), count: Math.min(list.length, max), trimmed, list: list.slice(0, max) };
}

/**
 * Final caption for a platform (preview + publish).
 * @param {object} post — SocialPost-like
 * @param {'facebook'|'instagram'|'tiktok'|'fb'|'ig'} platform
 * @param {object} [settings] — from resolveCaptionSettings
 */
export function buildCaption(post, platform, settings) {
  const cfg = resolveCaptionSettings(settings);
  const key = platformKey(platform);
  const warnings = [];

  const body =
    key === "tiktok"
      ? String(post?.captionTiktok || "").trim() ||
        String(post?.caption || post?.captions?.tiktok || "")
          .trim()
          .split("\n")
          .filter(Boolean)
          .slice(0, 2)
          .join("\n") ||
        String(post?.captions?.instagram || "").trim()
      : String(post?.caption || "").trim() ||
        String(post?.captions?.[key] || post?.captions?.instagram || "").trim();

  const addFooter = post?.addFooter !== false;
  const footer = addFooter
    ? buildFooter(cfg.footerText, post?.productUrl || "", body)
    : "";

  const tagSource =
    Array.isArray(post?.hashtagList) && post.hashtagList.length
      ? post.hashtagList
      : post?.hashtags?.instagram || post?.hashtags?.facebook || post?.hashtags || "";

  const { text: tagPart, trimmed } = tagsForPlatform(tagSource, key, cfg);
  if (trimmed) warnings.push(`Hashtags trimmed for ${key}`);

  const parts = [body];
  if (footer) parts.push(footer);
  if (tagPart) parts.push(tagPart);
  let message = parts.filter(Boolean).join("\n\n").trim();

  if (key === "instagram" && message.length > IG_CAPTION_MAX) {
    warnings.push(`Instagram caption truncated from ${message.length} to ${IG_CAPTION_MAX}`);
    message = message.slice(0, IG_CAPTION_MAX);
  }

  return { message, warnings, footer, hashtags: tagPart };
}

/**
 * Build final message for a platform (used by FB/IG publishers).
 * Prefers buildCaption when new fields exist; falls back to legacy captions/hashtags.
 */
export function buildPlatformMessage(post, platform) {
  const hasNew =
    Boolean(String(post?.caption || "").trim()) ||
    (Array.isArray(post?.hashtagList) && post.hashtagList.length > 0) ||
    post?.addFooter === true ||
    post?.addFooter === false;

  if (hasNew || post?.productUrl) {
    // settings may be attached on post.__captionSettings by publisher/cron
    return buildCaption(post, platform, post?.__captionSettings || null);
  }

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
