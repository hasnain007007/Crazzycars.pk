"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_HOMEPAGE_SETTINGS } from "@/lib/defaultHomepageSettings";
import { heroImageUrl, heroImageUrlMobile } from "@/lib/cloudinaryImage";
import { useStorePayment } from "@/context/StoreSettingsContext";
import { formatFreeDeliveryThreshold } from "@/lib/freeDelivery";

function useTrustBadges() {
  const storePayment = useStorePayment();
  return useMemo(
    () => [
      "✓ COD Available",
      `✓ Free Delivery ${formatFreeDeliveryThreshold(storePayment)}+`,
      "✓ Easy Returns",
    ],
    [storePayment]
  );
}

function splitHeadline(headline) {
  const text = headline || "";
  const parts = text.trim().split(/\s+/);
  if (parts.length <= 1) return { line1: text, line2: "" };
  const line2 = parts.pop();
  return { line1: parts.join(" "), line2 };
}

function normalizeButtonUrl(url) {
  const u = String(url || "").trim();
  if (!u) return "/shop";
  if (u.startsWith("http://") || u.startsWith("https://") || u.startsWith("/")) return u;
  return `/${u}`;
}

function HeroButtons({ buttons, defaultTextColor = "#FFFFFF", mobilePrimaryOnly = false }) {
  let list = Array.isArray(buttons)
    ? buttons.filter((b) => String(b?.text || "").trim())
    : [];
  if (mobilePrimaryOnly && list.length > 1) {
    list = list.slice(0, 1);
  }
  if (!list.length) return null;

  return (
    <div className={`home-hero__ctas${mobilePrimaryOnly ? " home-hero__ctas--mobile" : ""}`}>
      {list.map((button, i) => {
        const text = String(button.text || "").trim();
        const href = normalizeButtonUrl(button.url || button.link);
        const textColor = button.textColor || button.color || defaultTextColor;
        const bgColor = button.bgColor || "#C41E1E";
        const styleKey = String(button.style || "primary").toLowerCase();
        const isSecondary = styleKey === "secondary" || styleKey === "outline";

        const className = isSecondary ? "home-hero__btn home-hero__btn--ghost" : "home-hero__btn home-hero__btn--primary";
        const style = isSecondary
          ? { color: textColor, borderColor: textColor }
          : { background: bgColor, color: textColor };

        if (href.startsWith("http://") || href.startsWith("https://")) {
          return (
            <a key={i} href={href} className={className} style={style} target="_blank" rel="noopener noreferrer">
              {text}
            </a>
          );
        }

        return (
          <Link key={i} href={href} className={className} style={style}>
            {text}
          </Link>
        );
      })}
    </div>
  );
}

