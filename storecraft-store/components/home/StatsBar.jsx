/**
 * Stats strip — value + label on one horizontal line.
 */
import { resolveHomepageStats } from "@/lib/homepageStats";

export default function StatsBar({ settings, activeProductCount = null }) {
  const fromBrand =
    Array.isArray(settings?.brandStory?.stats) && settings.brandStory.stats.length
      ? settings.brandStory.stats
      : null;
  const fromHomepage =
    Array.isArray(settings?.stats) && settings.stats.length ? settings.stats : null;
  const stats = resolveHomepageStats(fromBrand || fromHomepage || [], { activeProductCount }).filter(
    (s) => s.value && s.label
  );

  if (!stats.length) return null;

  const gridClass =
    stats.length <= 3
      ? "grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-0"
      : "grid grid-cols-2 md:grid-cols-4";

  return (
    <section style={{ background: "#111111" }}>
      <div className="store-container py-5">
        <div className={gridClass}>
          {stats.map((item, i) => (
            <div
              key={`${item.label}-${i}`}
              className="flex min-h-[52px] items-center justify-center gap-2.5 px-3 sm:min-h-[60px]"
              style={{
                borderRight:
                  i < stats.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none",
                borderBottom:
                  stats.length > 3 && i < 2 ? "1px solid rgba(255,255,255,0.08)" : "none",
              }}
            >
              <span
                className="font-heading shrink-0 text-[22px] font-bold leading-none md:text-[28px]"
                style={{ color: "#C41E1E" }}
              >
                {item.value}
              </span>
              <span
                className="text-left text-[12px] leading-snug md:text-[13px]"
                style={{ color: "#9CA3AF" }}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
