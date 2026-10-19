"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { flushMetaPixelQueue, trackPageView } from "@/lib/metaPixel";
import { trackSnapPageView } from "@/lib/snapPixel";
import { useDeferredThirdParty } from "@/lib/useDeferredThirdParty";

/** One PageView per App Router location (survives Strict Mode remounts). */
const pageViewFiredKeys = new Set();
const snapPageViewFiredKeys = new Set();

/**
 * Fire PageView once the deferred pixel is available.
 * Init script intentionally does NOT call PageView — this tracker owns it.
 */
function MetaPixelPageViews() {
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const firedRef = useRef(false);

  useEffect(() => {
    setSearch(String(window.location.search || "").replace(/^\?/, ""));
    firedRef.current = false;
  }, [pathname]);

  useEffect(() => {
    const key = `${pathname}?${search}`;
    let attempts = 0;
    let timer;

    const fire = () => {
      if (firedRef.current || pageViewFiredKeys.has(key)) {
        firedRef.current = true;
        return true;
      }
      if (typeof window !== "undefined" && typeof window.fbq === "function") {
        trackPageView();
        flushMetaPixelQueue();
        firedRef.current = true;
        pageViewFiredKeys.add(key);
        return true;
      }
      return false;
    };

    if (fire()) return undefined;

    timer = window.setInterval(() => {
      attempts += 1;
      if (fire() || attempts > 40) window.clearInterval(timer);
    }, 100);

    return () => window.clearInterval(timer);
  }, [pathname, search]);

  return null;
}

function SnapPixelPageViews() {
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const firedRef = useRef(false);

  useEffect(() => {
    setSearch(String(window.location.search || "").replace(/^\?/, ""));
    firedRef.current = false;
  }, [pathname]);

  useEffect(() => {
    const key = `snap:${pathname}?${search}`;
    let attempts = 0;
    let timer;

    const fire = () => {
      if (firedRef.current || snapPageViewFiredKeys.has(key)) {
        firedRef.current = true;
        return true;
      }
      if (typeof window !== "undefined" && typeof window.snaptr === "function") {
        trackSnapPageView();
        firedRef.current = true;
        snapPageViewFiredKeys.add(key);
        return true;
      }
      return false;
    };

    if (fire()) return undefined;

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
  const snapPixelId = String(settings?.seo?.snapchatPixelId || "").trim();
  const deferMeta = useDeferredThirdParty(8000);
  const deferSnap = useDeferredThirdParty(8000);

  if (!gaId && !fbPixelId && !snapPixelId) return null;

  return (
    <>
      {gaId ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`}
            strategy="lazyOnload"
          />
          <Script id="ga4-init" strategy="lazyOnload">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId.replace(/'/g, "\\'")}');
            `}
          </Script>
        </>
      ) : null}
      {fbPixelId && deferMeta ? (
        <>
          <Script id="fb-pixel" strategy="lazyOnload">
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
      {snapPixelId && deferSnap ? (
        <>
          <Script id="snap-pixel" strategy="lazyOnload">
            {`
              (function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function()
              {a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};
              a.queue=[];var s='script';r=t.createElement(s);r.async=!0;
              r.src=n;var u=t.getElementsByTagName(s)[0];
              u.parentNode.insertBefore(r,u);})(window,document,
              'https://sc-static.net/scevent.min.js');
              snaptr('init', '${snapPixelId.replace(/'/g, "\\'")}', {});
            `}
          </Script>
          <SnapPixelPageViews />
        </>
      ) : null}
    </>
  );
}
