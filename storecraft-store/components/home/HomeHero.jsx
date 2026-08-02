"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_HOMEPAGE_SETTINGS } from "@/lib/defaultHomepageSettings";
import { useStorePayment } from "@/context/StoreSettingsContext";
import { formatFreeDeliveryThreshold } from "@/lib/freeDelivery";
import {
  heroHeightStyle,
  mapBannerToSlide,
  normalizeImageDisplay,
} from "@/lib/heroBannerDisplay";

const BRAND = "Crazzycars.pk";
const SWIPE_PX = 48;
const SLIDE_MS = 560;

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

function slideMeta(slide, settings) {
  const bgImage = slide?.imageUrl || null;
  const bgImageMobile = slide?.imageUrlMobile || bgImage;
  const copy = resolveCopy(slide, settings);
  const hasTextOverlay = copy.hasText;
  const designedArtwork = Boolean(bgImage) && !hasTextOverlay;
  const clickThroughOnly = designedArtwork && !copy.hasButtons;
  const display = normalizeImageDisplay(slide?.imageDisplay, { imageOnly: designedArtwork });
  const firstBtnUrl = Array.isArray(slide?.buttons)
    ? slide.buttons.find((b) => String(b?.url || b?.link || "").trim())
    : null;
  const linkHref = normalizeButtonUrl(
    slide?.targetUrl || firstBtnUrl?.url || firstBtnUrl?.link || "/shop"
  );
  return {
    bgImage,
    bgImageMobile,
    copy,
    hasTextOverlay,
    designedArtwork,
    clickThroughOnly,
    display,
    linkHref,
    darkOverlay: overlayStyle(display),
  };
}

