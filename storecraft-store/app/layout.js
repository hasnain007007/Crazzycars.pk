import { Inter, Rajdhani } from "next/font/google";
import { cache, Suspense } from "react";
import { Toaster } from "react-hot-toast";
import AnalyticsScripts from "@/components/store/AnalyticsScripts";
import AnnouncementBar from "@/components/store/AnnouncementBar";
import MobileBottomNav from "@/components/store/MobileBottomNav";
import ThemeInjector from "@/components/store/ThemeInjector";
import { CartDrawer } from "@/components/store/CartDrawer";
import { StoreFooter } from "@/components/store/StoreFooter";
import { StoreHeader } from "@/components/store/StoreHeader";
import { StoreProviders } from "@/components/store/StoreProviders";
import WhatsAppButton from "@/components/store/WhatsAppButton";
import { CustomerProvider } from "@/lib/customerAuth";
import { getServerStoreSettings } from "@/lib/serverSettings";
import "./globals.css";

export const dynamic = "force-dynamic";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600"],
  preload: true,
});

const rajdhani = Rajdhani({
  subsets: ["latin"],
  variable: "--font-rajdhani",
  display: "swap",
  weight: ["400", "500", "600", "700"],
  preload: true,
});

const FALLBACK_DESCRIPTION =
  "Buy premium car accessories online in Pakistan. Seat covers, floor mats, steering wheels, car lighting & more. Cash on delivery available nationwide from Sialkot.";

const DEFAULT_KEYWORDS = [
  "car accessories pakistan",
  "seat covers pakistan",
  "Crazzycars.pk",
  "car parts online pakistan",
  "cod car accessories",
  "auto accessories pakistan",
];

function getPublicOrigin() {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;
  return "http://localhost:3000";
}

const getLayoutSettings = cache(getServerStoreSettings);

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

function keywordsFromSeo(metaKeywords) {
  if (!metaKeywords || typeof metaKeywords !== "string") return [];
  return metaKeywords
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

function safeUrl(str, fallback) {
  try {
    return new URL(str);
  } catch {
    try {
      return new URL(fallback);
    } catch {
      return new URL("http://localhost:3000");
    }
  }
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
      "The Chain Gang";

    const title =
      seo.metaTitle?.trim() ||
      seo.defaultMetaTitle?.trim() ||
      storeName ||
      "The Chain Gang";
    const description =
      seo.metaDescription?.trim() ||
      seo.defaultMetaDescription?.trim() ||
      FALLBACK_DESCRIPTION;
    const keywordsRaw = seo.metaKeywords?.trim();
    const kw = keywordsFromSeo(keywordsRaw);
    const keywords = kw.length ? kw : DEFAULT_KEYWORDS;

    const envFallback = (process.env.NEXT_PUBLIC_STORE_URL || getPublicOrigin()).replace(/\/$/, "");
    const canonical = (seo.canonicalUrl?.trim() || envFallback || "https://crazzycars.pk").replace(
      /\/$/,
      ""
    );

    const ogTitle = seo.ogTitle?.trim() || title;
    const ogDescription = seo.ogDescription?.trim() || description;
    const ogImage = seo.ogImage?.trim();

    const gsc = seo.googleSearchConsoleId?.trim();
    const verification = gsc ? { google: gsc } : {};

    return {
      metadataBase: safeUrl(canonical, envFallback),
      title: {
        default: title,
        template: `%s | ${storeName}`,
      },
      description,
      keywords,
      authors: [{ name: storeName }],
      creator: storeName,
      publisher: storeName,
      robots: robotsFromSeo(seo.robotsTxt),
      openGraph: {
        title: ogTitle,
        description: ogDescription,
        locale: "en_PK",
        type: "website",
        siteName: storeName,
        images: ogImage
          ? [{ url: ogImage, width: 1200, height: 630, alt: storeName }]
          : [{ url: "/og-image.jpg", width: 1200, height: 630, alt: storeName }],
      },
      twitter: {
        card: "summary_large_image",
        title: ogTitle,
        description: ogDescription,
        images: ogImage ? [ogImage] : ["/og-image.jpg"],
      },
      alternates: {
        canonical,
      },
      verification,
    };
  } catch (e) {
    console.error("generateMetadata error:", e);
    return {
      title: "The Chain Gang | Premium Body Piercing Jewelry",
      description: FALLBACK_DESCRIPTION,
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

  const seo = settings?.seo || {};
  const appearance = settings?.appearance || {};
  const general = settings?.general || {};
  const storeName =
    general.storeName ||
    process.env.NEXT_PUBLIC_APP_NAME ||
    process.env.NEXT_PUBLIC_STORE_NAME ||
    "The Chain Gang";
  const baseUrl = (
    seo.canonicalUrl?.trim() ||
    process.env.NEXT_PUBLIC_STORE_URL?.replace(/\/$/, "") ||
    getPublicOrigin()
  ).replace(/\/$/, "");
  const description =
    seo.metaDescription?.trim() || seo.defaultMetaDescription?.trim() || FALLBACK_DESCRIPTION;

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: storeName,
    url: baseUrl,
    logo: `${baseUrl}/og-image.jpg`,
    description,
    address: {
      "@type": "PostalAddress",
      streetAddress: general.address || "Sialkot",
      addressLocality: "Sialkot",
      addressRegion: "Punjab",
      postalCode: "51310",
      addressCountry: "PK",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: ["English", "Urdu"],
    },
    sameAs: [],
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: storeName,
    url: baseUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${baseUrl}/products?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

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
          <StoreProviders settings={settings}>
            <AnnouncementBar />
            <Suspense fallback={null}>
              <StoreHeader />
            </Suspense>
            <main className="flex-1 pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">{children}</main>
            <Suspense fallback={null}>
              <StoreFooter settings={settings} />
            </Suspense>
            <CartDrawer />
            <WhatsAppButton />
            <MobileBottomNav />
          </StoreProviders>
        </CustomerProvider>
        <Toaster position="top-right" toastOptions={{ className: "text-sm" }} />
      </body>
    </html>
  );
}
