import { formatPrice } from "@/lib/currency";
import { cardImageUrl } from "@/lib/cloudinaryImage";
import LocalMediaImg from "@/components/store/LocalMediaImg";
import {
  getProductCardImage,
  getProductCardPrices,
  getProductCardReviews,
  isAllowedNextImageSrc,
  normalizeProductForCard,
  productCardAlt,
} from "@/lib/productCardShape";
import Image from "next/image";

function CardImage({ src, master, alt, priority, sizes, className }) {
  if (!src && !master) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1 px-3 text-center">
        <span className="text-2xl text-[#D1D5DB]">—</span>
      </div>
    );
  }
  // Local /media is already compressed WebP — use plain <img> so we never depend on
  // /_next/image quality allowlists (invalid q → HTTP 400 → blank cards).
  const localMedia = /crazzycars\.pk\/media\/|^\/media\//i.test(String(src || master || ""));
  if (!localMedia && isAllowedNextImageSrc(src)) {
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
    <LocalMediaImg
      src={src || master}
      master={master || src}
      alt={alt}
      className={`h-full w-full object-cover ${className || ""}`}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      sizes={sizes}
    />
  );
}

function PriceBlock({ sale, regular, onSale, nowClass, wasClass }) {
  return (
    <div className="cc-card-price-row mt-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-0 md:mt-1.5 md:gap-1.5">
      <span className={nowClass}>{formatPrice(sale)}</span>
      {onSale && regular > sale ? (
        <span className={wasClass}>{formatPrice(regular)}</span>
      ) : null}
    </div>
  );
}

/**
 * Crawler-first product card (React Server Component).
 * One wrapping <a href="/{slug}"> — no nested links.
 */
export function ServerProductCard({ product, categoryName, priority = false, variant = "grid" }) {
  const card = normalizeProductForCard(product);
  if (!card) return null;

  const rawImageUrl = getProductCardImage(card);
  // Always use direct /media (or Cloudinary) URLs — never /_next/image wrappers.
  const imageUrl = cardImageUrl(rawImageUrl, 400) || rawImageUrl;
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
                master={rawImageUrl}
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
            master={rawImageUrl}
            alt={alt}
            priority={priority}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        </div>
        <div className="cc-card-body flex flex-1 flex-col p-2.5">
          <h3 className="cc-card-title m-0 line-clamp-3 text-[13px] font-medium leading-snug text-[#111111]">
            {card.name}
          </h3>
          {reviews ? (
            <div className="cc-card-stars mt-1 text-[11px] text-[#9CA3AF]">
              {reviews.rating != null ? `${reviews.rating.toFixed(1)} ★ ` : null}(
              {reviews.reviewCount} {reviews.reviewCount === 1 ? "review" : "reviews"})
            </div>
          ) : null}
          <PriceBlock
            sale={sale}
            regular={regular}
            onSale={onSale}
            nowClass="cc-card-price text-[16px] font-bold text-[#111111] md:text-[15px]"
            wasClass="text-[12px] line-through text-[#9CA3AF]"
          />
        </div>
      </a>
    </article>
  );
}
