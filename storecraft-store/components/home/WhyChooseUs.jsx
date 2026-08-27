import { DEFAULT_HOMEPAGE_SETTINGS } from "@/lib/defaultHomepageSettings";

const ACCENTS = ["var(--color-primary)", "var(--color-secondary)", "#8C6D4D", "var(--color-primary)"];

function iconKind(item, index) {
  const t = String(item?.title || "").toLowerCase();
  if (t.includes("deliver") || t.includes("ship")) return "truck";
  if (t.includes("cash") || t.includes("cod") || t.includes("pay")) return "cod";
  if (t.includes("return") || t.includes("exchange")) return "returns";
  if (t.includes("quality") || t.includes("check")) return "check";
  return ["truck", "cod", "returns", "check"][index % 4];
}

function TrustIcon({ kind }) {
  const props = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.7",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    className: "h-4 w-4",
  };
  if (kind === "truck") {
    return (
      <svg {...props}>
        <path d="M3 7h11v10H3z" />
        <path d="M14 10h4l3 3v4h-7" />
        <circle cx="7" cy="18" r="1.6" />
        <circle cx="18" cy="18" r="1.6" />
      </svg>
    );
  }
  if (kind === "cod") {
    return (
      <svg {...props}>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M3 10h18" />
        <path d="M8 15h3" />
      </svg>
    );
  }
  if (kind === "returns") {
    return (
      <svg {...props}>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v5h5" />
      </svg>
    );
  }
  return (
    <svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5 11 15.5 16.5 9.5" />
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
    <section className="py-5 md:py-6">
      <div className="store-container">
        <h2 className="mb-3 font-heading text-lg font-bold text-[#111] md:text-xl">
          {settings?.sectionTitles?.whyChooseUs || "Why Choose Homefy"}
        </h2>
        <div
          className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#E8D9CC] bg-[#E8D9CC] md:grid-cols-4"
        >
          {items.map((item, i) => {
            const kind = iconKind(item, i);
            const accent = ACCENTS[i % ACCENTS.length];
            return (
              <div key={`${item.title}-${i}`} className="flex items-start gap-3 bg-[#FAF7F2] px-3 py-3.5 md:px-4">
                <span
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{ background: "white", color: accent, border: `1px solid ${accent}` }}
                >
                  <TrustIcon kind={kind} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-[13px] font-semibold leading-snug text-[#111]">{item.title}</h3>
                  {item.description ? (
                    <p className="mt-0.5 text-[11px] leading-snug text-[#6B7280]">{item.description}</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