function FallbackHero({ settings }) {
  const trust = useTrustBadges();
  const hp = settings || DEFAULT_HOMEPAGE_SETTINGS;
  const { line1, line2 } = splitHeadline(hp.heroHeadline);
  const subtext = hp.heroSubtext || DEFAULT_HOMEPAGE_SETTINGS.heroSubtext;
  const ctaText = hp.heroCtaText || DEFAULT_HOMEPAGE_SETTINGS.heroCtaText;
  const ctaUrl = hp.heroCtaUrl || DEFAULT_HOMEPAGE_SETTINGS.heroCtaUrl;

  return (
    <section className="home-hero home-hero--fallback" aria-label="Welcome">
      <div className="home-hero__veil" aria-hidden />
      <div className="home-hero__inner">
        <div className="home-hero__copy">
          <p className="home-hero__eyebrow">Pakistan&apos;s Car Accessories Store</p>
          <h1 className="home-hero__title">
            <span className="home-hero__title-line">{line1 || "UPGRADE"}</span>
            {line2 ? <span className="home-hero__title-brand">{line2}</span> : null}
          </h1>
          {subtext ? <p className="home-hero__sub home-hero__sub--desktop">{subtext}</p> : null}
          <div className="home-hero__ctas">
            <Link href={ctaUrl} className="home-hero__btn home-hero__btn--primary">
              {ctaText}
            </Link>
            <Link href="/categories" className="home-hero__btn home-hero__btn--ghost home-hero__btn--desktop">
              Browse Categories
            </Link>
          </div>
          <ul className="home-hero__trust home-hero__trust--desktop">
            {trust.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function HeroSlideContent({ slide }) {
  const trust = useTrustBadges();
  const { line1, line2 } = splitHeadline(slide.title);
  const primaryButtons = slide.buttons?.length
    ? slide.buttons
    : [{ text: "Shop Now", url: "/shop", style: "primary", bgColor: "#C41E1E" }];

  return (
    <div className="home-hero__copy">
      <p className="home-hero__eyebrow">Pakistan&apos;s Car Accessories Store</p>
      <h1 className="home-hero__title" style={{ color: slide.textColor }}>
        <span className="home-hero__title-line">{line1 || slide.title}</span>
        {line2 ? <span className="home-hero__title-brand">{line2}</span> : null}
      </h1>
      {slide.subtitle ? (
        <p className="home-hero__sub home-hero__sub--desktop" style={{ color: slide.subColor }}>
          {slide.subtitle}
        </p>
      ) : null}
      <HeroButtons buttons={primaryButtons} defaultTextColor={slide.textColor} />
      <ul className="home-hero__trust home-hero__trust--desktop">
        {trust.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * @param {{ settings?: object, initialSlides?: Array }} props
 * initialSlides from SSR — first paint includes the hero image (no empty flash).
 */
export default function HomeHero({ settings, initialSlides = null }) {
  const hasInitial = Array.isArray(initialSlides);
  const [slides, setSlides] = useState(() => (hasInitial ? initialSlides : []));
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(!hasInitial);

  useEffect(() => {
    if (hasInitial) {
      setSlides(initialSlides);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    fetch("/api/banners")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const heroList = Array.isArray(data?.hero_slider) ? data.hero_slider : [];
        setSlides(
          heroList.map((b) => {
            const raw = String(b?.background?.image?.url || "").trim();
            return {
              id: b?._id || b?.id || "hero",
              title: String(b?.content?.heading?.text || "").trim(),
              subtitle: String(b?.content?.subheading?.text || "").trim(),
              imageUrl: raw ? heroImageUrl(raw) : null,
              imageUrlMobile: raw ? heroImageUrlMobile(raw) : null,
              buttons: (Array.isArray(b?.content?.buttons) ? b.content.buttons : []).map((btn) => ({
                text: btn?.text || "",
                url: btn?.url || btn?.link || b?.targetUrl || "/shop",
                bgColor: btn?.bgColor || "",
                textColor: btn?.textColor || btn?.color || "",
                style: btn?.style || "primary",
              })),
              backgroundColor: b?.background?.color || "#111111",
              textColor: b?.content?.heading?.color || "#FFFFFF",
              subColor: b?.content?.subheading?.color || "#9CA3AF",
            };
          })
        );
      })
      .catch(() => {
        if (!cancelled) setSlides([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hasInitial, initialSlides]);

  const go = useCallback(
    (dir) => {
      if (slides.length < 2) return;
      setIndex((i) => (i + dir + slides.length) % slides.length);
    },
    [slides.length]
  );

  useEffect(() => {
    if (slides.length < 2) return undefined;
    const t = setInterval(() => go(1), 5000);
    return () => clearInterval(t);
  }, [slides.length, go]);

  if (loading) {
    return <section className="home-hero home-hero--loading" aria-busy="true" />;
  }

  if (!slides.length) {
    return <FallbackHero settings={settings} />;
  }

  const slide = slides[index];
  const bgImage = slide.imageUrl;
  const bgImageMobile = slide.imageUrlMobile || bgImage;

  return (
    <section
      className="home-hero"
      style={{ background: slide.backgroundColor || "#0a0a0a" }}
      aria-roledescription="carousel"
      aria-label="Featured"
    >
      {bgImage ? (
        <picture className="home-hero__media">
          {bgImageMobile && bgImageMobile !== bgImage ? (
            <source media="(max-width: 768px)" srcSet={bgImageMobile} />
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element -- LCP hero; Cloudinary-optimized src */}
          <img
            src={bgImage}
            alt=""
            fetchPriority={index === 0 ? "high" : "low"}
            loading={index === 0 ? "eager" : "lazy"}
            decoding="async"
            className="home-hero__img"
            key={slide.id}
          />
        </picture>
      ) : (
        <div className="home-hero__media home-hero__media--gradient" aria-hidden />
      )}
      <div className="home-hero__veil" aria-hidden />
      <div className="home-hero__inner">
        <HeroSlideContent slide={slide} />
      </div>

      {slides.length > 1 ? (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous slide"
            className="home-hero__arrow home-hero__arrow--prev home-hero__arrow--desktop"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next slide"
            className="home-hero__arrow home-hero__arrow--next home-hero__arrow--desktop"
          >
            ›
          </button>
          <div className="home-hero__dots">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index ? "true" : undefined}
                onClick={() => setIndex(i)}
                className={i === index ? "is-active" : undefined}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
