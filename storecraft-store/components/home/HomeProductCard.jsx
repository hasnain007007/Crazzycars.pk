"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/currency";

function pctOff(regular, sale, onSale) {
  if (!onSale || regular <= 0) return 0;
  return Math.max(1, Math.round(((regular - sale) / regular) * 100));
}

export function HomeProductCard({ product }) {
  const { addItem } = useCart();
  const images = [];
  const push = (u) => {
    const url = typeof u === "string" ? u.trim() : String(u?.url || "").trim();
    if (url && !images.includes(url)) images.push(url);
  };
  push(product.image);
  for (const img of product.images || []) push(img);
  for (const img of product.media?.images || []) push(img);
  const imageUrl = images[0] || "";
  const hoverImageUrl = images[1] || "";
  const regular = Number(product.regularPrice ?? product.compareAt ?? 0);
  const saleVal = Number(product.salePrice ?? 0);
  const onSale =
    Boolean(product.isOnSale) ||
    (saleVal > 0 && regular > 0 && saleVal < regular);
  const displayPrice = onSale ? saleVal : Number(product.price ?? regular);
  const discount = pctOff(regular, saleVal, onSale);

  function handleAdd(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!product.inStock && product.inventory?.trackInventory !== false) return;
    addItem({
      id: product.id,
      slug: product.slug,
      name: product.name,
      image: imageUrl,
      price: displayPrice,
      unitPrice: displayPrice,
      inventory: product.inventory,
      simpleVariations: [],
      variationCombinations: [],
      requiresVariant: false,
    });
  }

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-sm transition hover:shadow-md">
      <Link href={`/${product.slug}`} className="relative block aspect-square overflow-hidden bg-[#f9fafb]">
        {imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={product.name || "Product"}
              className={`absolute inset-0 h-full w-full object-cover transition duration-300 ${
                hoverImageUrl ? "group-hover:opacity-0" : "group-hover:scale-[1.03]"
              }`}
              loading="lazy"
            />
            {hoverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={hoverImageUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                loading="lazy"
              />
            ) : null}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-4xl text-[#d1d5db]">💎</div>
        )}
        {onSale ? (
          <span className="absolute top-2 left-2 rounded-full bg-[#D72323] px-2 py-0.5 text-xs font-semibold text-[#111111]">SALE</span>
        ) : null}
        {product.newArrival ? (
          <span className="absolute top-2 right-2 rounded-full bg-[#111827] px-2 py-0.5 text-xs font-semibold text-white">NEW</span>
        ) : null}
      </Link>
      <div className="flex flex-1 flex-col p-3">
        <Link
          href={`/${product.slug}`}
          className="font-medium text-[#111111] line-clamp-2 hover:text-[#111111]"
          style={{ fontSize: 14 }}
        >
          {product.name}
        </Link>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            margin: "6px 0",
          }}
        >
          <div style={{ display: "flex", gap: 1 }}>
            {[1, 2, 3, 4, 5].map((star) => {
              const rating = Number(product.rating || product.averageRating || 0);
              return (
                <span
                  key={star}
                  style={{
                    color: star <= Math.round(rating) ? "#D72323" : "#E5E5E5",
                    fontSize: 13,
                    lineHeight: 1.1,
                  }}
                >
                  ★
                </span>
              );
            })}
          </div>
          <span style={{ fontSize: 11, color: "#888888", lineHeight: 1.1 }}>
            {(() => {
              const count = Number(product.reviewCount || product.numReviews || 0);
              const rating = Number(product.rating || product.averageRating || 0);
              if (count > 0) {
                return `${Number(rating).toFixed(1)} (${count})`;
              }
              return "(0)";
            })()}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className="price font-bold"
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "#111111",
              fontFamily: "Arial, Helvetica, sans-serif",
            }}
          >
            {formatPrice(displayPrice)}
          </span>
          {onSale && regular > 0 ? (
            <>
              <span className="price text-sm text-[#9ca3af] line-through">{formatPrice(regular)}</span>
              <span className="rounded-full bg-[rgba(201,168,76,0.12)] px-2 py-0.5 text-xs font-semibold text-[#D72323]">-{discount}%</span>
            </>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={product.inventory?.trackInventory !== false && !product.inStock}
          className="mt-3 w-full rounded-lg bg-[#111111] py-2.5 text-sm font-semibold text-white transition hover:bg-[#333333] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}
