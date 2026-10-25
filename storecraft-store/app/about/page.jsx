import AboutPageView from "@/components/store/AboutPageView";
import { getServerStoreSettings } from "@/lib/serverSettings";
import { buildPageMetadata } from "@/lib/pageMetadata";
import { withSafeMetadata } from "@/lib/safeMetadata";
import { BRAND_NAME, withBrandTitleSuffix } from "@/lib/brand";
import { formatActiveProductStat } from "@/lib/homepageStats";
import Product from "@/lib/models/Product.model";
import { dbConnect } from "@/lib/db";
import { STOREFRONT_PRODUCT_FILTER } from "@/lib/productVisibility";

export const generateMetadata = withSafeMetadata(async function aboutMetadata() {
  const settings = await getServerStoreSettings();
  const about = settings?.aboutPage || {};
  const hero = about.hero || {};
  const metaTitle =
    String(about.metaTitle || about.seo?.metaTitle || "").trim() ||
    String(hero.title || "").trim() ||
    "About Us";
  const title = withBrandTitleSuffix(metaTitle, { maxLen: 60 });
  const description = String(
    about.metaDescription || about.seo?.metaDescription || hero.subtitle || ""
  ).trim() ||
    `Learn about ${BRAND_NAME} — premium car accessories delivered across Pakistan.`;

  return buildPageMetadata({
    title,
    description: description.slice(0, 155),
    path: "/about",
    absoluteTitle: true,
  });
});

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const settings = await getServerStoreSettings();
  let activeProductCount = null;
  try {
    await dbConnect();
    activeProductCount = await Product.countDocuments(STOREFRONT_PRODUCT_FILTER);
  } catch {
    activeProductCount = null;
  }
  const productCountLabel = formatActiveProductStat(activeProductCount);
  return (
    <AboutPageView
      aboutPage={settings?.aboutPage}
      productCountLabel={productCountLabel}
    />
  );
}
