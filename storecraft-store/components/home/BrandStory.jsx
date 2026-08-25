"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { storyImageUrlOptimized } from "@/lib/cloudinaryImage";
import { resolveHomepageStats } from "@/lib/homepageStats";

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
  const hasStats =
    Array.isArray(story.stats) && story.stats.some((s) => String(s?.value || "").trim() || String(s?.label || "").trim());
  const hasButton = String(story.buttonText || "").trim();
  return hasText || hasImages || hasStats || hasButton;
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
  });

  return (
    <section className="homepage-section bg-white py-8 md:py-20">
      <div className="store-container">
        <div className="grid items-center gap-6 lg:grid-cols-[2fr_3fr] lg:gap-10">
          <div className="relative min-h-[160px] lg:min-h-[360px]">
            {image1Url || image2Url ? (
              <div className="relative h-full min-h-[160px] md:min-h-[280px]">
                {image1Url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={image1Url}
                    alt={story.heading || "Our story"}
                    loading="lazy"
                    fetchPriority="low"
                    decoding="async"
                    className="h-full min-h-[160px] w-full rounded-xl object-cover shadow-md md:min-h-[280px]"
                  />
                ) : null}
                {image2Url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={image2Url}
                    alt={story.heading ? `${story.heading} — detail` : "Our story — detail"}
                    loading="lazy"
                    className="absolute bottom-4 left-4 z-10 w-[45%] rounded-lg border-4 border-white object-cover shadow-lg"
                    style={{ height: 140 }}
                  />
                ) : null}
              </div>
            ) : (
              <div
                className="flex min-h-[160px] items-center justify-center rounded-xl md:min-h-[280px] lg:min-h-[360px]"
                style={{
                  background: "linear-gradient(135deg, #1a1a1a 0%, #2a0f0f 100%)",
                }}
              >
                <span className="text-4xl opacity-80 md:text-6xl" aria-hidden>
                  🚗
                </span>
              </div>
            )}
          </div>

          <div>
            {story.badge ? (
              <span
                className="mb-4 inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide"
                style={{ background: "#FFF8E6", color: "#B45309" }}
              >
                {story.badge}
              </span>
            ) : null}

            {story.heading ? (
              <h2 className="font-heading text-[22px] font-bold leading-tight md:text-[36px]" style={{ color: "#111111" }}>
                {story.heading}
              </h2>
            ) : null}

            {story.subheading ? (
              <p className="mt-3 text-base font-medium" style={{ color: "#6B7280" }}>
                {story.subheading}
              </p>
            ) : null}

            {story.description ? (
              <p className="mt-4 text-[15px] leading-[1.7]" style={{ color: "#374151" }}>
                {story.description}
              </p>
            ) : null}

            {stats.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-5 md:mt-8 md:gap-8">
                {stats.map((stat, i) => (
                  <div key={`${stat.value}-${stat.label}-${i}`}>
                    <p className="font-heading text-xl font-bold md:text-2xl" style={{ color: "#C41E1E" }}>
                      {stat.value}
                    </p>
                    <p className="mt-1 text-xs" style={{ color: "#6B7280" }}>
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            {story.buttonText ? (
              <Link
                href={story.buttonLink || "/about"}
                className="mt-6 inline-flex items-center rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 md:mt-8 md:px-6 md:py-3"
                style={{ background: "#C41E1E" }}
              >
                {story.buttonText.includes("→") ? story.buttonText : `${story.buttonText} →`}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
