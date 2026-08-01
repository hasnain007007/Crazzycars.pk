"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_HOMEPAGE_SETTINGS } from "@/lib/defaultHomepageSettings";
import { heroImageUrl, heroImageUrlMobile } from "@/lib/cloudinaryImage";
import { useStorePayment } from "@/context/StoreSettingsContext";
import { formatFreeDeliveryThreshold } from "@/lib/freeDelivery";

const BRAND = "Crazzycars.pk";

function useTrustItems() {
  const storePayment = useStorePayment();
  return useMemo(
    () => [
      "Cash on delivery",
      `Free delivery ${formatFreeDeliveryThreshold(storePayment)}+`,
      "Easy returns",
    ],
    [storePayment]
  );
}

function normalizeButtonUrl(url) {
  const u = String(url || "").trim();
  if (!u) return "/shop";
  if (u.startsWith("http://") || u.startsWith("https://") || u.startsWith("/")) return u;
  return `/${u}`;
}

/**
 * Brand-first copy: brand stays the hero signal; slide title becomes the benefit line
 * when it is a welcome/brand phrase (common admin banner default).
 */
function resolveCopy(slide, settings) {
  const hp = settings || DEFAULT_HOMEPAGE_SETTINGS;
  const rawTitle = String(slide?.title || hp.heroHeadline || "").trim();
  const rawSub = String(slide?.subtitle || "").trim();
  const titleLower = rawTitle.toLowerCase();
  const isBrandish =
    !rawTitle ||
    /crazzy\s*cars/i.test(rawTitle) ||
    /^welcome\b/i.test(rawTitle) ||
    titleLower === "shop now";
  const weakSub = !rawSub || rawSub.length < 18;

  let headline;
  let sub;
  if (isBrandish) {
    headline = weakSub
      ? hp.heroHeadline || "Premium car accessories for every ride"
      : rawSub;
    sub =
      hp.heroSubtext ||
      "Exterior, interior, lighting — built for Pakistani cars.";
  } else {
    headline = rawTitle;
    sub = weakSub
      ? hp.heroSubtext || "Exterior, interior, lighting — built for Pakistani cars."
      : rawSub;
  }

  const buttons = Array.isArray(slide?.buttons)
    ? slide.buttons.filter((b) => String(b?.text || "").trim())
    : [];
  const primary =
    buttons[0] ||
    {
      text: hp.heroCtaText || "Shop Now",
      url: hp.heroCtaUrl || "/shop",
      style: "primary",
      bgColor: "#C41E1E",
    };
  const secondary = buttons.find((b, i) => i > 0 && String(b.style || "").toLowerCase() !== "primary") || buttons[1] || null;

  return { headline, sub, primary, secondary };
}

function primaryButtonColors(button) {
  const raw = String(button?.bgColor || "").trim().toLowerCase();
  // Dark/black admin colors disappear on a dark hero — force brand red.
  const unusable =
    !raw ||
    raw === "#000" ||
    raw === "#000000" ||
    raw === "black" ||
    raw === "#111" ||
    raw === "#111111" ||
    raw === "#0a0a0a" ||
    raw === "#0b0b0b";
  return {
    background: unusable ? "#C41E1E" : button.bgColor,
    color: button?.textColor || "#FFFFFF",
  };
}

function CtaLink({ button, className }) {
  const text = String(button?.text || "Shop Now").trim();
  const href = normalizeButtonUrl(button?.url || button?.link);
  const style = className.includes("home-hero__btn--ghost")
    ? undefined
    : primaryButtonColors(button);

  if (href.startsWith("http://") || href.startsWith("https://")) {
    return (
      <a href={href} className={className} style={style} target="_blank" rel="noopener noreferrer">
        {text}
      </a>
    );
  }
  return (
    <Link href={href} className={className} style={style}>
      {text}
    </Link>
  );
}

