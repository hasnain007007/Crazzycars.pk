/**
 * generateMetadata must never take down a shoppable page.
 * Next.js 16 validates Open Graph `type` at runtime — an invalid value
 * (e.g. "product") throws and the customer sees a blank error screen.
 */

const STORE_NAME =
  process.env.NEXT_PUBLIC_STORE_NAME ||
  process.env.NEXT_PUBLIC_APP_NAME ||
  "Crazzycars.pk";

/** Next.js Metadata.openGraph.type allowlist (not Facebook's og:product). */
const OG_TYPES = new Set([
  "article",
  "book",
  "profile",
  "website",
  "music.song",
  "music.album",
  "music.playlist",
  "music.radio_station",
  "video.tv_show",
  "video.other",
  "video.movie",
  "video.episode",
]);

const TWITTER_CARDS = new Set(["summary", "summary_large_image", "app", "player"]);

export const FALLBACK_METADATA = {
  title: STORE_NAME,
  description:
    "Car accessories in Pakistan — Cash on Delivery nationwide. Crazzycars.pk",
  icons: {
    icon: [
      { url: "/favicon.ico?v=3", sizes: "any" },
      { url: "/icon.png?v=3", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/apple-touch-icon.png?v=3", sizes: "180x180" }],
  },
  openGraph: { type: "website" },
  twitter: { card: "summary_large_image" },
};

export function isNextNavigationError(error) {
  const digest = String(error?.digest || "");
  return (
    digest.startsWith("NEXT_REDIRECT") ||
    digest.startsWith("NEXT_NOT_FOUND") ||
    digest.startsWith("NEXT_HTTP_ERROR_FALLBACK")
  );
}

function asMetaString(value) {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function sanitizeImageList(images) {
  if (!images) return undefined;
  const list = Array.isArray(images) ? images : [images];
  const cleaned = list
    .map((img) => {
      if (typeof img === "string") {
        const url = img.trim();
        return url || null;
      }
      if (img && typeof img === "object") {
        const url = asMetaString(img.url).trim();
        if (!url) return null;
        return { ...img, url };
      }
      return null;
    })
    .filter(Boolean);
  return cleaned.length ? cleaned : undefined;
}

export function sanitizeOpenGraph(og) {
  if (!og || typeof og !== "object") return { type: "website" };
  const raw = asMetaString(og.type || "website").trim().toLowerCase();
  const type = OG_TYPES.has(raw) ? raw : "website";
  const next = { ...og, type };
  const images = sanitizeImageList(og.images);
  if (images) next.images = images;
  else delete next.images;
  if (og.url != null && typeof og.url !== "string") {
    next.url = asMetaString(og.url);
  }
  return next;
}

export function sanitizeTwitter(twitter) {
  if (!twitter || typeof twitter !== "object") return twitter;
  const raw = asMetaString(twitter.card || "summary_large_image").trim();
  const card = TWITTER_CARDS.has(raw) ? raw : "summary_large_image";
  const next = { ...twitter, card };
  const images = sanitizeImageList(twitter.images);
  if (images) next.images = images;
  else delete next.images;
  return next;
}

function sanitizeTitle(title) {
  if (title == null) return undefined;
  if (typeof title === "string" || typeof title === "number") return String(title);
  if (typeof title === "object") {
    const next = { ...title };
    if (next.absolute != null && typeof next.absolute !== "string") {
      next.absolute = asMetaString(next.absolute);
    }
    if (next.default != null && typeof next.default !== "string") {
      next.default = asMetaString(next.default);
    }
    if (next.template != null && typeof next.template !== "string") {
      next.template = asMetaString(next.template);
    }
    return next;
  }
  return String(STORE_NAME);
}

/** Strip metadata fields that Next.js will throw on. */
export function sanitizeMetadata(meta) {
  if (!meta || typeof meta !== "object") return FALLBACK_METADATA;
  const next = { ...meta };
  if (next.title !== undefined) next.title = sanitizeTitle(next.title);
  if (next.description != null && typeof next.description !== "string") {
    next.description = asMetaString(next.description);
  }
  if (next.openGraph) next.openGraph = sanitizeOpenGraph(next.openGraph);
  if (next.twitter) next.twitter = sanitizeTwitter(next.twitter);
  return next;
}

export function withSafeMetadata(fn) {
  return async function generateMetadata(ctx) {
    try {
      const meta = await fn(ctx);
      return sanitizeMetadata(meta);
    } catch (error) {
      if (isNextNavigationError(error)) throw error;
      console.error("[generateMetadata] swallowed (page still renders):", error);
      return FALLBACK_METADATA;
    }
  };
}
