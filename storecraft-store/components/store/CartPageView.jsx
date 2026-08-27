"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/currency";
import { productPath } from "@/lib/productPath";
import { isPlaceholderProductImage } from "@/lib/homefyBrand";
import { ProductImagePlaceholder } from "@/components/store/ProductImagePlaceholder";

export function CartPageView() {
  const { items, subtotal, removeItem, updateQuantity } = useCart();

  return (
    <div className="min-h-[60vh] bg-[#FAF7F2] py-8 md:py-12">
      <div className="store-container max-w-3xl">
        <h1 className="font-heading text-2xl font-bold text-[#111] md:text-3xl">Your cart</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          {items.length ? `${items.length} item${items.length === 1 ? "" : "s"}` : "Nothing here yet."}
        </p>

        {!items.length ? (
          <div className="mt-10 rounded-xl border border-[#E8D9CC] bg-white px-6 py-12 text-center">
            <p className="font-heading text-lg font-semibold text-[#111]">Your cart is empty</p>
            <p className="mt-2 text-sm text-[#6B7280]">Kitchen pieces and bags — same checkout, Cash on Delivery.</p>
            <Link
              href="/shop"
              className="mt-6 inline-flex min-h-[44px] items-center rounded-lg px-5 text-sm font-semibold text-white"
              style={{ background: "var(--color-primary)" }}
            >
              Shop Homefy
            </Link>
          </div>
        ) : (
          <>
            <ul className="mt-6 space-y-4">
              {items.map((item, index) => {
                const itemId = item._id || item.id || index;
                const price = Number(item.price ?? item.unitPrice ?? 0) || 0;
                const imageUrl =
                  item.image ||
                  (Array.isArray(item.images) ? item.images[0] : null) ||
                  item.media?.images?.[0]?.url ||
                  "";
                const qty = Number(item.quantity) || 1;
                return (
                  <li
                    key={itemId}
                    className="flex gap-4 rounded-xl border border-[#E8D9CC] bg-white p-3 md:p-4"
                  >
                    <Link
                      href={productPath(item)}
                      className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-[#FAF7F2]"
                    >
                      {imageUrl && !isPlaceholderProductImage(imageUrl) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <ProductImagePlaceholder name={item.name} compact />
                      )}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link href={productPath(item)} className="font-medium text-[#111] hover:text-[var(--color-primary)]">
                        {item.name}
                      </Link>
                      {item.variationLabel ? (
                        <p className="text-xs text-[#6B7280]">{item.variationLabel}</p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-lg"
                            aria-label="Decrease quantity"
                            onClick={() => {
                              if (qty <= 1) removeItem(itemId);
                              else updateQuantity(itemId, qty - 1);
                            }}
                          >
                            −
                          </button>
                          <span className="min-w-[2rem] text-center text-sm font-semibold">{qty}</span>
                          <button
                            type="button"
                            className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-lg"
                            aria-label="Increase quantity"
                            onClick={() => updateQuantity(itemId, qty + 1)}
                          >
                            +
                          </button>
                        </div>
                        <p className="text-sm font-bold">{formatPrice(price * qty)}</p>
                      </div>
                      <button
                        type="button"
                        className="mt-2 text-xs text-[#6B7280] underline hover:text-[#111]"
                        onClick={() => removeItem(itemId)}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="mt-8 rounded-xl border border-[#E8D9CC] bg-white p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#6B7280]">Subtotal</span>
                <span className="font-heading text-xl font-bold">{formatPrice(subtotal)}</span>
              </div>
              <p className="mt-1 text-xs text-[#6B7280]">Delivery is calculated at checkout. Cash on Delivery available.</p>
              <Link
                href="/checkout"
                className="mt-4 flex min-h-[44px] w-full items-center justify-center rounded-xl text-base font-semibold text-white"
                style={{ background: "#111" }}
              >
                Checkout
              </Link>
              <Link href="/shop" className="mt-3 block text-center text-sm text-[#6B7280] hover:text-[#111]">
                Continue shopping
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
