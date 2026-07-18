import { absoluteUrl } from "@/lib/siteUrl";

export function buildPageMetadata({ title, description, path, noIndex = false }) {
  const url = absoluteUrl(path);
  const ogImage = absoluteUrl("/og-image.jpg");
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: noIndex ? { index: false, follow: false } : undefined,
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