function HeroSlidePanel({
  slide,
  settings,
  isActive,
  isLcp,
  reduceMotion,
}) {
  const meta = slideMeta(slide, settings);
  const {
    bgImage,
    bgImageMobile,
    designedArtwork,
    clickThroughOnly,
    display,
    linkHref,
    darkOverlay,
  } = meta;

  return (
    <div
      className={[
        "home-hero__slide",
        isActive ? "is-active" : "",
        !bgImage ? "home-hero__slide--fallback" : "",
        designedArtwork ? "home-hero__slide--image-only" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        background: slide.backgroundColor || "#0b0b0b",
        ["--hero-object-fit"]: display.objectFit,
        ["--hero-object-position"]: display.objectPosition,
      }}
      aria-hidden={!isActive}
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
            fetchPriority={isLcp ? "high" : "low"}
            loading={isLcp ? "eager" : "lazy"}
            decoding="async"
            className="home-hero__img"
            draggable={false}
          />
        </picture>
      ) : (
        <div className="home-hero__media home-hero__media--gradient" aria-hidden />
      )}

      {darkOverlay ? (
        <div className="home-hero__veil home-hero__veil--admin" style={darkOverlay} aria-hidden />
      ) : null}

      {clickThroughOnly ? (
        <Link
          href={linkHref}
          className="home-hero__hit"
          aria-label={`Shop at ${BRAND}`}
          tabIndex={isActive ? 0 : -1}
        >
          <span className="sr-only">{BRAND}</span>
        </Link>
      ) : (
        <div className="home-hero__inner">
          <HeroCopy
            slide={slide}
            settings={settings}
            animateKey={reduceMotion ? "static" : `${slide.id}-${isActive ? "on" : "off"}`}
          />
        </div>
      )}
    </div>
  );
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
  const [dragPx, setDragPx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const pointerRef = useRef({ x: 0, y: 0, active: false, locked: false });

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return undefined;
    const apply = () => setReduceMotion(Boolean(mq.matches));
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  useEffect(() => {
    if (hasInitial) {
      setSlides(initialSlides);
      setLoading(false);
    }
    let cancelled = false;
    // Always refresh active hero slides so enabling a 2nd banner becomes a slider
    // without waiting for homepage ISR (revalidate=60).
    fetch("/api/banners", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const heroList = Array.isArray(data?.hero_slider) ? data.hero_slider : [];
        const mapped = heroList.map(mapApiBanner).filter((s) => s.imageUrl || s.title);
        setSlides(mapped);
      })
      .catch(() => {
        if (!cancelled && !hasInitial) setSlides([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hasInitial, initialSlides]);

  useEffect(() => {
    setIndex((i) => {
      if (!slides.length) return 0;
      return Math.min(i, slides.length - 1);
    });
  }, [slides.length]);

  const go = useCallback(
    (dir) => {
      if (slides.length < 2) return;
      setDragPx(0);
      setIndex((i) => (i + dir + slides.length) % slides.length);
    },
    [slides.length]
  );

  const goTo = useCallback(
    (next) => {
      if (slides.length < 2) return;
      setDragPx(0);
      setIndex(((next % slides.length) + slides.length) % slides.length);
    },
    [slides.length]
  );

  useEffect(() => {
    if (slides.length < 2 || paused || dragging) return undefined;
    if (reduceMotion) return undefined;
    const t = setInterval(() => go(1), 7000);
    return () => clearInterval(t);
  }, [slides.length, go, paused, dragging, reduceMotion]);

  const onPointerDown = useCallback(
    (e) => {
      if (slides.length < 2 || reduceMotion) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      pointerRef.current = {
        x: e.clientX,
        y: e.clientY,
        active: true,
        locked: false,
      };
      setDragging(true);
      setPaused(true);
      try {
        e.currentTarget.setPointerCapture?.(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [slides.length, reduceMotion]
  );

  const onPointerMove = useCallback(
    (e) => {
      const p = pointerRef.current;
      if (!p.active) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      if (!p.locked) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        // Lock to horizontal swipe only when clearly horizontal.
        if (Math.abs(dy) > Math.abs(dx)) {
          p.active = false;
          setDragging(false);
          setDragPx(0);
          setPaused(false);
          return;
        }
        p.locked = true;
      }
      e.preventDefault?.();
      const width = e.currentTarget?.offsetWidth || 1;
      const max = width * 0.92;
      setDragPx(Math.max(-max, Math.min(max, dx)));
    },
    []
  );

  const endPointer = useCallback(
    (e) => {
      const p = pointerRef.current;
      if (!p.active && !dragging) return;
      const dx = dragPx || e.clientX - p.x;
      pointerRef.current.active = false;
      pointerRef.current.locked = false;
      setDragging(false);
      setPaused(false);
      if (Math.abs(dx) >= SWIPE_PX) {
        go(dx < 0 ? 1 : -1);
      } else {
        setDragPx(0);
      }
      try {
        e.currentTarget.releasePointerCapture?.(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [dragging, dragPx, go]
  );

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

  const activeMeta = slideMeta(slide, settings);
  const { bgImage, designedArtwork, copy, hasTextOverlay, display } = activeMeta;
  const multi = slides.length > 1;
  // Designed auto-height banners: let CSS own sizing (desktop = full art,
  // mobile = tall cover frame). Inline height:auto/minHeight:0 would block that.
  const heightCss =
    designedArtwork && display.height === "auto" ? {} : heroHeightStyle(display.height);

  const sectionClass = [
    "home-hero",
    multi ? "home-hero--carousel" : "",
    dragging ? "home-hero--dragging" : "",
    !bgImage ? "home-hero--fallback" : "",
    designedArtwork ? "home-hero--image-only" : "",
    copy.hasButtons && !hasTextOverlay ? "home-hero--ctas-only" : "",
    `home-hero--h-${display.height}`,
    `home-hero--fit-${display.objectFit}`,
    display.hoverZoom && !multi ? "home-hero--hover-zoom" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const trackStyle = multi
    ? {
        transform: `translate3d(calc(${-index * 100}% + ${dragPx}px), 0, 0)`,
        transition:
          dragging || reduceMotion
            ? "none"
            : `transform ${SLIDE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
      }
    : undefined;

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
        onMouseLeave={() => {
          if (!dragging) setPaused(false);
        }}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false);
        }}
      >
        <div
          className="home-hero__viewport"
          onPointerDown={multi ? onPointerDown : undefined}
          onPointerMove={multi ? onPointerMove : undefined}
          onPointerUp={multi ? endPointer : undefined}
          onPointerCancel={multi ? endPointer : undefined}
        >
          <div className="home-hero__track" style={trackStyle}>
            {(multi ? slides : [slide]).map((s, i) => (
              <HeroSlidePanel
                key={s.id || i}
                slide={s}
                settings={settings}
                isActive={multi ? i === index : true}
                isLcp={i === 0}
                reduceMotion={reduceMotion}
              />
            ))}
          </div>

          {multi ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
                aria-label="Previous slide"
                className="home-hero__arrow home-hero__arrow--prev"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      goTo(i);
                    }}
                    className={i === index ? "is-active" : undefined}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      </section>
      <HeroRail items={trust} />
    </>
  );
}
