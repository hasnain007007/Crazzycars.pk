"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useCart } from "@/context/CartContext";
import { useProductBadgeConfig, useStoreSettings } from "@/context/StoreSettingsContext";
import { WatermarkedImage } from "./WatermarkedImage";
import { normalizeProductImageWatermark } from "@/lib/productImageWatermark";
import { formatPrice } from "@/lib/currency";
import { productPath } from "@/lib/productPath";
import { imageBelongsToProduct } from "@/lib/productCardShape";

const WISHLIST_KEY = "sialkot_wishlist";

function getStock(product) {
  const q = Number(product?.inventory?.quantity ?? product?.stock ?? product?.quantity ?? 0);
  if (product?.inventory?.trackInventory === false) return 99;
  if (product?.inventory?.allowBackorder === true) return Math.max(q, 1);
  return q;
}

function canSell(product) {
  if (product?.inventory?.trackInventory === false) return true;
  if (product?.inventory?.allowBackorder === true) return true;
  return getStock(product) > 0;
}

function productNeedsOptions(product) {
  if (product?.requiresOptions === true) return true;
  const hasAxes = (product?.simpleVariations || []).some(
    (v) => v?.enabled && Array.isArray(v.tags) && v.tags.length > 0
  );
  const hasCombos =
    Array.isArray(product?.variationCombinations) && product.variationCombinations.length > 0;
  return hasAxes && hasCombos;
}

function getProductImages(product) {
  const list = [];
  const push = (u) => {
    if (!imageBelongsToProduct(u, product)) return;
    const url = typeof u === "string" ? u.trim() : String(u?.url || "").trim();
    if (url && !list.includes(url)) list.push(url);
  };
  if (typeof product?.image === "string") push(product.image);
  else if (product?.image?.url) push(product.image);
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
  const [hoverReady, setHoverReady] = useState(false);
  const inStock = canSell(product);
  const qtyLeft = Number(product?.inventory?.quantity ?? product?.stock ?? 0);
  const onBackorder = inStock && product?.inventory?.trackInventory !== false && qtyLeft <= 0;
  const images = getProductImages(product);
  const imageUrl = images[0] || "";
  const hoverImageUrl = images[1] || "";
  const { regular, sale, onSale, pct } = getPrices(product);
  const slug = product.slug || product.handle || "";
  const href = productPath(product);
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
    if (productNeedsOptions(product)) {
      toast.error("Choose options on the product page first.");
      window.location.href = productPath(product);
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
      codEnabled: product.codEnabled !== false,
      advancePercentRequired: Math.min(
        100,
        Math.max(0, Number(product.advancePercentRequired) || 0)
      ),
    });
    toast.success("Added to cart");
  }

  return (
    <article
      className="product-card group relative flex h-full flex-col overflow-hidden rounded-xl border bg-white transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.10)]"
      style={{ borderColor: "#F3F4F6" }}
      onMouseEnter={() => hoverImageUrl && setHoverReady(true)}
      onFocusCapture={() => hoverImageUrl && setHoverReady(true)}
    >
      <Link
        href={href}
        className="cc-card-media relative block aspect-square overflow-hidden bg-[#F9FAFB]"
        onTouchStart={() => hoverImageUrl && setHoverReady(true)}
      >
        {imageUrl ? (
          <div className="relative h-full w-full">
            <div
              className={`absolute inset-0 transition-opacity duration-300 ${
                hoverImageUrl && hoverReady ? "group-hover:opacity-0" : ""
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
                imgStyle={{ height: "100%", width: "100%", objectFit: "cover" }}
                width={480}
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
            </div>
            {hoverImageUrl && hoverReady ? (
              <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <WatermarkedImage
                  src={hoverImageUrl}
                  alt=""
                  watermark={productImageWatermark}
                  className="h-full w-full"
                  imgClassName="h-full w-full object-cover"
                  imgStyle={{ height: "100%", width: "100%", objectFit: "cover" }}
                  width={480}
                  loading="eager"
                />
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 px-3 text-center">
            <span className="text-2xl text-[#D1D5DB]">—</span>
            <span className="line-clamp-2 text-[11px] font-medium text-[#9CA3AF]">
              {product.name || "No image"}
            </span>
          </div>
        )}

        {onSale && badgeConfig.showSaleBadge ? (
          <span
            className="absolute left-1.5 top-1.5 rounded-full px-1.5 py-px text-[9px] font-semibold text-white md:left-2 md:top-2 md:px-2 md:py-0.5 md:text-[11px]"
            style={{ background: badgeConfig.saleBadgeColor }}
          >
            {badgeConfig.saleBadgeText}
          </span>
        ) : showNew && badgeConfig.showNewBadge ? (
          <span
            className="absolute left-1.5 top-1.5 rounded-full px-1.5 py-px text-[9px] font-semibold text-white md:left-2 md:top-2 md:px-2 md:py-0.5 md:text-[11px]"
            style={{ background: badgeConfig.newBadgeColor || "#111111" }}
          >
            {badgeConfig.newBadgeText}
          </span>
        ) : null}

        <button
          type="button"
          onClick={toggleWish}
          className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 opacity-100 shadow-sm transition md:h-8 md:w-8 md:opacity-0 md:group-hover:opacity-100"
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
            className="absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full text-[15px] font-semibold leading-none text-white shadow-sm md:bottom-0 md:left-0 md:right-0 md:h-auto md:w-auto md:translate-y-full md:rounded-none md:py-3 md:text-sm md:opacity-0 md:shadow-none md:group-hover:translate-y-0 md:group-hover:opacity-100"
            style={{ background: "#C41E1E" }}
          >
            {onBackorder ? "Order" : <span className="md:hidden">+</span>}
            <span className="hidden md:inline">{onBackorder ? "Order (backorder)" : "Add to Cart"}</span>
          </button>
        )}
      </Link>

      <div className={`cc-card-body flex flex-1 flex-col ${compact ? "p-1.5 md:p-3" : "p-1.5 md:p-4"}`}>
        <Link href={href} className="cc-card-title line-clamp-2 text-[11px] font-medium leading-snug text-[#111111] hover:text-[#C41E1E] md:text-sm">
          {product.name}
        </Link>

        {reviewCount > 0 ? (
          <div className="cc-card-stars mt-0.5 flex items-center gap-px md:mt-1.5 md:gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <span
                key={s}
                className="text-[9px] leading-none md:text-[12px]"
                style={{ color: s <= Math.round(rating) ? "#E8941A" : "#E5E7EB" }}
              >
                ★
              </span>
            ))}
            <span className="ml-0.5 text-[9px] md:text-[11px]" style={{ color: "#9CA3AF" }}>
              ({reviewCount})
            </span>
          </div>
        ) : null}

        <div className="cc-card-price-row mt-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-0 md:mt-2 md:gap-2">
          <span className="cc-card-price text-[13px] font-bold text-[#111111] md:text-lg">{formatPrice(sale)}</span>
          {onSale ? (
            <>
              <span className="text-[10px] line-through md:text-[13px]" style={{ color: "#9CA3AF" }}>
                {formatPrice(regular)}
              </span>
              {pct > 0 && badgeConfig.showSaleBadge ? (
                <span className="text-[10px] font-medium md:text-xs" style={{ color: badgeConfig.saleBadgeColor }}>
                  {pct}% off
                </span>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
