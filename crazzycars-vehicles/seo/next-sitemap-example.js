/**
 * Next.js (App Router) — dynamic sitemap that includes every category,
 * vehicle and product straight from MongoDB.
 *
 * Put this file at:  app/sitemap.js   in your Next.js frontend.
 * (If your frontend can't reach Mongo directly, fetch from your API instead.)
 */

// app/sitemap.js
export default async function sitemap() {
  const SITE = "https://crazzycars.pk"; // final domain
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [categories, vehicles, products] = await Promise.all([
    fetch(`${API}/api/categories/tree`).then((r) => r.json()),
    fetch(`${API}/api/vehicles`).then((r) => r.json()),
    fetch(`${API}/api/products?fields=slug,updatedAt&limit=5000`).then((r) => r.json()),
  ]);

  const flatCats = categories.flatMap((p) => [p, ...(p.children || [])]);

  return [
    { url: SITE, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/shop`, changeFrequency: "daily", priority: 0.9 },
    ...flatCats.map((c) => ({
      url: `${SITE}/categories/${c.slug}`,
      changeFrequency: "weekly",
      priority: 0.8,
    })),
    ...vehicles.map((v) => ({
      url: `${SITE}/cars/${v.slug}`,
      changeFrequency: "weekly",
      priority: 0.8,
    })),
    ...(products.items || products).map((p) => ({
      url: `${SITE}/products/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    })),
  ];
}

/* ------------------------------------------------------------------ */
/* Put this file at:  app/robots.js                                    */
/* ------------------------------------------------------------------ */
// export default function robots() {
//   return {
//     rules: [{ userAgent: "*", allow: "/", disallow: ["/account", "/cart", "/checkout", "/admin"] }],
//     sitemap: "https://crazzycars.pk/sitemap.xml",
//   };
// }
