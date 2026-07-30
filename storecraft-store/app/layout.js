import { Inter, Rajdhani } from "next/font/google";
import { cache, Suspense } from "react";
import { Toaster } from "react-hot-toast";
import AnalyticsScripts from "@/components/store/AnalyticsScripts";
import AnnouncementBar from "@/components/store/AnnouncementBar";
import { ClientOnlyWidgets, LivePresenceClient } from "@/components/store/ClientOnlyWidgets";
import MobileBottomNav from "@/components/store/MobileBottomNav";
import ThemeInjector from "@/components/store/ThemeInjector";
import { StoreFooter } from "@/components/store/StoreFooter";
import { StoreHeader } from "@/components/store/StoreHeader";
import { StoreProviders } from "@/components/store/StoreProviders";
import { CustomerProvider } from "@/lib/customerAuth";
import { getPublicStoreSettings } from "@/lib/serverSettings";
import { isShopifyEnabled } from "@/lib/shopify";
import { fetchCategoryTreeServer } from "@/lib/serverCategoryTree";
import { getSiteUrl, isIndexableEnvironment, sanitizeCanonicalUrl, absoluteUrl } from "@/lib/siteUrl";
import { buildFaviconMetadata } from "@/lib/faviconUrl";
import { organizationJsonLd as buildOrgLd, websiteJsonLd as buildWebsiteLd } from "@/lib/seo/jsonld";
import "./globals.css";

/** Cache HTML for 60s — major TTFB win vs force-dynamic. */
export const revalidate = 60;

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "600"],
  preload: true,
});

const rajdhani = Rajdhani({
  subsets: ["latin"],
  variable: "--font-rajdhani",
  display: "swap",
  weight: ["600", "700"],
  preload: true,
});

const FALLBACK_DESCRIPTION =
  "Buy premium car accessories online in Pakistan — splitters, body kits, LED lights, carbon fiber accessories & more. Cash on Delivery nationwide. CrazzyCars.pk";

const getLayoutSettings = cache(getPublicStoreSettings);

