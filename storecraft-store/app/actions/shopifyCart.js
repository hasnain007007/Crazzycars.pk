"use server";

import { cookies } from "next/headers";
import {
  cartCreate,
  cartLinesAdd,
  cartLinesRemove,
  cartLinesUpdate,
  getCart as fetchCart,
  mapShopifyCart,
} from "@/lib/shopifyCart";
import { isShopifyEnabled } from "@/lib/shopify";

const CART_COOKIE = "shopify_cart_id";

async function cartCookie() {
  return cookies();
}

async function currentCartId() {
  const store = await cartCookie();
  return store.get(CART_COOKIE)?.value || "";
}

async function persistCartId(cartId) {
  const store = await cartCookie();
  store.set(CART_COOKIE, cartId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

function unavailable() {
  if (!isShopifyEnabled()) throw new Error("Shopify cart is not configured.");
}

export async function getShopifyCart() {
  unavailable();
  const cartId = await currentCartId();
  if (!cartId) return null;
  const cart = await fetchCart(cartId);
  return mapShopifyCart(cart);
}

export async function addShopifyCartLine({ merchandiseId, quantity = 1 }) {
  unavailable();
  if (!merchandiseId) throw new Error("A Shopify variant ID is required.");
  const cartId = await currentCartId();
  const line = { merchandiseId, quantity: Math.max(1, Number(quantity) || 1) };
  const cart = cartId ? await cartLinesAdd(cartId, [line]) : await cartCreate([line]);
  await persistCartId(cart.id);
  return mapShopifyCart(cart);
}

export async function updateShopifyCartLine({ lineId, quantity }) {
  unavailable();
  const cartId = await currentCartId();
  if (!cartId || !lineId) throw new Error("Shopify cart line not found.");
  if (Number(quantity) < 1) return removeShopifyCartLine({ lineId });
  return mapShopifyCart(await cartLinesUpdate(cartId, [{ id: lineId, quantity: Math.max(1, Number(quantity) || 1) }]));
}

export async function removeShopifyCartLine({ lineId }) {
  unavailable();
  const cartId = await currentCartId();
  if (!cartId || !lineId) throw new Error("Shopify cart line not found.");
  return mapShopifyCart(await cartLinesRemove(cartId, [lineId]));
}
