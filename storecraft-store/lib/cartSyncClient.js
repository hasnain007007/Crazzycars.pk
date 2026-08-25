/**
 * Client helpers: session id + debounced cart sync to the server.
 */
"use client";

const PRESENCE_KEY = "cc_presence_sid";
const RECOVERY_TOKEN_KEY = "cc_cart_recovery_token";

export function getCartSessionId() {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(PRESENCE_KEY);
    if (id && /^[a-zA-Z0-9_-]{8,80}$/.test(id)) return id;
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID().replace(/-/g, "")
        : `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
    localStorage.setItem(PRESENCE_KEY, id);
    return id;
  } catch {
    return `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  }
}

export function getStoredRecoveryToken() {
  try {
    return localStorage.getItem(RECOVERY_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function setStoredRecoveryToken(token) {
  try {
    if (token) localStorage.setItem(RECOVERY_TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

function serializeItems(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => ({
    productId: item.productId || item._id || item.id || item.itemId,
    slug: item.slug || "",
    name: item.name || "",
    image: item.image || "",
    quantity: item.quantity || 1,
    unitPrice: item.unitPrice ?? item.price ?? 0,
    price: item.price ?? item.unitPrice ?? 0,
    variantId: item.variantId || "",
    variationLabel: item.variationLabel || "",
    articleNo: item.articleNo || "",
    sku: item.sku || "",
    selectedOptions: item.selectedOptions || null,
    matchedCombination: item.matchedCombination || null,
    selectedVariation: item.selectedVariation || null,
    selectedAddOns: Array.isArray(item.selectedAddOns) ? item.selectedAddOns : undefined,
    categoryIds: Array.isArray(item.categoryIds) ? item.categoryIds : undefined,
    requiresVariant: Boolean(item.requiresVariant),
  }));
}

/**
 * Fire-and-forget sync. Safe to call often — caller should debounce.
 */
export async function syncCartToServer({ items, customer, path } = {}) {
  const sessionId = getCartSessionId();
  if (!sessionId) return null;
  try {
    const res = await fetch("/api/cart/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        items: serializeItems(items),
        customer: customer || undefined,
        path: path || (typeof window !== "undefined" ? window.location.pathname : ""),
      }),
      keepalive: true,
    });
    const json = await res.json().catch(() => ({}));
    if (json?.recoveryToken) setStoredRecoveryToken(json.recoveryToken);
    return json;
  } catch {
    return null;
  }
}

export async function fetchRecoverCart(token) {
  const res = await fetch(`/api/cart/recover?token=${encodeURIComponent(token)}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.error || "Could not restore cart.");
  }
  return json;
}
