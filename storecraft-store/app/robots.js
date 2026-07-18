import { getSiteUrl, isIndexableEnvironment } from "@/lib/siteUrl";

export default function robots() {
  const siteUrl = getSiteUrl();
  if (!isIndexableEnvironment()) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/account/", "/checkout/", "/cart/", "/admin/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
