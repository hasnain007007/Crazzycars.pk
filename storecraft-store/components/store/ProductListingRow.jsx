"use client";

import Link from "next/link";
import toast from "react-hot-toast";
import { useCart } from "@/context/CartContext";
import { useStoreSettings } from "@/context/StoreSettingsContext";
import { WatermarkedImage } from "./WatermarkedImage";
import { normalizeProductImageWatermark } from "@/lib/productImageWatermark";
import { formatPrice } from "@/lib/currency";
import { productPath } from "@/lib/productPath";

function getImages(product) {
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

function getPrices(product) {
  const regular = Number(product.regularPrice ?? product.compareAt ?? product.price ?? 0);
  const sale = Number(product.salePrice ?? product.price ?? regular);
  const onSale = sale > 0 && sale < regular;
  return { regular, sale: onSale ? sale : regular, onSale };
}

function categoryLabel(product) {
  const cats = product.categories || [];
  if (Array.isArray(cats) && cats.length) {
    return cats
      .map((c) => (typeof c === "string" ? c : c?.name))
      .filter(Boolean)
      .slice(0, 2)
      .join(", ");
  }
  return product.categoryName || product.category?.name || "";
}

function plainExcerpt(product, max = 160) {
  const raw =
    product.shortDescription ||
    product.excerpt ||
    product.description ||
    product.longDescription ||
    "";
  const text = String(raw)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}

function CartRoundButton({ onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Add to cart"
      className="pl-cart-round"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M6 6h15l-1.5 9h-12L6 6zm0 0L5 3H2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="9" cy="20" r="1.2" fill="currentColor" />
        <circle cx="17" cy="20" r="1.2" fill="currentColor" />
      </svg>
    </button>
  );
}

/** List / detailed-list row matching reference listing options. */
export function ProductListingRow({ product, mode = "list" }) {
  const { addItem } = useCart();
  const { productImageWatermark: rawWatermark } = useStoreSettings();
  const watermark = normalizeProductImageWatermark(rawWatermark);
  const images = getImages(product);
  const { regular, sale, onSale } = getPrices(product);
  const slug = product.slug || product.handle || "";
  const href = productPath(product);
  const cats = categoryLabel(product);
  const excerpt = plainExcerpt(product);
  const sku = product.articleNo || product.sku || product.inventory?.sku || "n/a";
  const rating = Number(product.rating || product.averageRating || product.ratingAverage || 0);
  const reviewCount = Number(product.reviewCount || product.totalReviews || product.numReviews || 0);
  const detailed = mode === "detail";
  const thumbs = detailed ? images.slice(0, 3) : images.slice(0, 1);

  function addToCart(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!product?.id && !product?._id) {
      toast.error("Product unavailable");
      return;
    }
    const id = product.id || product._id;
    addItem({
      productId: id,
      id,
      slug,
      name: product.name,
      image: images[0] || "",
      unitPrice: sale,
      price: sale,
      quantity: 1,
      variationLabel: "",
      variantId: "",
      merchandiseId: "",
      source: product.source,
    });
    toast.success("Added to cart");
  }

  return (
    <article className={`pl-row${detailed ? " pl-row--detail" : ""}`}>
      <div className="pl-row-media">
        {thumbs.length ? (
          thumbs.map((src, i) => (
            <Link key={`${src}-${i}`} href={href} className="pl-row-thumb">
              <WatermarkedImage
                src={src}
                alt={product.name || "Product"}
                watermark={watermark}
                className="h-full w-full"
                imgClassName="h-full w-full object-cover"
                width={detailed ? 120 : 96}
                sizes="120px"
              />
            </Link>
          ))
        ) : (
          <div className="pl-row-thumb pl-row-thumb--empty">—</div>
        )}
      </div>

      <div className="pl-row-body">
        {cats ? <p className="pl-row-cats">{cats}</p> : null}
        <Link href={href} className="pl-row-title">
          {product.name}
        </Link>
        <div className="pl-row-stars" aria-label={`Rating ${rating} of 5`}>
          {[1, 2, 3, 4, 5].map((s) => (
            <span key={s} style={{ color: s <= Math.round(rating) ? "#E8941A" : "#D1D5DB" }}>
              ★
            </span>
          ))}
          <span className="pl-row-reviews">({reviewCount})</span>
        </div>
        {detailed && excerpt ? <p className="pl-row-excerpt">{excerpt}</p> : null}
        {detailed ? <p className="pl-row-sku">SKU: {sku}</p> : null}
      </div>

      <div className="pl-row-buy">
        <div className="pl-row-price">
          <span className="pl-row-price-now">{formatPrice(sale)}</span>
          {onSale ? <span className="pl-row-price-was">{formatPrice(regular)}</span> : null}
        </div>
        <CartRoundButton onClick={addToCart} />
      </div>
    </article>
  );
}
