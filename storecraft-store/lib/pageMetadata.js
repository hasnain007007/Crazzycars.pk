import { absoluteUrl } from "@/lib/siteUrl";
import { ROBOTS_INDEX_FOLLOW, ROBOTS_NOINDEX_FOLLOW, ROBOTS_NOINDEX_NOFOLLOW } from "@/lib/seo/robotsMeta";
import { sanitizeMetadata } from "@/lib/safeMetadata";
import { BRAND_NAME } from "@/lib/brand";

/** Default Open Graph / Twitter image (1200×630). */
export const DEFAULT_OG_IMAGE_PATH = "/og/default-1200x630.jpg";

export function buildPageMetadata({
  title,
  description,
  path,
  noIndex = false,
  noFollow = false,
  absoluteTitle = false,
  images = null,
}) {
  const url = absoluteUrl(path);
  const ogList =
    Array.isArray(images) && images.length
      ? images.map((img) =>
          typeof img === "string"
            ? { url: img.startsWith("http") ? img : absoluteUrl(img), width: 1200, height: 630, alt: title }
            : {
                url: String(img.url || "").startsWith("http")
                  ? img.url
                  : absoluteUrl(img.url || DEFAULT_OG_IMAGE_PATH),
                width: img.width || 1200,
                height: img.height || 630,
                alt: img.alt || title || BRAND_NAME,
              }
        )
      : [
          {
            url: absoluteUrl(DEFAULT_OG_IMAGE_PATH),
            width: 1200,
            height: 630,
            alt: title || BRAND_NAME,
          },
        ];
  const ogImageUrl = ogList[0]?.url;
  return sanitizeMetadata({
    // The root layout appends "| <storeName>" from the settings document. Titles
    // that already carry the brand opt out, otherwise the name renders twice —
    // and a stale storeName in settings would override the correct brand.
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url },
    robots: noIndex
      ? noFollow
        ? ROBOTS_NOINDEX_NOFOLLOW
        : ROBOTS_NOINDEX_FOLLOW
      : ROBOTS_INDEX_FOLLOW,
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: BRAND_NAME,
      images: ogList,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  });
}
