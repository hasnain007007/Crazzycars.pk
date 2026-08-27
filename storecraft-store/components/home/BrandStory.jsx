"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { storyImageUrlOptimized } from "@/lib/cloudinaryImage";
import { resolveHomepageStats } from "@/lib/homepageStats";

const STORY_TILES = [
  { src: "/images/catalog/kitchen-accessories.svg", label: "Kitchen" },
  { src: "/images/catalog/beauty-bags.svg", label: "Beauty bags" },
  { src: "/images/catalog/ladies-bags.svg", label: "Ladies bags" },
];

function storyImageUrl(field) {
  if (field == null) return "";
  if (typeof field === "string") return field.trim();
  if (typeof field === "object") {
    const u = field.url ?? field.secure_url ?? field.secureUrl;
    return typeof u === "string" ? u.trim() : "";
  }
  return "";
}

function hasBrandStoryContent(story) {
  if (!story || story.enabled === false) return false;
  const hasText = [story.badge, story.heading, story.subheading, story.description].some(
    (s) => String(s || "").trim()
  );
  const hasImages = storyImageUrl(story.image1) || storyImageUrl(story.image2);
  const hasButton = String(story.buttonText || "").trim();
  return hasText || hasImages || hasButton;
}

function StoryMosaic({ image1Url, image2Url, heading }) {
  if (image1Url) {
    return (
      <div className="relative overflow-hidden rounded-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image1Url}
          alt={heading || "Our story"}
          loading="lazy"
          decoding="async"
          className="h-40 w-full object-cover md:h-52"
        />
        {image2Url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image2Url}
            alt=""
            loading="lazy"
            className="absolute bottom-2 left-2 h-16 w-16 rounded-lg border-2 border-white object-cover md:h-20 md:w-20"
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {STORY_TILES.map((tile) => (
        <div key={tile.label} className="overflow-hidden rounded-xl bg-[#FAF7F2]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={tile.src} alt="" className="aspect-square w-full object-cover" />
          <p className="px-1.5 py-1.5 text-center text-[10px] font-semibold text-[#6B7280] md:text-[11px]">
            {tile.label}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function BrandStory({ story: storyProp, activeProductCount = null }) {
  const [story, setStory] = useState(storyProp || null);
  const [loading, setLoading] = useState(!storyProp);

  useEffect(() => {
    if (storyProp) {
      setStory(storyProp);
      setLoading(false);
      return;
    }
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        const settings = data?.data || data?.settings || data;
        if (settings?.brandStory) setStory(settings.brandStory);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [storyProp]);

  if (loading || !hasBrandStoryContent(story)) return null;

  const image1Url = storyImageUrlOptimized(storyImageUrl(story.image1)) || storyImageUrl(story.image1);
  const image2Url = storyImageUrlOptimized(storyImageUrl(story.image2)) || storyImageUrl(story.image2);
  const stats = resolveHomepageStats(Array.isArray(story.stats) ? story.stats : [], {
    activeProductCount,
  }).filter((s) => s.value && s.label);

  return (
    <section className="homefy-brand-story py-5 md:py-6">
      <div className="store-container">
        <div className="overflow-hidden rounded-xl border border-[#E8D9CC] bg-white">
          <div className="grid items-center gap-4 p-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)] md:gap-8 md:p-5">
            <StoryMosaic image1Url={image1Url} image2Url={image2Url} heading={story.heading} />

            <div>
              {story.badge ? (
                <span className="mb-2 inline-block rounded-full bg-[#FAF7F2] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                  {story.badge}
                </span>
              ) : null}

              {story.heading ? (
                <h2 className="font-heading text-xl font-bold leading-tight text-[#111] md:text-2xl">
                  {story.heading}
                </h2>
              ) : null}

              {story.subheading ? (
                <p className="mt-1 text-sm font-medium text-[#6B7280]">{story.subheading}</p>
              ) : null}

              {story.description ? (
                <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-[#374151]">{story.description}</p>
              ) : null}

              {stats.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-5">
                  {stats.map((stat, i) => (
                    <div key={`${stat.value}-${stat.label}-${i}`}>
                      <p className="font-heading text-lg font-bold text-[var(--color-primary)]">{stat.value}</p>
                      <p className="text-[11px] text-[#6B7280]">{stat.label}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {story.buttonText ? (
                <Link
                  href={story.buttonLink || "/shop"}
                  className="mt-3 inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold transition hover:opacity-90"
                  style={{ background: "var(--color-primary)", color: "#FFFFFF" }}
                >
                  {story.buttonText.includes("→") ? story.buttonText : `${story.buttonText} →`}
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