function HeroRail({ items }) {
  if (!items?.length) return null;
  return (
    <div className="home-hero-rail" aria-label="Store benefits">
      <ul className="home-hero-rail__list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function HeroCopy({ slide, settings, animateKey }) {
  const { sub, primary, secondary } = resolveCopy(slide, settings);

  return (
    <div className="home-hero__copy" key={animateKey}>
      <h1 className="home-hero__brand">{BRAND}</h1>
      {sub ? <p className="home-hero__sub">{sub}</p> : null}
      <div className="home-hero__ctas">
        <CtaLink button={primary} className="home-hero__btn home-hero__btn--primary" />
        {secondary ? (
          <CtaLink button={secondary} className="home-hero__btn home-hero__btn--ghost" />
        ) : (
          <Link href="/categories" className="home-hero__btn home-hero__btn--ghost">
            Shop by category
          </Link>
        )}
      </div>
    </div>
  );
}

function mapApiBanner(b) {
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
    backgroundColor: b?.background?.color || "#0b0b0b",
    textColor: b?.content?.heading?.color || "#FFFFFF",
    subColor: b?.content?.subheading?.color || "#D1D5DB",
  };
}

/**
 * Full-bleed homepage hero — brand-first, one CTA composition (ecommerce standard).
 * @param {{ settings?: object, initialSlides?: Array }} props
 */
export default function HomeHero({ settings, initialSlides = null }) {
  const trust = useTrustItems();
  const hasInitial = Array.isArray(initialSlides);
  const [slides, setSlides] = useState(() => (hasInitial ? initialSlides : []));
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(!hasInitial);
  const [paused, setPaused] = useState(false);

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
        setSlides(heroList.map(mapApiBanner));
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
    if (slides.length < 2 || paused) return undefined;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduce) return undefined;
    const t = setInterval(() => go(1), 7000);
    return () => clearInterval(t);
  }, [slides.length, go, paused]);

  if (loading) {
    return (
      <>
        <section className="home-hero home-hero--loading" aria-busy="true" />
        <HeroRail items={trust} />
      </>
    );
  }

  const slide =
    slides[index] ||
    ({
      id: "fallback",
      title: settings?.heroHeadline || DEFAULT_HOMEPAGE_SETTINGS.heroHeadline,
      subtitle: settings?.heroSubtext || DEFAULT_HOMEPAGE_SETTINGS.heroSubtext,
      buttons: [
        {
          text: settings?.heroCtaText || DEFAULT_HOMEPAGE_SETTINGS.heroCtaText,
          url: settings?.heroCtaUrl || DEFAULT_HOMEPAGE_SETTINGS.heroCtaUrl,
          style: "primary",
          bgColor: "#C41E1E",
        },
      ],
      backgroundColor: "#0b0b0b",
      imageUrl: null,
      imageUrlMobile: null,
    });

  const bgImage = slide.imageUrl;
  const bgImageMobile = slide.imageUrlMobile || bgImage;
  const multi = slides.length > 1;

  return (
    <>
      <section
        className={`home-hero${!bgImage ? " home-hero--fallback" : ""}`}
        style={{ background: slide.backgroundColor || "#0b0b0b" }}
        aria-roledescription={multi ? "carousel" : undefined}
        aria-label="Featured"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false);
        }}
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
          <HeroCopy slide={slide} settings={settings} animateKey={slide.id || index} />
        </div>

        {multi ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous slide"
              className="home-hero__arrow home-hero__arrow--prev"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next slide"
              className="home-hero__arrow home-hero__arrow--next"
            >
              ›
            </button>
            <div className="home-hero__dots" role="tablist" aria-label="Hero slides">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-label={`Slide ${i + 1}`}
                  aria-selected={i === index}
                  onClick={() => setIndex(i)}
                  className={i === index ? "is-active" : undefined}
                />
              ))}
            </div>
          </>
        ) : null}
      </section>
      <HeroRail items={trust} />
    </>
  );
}
