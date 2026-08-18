import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/currency";
import {
  getProductCardImage,
  getProductCardPrices,
  getProductCardReviews,
  normalizeProductForCard,
  productCardAlt,
} from "@/lib/productCardShape";

/**
 * Crawler-first product card for listing pages (React Server Component).
 * Interactivity (wishlist, add-to-cart) is layered client-side on top.
 */
export function ServerProductCard({ product, categoryName, priority = false }) {
  const card = normalizeProductForCard(product);
  if (!card?.slug) return null;

  const imageUrl = getProductCardImage(card);
  const { regular, sale, onSale } = getProductCardPrices(card);
  const reviews = getProductCardReviews(card);
  const alt = productCardAlt(card, categoryName);
  const href = card.href || `/${card.slug}`;

  return (
    <article className="product-card group relative flex h-full flex-col overflow-hidden rounded-xl border border-[#F3F4F6] bg-white">
      <Link href={href} className="relative block aspect-square overflow-hidden bg-[#F9FAFB]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={alt}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
            priority={priority}
            loading={priority ? "eager" : "lazy"}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 px-3 text-center">
            <span className="text-2xl text-[#D1D5DB]">—</span>
            <span className="line-clamp-2 text-[11px] font-medium text-[#9CA3AF]">{card.name}</span>
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="m-0 text-sm font-medium leading-snug">
          <Link href={href} className="line-clamp-2 text-[#111111] hover:text-[#C41E1E]">
            {card.name}
          </Link>
        </h3>

        {reviews ? (
          <p className="mt-1.5 text-[11px] text-[#9CA3AF]">
            {reviews.rating != null ? (
              <>
                <span aria-hidden="true">{reviews.rating.toFixed(1)} ★ </span>
                <span className="sr-only">Rated {reviews.rating.toFixed(1)} out of 5</span>
              </>
            ) : null}
            ({reviews.reviewCount} {reviews.reviewCount === 1 ? "review" : "reviews"})
          </p>
        ) : null}

        <p className="mt-2 flex flex-wrap items-baseline gap-2">
          <span className="text-lg font-bold text-[#111111]">{formatPrice(sale)}</span>
          {onSale && regular > sale ? (
            <span className="text-[13px] line-through text-[#9CA3AF]">{formatPrice(regular)}</span>
          ) : null}
        </p>
      </div>
    </article>
  );
}
