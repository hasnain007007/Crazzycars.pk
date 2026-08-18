"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import { useCheckoutMessages, useStorePayment } from "@/context/StoreSettingsContext";
import { FreeDeliveryProgress } from "@/components/store/FreeDeliveryProgress";
import { formatPrice } from "@/lib/currency";
import { productPath } from "@/lib/productPath";
import { getProgressBarThreshold } from "@/lib/freeDelivery";

function lineKey(x) {
  const m = x?.customMeasurements && typeof x.customMeasurements === "object" ? x.customMeasurements : {};
  const mk = Object.keys(m)
    .sort()
    .map((k) => `${k}:${m[k]}`)
    .join("|");
  return `${x.productId}::${x.variationLabel || ""}::${mk}`;
}

export function CartDrawer() {
  const { items, open, setOpen, subtotal, removeItem, updateQuantity, checkoutUrl } = useCart();
  const checkoutMessages = useCheckoutMessages();
  const storePayment = useStorePayment();
  const emptyMsg = checkoutMessages.cartEmptyMessage || "Your cart is empty";
  const freeShippingThreshold = getProgressBarThreshold(storePayment);
  const [openMeasurements, setOpenMeasurements] = useState({});
  const estimatedShipping = items.reduce(
    (sum, item) => sum + (Number(item.estimatedShipping) || 0) * (Number(item.quantity) || 1),
    0
  );

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="cart-overlay fixed inset-0 border-0 p-0"
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 9998,
        }}
        aria-label="Close cart"
        onClick={() => setOpen(false)}
      />
      <aside
        className="cart-panel cart-drawer fixed top-0 right-0 flex h-full w-full max-w-none flex-col bg-[#FFFFFF] shadow-2xl md:max-w-md"
        style={{ borderLeft: "1px solid #E5E5E5", zIndex: 9999 }}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            Your Cart <span className="ml-1 rounded-full bg-black px-2 py-0.5 text-xs text-white">{items.length}</span>
          </h2>
          <button type="button" className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100" onClick={() => setOpen(false)}>
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!items.length ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <svg className="h-16 w-16 text-gray-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.5 6h13M9 21h.01M16 21h.01" />
              </svg>
              <p className="mt-2 text-lg font-semibold text-[#111111]">{emptyMsg}</p>
              <p className="text-sm text-[#888888]">Discover our products</p>
              <Link href="/products" onClick={() => setOpen(false)} className="mt-4 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white">
                Start Shopping →
              </Link>
            </div>
          ) : (
            <ul className="space-y-4">
              {(items || []).map((item, index) => {
                const itemId = item._id || item.id || index;
                const price = Number(item.price ?? item.pricing?.regularPrice ?? 0) || 0;
                const imageUrl =
                  item.image ||
                  (Array.isArray(item.images) ? item.images[0] : null) ||
                  item.media?.images?.[0]?.url ||
                  null;
                const qty = Number(item.quantity) || 1;
                return (
                <li key={itemId} className="flex gap-3 border-b border-zinc-100 pb-4">
                  <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link href={productPath(item)} className="line-clamp-2 font-medium text-zinc-900 hover:underline" onClick={() => setOpen(false)}>
                      {item.name}
                    </Link>
                    {item.variationLabel ? <p className="text-xs text-zinc-500">{item.variationLabel}</p> : null}
                    {item.customMeasurements && Object.keys(item.customMeasurements).length ? (
                      <div className="mt-1 text-xs text-blue-700">
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 font-medium">
                          Custom size
                        </span>{" "}
                        <button
                          type="button"
                          className="font-medium underline"
                          onClick={() =>
                            setOpenMeasurements((prev) => ({ ...prev, [lineKey(item)]: !prev[lineKey(item)] }))
                          }
                        >
                          {openMeasurements[lineKey(item)] ? "Hide" : "View"}
                        </button>
                        {openMeasurements[lineKey(item)] ? (
                          <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50 p-2 text-[11px] text-blue-900">
                            {Object.entries(item.customMeasurements).map(([field, value]) => (
                              <div key={field} className="flex justify-between gap-2">
                                <span>{field}</span>
                                <span className="font-medium">{value}</span>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="mt-2 flex items-center justify-between">
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => {
                            if (qty <= 1) removeItem(itemId);
                            else updateQuantity(itemId, qty - 1);
                          }}
                          style={{
                            width: 28, height: 28,
                            border: "1px solid #E5E5E5",
                            borderRadius: 6,
                            background: "#FFFFFF",
                            cursor: "pointer",
                            fontSize: 16,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          −
                        </button>
                        <span style={{ minWidth: 32, textAlign: "center", fontSize: 14, fontWeight: 600, color: "#111111" }}>
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(itemId, qty + 1)}
                          style={{
                            width: 28, height: 28,
                            border: "1px solid #E5E5E5",
                            borderRadius: 6,
                            background: "#FFFFFF",
                            cursor: "pointer",
                            fontSize: 16,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          +
                        </button>
                      </div>
                      <p className="price text-sm font-semibold text-zinc-800">{formatPrice(price * qty)}</p>
                    </div>
                    <div className="mt-1 text-right">
                      <button
                        type="button"
                        onClick={() => removeItem(itemId)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#ef4444",
                          fontSize: 18,
                          padding: "4px",
                          display: "flex",
                          alignItems: "center",
                          marginLeft: "auto",
                        }}
                        title="Remove item"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </li>
                );
              })}
            </ul>
          )}
          {items.length > 0 ? (
            <FreeDeliveryProgress cartTotal={subtotal} threshold={freeShippingThreshold} className="mt-4" />
          ) : null}
        </div>
        <div className="border-t border-[var(--border)] p-5">
          <div className="mb-3 flex gap-2">
            <input type="text" placeholder="Enter promo code" className="h-10 flex-1 rounded-lg border border-[var(--border)] px-3 text-sm" />
            <button type="button" className="rounded-lg border border-[var(--border)] px-3 text-sm font-medium">Apply</button>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-600">Subtotal ({items.length} items)</span>
            <span className="price font-semibold text-zinc-900">{formatPrice(subtotal)}</span>
          </div>
          {estimatedShipping > 0 ? (
            <p className="mt-1 text-xs text-zinc-700">
              Estimated shipping: <span className="price">{formatPrice(estimatedShipping)}</span>
            </p>
          ) : null}
          {items.length > 0 && checkoutMessages.shippingNote ? (
            <p className="mt-1 text-xs text-zinc-500">{checkoutMessages.shippingNote}</p>
          ) : null}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-base font-semibold">Order Total</span>
            <span className="price text-xl font-bold">{formatPrice(subtotal)}</span>
          </div>
          {checkoutUrl ? (
            <a href={checkoutUrl} onClick={() => setOpen(false)} className="mt-4 block w-full rounded-xl py-3.5 text-center text-base font-semibold transition hover:opacity-90" style={{ background: "#111111", color: "#FFFFFF" }}>
              Checkout →
            </a>
          ) : (
            <Link href="/checkout" onClick={() => setOpen(false)} className="mt-4 block w-full rounded-xl py-3.5 text-center text-base font-semibold transition hover:opacity-90" style={{ background: "#111111", color: "#FFFFFF" }}>
              Checkout →
            </Link>
          )}
          <button type="button" onClick={() => setOpen(false)} className="mt-3 w-full text-center text-sm text-zinc-500 hover:text-zinc-700">
            Continue Shopping
          </button>
        </div>
      </aside>
    </>
  );
}
