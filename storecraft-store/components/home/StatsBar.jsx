"use client";

/**
 * Homepage stats strip. Prefers CMS `brandStory.stats` / `homepage.stats`,
 * then falls back to defaults — edit those in Admin → Settings rather than hardcoding.
 */
const DEFAULT_STATS = [
  { value: "10,000+", label: "Happy Customers" },
  { value: "500+", label: "Products" },
  { value: "5 Years", label: "Experience" },
  { value: "100%", label: "Genuine Products" },
];

export default function StatsBar({ settings }) {
  const fromBrand =
    Array.isArray(settings?.brandStory?.stats) && settings.brandStory.stats.length
      ? settings.brandStory.stats.map((s) => ({
          value: s.value || s.number || "",
          label: s.label || "",
        }))
      : null;
  const fromHomepage =
    Array.isArray(settings?.stats) && settings.stats.length
      ? settings.stats.map((s) => ({
          value: s.value || s.number || "",
          label: s.label || "",
        }))
      : null;
  const stats = (fromBrand || fromHomepage || DEFAULT_STATS).filter((s) => s.value && s.label);

  if (!stats.length) return null;

  return (
    <section style={{ background: "#111111" }}>
      <div className="store-container py-6 md:py-5">
        <div className="grid grid-cols-2 md:grid-cols-4">
          {stats.map((item, i) => (
            <div
              key={`${item.label}-${i}`}
              className="flex min-h-[80px] flex-col items-center justify-center text-center"
              style={{
                borderRight: i !== stats.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none",
                borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.08)" : "none",
              }}
            >
              <p className="font-heading text-[28px] font-bold md:text-[32px]" style={{ color: "#C41E1E" }}>
                {item.value}
              </p>
              <p className="text-[13px]" style={{ color: "#9CA3AF" }}>
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
