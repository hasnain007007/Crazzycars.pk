"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_HOMEPAGE_SETTINGS } from "@/lib/defaultHomepageSettings";
import { useStorePayment } from "@/context/StoreSettingsContext";
import { formatFreeDeliveryThreshold } from "@/lib/freeDelivery";
import {
  heroHeightStyle,
  mapBannerToSlide,
  normalizeImageDisplay,
} from "@/lib/heroBannerDisplay";

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
  const raw = String(url || "").trim();
  if (!raw) return "/shop";

  let u = raw;
  // "crazzycars.pk/cars" → treat as absolute host
  if (!/^https?:\/\//i.test(u) && !u.startsWith("/") && /^[a-z0-9.-]+\.[a-z]{2,}([/:?]|$)/i.test(u)) {
    u = `https://${u}`;
  }

  if (u.startsWith("http://") || u.startsWith("https://")) {
    try {
      const parsed = new URL(u);
      // Keep same-store links in-app (no new tab / full reload)
      if (/(^|\.)crazzycars\.pk$/i.test(parsed.hostname)) {
        return `${parsed.pathname || "/"}${parsed.search || ""}${parsed.hash || ""}` || "/";
      }
    } catch {
      /* keep as-is */
    }
    return u;
  }

  if (u.startsWith("/")) return u;
  return `/${u.replace(/^\/+/, "")}`;
}

/**
 * Admin text overlays only when heading/subheading exist.
 * Banner buttons still render on designed (image-only) heroes.
 */
function resolveCopy(slide, settings) {
  const hp = settings || DEFAULT_HOMEPAGE_SETTINGS;
  const rawTitle = String(slide?.title || "").trim();
  const rawSub = String(slide?.subtitle || "").trim();
  const buttons = Array.isArray(slide?.buttons)
    ? slide.buttons.filter((b) => String(b?.text || "").trim())
    : [];

  const hasText = Boolean(rawTitle || rawSub);
  const hasButtons = buttons.length > 0;

  if (!hasText && !hasButtons) {
    return {
      headline: "",
      sub: "",
      buttons: [],
      hasText: false,
      hasButtons: false,
      hasOverlay: false,
    };
  }

  // With text but no admin buttons, keep a default Shop CTA.
  const resolvedButtons = hasButtons
    ? buttons
    : [
        {
          text: hp.heroCtaText || "Shop Now",
          url: hp.heroCtaUrl || "/shop",
          style: "primary",
          bgColor: "#C41E1E",
        },
      ];

  return {
    headline: rawTitle,
    sub: rawSub,
    buttons: resolvedButtons,
    hasText,
    hasButtons,
    hasOverlay: true,
  };
}

function buttonClassName(button) {
  const style = String(button?.style || "primary").toLowerCase();
  if (style === "outline" || style === "secondary" || style === "ghost") {
    return "home-hero__btn home-hero__btn--ghost";
  }
  return "home-hero__btn home-hero__btn--primary";
}

function primaryButtonColors(button) {
  const style = String(button?.style || "primary").toLowerCase();
  if (style === "white") {
    return { background: "#FFFFFF", color: "#111111" };
  }
  if (style === "dark") {
    return { background: "#111111", color: "#FFFFFF" };
  }
  const raw = String(button?.bgColor || "").trim().toLowerCase();
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
    color: button?.textColor || button?.color || "#FFFFFF",
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
  const { headline, sub, buttons, hasOverlay, hasText } = resolveCopy(slide, settings);

  if (!hasOverlay) {
    return (
      <h1 className="sr-only" key={animateKey}>
        {BRAND}
      </h1>
    );
  }

  return (
    <div className={`home-hero__copy${!hasText ? " home-hero__copy--ctas-only" : ""}`} key={animateKey}>
      {headline ? <h1 className="home-hero__title">{headline}</h1> : <h1 className="sr-only">{BRAND}</h1>}
      {sub ? <p className="home-hero__sub">{sub}</p> : null}
      {buttons.length ? (
        <div className="home-hero__ctas">
          {buttons.map((btn, i) => (
            <CtaLink key={`${btn.text}-${i}`} button={btn} className={buttonClassName(btn)} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function mapApiBanner(b) {
  return mapBannerToSlide(b);
}

function overlayStyle(display) {
  if (!display?.overlay?.enabled) return null;
  const color = display.overlay.color || "rgba(0,0,0,0.4)";
  const opacity = (Number(display.overlay.opacity) || 40) / 100;
  // If color already includes alpha, still multiply via opacity for admin slider control.
  return { background: color, opacity };
}

/**
 * Full-bleed homepage hero. Applies admin Image Display Settings
 * (height, fit, dark overlay, hover zoom). Text overlays only when
 * the banner has heading/subheading in admin.
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
      title: "",
      subtitle: "",
      buttons: [],
      backgroundColor: "#0b0b0b",
      imageUrl: null,
      imageUrlMobile: null,
      targetUrl: "",
      imageDisplay: normalizeImageDisplay(null),
    });

  const bgImage = slide.imageUrl;
  const bgImageMobile = slide.imageUrlMobile || bgImage;
  const multi = slides.length > 1;
  const copy = resolveCopy(slide, settings);
  const hasTextOverlay = copy.hasText;
  const firstBtnUrl = Array.isArray(slide.buttons)
    ? slide.buttons.find((b) => String(b?.url || b?.link || "").trim())
    : null;
  const linkHref = normalizeButtonUrl(
    slide.targetUrl || firstBtnUrl?.url || firstBtnUrl?.link || "/shop"
  );
  // Designed artwork (no HTML headline) keeps auto-height layout even when CTAs exist.
  const designedArtwork = Boolean(bgImage) && !hasTextOverlay;
  const clickThroughOnly = designedArtwork && !copy.hasButtons;
  const display = normalizeImageDisplay(slide.imageDisplay, { imageOnly: designedArtwork });
  const darkOverlay = overlayStyle(display);
  const heightCss = heroHeightStyle(display.height);

  const sectionClass = [
    "home-hero",
    !bgImage ? "home-hero--fallback" : "",
    designedArtwork ? "home-hero--image-only" : "",
    copy.hasButtons && !hasTextOverlay ? "home-hero--ctas-only" : "",
    `home-hero--h-${display.height}`,
    `home-hero--fit-${display.objectFit}`,
    display.hoverZoom ? "home-hero--hover-zoom" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <section
        className={sectionClass}
        style={{
          background: slide.backgroundColor || "#0b0b0b",
          ...heightCss,
          ["--hero-object-fit"]: display.objectFit,
          ["--hero-object-position"]: display.objectPosition,
        }}
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

        {darkOverlay ? (
          <div className="home-hero__veil home-hero__veil--admin" style={darkOverlay} aria-hidden />
        ) : null}

        {clickThroughOnly ? (
          <Link href={linkHref} className="home-hero__hit" aria-label={`Shop at ${BRAND}`}>
            <span className="sr-only">{BRAND}</span>
          </Link>
        ) : (
          <div className="home-hero__inner">
            <HeroCopy slide={slide} settings={settings} animateKey={slide.id || index} />
          </div>
        )}

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
