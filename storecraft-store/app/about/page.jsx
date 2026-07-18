import AboutPageView from "@/components/store/AboutPageView";
import { getServerStoreSettings } from "@/lib/serverSettings";
import { buildPageMetadata } from "@/lib/pageMetadata";

const STORE = process.env.NEXT_PUBLIC_STORE_NAME || "Crazzycars.pk";

export async function generateMetadata() {
  const settings = await getServerStoreSettings();
  const hero = settings?.aboutPage?.hero || {};
  const title = hero.title ? `${hero.title} | ${STORE}` : `About Us | ${STORE}`;
  const description =
    hero.subtitle ||
    `Learn about ${STORE} — premium car accessories delivered across Pakistan.`;

  return buildPageMetadata({
    title,
    description,
    path: "/about",
  });
}

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const settings = await getServerStoreSettings();
  return <AboutPageView aboutPage={settings?.aboutPage} />;
}
