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
import { STORE_NAP } from "@/config/store-nap";
import { STORE_CONTACT } from "@/config/store-policy";

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
  // Display + LocalBusiness fields from STORE_NAP (GBP), not stale Mongo Settings.
  const localBusiness = {
    streetAddress: STORE_NAP.streetAddress,
    addressLocality: STORE_NAP.addressLocality,
    addressRegion: STORE_NAP.addressRegion,
    postalCode: STORE_NAP.postalCode,
    addressCountry: STORE_NAP.addressCountry,
    latitude: STORE_NAP.latitude,
    longitude: STORE_NAP.longitude,
    mapUrl: general.mapUrl || general.googleMapsUrl || STORE_NAP.mapUrl || "",
    googleReviewUrl: general.googleReviewUrl || "",
    whatsapp: STORE_CONTACT.whatsapp || STORE_CONTACT.phoneE164,
    priceRange: general.priceRange || "",
    sameAs: STORE_NAP.sameAs,
    openingHours: STORE_NAP.openingHoursSpec,
    hoursDisplay: STORE_NAP.hoursDisplay,
  };

  const baseUrl = getSiteUrl();
  const logoUrl = resolveStoreLogoUrl(settings) || `${baseUrl}/logo.png`;
  const orgLd = buildOrgLd({
    name: BRAND_NAME,
    logo: logoUrl,
    image: absoluteUrl(DEFAULT_OG_IMAGE_PATH),
    email: general.email || settings?.email || STORE_CONTACT.email,
    whatsapp: STORE_CONTACT.whatsapp || STORE_CONTACT.phoneE164,
    mapUrl: localBusiness.mapUrl,
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
          email: settings?.email || general.email || STORE_CONTACT.email,
          phone: STORE_NAP.shopPhoneDisplay,
          googleReviewUrl: general.googleReviewUrl || "",
        }}
        localBusiness={localBusiness}
      />
    </>
  );
}
