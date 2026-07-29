/**
 * Ask the StoreCraft storefront to purge settings/homepage caches after admin saves.
 * Non-blocking: never throws to the caller.
 */

const SHOPIFY_HOST_HINTS = ["myshopify.com", "cdn.shopify.com"];

/** Accepts either an origin or a full .../api/revalidate URL and returns the origin. */
function normalizeBase(url) {
  return String(url || "")
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/api\/revalidate$/i, "");
}

function isLikelyShopify(url) {
  const u = normalizeBase(url).toLowerCase();
  if (!u) return true;
  return SHOPIFY_HOST_HINTS.some((h) => u.includes(h));
}

function isAdminOrigin(url) {
  const u = normalizeBase(url).toLowerCase();
  return (
    !u ||
    u.includes("localhost:3001") ||
    u.includes("storecraft-admin") ||
    u.includes("admin.crazzycars.pk") ||
    u.endsWith("/admin")
  );
}

function getRevalidateBases() {
  const candidates = [
    process.env.STOREFRONT_REVALIDATE_URL,
    process.env.STORECRAFT_STORE_URL,
    process.env.STOREFRONT_ORIGIN,
    process.env.NEXT_PUBLIC_STORE_URL,
    process.env.NEXT_PUBLIC_STOREFRONT_URL,
  ];
  const seen = new Set();
  const bases = [];
  for (const raw of candidates) {
    const base = normalizeBase(raw);
    if (!base || seen.has(base) || isAdminOrigin(base) || isLikelyShopify(base)) continue;
    seen.add(base);
    bases.push(base);
  }
  return bases;
}

async function postRevalidate(base, secret, paths) {
  const res = await fetch(`${base}/api/revalidate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-revalidate-secret": secret,
    },
    body: JSON.stringify({ paths }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  return { base, ok: res.ok, status: res.status, data };
}

export async function revalidateStorefront(paths = ["/", "/api/settings"]) {
  const secret = String(process.env.REVALIDATE_SECRET || "").trim();
  const bases = getRevalidateBases();
  if (!secret || !bases.length) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[revalidateStorefront] skipped — missing REVALIDATE_SECRET or storefront URL");
    }
    return { skipped: true, bases };
  }

  const results = [];
  for (const base of bases) {
    try {
      results.push(await postRevalidate(base, secret, paths));
    } catch (e) {
      results.push({ base, ok: false, error: String(e?.message || e) });
    }
  }

  const anyOk = results.some((r) => r.ok);
  if (!anyOk) {
    console.warn("[revalidateStorefront] all attempts failed", results);
  }
  return { ok: anyOk, results };
}
