/**
 * Browser tab icons need a square, widely-supported image. Admin uploads are
 * WebP (Safari won't render WebP favicons) and often not square, so Cloudinary
 * assets are re-served as padded square PNGs.
 *
 * Logos are usually exported with wide empty margins. Padding those straight to
 * a square leaves the artwork a few pixels tall and effectively invisible in a
 * tab, so the blank border is trimmed first and the result padded afterwards.
 */

const CLOUDINARY_UPLOAD = /\/upload\//i;

export function faviconVariant(url, size = 256) {
  const src = String(url || "").trim();
  if (!src) return "";
  if (!/res\.cloudinary\.com/i.test(src) || !CLOUDINARY_UPLOAD.test(src)) return src;

  const at = src.search(CLOUDINARY_UPLOAD) + "/upload/".length;
  const transform = `e_trim/f_png,c_pad,b_transparent,w_${size},h_${size}`;
  return `${src.slice(0, at)}${transform}/${src.slice(at)}`;
}

/** Resolve the configured favicon from settings.general, if any. */
export function configuredFaviconUrl(general = {}) {
  const g = general || {};
  return (
    (typeof g.faviconUrl === "string" ? g.faviconUrl.trim() : "") ||
    (typeof g.favicon === "string" ? g.favicon.trim() : g.favicon?.url || "")
  );
}

/** Next.js `metadata.icons` for the store, falling back to the bundled file. */
export function buildFaviconMetadata(general = {}) {
  const configured = configuredFaviconUrl(general);
  if (!configured) {
    return {
      icon: [{ url: "/favicon.ico" }],
      shortcut: [{ url: "/favicon.ico" }],
      apple: [{ url: "/favicon.ico" }],
    };
  }

  return {
    icon: [
      { url: faviconVariant(configured, 32), type: "image/png", sizes: "32x32" },
      { url: faviconVariant(configured, 192), type: "image/png", sizes: "192x192" },
    ],
    shortcut: [{ url: faviconVariant(configured, 32) }],
    apple: [{ url: faviconVariant(configured, 180), sizes: "180x180" }],
  };
}
