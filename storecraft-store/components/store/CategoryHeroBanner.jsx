import { categoryBannerUrl, logoImageUrl } from "@/lib/cloudinaryImage";
import { trimmedLogoUrl } from "@/lib/storeLogo";

function productImageUrls(products) {
  const urls = [];
  for (const p of products || []) {
    const u =
      (typeof p.image === "string" ? p.image : p.image?.url) ||
      p.media?.images?.find((i) => i?.isMain)?.url ||
      p.media?.images?.[0]?.url ||
      "";
    if (u && !urls.includes(u)) urls.push(u);
    if (urls.length >= 6) break;
  }
  return urls;
}

/**
 * Bold category hero — branded carbon/red panel, logo chip, large title, banner visual.
 * Server-safe (no hooks) so the page H1 can SSR outside any useSearchParams island.
 */
export function CategoryHeroBanner({ category, subcategories, products, brand }) {
  const title = String(category?.name || "").toUpperCase();
  const imageAlt = category?.image?.altText || category?.name || "";
  const imageTitle = category?.image?.title || category?.name || "";
  const storeName = brand?.name || "CrazzyCars.pk";
  const logoUrl = logoImageUrl(trimmedLogoUrl(brand?.logo || "")) || trimmedLogoUrl(brand?.logo || "");

  const bannerSlots = (Array.isArray(category?.bannerImages) ? category.bannerImages : [])
    .map((b) => b?.url)
    .filter(Boolean);
  const sideImages = (subcategories || [])
    .map((s) => s?.image?.url)
    .filter(Boolean);
  const productImgs = productImageUrls(products);

  const rawBanner =
    category?.image?.url ||
    bannerSlots[0] ||
    sideImages[0] ||
    productImgs[0] ||
    "";

  const bannerSrc = rawBanner ? categoryBannerUrl(rawBanner) : "";

  return (
    <div className="cat-hero cat-hero--brand" aria-label={`${category?.name} — ${storeName}`}>
      <div className="cat-hero__panel" aria-hidden>
        <span className="cat-hero__carbon" />
        <span className="cat-hero__speed" />
        <span className="cat-hero__flare" />
        <span className="cat-hero__stripe cat-hero__stripe--1" />
        <span className="cat-hero__stripe cat-hero__stripe--2" />
        <svg className="cat-hero__car-mark" viewBox="0 0 120 36" fill="none" aria-hidden>
          <path
            d="M8 24c6-10 18-16 34-16 14 0 24 4 34 10 8 5 16 8 28 8h8"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="34" cy="26" r="5" stroke="currentColor" strokeWidth="2.5" />
          <circle cx="86" cy="26" r="5" stroke="currentColor" strokeWidth="2.5" />
        </svg>
      </div>

      <div className="cat-hero__stage">
        <div className="cat-hero__copy">
          <div className="cat-hero__brand">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="cat-hero__brand-logo" />
            ) : (
              <span className="cat-hero__brand-mark" aria-hidden>
                CC
              </span>
            )}
            <div className="cat-hero__brand-text">
              <span className="cat-hero__brand-name">{storeName}</span>
              <span className="cat-hero__brand-tag">Premium Car Accessories · Pakistan</span>
            </div>
          </div>

          <p className="cat-hero__eyebrow">Shop Collection</p>
          <h1 className="cat-hero__title">{title}</h1>
          <p className="cat-hero__sub">
            Built for real roads — fitment-ready parts from {storeName}
          </p>
        </div>

        {bannerSrc ? (
          <div className="cat-hero__visual">
            <div className="cat-hero__visual-frame">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bannerSrc}
                alt={imageAlt}
                title={imageTitle}
                fetchPriority="high"
                decoding="async"
              />
            </div>
          </div>
        ) : (
          <div className="cat-hero__visual cat-hero__visual--empty" aria-hidden>
            <span className="cat-hero__empty-logo">{storeName}</span>
          </div>
        )}
      </div>

      <svg className="cat-hero__wave" viewBox="0 0 1440 56" preserveAspectRatio="none" aria-hidden>
        <path
          d="M0,22 C180,52 360,4 540,24 C720,44 900,8 1080,26 C1260,44 1350,18 1440,28 L1440,56 L0,56 Z"
          fill="#ffffff"
        />
      </svg>
    </div>
  );
}
