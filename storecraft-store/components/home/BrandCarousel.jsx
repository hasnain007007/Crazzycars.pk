import { DEFAULT_HOMEPAGE_SETTINGS } from "@/lib/defaultHomepageSettings";

function WordmarkLogo({ label, fontSize = 18, letterSpacing = 1, fontWeight = 700 }) {
  return (
    <svg width="80" height="32" viewBox="0 0 80 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontFamily="Rajdhani, sans-serif"
        fontWeight={fontWeight}
        fontSize={fontSize}
        letterSpacing={letterSpacing}
      >
        {label}
      </text>
    </svg>
  );
}

function HondaLogo() {
  return <WordmarkLogo label="HONDA" letterSpacing={2} />;
}

function ToyotaLogo() {
  return <WordmarkLogo label="TOYOTA" fontSize={15} letterSpacing={1.5} />;
}

function SuzukiLogo() {
  return <WordmarkLogo label="SUZUKI" fontSize={15} />;
}

function KiaLogo() {
  return (
    <svg width="80" height="32" viewBox="0 0 80 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontFamily="Rajdhani, sans-serif"
        fontWeight={800}
        fontSize={18}
        letterSpacing={4}
      >
        KIA
      </text>
    </svg>
  );
}

function HyundaiLogo() {
  return <WordmarkLogo label="HYUNDAI" fontSize={14} letterSpacing={0.5} fontWeight={600} />;
}

function MgLogo() {
  return (
    <svg width="80" height="32" viewBox="0 0 80 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M40 5 L54 9 L56 23 L40 27 L24 23 L26 9 Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <text
        x="40"
        y="17"
        dominantBaseline="middle"
        textAnchor="middle"
        fill="currentColor"
        fontFamily="Rajdhani, sans-serif"
        fontWeight={800}
        fontSize={11}
        letterSpacing={1}
      >
        MG
      </text>
    </svg>
  );
}

function ChanganLogo() {
  return <WordmarkLogo label="CHANGAN" fontSize={13} letterSpacing={0.5} fontWeight={600} />;
}

function HavalLogo() {
  return <WordmarkLogo label="HAVAL" letterSpacing={3} fontWeight={800} />;
}

function IsuzuLogo() {
  return <WordmarkLogo label="ISUZU" letterSpacing={2} />;
}

function AudiLogo() {
  return (
    <svg width="80" height="32" viewBox="0 0 80 32" fill="none" stroke="currentColor" strokeWidth="2" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="10" />
      <circle cx="30" cy="16" r="10" />
      <circle cx="44" cy="16" r="10" />
      <circle cx="58" cy="16" r="10" />
    </svg>
  );
}

const BRAND_LOGOS = {
  honda: HondaLogo,
  toyota: ToyotaLogo,
  suzuki: SuzukiLogo,
  kia: KiaLogo,
  hyundai: HyundaiLogo,
  mg: MgLogo,
  changan: ChanganLogo,
  haval: HavalLogo,
  isuzu: IsuzuLogo,
  audi: AudiLogo,
};

function slugifyBrand(name) {
  return String(name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

function BrandLogoItem({ name }) {
  const id = slugifyBrand(name);
  const Logo = BRAND_LOGOS[id] || (() => <WordmarkLogo label={String(name).toUpperCase()} />);

  return (
    <span
      className="inline-flex shrink-0 items-center text-[#6B7280] transition-colors duration-200 hover:text-[#C41E1E]"
      style={{ padding: "0 28px", borderRight: "1px solid #E5E7EB" }}
      aria-label={name}
    >
      <span style={{ transform: "scale(1.15)", transformOrigin: "center" }}><Logo /></span>
    </span>
  );
}

const DEFAULT_BRANDS = (DEFAULT_HOMEPAGE_SETTINGS.brands || [])
  .filter((b) => b.isActive !== false && String(b.name || "").trim())
  .map((b) => String(b.name).trim());

/** Repeat brands until one marquee half is wide enough (avoids empty right side). */
function expandBrandHalf(names, minCount = 12) {
  const list = (names || []).map((n) => String(n || "").trim()).filter(Boolean);
  if (!list.length) return [];
  const half = [];
  while (half.length < minCount) {
    half.push(...list);
  }
  return half;
}

export default function BrandCarousel({ settings }) {
  const fromSettings = (settings?.brands || [])
    .filter((b) => b.isActive !== false && String(b.name || "").trim())
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((b) => String(b.name).trim());

  // Prefer CMS list; never pad with hardcoded extras (Isuzu/Audi, etc.).
  const brandNames = fromSettings.length ? fromSettings : DEFAULT_BRANDS;
  const half = expandBrandHalf(brandNames, Math.max(12, brandNames.length * 2));
  // Two identical halves → translateX(-50%) loops seamlessly while running.
  const items = [...half, ...half];

  return (
    <section
      className="overflow-hidden py-12 md:py-20"
      style={{
        background: "#F9FAFB",
        borderTop: "1px solid #E5E7EB",
        borderBottom: "1px solid #E5E7EB",
      }}
    >
      <div className="store-container">
        <h2 className="font-heading text-[32px] font-bold text-[#111111]">{settings?.sectionTitles?.brands || "Trusted Brands"}</h2>
        <div style={{ width: 48, height: 3, background: "#C41E1E", marginTop: 8, marginBottom: 24 }} />
      </div>
      <div className="brand-marquee-wrap group" style={{ height: 62 }} aria-label="Trusted brands">
        <div className="brand-marquee items-center">
          {items.map((name, i) => (
            <BrandLogoItem key={`${name}-${i}`} name={name} />
          ))}
        </div>
      </div>
    </section>
  );
}
