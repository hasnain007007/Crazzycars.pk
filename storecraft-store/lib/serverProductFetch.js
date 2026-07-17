import { headers } from "next/headers";

/** Origin for server-side fetches to this app's /api routes. */
export async function getServerStoreOrigin() {
  const explicit = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_STORE_URL ||
    ""
  )
    .trim()
    .replace(/\/$/, "");
  if (explicit) return explicit;

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;

  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host");
    const proto = h.get("x-forwarded-proto") || "http";
    if (host) return `${proto}://${host}`;
  } catch {
    /* headers() unavailable outside request */
  }

  return "http://127.0.0.1:3000";
}

/**
 * @param {Record<string, string | number | boolean | undefined>} params
 */
export async function fetchProductsServer(params = {}) {
  const origin = await getServerStoreOrigin();
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      qs.set(key, String(value));
    }
  });

  try {
    const res = await fetch(`${origin}/api/products?${qs.toString()}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return { products: [], total: 0 };
    const data = await res.json();
    return {
      products: Array.isArray(data?.products) ? data.products : [],
      total: Number(data?.total) || 0,
    };
  } catch {
    return { products: [], total: 0 };
  }
}
