"use client";

import Script from "next/script";
import { GOOGLE_MERCHANT_ID } from "@/lib/googleCustomerReviews";

/**
 * Sitewide Google Customer Reviews badge (seller rating when available).
 * @see https://support.google.com/merchants/answer/7106244
 */
export default function GoogleCustomerReviewsBadge() {
  return (
    <>
      <Script
        id="merchantWidgetScript"
        src="https://www.gstatic.com/shopping/merchant/merchantwidget.js"
        strategy="lazyOnload"
      />
      <Script id="gcr-badge-init" strategy="lazyOnload">
        {`
          (function () {
            function startBadge() {
              try {
                if (typeof merchantwidget === 'undefined' || !merchantwidget.start) return false;
                merchantwidget.start({
                  merchant_id: ${GOOGLE_MERCHANT_ID},
                  position: 'BOTTOM_RIGHT'
                });
                return true;
              } catch (e) {
                return false;
              }
            }
            var el = document.getElementById('merchantWidgetScript');
            if (el) {
              el.addEventListener('load', startBadge);
            }
            if (!startBadge()) {
              var n = 0;
              var t = setInterval(function () {
                n += 1;
                if (startBadge() || n > 40) clearInterval(t);
              }, 200);
            }
          })();
        `}
      </Script>
    </>
  );
}
