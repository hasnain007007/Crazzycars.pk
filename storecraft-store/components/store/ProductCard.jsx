"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useCart } from "@/context/CartContext";
import { useProductBadgeConfig, useStoreSettings } from "@/context/StoreSettingsContext";
import { WatermarkedImage } from "./WatermarkedImage";
import { normalizeProductImageWatermark } from "@/lib/productImageWatermark";
import { formatPrice } from "@/lib/currency";

const WISHLIST_KEY = "sialkot_wishlist";

function getStock(product) {
  const q = Number(product?.inventory?.quantity ?? product?.stock ?? product?.quantity ?? 0);
  if (product?.inventory?.trackInventory === false) return 99;
  return q;
}

function getProductImages(product) {
  const list = [];
  const push = (u) => {
    const url = typeof u === "string" ? u.trim() : String(u?.url || "").trim();
    if (url && !list.includes(url)) list.push(url);
  };
  if (typeof product?.image === "string") push(product.image);
  else if (product?.image?.url) push(product.image.url);
  for (const img of product?.images || []) push(img);
  for (const img of product?.media?.images || []) push(img);
  return list;
}

function getImage(product) {
  return getProductImages(product)[0] || "";
}

function getPrices(product) {
  const regular = Number(product.regularPrice ?? product.compareAt ?? product.price ?? 0);
  const sale = Number(product.salePrice ?? product.price ?? regular);
  const onSale = sale > 0 && sale < regular;
  const pct = onSale && regular > 0 ? Math.round(((regular - sale) / regular) * 100) : 0;
  return { regular, sale: onSale ? sale : regular, onSale, pct };
}

function isNewProduct(product) {
  if (product?.isNew || product?.badge === "new") return true;
  const created = product?.createdAt || product?.created_at;
  if (!created) return false;
  const age = Date.now() - new Date(created).getTime();
  return age < 30 * 24 * 60 * 60 * 1000;
}

