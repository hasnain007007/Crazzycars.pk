/**
 * Stats strip — value + label on one horizontal line (stays horizontal on mobile).
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
      ? "home-stats-grid home-stats-grid--3"
      : "home-stats-grid home-stats-grid--4";

  return (
    <section className="home-stats" aria-label="Store stats">
      <div className="store-container home-stats__inner">
        <div className={gridClass}>
          {stats.map((item, i) => (
            <div
              key={`${item.label}-${i}`}
              className={`home-stats__item${i < stats.length - 1 ? " home-stats__item--divider" : ""}`}
            >
              <span className="home-stats__value">{item.value}</span>
              <span className="home-stats__label">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
