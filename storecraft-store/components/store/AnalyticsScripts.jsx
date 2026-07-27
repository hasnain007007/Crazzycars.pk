"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import { Suspense } from "react";
import { trackPageView } from "@/lib/metaPixel";

/**
 * Fire PageView on App Router navigations (including first paint).
 * Init script intentionally does NOT call PageView — avoids double-firing with this tracker.
 */
function MetaPixelPageViews() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() || "";
  const readyRef = useRef(false);

  useEffect(() => {
    let attempts = 0;
    let timer;

    const fire = () => {
      if (typeof window !== "undefined" && typeof window.fbq === "function") {
        trackPageView();
        readyRef.current = true;
        return true;
      }
      return false;
    };

    if (fire()) return undefined;

    // Script may still be loading (afterInteractive) — retry briefly.
    timer = window.setInterval(() => {
      attempts += 1;
      if (fire() || attempts > 40) window.clearInterval(timer);
    }, 100);

    return () => window.clearInterval(timer);
  }, [pathname, search]);

  return null;
}

export default function AnalyticsScripts({ settings }) {
  const gaId = String(settings?.seo?.googleAnalyticsId || "").trim();
  const fbPixelId = String(settings?.seo?.facebookPixelId || "").trim();

  if (!gaId && !fbPixelId) return null;

  return (
    <>
      {gaId ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId.replace(/'/g, "\\'")}');
            `}
          </Script>
        </>
      ) : null}
      {fbPixelId ? (
        <>
          <Script id="fb-pixel" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${fbPixelId.replace(/'/g, "\\'")}');
            `}
          </Script>
          <Suspense fallback={null}>
            <MetaPixelPageViews />
          </Suspense>
        </>
      ) : null}
    </>
  );
}
