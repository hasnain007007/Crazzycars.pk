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

function HeroButtons({ buttons, defaultTextColor = "#FFFFFF" }) {
  const list = Array.isArray(buttons)
    ? buttons.filter((b) => String(b?.text || "").trim())
    : [];
  if (!list.length) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 32 }}>
      {list.map((button, i) => {
        const text = String(button.text || "").trim();
        const href = normalizeButtonUrl(button.url || button.link);
        const textColor = button.textColor || button.color || defaultTextColor;
        const bgColor = button.bgColor || "#C41E1E";
        const styleKey = String(button.style || "primary").toLowerCase();
        const isSecondary = styleKey === "secondary" || styleKey === "outline";

        const style = isSecondary
          ? {
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
              background: "transparent",
              color: textColor,
              padding: "12px 30px",
              borderRadius: 8,
              border: `2px solid ${textColor}`,
              fontWeight: 600,
              fontSize: 15,
              cursor: "pointer",
            }
          : {
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
              background: bgColor,
              color: textColor,
              padding: "14px 32px",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 15,
              border: "none",
              cursor: "pointer",
            };

        if (href.startsWith("http://") || href.startsWith("https://")) {
          return (
            <a key={i} href={href} style={style} target="_blank" rel="noopener noreferrer">
              {text}
            </a>
          );
        }

        return (
          <Link key={i} href={href} style={style}>
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
    <section
      className="relative overflow-hidden"
      style={{
        minHeight: "580px",
        background: "linear-gradient(135deg, #0F0F0F 0%, #1A1A1A 50%, #111111 100%)",
      }}
    >
      <div className="relative mx-auto flex h-full min-h-[420px] max-w-[1400px] items-center px-6 py-16 md:min-h-[580px] md:pl-[8%] md:pr-8">
        <div className="relative z-10 max-w-[560px]">
          <p className="mb-4 font-body uppercase" style={{ fontSize: 12, letterSpacing: "2px", color: "#E8941A" }}>
            Pakistan&apos;s Car Accessories Store
          </p>
          <h1 className="font-heading font-bold leading-none" style={{ fontSize: "clamp(42px, 8vw, 72px)" }}>
            <span className="block text-white">{line1 || "UPGRADE"}</span>
            {line2 ? (
              <span className="block" style={{ color: "#C41E1E" }}>
                {line2}
              </span>
            ) : null}
          </h1>
          <p className="mt-5 max-w-md font-body leading-relaxed" style={{ fontSize: 16, color: "#9CA3AF" }}>
            {subtext}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={ctaUrl} className="inline-flex items-center rounded-md px-8 py-3 text-[15px] font-bold text-white transition hover:opacity-90" style={{ background: "#C41E1E" }}>
              {ctaText} →
            </Link>
            <Link href="/categories" className="inline-flex items-center rounded-md border border-white px-8 py-3 text-[15px] font-semibold text-white transition hover:bg-white/10">
              Browse Categories
            </Link>
          </div>
          <ul className="mt-6 flex flex-wrap gap-2">
            {trust.map((t) => (
              <li key={t} className="rounded-full border border-white/40 px-3 py-1 text-xs text-white/90">
                {t}
              </li>
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
  return (
    <div className="relative z-10 max-w-[560px]">
      <p className="mb-4 font-body uppercase" style={{ fontSize: 12, letterSpacing: "2px", color: "#E8941A" }}>
        Pakistan&apos;s Car Accessories Store
      </p>
      <h1
        className="font-heading font-bold leading-none"
        style={{ fontSize: "clamp(42px, 8vw, 72px)", color: slide.textColor }}
      >
        <span className="block">{line1 || slide.title}</span>
        {line2 ? (
          <span className="block" style={{ color: "#C41E1E" }}>
            {line2}
          </span>
        ) : null}
      </h1>
      {slide.subtitle ? (
        <p className="mt-5 max-w-md font-body leading-relaxed" style={{ fontSize: 16, color: slide.subColor }}>
          {slide.subtitle}
        </p>
      ) : null}
      <HeroButtons
        buttons={
          slide.buttons?.length
            ? slide.buttons
            : [
                { text: "Shop Now", url: "/shop", style: "primary" },
                { text: "Browse Categories", url: "/categories", style: "outline" },
              ]
        }
        defaultTextColor={slide.textColor}
      />
      <ul className="mt-6 flex flex-wrap gap-2">
        {trust.map((t) => (
          <li key={t} className="rounded-full border border-white/40 px-3 py-1 text-xs text-white/90">
            {t}
          </li>
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
    return (
      <section
        className="relative overflow-hidden"
        style={{ minHeight: 600, background: "#111111" }}
        aria-busy="true"
      />
    );
  }

  if (!slides.length) {
    return <FallbackHero settings={settings} />;
  }

  const slide = slides[index];
  const bgImage = slide.imageUrl;
  const bgImageMobile = slide.imageUrlMobile || bgImage;

  return (
    <section className="relative overflow-hidden" style={{ minHeight: 600, background: slide.backgroundColor || "#111111" }}>
      {bgImage ? (
        <picture className="absolute inset-0 block h-full w-full">
          {bgImageMobile && bgImageMobile !== bgImage ? (
            <source media="(max-width: 768px)" srcSet={bgImageMobile} />
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element -- LCP hero; Cloudinary-optimized src */}
          <img
            src={bgImage}
            alt=""
            fetchPriority={index === 0 ? "high" : "low"}
            loading={index === 0 ? "eager" : "lazy"}
            decoding={index === 0 ? "async" : "async"}
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
            style={{ opacity: 1 }}
            key={slide.id}
          />
        </picture>
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 20% 30%, rgba(196,30,30,0.35), transparent 40%), linear-gradient(120deg, #111111 0%, #1a1a1a 40%, #2a0f0f 100%)",
          }}
          aria-hidden
        />
      )}
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.45)" }} aria-hidden />
      <div className="relative mx-auto flex min-h-[420px] max-w-[1400px] items-center px-6 py-12 md:min-h-[600px] md:py-20 md:pl-[8%] md:pr-8">
        <HeroSlideContent slide={slide} />
      </div>

      {slides.length > 1 ? (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous slide"
            className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/40 px-3 py-2 text-white hover:bg-black/60"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next slide"
            className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/40 px-3 py-2 text-white hover:bg-black/60"
          >
            ›
          </button>
          <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => setIndex(i)}
                style={{
                  width: i === index ? 24 : 8,
                  height: 8,
                  borderRadius: 99,
                  border: "none",
                  background: i === index ? "#C41E1E" : "rgba(255,255,255,0.5)",
                  cursor: "pointer",
                  transition: "width 0.2s",
                }}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