export function ProductCard({ product, compact = false }) {
  const { addItem } = useCart();
  const badgeConfig = useProductBadgeConfig();
  const { productImageWatermark: rawWatermark } = useStoreSettings();
  const productImageWatermark = normalizeProductImageWatermark(rawWatermark);
  const [wish, setWish] = useState(false);
  const inStock = getStock(product) > 0;
  const images = getProductImages(product);
  const imageUrl = images[0] || "";
  const hoverImageUrl = images[1] || "";
  const { regular, sale, onSale, pct } = getPrices(product);
  const slug = product.slug || product.handle || "";
  const href = slug ? (product.source === "shopify" || product.handle ? `/products/${slug}` : `/${slug}`) : "#";
  const reviewCount = Number(product.reviewCount || product.reviews_count || 0);
  const rating = Number(product.rating || 0);
  const showNew = !onSale && isNewProduct(product);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(WISHLIST_KEY);
      const list = raw ? JSON.parse(raw) : [];
      setWish(Array.isArray(list) && list.some((i) => i.slug === slug || i.id === product.id));
    } catch {
      setWish(false);
    }
  }, [product.id, slug]);

  function toggleWish(e) {
    e.preventDefault();
    e.stopPropagation();
    try {
      const raw = localStorage.getItem(WISHLIST_KEY);
      let list = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) list = [];
      const exists = list.some((i) => i.slug === slug);
      if (exists) {
        list = list.filter((i) => i.slug !== slug);
        setWish(false);
      } else {
        list.push({ id: product.id, slug, name: product.name, image: imageUrl, price: sale });
        setWish(true);
      }
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
      window.dispatchEvent(new Event("sialkot-wishlist-change"));
    } catch {
      /* ignore */
    }
  }

  function addToCart(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!product?.id) {
      toast.error("Product unavailable");
      return;
    }
    const variant = product.source === "shopify" ? product.variants?.find((item) => item.availableForSale) : null;
    if (product.source === "shopify" && !variant?.id) {
      toast.error("Product unavailable");
      return;
    }
    addItem({
      productId: product.id,
      id: product.id,
      slug,
      name: product.name,
      image: imageUrl,
      unitPrice: sale,
      price: sale,
      quantity: 1,
      variationLabel: "",
      variantId: variant?.id || "",
      merchandiseId: variant?.id || "",
      source: product.source,
    });
    toast.success("Added to cart");
  }

  return (
    <article
      className="group relative flex h-full flex-col overflow-hidden rounded-xl border bg-white transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.10)]"
      style={{ borderColor: "#F3F4F6" }}
    >
      <Link href={href} className="relative block aspect-square overflow-hidden rounded-lg m-3 mb-0" style={{ background: "#F9FAFB" }}>
        {imageUrl ? (
          <div className="relative h-full w-full">
            <div
              className={`absolute inset-0 transition-opacity duration-300 ${
                hoverImageUrl ? "group-hover:opacity-0" : ""
              }`}
            >
              <WatermarkedImage
                src={imageUrl}
                alt={product.name || "Product"}
                watermark={productImageWatermark}
                className="h-full w-full"
                imgClassName={`h-full w-full object-cover transition-transform duration-300 ${
                  hoverImageUrl ? "" : "group-hover:scale-[1.02]"
                }`}
                imgStyle={{ height: "100%", objectFit: "cover" }}
              />
            </div>
            {hoverImageUrl ? (
              <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <WatermarkedImage
                  src={hoverImageUrl}
                  alt=""
                  watermark={productImageWatermark}
                  className="h-full w-full"
                  imgClassName="h-full w-full object-cover"
                  imgStyle={{ height: "100%", objectFit: "cover" }}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-3xl text-[#D1D5DB]">—</div>
        )}

        {onSale && badgeConfig.showSaleBadge ? (
          <span
            className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
            style={{ background: badgeConfig.saleBadgeColor }}
          >
            {badgeConfig.saleBadgeText}
          </span>
        ) : showNew && badgeConfig.showNewBadge ? (
          <span
            className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
            style={{ background: badgeConfig.newBadgeColor || "#111111" }}
          >
            {badgeConfig.newBadgeText}
          </span>
        ) : null}

        <button
          type="button"
          onClick={toggleWish}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 opacity-0 shadow-sm transition group-hover:opacity-100"
          aria-label="Save to wishlist"
        >
          <span style={{ color: wish ? "#C41E1E" : "#6B7280", fontSize: 16 }}>{wish ? "♥" : "♡"}</span>
        </button>

        {!inStock ? (
          <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-xs font-semibold text-white">
            Sold Out
          </span>
        ) : (
          <button
            type="button"
            onClick={addToCart}
            className="absolute bottom-0 left-0 right-0 translate-y-full py-3 text-sm font-semibold text-white opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100"
            style={{ background: "#C41E1E" }}
          >
            Add to Cart
          </button>
        )}
      </Link>

      <div className={`flex flex-1 flex-col ${compact ? "p-3" : "p-4"}`}>
        <Link href={href} className="line-clamp-2 text-sm font-medium leading-snug text-[#111111] hover:text-[#C41E1E]">
          {product.name}
        </Link>

        {reviewCount > 0 ? (
          <div className="mt-1.5 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <span key={s} style={{ color: s <= Math.round(rating) ? "#E8941A" : "#E5E7EB", fontSize: 12 }}>
                ★
              </span>
            ))}
            <span className="text-[11px]" style={{ color: "#9CA3AF" }}>
              ({reviewCount})
            </span>
          </div>
        ) : null}

        <div className="mt-2 flex flex-wrap items-baseline gap-2">
          <span className="text-lg font-bold text-[#111111]">{formatPrice(sale)}</span>
          {onSale ? (
            <>
              <span className="text-[13px] line-through" style={{ color: "#9CA3AF" }}>
                {formatPrice(regular)}
              </span>
              {pct > 0 && badgeConfig.showSaleBadge ? (
                <span className="text-xs font-medium" style={{ color: badgeConfig.saleBadgeColor }}>
                  {pct}% off
                </span>
              ) : null}
            </>
          ) : null}
        </div>

        {badgeConfig.showCodBadge ? (
          <div
            className="mt-3 inline-flex max-w-full items-center gap-1.5 px-2.5 py-1"
            style={{
              background: "#111111",
              color: "#FFFFFF",
              borderRadius: 2,
            }}
            title={badgeConfig.codBadgeText || "Cash on delivery"}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
              style={{ flexShrink: 0 }}
            >
              <path
                d="M3 7h11v8H3V7z"
                stroke="#C41E1E"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <path
                d="M14 10h4l3 3v2h-7v-5z"
                stroke="#C41E1E"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <circle cx="7" cy="17.5" r="1.6" fill="#C41E1E" />
              <circle cx="17" cy="17.5" r="1.6" fill="#C41E1E" />
              <path
                d="M1 9h1.5M1 12h1.5M1 15h1.5"
                stroke="#C41E1E"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            <span
              className="truncate text-[11px] font-bold uppercase tracking-wide"
              style={{ fontStyle: "italic", letterSpacing: "0.04em" }}
            >
              {badgeConfig.codBadgeText || "Cash on delivery"}
            </span>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default ProductCard;
