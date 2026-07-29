import AboutPageView from "@/components/store/AboutPageView";
import { buildPageMetadata } from "@/lib/pageMetadata";
import { getServerStoreSettings } from "@/lib/serverSettings";

export const dynamic = "force-dynamic";
export const metadata = buildPageMetadata({
  title: "About Us | Crazzycars.pk",
  description: "Learn about Crazzycars.pk and our premium car accessories.",
  path: "/about-us",
  absoluteTitle: true,
});

export default async function AboutUsPage() {
  const settings = await getServerStoreSettings();
  return <AboutPageView aboutPage={settings?.aboutPage} />;
}
