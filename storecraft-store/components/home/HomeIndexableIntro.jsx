import Link from "next/link";
import { BRAND_NAME } from "@/lib/brand";
import { DEFAULT_HOME_INTRO } from "@/lib/defaultHomepageSettings";

/**
 * Indexable home intro under the hero (server-rendered; H1 lives in BrandHero).
 * Text comes from Settings › Homepage › Home intro, else DEFAULT_HOME_INTRO.
 */
export default function HomeIndexableIntro({ text }) {
  const body = String(text || "").trim() || DEFAULT_HOME_INTRO;
  return (
    <section
      className="store-container home-indexable-intro"
      style={{ padding: "20px 16px 8px", maxWidth: 920 }}
      aria-labelledby="home-intro-title"
    >
      <h2 id="home-intro-title" style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: "#111" }}>
        About {BRAND_NAME}
      </h2>
      {body.split(/\n{2,}/).map((para, i) => (
        <p key={i} style={{ margin: i ? "10px 0 0" : 0, fontSize: 15, lineHeight: 1.7, color: "#444" }}>
          {para}
        </p>
      ))}
      <p style={{ margin: "12px 0 0", fontSize: 14, lineHeight: 1.6, color: "#555" }}>
        Start with{" "}
        <Link href="/cars" className="font-semibold text-[#C41E1E] underline">
          shop by car
        </Link>
        ,{" "}
        <Link href="/categories" className="font-semibold text-[#C41E1E] underline">
          categories
        </Link>
        , or{" "}
        <Link href="/shop" className="font-semibold text-[#C41E1E] underline">
          shop all
        </Link>
        .
      </p>
    </section>
  );
}
