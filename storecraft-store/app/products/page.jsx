import { permanentRedirect } from "next/navigation";

/**
 * Duplicate of /shop. Shopify leftover /products/:handle still 308s in middleware.
 * Preserve listing query strings (q, sort, page) on the canonical /shop URL.
 */
export default async function ProductsIndexRedirect({ searchParams }) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(sp || {})) {
    if (value == null || value === "") continue;
    const v = Array.isArray(value) ? value[0] : value;
    if (v != null && String(v) !== "") qs.set(key, String(v));
  }
  const s = qs.toString();
  permanentRedirect(s ? `/shop?${s}` : "/shop");
}
