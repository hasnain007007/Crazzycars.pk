import { DEFAULT_HOMEPAGE_SETTINGS } from "@/lib/defaultHomepageSettings";

function iconKind(item) {
  const blob = `${item?.title || ""} ${item?.description || ""} ${item?.icon || ""}`.toLowerCase();
  if (/return|refund|exchange|🔄/.test(blob)) return "returns";
  if (/pay|cash|cod|money|bag|💰/.test(blob)) return "cod";
  if (/deliver|ship|truck|nationwide|🚚/.test(blob)) return "delivery";
  return "quality";
}

function TrustGlyph({ kind }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };
  if (kind === "delivery") {
    return (
      <svg {...common}>
        <path d="M3 7h11v10H3z" />
        <path d="M14 10h4l3 3v4h-7" />
        <circle cx="7" cy="18" r="1.6" />
        <circle cx="18" cy="18" r="1.6" />
      </svg>
    );
  }
  if (kind === "cod") {
    return (
      <svg {...common}>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M3 10h18" />
        <path d="M7 15h3" />
      </svg>
    );
  }
  if (kind === "returns") {
    return (
      <svg {...common}>
        <path d="M3 12a9 9 0 0 1 15.5-6.4L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-15.5 6.4L3 16" />
        <path d="M8 16H3v5" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export default function WhyChooseUs({ settings }) {
  const raw = settings?.whyChooseUs;
  const items = (Array.isArray(raw) && raw.length ? raw : DEFAULT_HOMEPAGE_SETTINGS.whyChooseUs)
    .filter((item) => item.isActive !== false && (item.title || item.description))
    .slice(0, 4);

  if (!items.length) return null;

  return (
    <section className="wcu" aria-label={settings?.sectionTitles?.whyChooseUs || "Why Choose Us"}>
      <div className="wcu-inner">
        <p className="wcu-kicker">{settings?.sectionTitles?.whyChooseUs || "Why Choose Us"}</p>
        <ul className="wcu-row">
          {items.map((item, i) => (
            <li key={`${item.title}-${i}`} className="wcu-item">
              <span className="wcu-icon">
                <TrustGlyph kind={iconKind(item)} />
              </span>
              <div className="wcu-copy">
                <p className="wcu-title">{item.title}</p>
                <p className="wcu-desc">{item.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
