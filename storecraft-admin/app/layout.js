/**
 * Root HTML layout and shared metadata.
 */
import { Inter } from "next/font/google";
import Script from "next/script";
import { Toaster } from "react-hot-toast";
import { dbConnect } from "@/lib/db";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { buildFaviconMetadata } from "@/lib/faviconUrl";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

/**
 * Admin HTML must never be edge-cached across deploys. Hashed CSS/JS chunks
 * change every build; stale HTML + missing CSS produces an unstyled layout
 * (giant images, crushed sidebar). Branding still refreshes via getBranding().
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

const BRANDING_TTL_MS = 60 * 1000;
let brandingCache = { value: null, at: 0 };

/**
 * Store name and favicon for the document head. Cached briefly so admin
 * navigation doesn't hit Mongo on every render, and never fatal — the panel
 * must still render if settings are unreachable.
 */
async function getBranding() {
  if (brandingCache.value && Date.now() - brandingCache.at < BRANDING_TTL_MS) {
    return brandingCache.value;
  }

  let general = {};
  try {
    await dbConnect();
    const doc = await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY })
      .select("general.storeName general.favicon general.faviconUrl")
      .lean();
    general = doc?.general || {};
  } catch (e) {
    console.error("admin branding metadata error:", e);
  }

  brandingCache = { value: general, at: Date.now() };
  return general;
}

export async function generateMetadata() {
  const general = await getBranding();
  const storeName =
    general.storeName || process.env.NEXT_PUBLIC_STORE_NAME || "Crazzycars.pk";

  return {
    title: { default: `${storeName} Admin`, template: `%s · ${storeName} Admin` },
    description: `${storeName} administration panel.`,
    icons: buildFaviconMetadata(general),
  };
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-[#111827]">
        <Script id="sialkot-theme-init" strategy="beforeInteractive">
          {`(function(){try{var r=document.documentElement;var k='sialkot-theme';var s=localStorage.getItem(k);if(s==='dark'){r.classList.add('dark');}else{r.classList.remove('dark');if(s===null){localStorage.setItem(k,'light');}}}catch(e){try{document.documentElement.classList.remove('dark');}catch(_){}}})();`}
        </Script>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            className: "text-sm",
            duration: 4000,
            success: {
              style: {
                background: "#ecfdf5",
                color: "#065f46",
                border: "1px solid #6ee7b7",
                fontWeight: 600,
              },
            },
            error: {
              style: {
                background: "#fef2f2",
                color: "#991b1b",
                border: "1px solid #fecaca",
                fontWeight: 600,
              },
            },
          }}
        />
      </body>
    </html>
  );
}
