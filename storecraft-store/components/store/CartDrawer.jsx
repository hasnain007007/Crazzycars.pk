"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { useCart } from "@/context/CartContext";
import { useCheckoutMessages } from "@/context/StoreSettingsContext";
import { formatPrice } from "@/lib/currency";
import { productPath } from "@/lib/productPath";
import {
  shippingAdvanceBannerEn,
  shippingAdvanceBannerUr,
} from "@/lib/storePolicyCopy";
import { cartHasBulkyItem, shippingFloorPKR } from "@/lib/shippingTier";

function lineKey(x) {
  const m = x?.customMeasurements && typeof x.customMeasurements === "object" ? x.customMeasurements : {};
  const mk = Object.keys(m)
    .sort()
    .map((k) => `${k}:${m[k]}`)
    .join("|");
  return `${x.productId}::${x.variationLabel || ""}::${mk}`;
}

const qtyBtnStyle = {
  width: 44,
  height: 44,
  minWidth: 44,
  minHeight: 44,
  border: "1px solid #E5E5E5",
  borderRadius: 8,
  background: "#FFFFFF",
  cursor: "pointer",
  fontSize: 18,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#111111",
};

export function CartDrawer() {
  const { items, open, setOpen, subtotal, removeItem, updateQuantity, checkoutUrl } = useCart();
  const checkoutMessages = useCheckoutMessages();
  const emptyMsg = checkoutMessages.cartEmptyMessage || "Your cart is empty";
  const [openMeasurements, setOpenMeasurements] = useState({});
  const [codOpen, setCodOpen] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);
  const codPanelId = useId();
  const hasBulky = cartHasBulkyItem(items);
  const estimatedShipping = items.length > 0 ? shippingFloorPKR(hasBulky) : 0;
  const estimatedTotal =
    Math.round((Number(subtotal) + Number(estimatedShipping || 0)) * 100) / 100;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setCodOpen(false);
      setPromoOpen(false);
    }
  }, [open]);

  if (!open) return null;

  const checkoutHref = checkoutUrl || "/checkout";

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
        className="cart-panel cart-drawer fixed top-0 right-0 flex h-[100dvh] w-full max-w-none flex-col bg-[#FFFFFF] shadow-2xl md:max-w-md"
        style={{ borderLeft: "1px solid #E5E5E5", zIndex: 9999 }}
        aria-label="Shopping cart"
      >
        {/* 1. Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-4 py-2 sm:px-5">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            Your Cart{" "}
            <span className="ml-1 rounded-full bg-black px-2 py-0.5 text-xs text-white">
              {items.length}
            </span>
          </h2>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100"
            aria-label="Close cart"
            onClick={() => setOpen(false)}
          >
            ✕
          </button>
        </div>

        {/* 2. Scrollable items (≥60% via flex-1 min-h-0) */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5">
          {!items.length ? (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center">
              <svg
                className="h-16 w-16 text-gray-200"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.5 6h13M9 21h.01M16 21h.01"
                />
              </svg>
              <p className="mt-2 text-lg font-semibold text-[#111111]">{emptyMsg}</p>
              <p className="text-sm text-[#4B5563]">Discover our products</p>
              <Link
                href="/shop"
                onClick={() => setOpen(false)}
                className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white"
              >
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
                        <img
                          src={imageUrl}
                          alt=""
                          width={72}
                          height={72}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={productPath(item)}
                          className="line-clamp-2 font-medium text-zinc-900 hover:underline"
                          onClick={() => setOpen(false)}
                        >
                          {item.name}
                        </Link>
                        <button
                          type="button"
                          onClick={() => removeItem(itemId)}
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
                          title="Remove item"
                          aria-label={`Remove ${item.name || "item"}`}
                        >
                          ×
                        </button>
                      </div>
                      {item.variationLabel ? (
                        <p className="text-xs text-zinc-500">{item.variationLabel}</p>
                      ) : null}
                      {item.customMeasurements && Object.keys(item.customMeasurements).length ? (
                        <div className="mt-1 text-xs text-blue-700">
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 font-medium">
                            Custom size
                          </span>{" "}
                          <button
                            type="button"
                            className="min-h-11 px-1 font-medium underline"
                            onClick={() =>
                              setOpenMeasurements((prev) => ({
                                ...prev,
                                [lineKey(item)]: !prev[lineKey(item)],
                              }))
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
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (qty <= 1) removeItem(itemId);
                              else updateQuantity(itemId, qty - 1);
                            }}
                            style={qtyBtnStyle}
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span
                            className="min-w-[32px] text-center text-sm font-semibold text-[#111111]"
                            aria-live="polite"
                          >
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(itemId, qty + 1)}
                            style={qtyBtnStyle}
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                        <p className="price text-sm font-semibold text-zinc-800">
                          {formatPrice(price * qty)}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Compact chrome ≤ ~35% viewport: COD + promo + summary + sticky CTAs */}
        {items.length > 0 ? (
          <div className="cart-drawer__chrome flex shrink-0 flex-col border-t border-[var(--border)] bg-white">
            {/* COD + promo capped so items keep ≥60%; summary + CTAs stay pinned */}
            <div className="max-h-[16dvh] space-y-1.5 overflow-y-auto overscroll-contain px-4 pt-2 sm:px-5">
              {/* 3. Collapsed COD notice */}
              <div
                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-left"
                role="note"
              >
                <div className="flex items-start gap-2">
                  <p className="m-0 min-w-0 flex-1 text-[13px] font-medium leading-snug text-amber-950">
                    COD needs a small booking advance (from Rs. 250).
                  </p>
                  <button
                    type="button"
                    className="inline-flex h-11 min-w-[44px] shrink-0 items-center justify-center rounded-md px-2 text-[13px] font-semibold text-amber-950 underline underline-offset-2"
                    aria-expanded={codOpen}
                    aria-controls={codPanelId}
                    onClick={() => setCodOpen((v) => !v)}
                  >
                    {codOpen ? "Hide" : "Details"}
                  </button>
                </div>
                {codOpen ? (
                  <div id={codPanelId} className="mt-2 border-t border-amber-200/80 pt-2">
                    <p className="m-0 text-[13px] font-medium leading-snug text-amber-950 sm:text-sm">
                      {shippingAdvanceBannerEn()}
                    </p>
                    <p
                      className="mt-1.5 mb-0 text-[12px] leading-snug text-amber-900/90 sm:text-[13px]"
                      lang="ur"
                      dir="rtl"
                    >
                      {shippingAdvanceBannerUr()}
                    </p>
                  </div>
                ) : null}
              </div>

              {/* 4. Promo collapsed by default */}
              {!promoOpen ? (
                <button
                  type="button"
                  className="flex w-full items-center py-1 text-left text-sm font-semibold text-[#111111] underline underline-offset-2"
                  onClick={() => setPromoOpen(true)}
                >
                  Have a promo code?
                </button>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter promo code"
                    className="h-10 min-h-10 flex-1 rounded-lg border border-[var(--border)] px-3 text-sm"
                  />
                  <button
                    type="button"
                    className="h-10 min-h-10 rounded-lg border border-[var(--border)] px-3 text-sm font-medium"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>

            {/* 5–6. Pinned summary + sticky CTAs */}
            <div className="shrink-0 border-t border-zinc-100 px-4 pb-1.5 pt-1.5 sm:px-5">
              <div className="space-y-0.5 pb-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-600">Subtotal ({items.length} items)</span>
                  <span className="price font-semibold text-zinc-900">{formatPrice(subtotal)}</span>
                </div>
                {estimatedShipping > 0 ? (
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Delivery (est.)</span>
                    <span className="price font-semibold text-zinc-900">
                      {formatPrice(estimatedShipping)}
                    </span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold">Total</span>
                  <span className="price text-lg font-bold">{formatPrice(estimatedTotal)}</span>
                </div>
                {estimatedShipping > 0 ? (
                  <p className="m-0 text-[11px] leading-snug text-zinc-500">
                    Final delivery confirmed at checkout.
                  </p>
                ) : null}
              </div>
              {checkoutUrl ? (
                <a
                  href={checkoutHref}
                  onClick={() => setOpen(false)}
                  className="flex h-12 min-h-12 w-full items-center justify-center rounded-xl text-center text-base font-semibold transition hover:opacity-90"
                  style={{ background: "#111111", color: "#FFFFFF" }}
                >
                  Checkout
                </a>
              ) : (
                <Link
                  href={checkoutHref}
                  onClick={() => setOpen(false)}
                  className="flex h-12 min-h-12 w-full items-center justify-center rounded-xl text-center text-base font-semibold transition hover:opacity-90"
                  style={{ background: "#111111", color: "#FFFFFF" }}
                >
                  Checkout
                </Link>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-0.5 flex w-full items-center justify-center py-1.5 text-center text-sm font-semibold text-[#111111] underline underline-offset-2"
              >
                Continue shopping
              </button>
            </div>
          </div>
        ) : (
          <div className="shrink-0 border-t border-[var(--border)] px-4 py-3 sm:px-5">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex min-h-11 w-full items-center justify-center text-center text-sm font-semibold text-[#111111] underline underline-offset-2"
            >
              Continue shopping
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
