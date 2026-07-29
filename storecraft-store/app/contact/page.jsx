import ContactPageView from "@/components/store/ContactPageView";
import { getServerStoreSettings } from "@/lib/serverSettings";
import { buildPageMetadata } from "@/lib/pageMetadata";

const STORE = process.env.NEXT_PUBLIC_STORE_NAME || "Crazzycars.pk";

export async function generateMetadata() {
  const settings = await getServerStoreSettings();
  const hero = settings?.contactPage?.hero || {};
  const title = hero.title ? `${hero.title} | ${STORE}` : `Contact Us | ${STORE}`;
  const description =
    hero.subtitle || `Contact ${STORE} for order help, product advice, or support.`;

  return buildPageMetadata({
    title,
    description,
    path: "/contact",
    absoluteTitle: true,
  });
}

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const settings = await getServerStoreSettings();
  return (
    <ContactPageView
      contactPage={settings?.contactPage}
      general={{
        email: settings?.email || settings?.general?.email,
        phone: settings?.phone || settings?.general?.phone,
      }}
    />
  );
}
