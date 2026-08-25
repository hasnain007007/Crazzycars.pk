import Image from "next/image";
import { formatPrice } from "@/lib/currency";
import {
  getProductCardImage,
  getProductCardPrices,
  getProductCardReviews,
  isAllowedNextImageSrc,
  normalizeProductForCard,
  productCardAlt,
} from "@/lib/productCardShape";

function CardImage({ src, alt, priority, sizes, className }) {
  if (!src) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1 px-3 text-center">
        <span className="text-2xl text-[#D1D5DB]">—</span>
      </div>
    );
  }
  if (isAllowedNextImageSrc(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={className || "object-cover"}
        sizes={sizes}
        priority={priority}
        loading={priority ? "eager" : "lazy"}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={`h-full w-full object-cover ${className || ""}`}
      loading={priority ? "eager" : "lazy"}
    />
  );
}

function PriceBlock({ sale, regular, onSale, nowClass, wasClass }) {
  return (
    <p className="cc-card-price-row mt-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-0 md:mt-2 md:gap-2">
      <span className={nowClass}>{formatPrice(sale)}</span>
      {onSale && regular > sale ? (
        <span className={wasClass}>{formatPrice(regular)}</span>
      ) : null}
    </p>
  );
}

/**
 * Crawler-first product card (React Server Component).
 * One wrapping <a href="/{slug}"> — no nested links.
 */
export function ServerProductCard({ product, categoryName, priority = false, variant = "grid" }) {
  const card = normalizeProductForCard(product);
  if (!card) return null;

  const imageUrl = getProductCardImage(card);
  const { regular, sale, onSale } = getProductCardPrices(card);
  const reviews = getProductCardReviews(card);
  const alt = productCardAlt(card, categoryName);
  const href = card.href || `/${card.slug}`;
  const isRow = variant === "list" || variant === "detail";
  const detailed = variant === "detail";

  if (isRow) {
    const cats = Array.isArray(card.categories)
      ? card.categories
          .map((c) => (typeof c === "string" ? c : c?.name))
          .filter(Boolean)
          .slice(0, 2)
          .join(", ")
      : "";
    const excerpt = String(card.shortDescription || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return (
      <article>
        <a href={href} className={`pl-row${detailed ? " pl-row--detail" : ""}`}>
          <div className="pl-row-media">
            <span className="pl-row-thumb relative block overflow-hidden">
              <CardImage
                src={imageUrl}
                alt={alt}
                priority={priority}
                sizes="120px"
                className="object-cover"
              />
            </span>
          </div>
          <div className="pl-row-body">
            {cats ? <p className="pl-row-cats">{cats}</p> : null}
            <h3 className="pl-row-title m-0">{card.name}</h3>
            {reviews ? (
              <p className="pl-row-reviews mt-1 text-[11px] text-[#9CA3AF]">
                {reviews.rating != null ? `${reviews.rating.toFixed(1)} ★ ` : null}(
                {reviews.reviewCount} {reviews.reviewCount === 1 ? "review" : "reviews"})
              </p>
            ) : null}
            {detailed && excerpt ? <p className="pl-row-excerpt">{excerpt}</p> : null}
          </div>
          <div className="pl-row-buy">
            <PriceBlock
              sale={sale}
              regular={regular}
              onSale={onSale}
              nowClass="pl-row-price-now"
              wasClass="pl-row-price-was"
            />
          </div>
        </a>
      </article>
    );
  }

  return (
    <article className="product-card group relative flex h-full flex-col overflow-hidden rounded-xl border border-[#F3F4F6] bg-white">
      <a href={href} className="flex h-full flex-col">
        <div className="cc-card-media relative block aspect-square overflow-hidden bg-[#F9FAFB]">
          <CardImage
            src={imageUrl}
            alt={alt}
            priority={priority}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
          />
        </div>
        <div className="cc-card-body flex flex-1 flex-col p-1.5 md:p-4">
          <h3 className="cc-card-title m-0 line-clamp-2 text-[11px] font-medium leading-snug text-[#111111] md:text-sm">{card.name}</h3>
          {reviews ? (
            <p className="cc-card-stars mt-0.5 text-[9px] text-[#9CA3AF] md:mt-1.5 md:text-[11px]">
              {reviews.rating != null ? `${reviews.rating.toFixed(1)} ★ ` : null}(
              {reviews.reviewCount} {reviews.reviewCount === 1 ? "review" : "reviews"})
            </p>
          ) : null}
          <PriceBlock
            sale={sale}
            regular={regular}
            onSale={onSale}
            nowClass="cc-card-price text-[13px] font-bold text-[#111111] md:text-lg"
            wasClass="text-[10px] line-through text-[#9CA3AF] md:text-[13px]"
          />
        </div>
      </a>
    </article>
  );
}
