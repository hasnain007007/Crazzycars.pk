import ContactPageView from "@/components/store/ContactPageView";
import { getServerStoreSettings } from "@/lib/serverSettings";
import { buildPageMetadata, DEFAULT_OG_IMAGE_PATH } from "@/lib/pageMetadata";
import { withSafeMetadata } from "@/lib/safeMetadata";
import { getPageSeoOverride } from "@/lib/seo/gscAudit2026-10.mjs";
import { BRAND_NAME, withBrandTitleSuffix } from "@/lib/brand";
import { organizationJsonLd as buildOrgLd } from "@/lib/seo/jsonld";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { resolveStoreLogoUrl } from "@/lib/storeLogo";
import { getSiteUrl, absoluteUrl } from "@/lib/siteUrl";
import { contactHoursToOpeningHoursSpec } from "@/lib/contactHours";

export const generateMetadata = withSafeMetadata(async function contactMetadata() {
  const settings = await getServerStoreSettings();
  const hero = settings?.contactPage?.hero || {};
  const override = getPageSeoOverride("/contact");
  // Absolute H1/title target — already includes BRAND_NAME (no TITLE_SUFFIX).
  const rawTitle =
    override?.title || hero.title || `Contact ${BRAND_NAME} – Gujranwala`;
  const title = /crazzy\s*cars\.pk/i.test(rawTitle)
    ? String(rawTitle).trim()
    : withBrandTitleSuffix(rawTitle);
  const description =
    override?.meta ||
    hero.subtitle ||
    `Contact ${BRAND_NAME} in Gujranwala for order help, product advice, or support.`;

  return buildPageMetadata({
    title,
    description,
    path: "/contact",
    absoluteTitle: true,
  });
});

/** ISR — same settings payload as layout; no per-user cookies required. */
export const revalidate = 300;

export default async function ContactPage() {
  const settings = await getServerStoreSettings();
  const general = settings?.general || {};
  const localBusiness = {
    streetAddress: general.streetAddress || "",
    addressLocality: general.addressLocality || "Gujranwala",
    addressRegion: general.addressRegion || "Punjab",
    postalCode: general.postalCode || "",
    addressCountry: general.addressCountry || "PK",
    latitude: general.latitude,
    longitude: general.longitude,
    mapUrl: general.mapUrl || "",
    mapEmbedUrl: general.mapEmbedUrl || "",
    whatsapp: general.whatsapp || "",
    priceRange: general.priceRange || "",
    sameAs: Array.isArray(general.sameAs) ? general.sameAs : [],
    // Prefer admin contactPage.hours; do not use seeded general.openingHours.
    openingHours: contactHoursToOpeningHoursSpec(settings?.contactPage?.hours),
  };

  const baseUrl = getSiteUrl();
  const logoUrl = resolveStoreLogoUrl(settings) || `${baseUrl}/logo.png`;
  const orgLd = buildOrgLd({
    name: BRAND_NAME,
    logo: logoUrl,
    image: absoluteUrl(DEFAULT_OG_IMAGE_PATH),
    email: general.email || settings?.email,
    telephone: general.telephone || general.phone || settings?.phone,
    ...localBusiness,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(orgLd) }}
      />
      <ContactPageView
        contactPage={settings?.contactPage}
        general={{
          email: settings?.email || general.email,
          phone: settings?.phone || general.phone,
        }}
        localBusiness={localBusiness}
      />
    </>
  );
}
