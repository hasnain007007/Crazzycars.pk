/**
 * Browser tab icons need a square, widely-supported image. Admin uploads are
 * WebP (Safari won't render WebP favicons) and often not square, so Cloudinary
 * assets are re-served as padded square PNGs.
 *
 * Store logos are wide wordmarks. Padding those to a square leaves a few-pixel
 * strip that looks blank in a tab — crop the left mark (the “C”) instead.
 * Dedicated /favicon/ uploads still pad after trim.
 *
 * Keep in sync with storecraft-store/lib/faviconUrl.js.
 */

const CLOUDINARY_UPLOAD = /\/upload\//i;

export function faviconVariant(url, size = 256) {
  const src = String(url || "").trim();
  if (!src) return "";
  if (!/res\.cloudinary\.com/i.test(src) || !CLOUDINARY_UPLOAD.test(src)) return src;

  const at = src.search(CLOUDINARY_UPLOAD) + "/upload/".length;
  const wordmark = /\/logo\//i.test(src);
  const transform = wordmark
    ? `e_trim/c_crop,g_west,ar_1:1,w_${size},h_${size},f_png`
    : `e_trim/f_png,c_pad,b_white,w_${size},h_${size}`;
  return `${src.slice(0, at)}${transform}/${src.slice(at)}`;
}

function firstUrl(...values) {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
    if (v && typeof v === "object" && typeof v.url === "string" && v.url.trim()) {
      return v.url.trim();
    }
  }
  return "";
}

/** Dedicated favicon, else the store logo (cropped for tabs). */
export function configuredFaviconUrl(general = {}) {
  const g = general || {};
  return (
    firstUrl(g.faviconUrl, g.favicon) ||
    firstUrl(g.logoUrl, g.logo)
  );
}

const LOCAL_ICONS = {
  icon: [
    { url: "/favicon.ico?v=2", sizes: "any" },
    { url: "/icon.png?v=2", type: "image/png", sizes: "32x32" },
  ],
  shortcut: [{ url: "/favicon.ico?v=2" }],
  apple: [{ url: "/apple-touch-icon.png?v=2", sizes: "180x180" }],
};

/** Next.js `metadata.icons` — Cloudinary when set, else bundled CrazzyCars mark. */
export function buildFaviconMetadata(general = {}) {
  const configured = configuredFaviconUrl(general);
  if (!configured) return LOCAL_ICONS;

  return {
    icon: [
      { url: faviconVariant(configured, 32), type: "image/png", sizes: "32x32" },
      { url: faviconVariant(configured, 192), type: "image/png", sizes: "192x192" },
      { url: "/favicon.ico?v=2", sizes: "any" },
    ],
    shortcut: [{ url: faviconVariant(configured, 32) }],
    apple: [
      { url: faviconVariant(configured, 180), sizes: "180x180" },
      { url: "/apple-touch-icon.png?v=2", sizes: "180x180" },
    ],
  };
}
