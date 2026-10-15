"use client";

import Script from "next/script";
import { GOOGLE_MERCHANT_ID } from "@/lib/googleCustomerReviews";
import { useDeferredThirdParty } from "@/lib/useDeferredThirdParty";

/**
 * Google Merchant badge — load on first interaction or ~3s after window load.
 */
export default function MerchantWidgetScripts() {
  const ready = useDeferredThirdParty(3000);
  if (!ready) return null;

  return (
    <>
      <Script
        id="merchantWidgetScript"
        src="https://www.gstatic.com/shopping/merchant/merchantwidget.js"
        strategy="afterInteractive"
        onLoad={() => {
          window.setTimeout(() => {
            try {
              if (typeof window.merchantwidget?.start === "function") {
                window.merchantwidget.start({
                  merchant_id: GOOGLE_MERCHANT_ID,
                  position: "BOTTOM_RIGHT",
                });
              }
            } catch {
              /* ignore */
            }
          }, 700);
        }}
      />
      <Script id="merchant-widget-boot" strategy="afterInteractive">
        {`
(function(){
  function start(){
    try{
      if(typeof merchantwidget==='undefined'||!merchantwidget.start)return false;
      merchantwidget.start({merchant_id:${GOOGLE_MERCHANT_ID},position:'BOTTOM_RIGHT'});
      return true;
    }catch(e){return false;}
  }
  var n=0,t=setInterval(function(){n++;if(start()||n>50)clearInterval(t);},400);
})();
`}
      </Script>
    </>
  );
}
