"use client";

import Script from "next/script";

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
      {fbPixelId ? (
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
            fbq('track', 'PageView');
          `}
        </Script>
      ) : null}
    </>
  );
}
