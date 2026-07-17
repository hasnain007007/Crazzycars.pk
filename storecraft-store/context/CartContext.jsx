"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "cart_items";
const LEGACY_STORAGE_KEY = "sialkot_store_cart_v1";
function normalizeMeasurements(raw) {
  if (!raw || typeof raw !== "object") return {};
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    const key = String(k || "").trim();
    const value = String(v || "").trim();
    if (!key || !value) continue;
    out[key] = value;
  }
  return out;
}

function measurementKey(raw) {
  const m = normalizeMeasurements(raw);
  const pairs = Object.keys(m)
    .sort()
    .map((k) => `${k}:${m[k]}`);
  return pairs.join("|");
}


function loadCart() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    const parsed = JSON.parse(raw || legacy || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCart(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

const CartContext = createContext(null);

function getItemId(item) {
  return String(item?._id || item?.id || item?.itemId || item?.productId || "");
}

function lineKey(item) {
  const variantId = String(item?.variantId || "").trim();
  return `${getItemId(item)}::${variantId}::${item?.variationLabel || ""}::${measurementKey(item?.customMeasurements)}`;
}

function computeRequiresVariant(row) {
  if (typeof row.requiresVariant === "boolean") return row.requiresVariant;
  const sv = row.simpleVariations;
  const hasSimple = Array.isArray(sv) && sv.some((v) => v?.enabled && (v.tags?.length || 0) > 0);
  const vc = row.variationCombinations;
  const multiCombo = Array.isArray(vc) && vc.length > 1;
  return Boolean(hasSimple || multiCombo);
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Hydrate cart from localStorage after mount (avoid SSR/client cart mismatch).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional one-time browser read
    setItems(loadCart());
  }, []);

  useEffect(() => {
    saveCart(items);
  }, [items]);

  const addItem = useCallback((productOrRow, quantityArg = 1) => {
    const row = productOrRow || {};
    const normalizedQty = Math.max(1, Math.min(99, Number(row.quantity ?? quantityArg) || 1));
    const itemId = getItemId(row);
    if (!itemId) return;
    setItems((prev) => {
      const i = prev.findIndex((x) => lineKey(x) === `${itemId}::${String(row.variantId || "").trim()}::${row.variationLabel || ""}::${measurementKey(row.customMeasurements)}`);
      let next;
      if (i >= 0) {
        next = [...prev];
        next[i] = {
          ...next[i],
          quantity: Math.min(99, (next[i].quantity || 0) + normalizedQty),
          unitPrice: Number(next[i].unitPrice ?? next[i].price) || 0,
          price: Number(next[i].price) || 0,
        };
      } else {
        next = [
          ...prev,
          {
            _id: itemId,
            id: itemId,
            itemId,
            productId: itemId,
            slug: row.slug,
            name: row.name,
            image: row.image || "",
            price: Number(row.price) || 0,
            unitPrice: Number(row.unitPrice ?? row.price) || 0,
            variantId: String(row.variantId || "").trim(),
            quantity: normalizedQty,
            variationLabel: row.variationLabel || "",
            selectedVariation: row.selectedVariation || null,
            matchedCombination: row.matchedCombination || null,
            selectedOptions: Array.isArray(row.selectedOptions) ? row.selectedOptions : null,
            simpleVariations: Array.isArray(row.simpleVariations) ? row.simpleVariations : [],
            variationCombinations: Array.isArray(row.variationCombinations) ? row.variationCombinations : [],
            requiresVariant: computeRequiresVariant(row),
            calculatedWeight: Number(row.calculatedWeight) || 0,
            shippingPriceSurcharge: Number(row.shippingPriceSurcharge) || 0,
            estimatedShipping: Number(row.estimatedShipping) || 0,
            estimatedShippingRates: Array.isArray(row.estimatedShippingRates) ? row.estimatedShippingRates : [],
            customMeasurements: normalizeMeasurements(row.customMeasurements),
          },
        ];
      }
      if (typeof window !== "undefined") {
        const subtotal = Math.round(
          next.reduce((t, item) => t + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0) * 100
        ) / 100;
        window.dispatchEvent(new CustomEvent("cart-item-added", { detail: { subtotal } }));
      }
      return next;
    });
    setOpen(true);
  }, []);

  const removeItem = useCallback((itemId) => {
    const target = String(itemId || "");
    setItems((prev) => prev.filter((item) => getItemId(item) !== target));
  }, []);

  const updateQuantity = useCallback((itemId, newQuantity) => {
    const target = String(itemId || "");
    const q = Number(newQuantity) || 0;
    if (q < 1) {
      removeItem(target);
      return;
    }
    setItems((prev) =>
      prev.map((item) => (getItemId(item) === target ? { ...item, quantity: Math.min(99, q) } : item))
    );
  }, [removeItem]);

  const increaseQuantity = useCallback((itemId) => {
    const target = String(itemId || "");
    setItems((prev) =>
      prev.map((item) =>
        getItemId(item) === target ? { ...item, quantity: Math.min(99, (Number(item.quantity) || 1) + 1) } : item
      )
    );
  }, []);

  const decreaseQuantity = useCallback((itemId) => {
    const target = String(itemId || "");
    setItems((prev) => {
      const item = prev.find((i) => getItemId(i) === target);
      if (!item) return prev;
      if ((Number(item.quantity) || 0) <= 1) {
        return prev.filter((i) => getItemId(i) !== target);
      }
      return prev.map((i) => (getItemId(i) === target ? { ...i, quantity: (Number(i.quantity) || 1) - 1 } : i));
    });
  }, []);

  const updateQty = useCallback((key, quantity) => {
    const q = Math.max(0, Math.min(99, parseInt(quantity, 10) || 0));
    setItems((prev) => {
      if (q <= 0) return prev.filter((x) => lineKey(x) !== key);
      return prev.map((x) => (lineKey(x) === key ? { ...x, quantity: q } : x));
    });
  }, []);

  const removeLine = useCallback((key) => {
    setItems((prev) => prev.filter((x) => lineKey(x) !== key));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const cartTotal = useMemo(() => {
    return Math.round(
      items.reduce((total, item) => {
        const price = Number(item.price ?? item.pricing?.regularPrice ?? 0) || 0;
        const qty = Number(item.quantity) || 1;
        return total + price * qty;
      }, 0) * 100
    ) / 100;
  }, [items]);

  const cartCount = useMemo(
    () => items.reduce((total, item) => total + (Number(item.quantity) || 1), 0),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      cartCount,
      cartTotal,
      count: cartCount,
      subtotal: cartTotal,
      open,
      isOpen: open,
      setOpen,
      openCart: () => setOpen(true),
      closeCart: () => setOpen(false),
      toggleCart: () => setOpen((v) => !v),
      addItem,
      removeItem,
      updateQuantity,
      increaseQuantity,
      decreaseQuantity,
      updateQty,
      removeLine,
      clearCart,
    }),
    [
      items,
      cartCount,
      cartTotal,
      open,
      addItem,
      removeItem,
      updateQuantity,
      increaseQuantity,
      decreaseQuantity,
      updateQty,
      removeLine,
      clearCart,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
