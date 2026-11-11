/**
 * Client helpers: session id + debounced cart sync to the server.
 * Unload path prefers sendBeacon; interactive path uses fetch.
 */
"use client";

import {
  draftHasContact,
  draftToSyncPayload,
  readCheckoutDraft,
} from "@/lib/checkoutDraft";
import { mergeContactPayload } from "@/lib/cartSyncNormalize";

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

function buildSyncBody({
  items,
  customer,
  shippingAddress,
  path,
  includeDraft = true,
  checkoutStage,
  customerId,
}) {
  const sessionId = getCartSessionId();
  if (!sessionId) return null;

  const draft = includeDraft ? readCheckoutDraft() : null;
  const fromDraft =
    draft && draftHasContact(draft) ? draftToSyncPayload(draft) : { customer: {}, shippingAddress: {} };
  const merged = mergeContactPayload(fromDraft, {
    customer: customer && typeof customer === "object" ? customer : {},
    shippingAddress: shippingAddress && typeof shippingAddress === "object" ? shippingAddress : {},
  });

  return {
    sessionId,
    items: serializeItems(items),
    customer: merged.hasCustomer ? merged.customer : undefined,
    shippingAddress: merged.hasAddress || merged.hasCustomer ? merged.shippingAddress : undefined,
    path: path || (typeof window !== "undefined" ? window.location.pathname : ""),
    checkoutStage: checkoutStage || undefined,
    customerId: customerId || undefined,
  };
}

function postViaBeacon(body) {
  if (typeof navigator === "undefined" || typeof navigator.sendBeacon !== "function") return false;
  try {
    const blob = new Blob([JSON.stringify(body)], { type: "application/json" });
    return navigator.sendBeacon("/api/cart/sync", blob);
  } catch {
    return false;
  }
}

/**
 * Fire-and-forget sync. Safe to call often — caller should debounce.
 * Merges local checkout draft so name/phone/address survive item-only syncs.
 * @param {{ unload?: boolean }} [opts] — unload=true prefers sendBeacon
 */
export async function syncCartToServer({
  items,
  customer,
  shippingAddress,
  path,
  includeDraft = true,
  checkoutStage,
  customerId,
  unload = false,
} = {}) {
  const body = buildSyncBody({
    items,
    customer,
    shippingAddress,
    path,
    includeDraft,
    checkoutStage,
    customerId,
  });
  if (!body) return null;

  if (unload) {
    if (postViaBeacon(body)) return { success: true, via: "beacon" };
    // Fallback keepalive fetch when beacon unavailable/rejected
    try {
      await fetch("/api/cart/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        keepalive: true,
      });
      return { success: true, via: "keepalive" };
    } catch {
      return null;
    }
  }

  try {
    const res = await fetch("/api/cart/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    });
    const json = await res.json().catch(() => ({}));
    if (json?.recoveryToken) setStoredRecoveryToken(json.recoveryToken);
    return json;
  } catch {
    return null;
  }
}

/** Immediate unload-safe flush (drawer/checkout pagehide). */
export function flushCartSyncOnUnload(opts = {}) {
  return syncCartToServer({ ...opts, unload: true });
}

export async function fetchRecoverCart(token) {
  const res = await fetch(`/api/cart/recover?token=${encodeURIComponent(token)}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.error || "Could not restore cart.");
  }
  return json;
}
