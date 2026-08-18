import { absoluteUrl } from "@/lib/siteUrl";
import {
  ROBOTS_INDEX_FOLLOW,
  ROBOTS_NOINDEX_FOLLOW,
  ROBOTS_NOINDEX_NOFOLLOW,
} from "@/lib/seo/robotsMeta";

export function buildPageMetadata({
  title,
  description,
  path,
  noIndex = false,
  noFollow = false,
  absoluteTitle = false,
}) {
  const url = absoluteUrl(path);
  const ogImage = absoluteUrl("/og-image.jpg");
  return {
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
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}
