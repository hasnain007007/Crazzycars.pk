"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/currency";

export function ShopifyProductView({ product }) {
  const { addItem } = useCart();
  const [imageIndex, setImageIndex] = useState(0);
  const [variantId, setVariantId] = useState(product.variants.find((variant) => variant.availableForSale)?.id || product.variants[0]?.id);
  const variant = product.variants.find((item) => item.id === variantId) || product.variants[0];
  const currentPrice = variant?.price || product.price;
  const compareAt = variant?.compareAtPrice || product.compareAt;
  const available = variant?.availableForSale ?? product.availableForSale;

  function addToCart() {
    if (!available || !variant?.id) return;
    addItem({
      productId: product.id,
      id: product.id,
      variantId: variant.id,
      merchandiseId: variant.id,
      slug: product.slug,
      name: product.name,
      image: product.images[imageIndex]?.url || product.image,
      price: currentPrice,
      unitPrice: currentPrice,
      quantity: 1,
      variationLabel: variant.title === "Default Title" ? "" : variant.title,
      selectedOptions: variant.selectedOptions,
      source: "shopify",
    });
    toast.success("Added to cart");
  }

  return (
    <div className="bg-white pb-16">
      <div className="border-b border-zinc-200 bg-zinc-50 py-3"><div className="mx-auto max-w-7xl px-4 text-sm text-zinc-500">Home / Products / {product.name}</div></div>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 lg:grid-cols-2">
        <div className="grid grid-cols-[72px_1fr] gap-4">
          <div className="flex flex-col gap-3">
            {product.images.map((image, index) => (
              <button key={image.url} type="button" onClick={() => setImageIndex(index)} className={`aspect-square overflow-hidden rounded border-2 ${index === imageIndex ? "border-[#C41E1E]" : "border-zinc-200"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt={image.altText || product.name} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
          <div className="aspect-square overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
            {product.images[imageIndex]?.url ? <img src={product.images[imageIndex].url} alt={product.images[imageIndex].altText || product.name} className="h-full w-full object-contain" /> : null}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.15em] text-[#C41E1E]">CrazzyCars</p>
          <h1 className="font-heading text-3xl font-bold text-zinc-950 md:text-4xl">{product.name}</h1>
          <div className="mt-5 flex items-center gap-3">
            <span className="text-3xl font-bold text-[#C41E1E]">{formatPrice(currentPrice)}</span>
            {compareAt > currentPrice ? <span className="text-lg text-zinc-400 line-through">{formatPrice(compareAt)}</span> : null}
          </div>
          <p className={`mt-4 text-sm font-semibold ${available ? "text-green-700" : "text-red-600"}`}>{available ? "In stock" : "Out of stock"}</p>
          {product.variants.length > 1 ? (
            <label className="mt-6 block text-sm font-semibold text-zinc-900">
              Variant
              <select className="mt-2 block w-full rounded border border-zinc-300 bg-white p-3" value={variantId} onChange={(event) => setVariantId(event.target.value)}>
                {product.variants.map((item) => <option key={item.id} value={item.id} disabled={!item.availableForSale}>{item.title}{!item.availableForSale ? " — Sold out" : ""}</option>)}
              </select>
            </label>
          ) : null}
          <button type="button" onClick={addToCart} disabled={!available} className="mt-6 w-full rounded-lg bg-[#C41E1E] px-6 py-4 text-sm font-bold uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:bg-zinc-300">
            {available ? "Add to Cart" : "Sold Out"}
          </button>
          <div className="prose mt-8 max-w-none text-zinc-700" dangerouslySetInnerHTML={{ __html: product.descriptionHtml }} />
        </div>
      </div>
    </div>
  );
}