function robotsFromSeo(robotsTxt) {
  const s = String(robotsTxt || "index, follow").toLowerCase();
  const noindex = s.includes("noindex");
  const nofollow = s.includes("nofollow");
  return {
    index: !noindex,
    follow: !nofollow,
    googleBot: {
      index: !noindex,
      follow: !nofollow,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  };
}

export async function generateMetadata() {
  try {
    const settings = await getLayoutSettings();
    const seo = settings?.seo || {};
    const general = settings?.general || {};
    const storeName =
      general.storeName ||
      process.env.NEXT_PUBLIC_STORE_NAME ||
      process.env.NEXT_PUBLIC_APP_NAME ||
      "CrazzyCars.pk";

    const title =
      seo.metaTitle?.trim() ||
      seo.defaultMetaTitle?.trim() ||
      storeName ||
      "CrazzyCars.pk";
    const description =
      seo.metaDescription?.trim() ||
      seo.defaultMetaDescription?.trim() ||
      FALLBACK_DESCRIPTION;
    const siteUrl = getSiteUrl();
    const canonical = sanitizeCanonicalUrl(seo.canonicalUrl?.trim() || siteUrl);

    const ogTitle = seo.ogTitle?.trim() || title;
    const ogDescription = seo.ogDescription?.trim() || description;
    // Allow site-relative, same-host, and Cloudinary uploads from admin SEO settings.
    const configuredOg = seo.ogImage?.trim() || "";
    let ogSafe = "";
    if (configuredOg) {
      try {
        if (configuredOg.startsWith("/")) {
          ogSafe = absoluteUrl(configuredOg);
        } else {
          const parsed = new URL(configuredOg, siteUrl);
          const host = parsed.hostname.replace(/^www\./, "");
          const siteHost = new URL(siteUrl).hostname.replace(/^www\./, "");
          const isHttps = parsed.protocol === "https:" || parsed.protocol === "http:";
          const allowed =
            host === siteHost ||
            host === "res.cloudinary.com" ||
            host.endsWith(".cloudinary.com");
          if (isHttps && allowed) {
            ogSafe = parsed.href;
          }
        }
      } catch {
        ogSafe = "";
      }
    }
    const ogImageUrl = ogSafe || absoluteUrl("/og-image.jpg");

    const gsc = seo.googleSearchConsoleId?.trim();
    const verification = gsc ? { google: gsc } : {};

    const icons = buildFaviconMetadata(general);

    return {
      metadataBase: new URL(siteUrl),
      title: {
        default: title,
        template: `%s | ${storeName}`,
      },
      description,
      icons,
      authors: [{ name: storeName }],
      creator: storeName,
      publisher: storeName,
      robots: isIndexableEnvironment() ? robotsFromSeo(seo.robotsTxt) : { index: false, follow: false },
      openGraph: {
        title: ogTitle,
        description: ogDescription,
        locale: "en_US",
        type: "website",
        siteName: storeName,
        url: canonical,
        images: [{ url: ogImageUrl, width: 1200, height: 630, alt: storeName }],
      },
      twitter: {
        card: "summary_large_image",
        title: ogTitle,
        description: ogDescription,
        images: [ogImageUrl],
      },
      alternates: {
        canonical,
      },
      verification,
    };
  } catch (e) {
    console.error("generateMetadata error:", e);
    return {
      metadataBase: new URL(getSiteUrl()),
      title: "CrazzyCars.pk | Car Accessories Pakistan",
      description: FALLBACK_DESCRIPTION,
      icons: buildFaviconMetadata(),
      robots: isIndexableEnvironment() ? undefined : { index: false, follow: false },
      openGraph: {
        images: [{ url: absoluteUrl("/og-image.jpg"), width: 1200, height: 630, alt: "CrazzyCars.pk" }],
      },
      twitter: {
        card: "summary_large_image",
        images: [absoluteUrl("/og-image.jpg")],
      },
    };
  }
}

export default async function RootLayout({ children }) {
  let settings = {};
  try {
    settings = await getLayoutSettings();
    const footerRaw = settings?.footer || {};
    settings = {
      ...settings,
      footer: {
        ...footerRaw,
        copyrightText: footerRaw.copyrightText || settings?.footerMeta?.copyrightText || "",
        tagline: footerRaw.tagline || settings?.footerMeta?.tagline || "Pakistan's Premier Car Accessories Store",
        paymentMethods: footerRaw.paymentMethods || settings?.footerMeta?.paymentMethods || [],
        shopLinks: footerRaw.shopLinks || [],
        customerCareLinks: footerRaw.customerCareLinks || [],
        categoriesLinks: footerRaw.categoriesLinks || [],
        social: footerRaw.social || settings?.footerMeta?.social || {},
      },
    };
  } catch (e) {
    console.error("RootLayout settings error:", e);
  }

  const categoryTree = await fetchCategoryTreeServer();

  const appearance = settings?.appearance || {};
  const general = settings?.general || {};
  const seo = settings?.seo || {};
  const storeName =
    general.storeName ||
    process.env.NEXT_PUBLIC_APP_NAME ||
    process.env.NEXT_PUBLIC_STORE_NAME ||
    "Crazzycars.pk";
  const baseUrl = getSiteUrl();
  const description =
    seo.metaDescription?.trim() || seo.defaultMetaDescription?.trim() || FALLBACK_DESCRIPTION;

  const organizationJsonLd = buildOrgLd({
    name: storeName,
    logo: `${baseUrl}/og-image.jpg`,
    email: general.email || undefined,
    telephone: general.phone || undefined,
    streetAddress: general.address || undefined,
  });

  const websiteJsonLd = buildWebsiteLd({ name: storeName });

  const bodyFont = appearance.fontFamily || undefined;

  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${rajdhani.variable} h-full`}>
      <body
        className="font-sans antialiased min-h-full flex flex-col"
        style={{
          background: "var(--color-background)",
          color: "var(--color-text-primary)",
          ...(bodyFont ? { fontFamily: bodyFont } : {}),
        }}
        suppressHydrationWarning
      >
        <ThemeInjector settings={settings} />
        <AnalyticsScripts settings={settings} />
        <LivePresenceClient />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteJsonLd),
          }}
        />
        <CustomerProvider>
          <StoreProviders settings={settings} shopifyEnabled={isShopifyEnabled()}>
            <AnnouncementBar />
            <Suspense fallback={null}>
              <StoreHeader initialCategoryTree={categoryTree} />
            </Suspense>
            <main className="flex-1 pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">{children}</main>
            <Suspense fallback={null}>
              <StoreFooter settings={settings} initialCategoryTree={categoryTree} />
            </Suspense>
            <ClientOnlyWidgets />
            <MobileBottomNav />
          </StoreProviders>
        </CustomerProvider>
        <Toaster position="top-right" toastOptions={{ className: "text-sm" }} />
      </body>
    </html>
  );
}
