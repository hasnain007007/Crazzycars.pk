import AboutPageView from "@/components/store/AboutPageView";
import { getServerStoreSettings } from "@/lib/serverSettings";
import { buildPageMetadata } from "@/lib/pageMetadata";
import { withSafeMetadata } from "@/lib/safeMetadata";

export const DEFAULT_ABOUT_META_TITLE =
  "About CrazzyCars.pk – Car Accessories Shop in Gujranwala";
export const DEFAULT_ABOUT_META_DESCRIPTION =
  "CrazzyCars.pk is a Gujranwala car accessories shop selling since 2023. Body kits, LEDs, mats. Cash on Delivery across Pakistan on eligible items.";

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
  const seo = settings?.aboutPage?.seo || {};
  const title = String(seo.metaTitle || "").trim() || DEFAULT_ABOUT_META_TITLE;
  const description = clampMetaDescription(
    seo.metaDescription,
    DEFAULT_ABOUT_META_DESCRIPTION
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
  const googleReviewUrl = String(
    settings?.general?.googleReviewUrl || settings?.googleReviewUrl || ""
  ).trim();
  return (
    <AboutPageView
      aboutPage={{
        ...(settings?.aboutPage || {}),
        googleReviewUrl,
      }}
    />
  );
}
