/**
 * Trust strip under the hero — true policy signals only (no inventable product counts).
 */
import { homepageTrustStripItems } from "@/lib/storePolicyCopy";

export default function StatsBar() {
  const stats = homepageTrustStripItems().filter((s) => s.value && s.label);
  if (!stats.length) return null;

  const gridClass =
    stats.length <= 3
      ? "home-stats-grid home-stats-grid--3"
      : "home-stats-grid home-stats-grid--4";

  return (
    <section className="home-stats" aria-label="Store promises">
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
