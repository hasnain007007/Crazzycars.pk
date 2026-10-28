import AboutPageView from "@/components/store/AboutPageView";
import { getServerStoreSettings } from "@/lib/serverSettings";
import { buildPageMetadata } from "@/lib/pageMetadata";
import { withSafeMetadata } from "@/lib/safeMetadata";

const STORE = process.env.NEXT_PUBLIC_STORE_NAME || "CrazzyCars.pk";

function clampMetaDescription(raw, fallback) {
  const text = String(raw || "").replace(/\s+/g, " ").trim();
  if (!text) return fallback;
  if (text.length <= 158) return text;
  const cut = text.slice(0, 157);
  const at = cut.lastIndexOf(" ");
  return `${(at > 120 ? cut.slice(0, at) : cut).replace(/[.,;:\s]+$/, "")}…`;
}

export const generateMetadata = withSafeMetadata(async function aboutMetadata() {
  const settings = await getServerStoreSettings();
  const hero = settings?.aboutPage?.hero || {};
  const title = hero.title ? `${hero.title} | ${STORE}` : `About Us | ${STORE}`;
  const description = clampMetaDescription(
    hero.subtitle,
    `Learn about ${STORE} — premium car accessories delivered across Pakistan.`
  );

  return buildPageMetadata({
    title,
    description,
    path: "/about",
    absoluteTitle: true,
  });
});

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const settings = await getServerStoreSettings();
  return <AboutPageView aboutPage={settings?.aboutPage} />;
}
