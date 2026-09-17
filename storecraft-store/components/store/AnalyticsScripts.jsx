"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { trackPageView } from "@/lib/metaPixel";
import GoogleCustomerReviewsBadge from "@/components/store/GoogleCustomerReviewsBadge";

/**
 * Fire PageView on App Router navigations (including first paint).
 * Init script intentionally does NOT call PageView — avoids double-firing with this tracker.
 */
function MetaPixelPageViews() {
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const readyRef = useRef(false);

  useEffect(() => {
    setSearch(String(window.location.search || "").replace(/^\?/, ""));
  }, [pathname]);

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
          <MetaPixelPageViews />
        </>
      ) : null}
      <GoogleCustomerReviewsBadge />
    </>
  );
}
