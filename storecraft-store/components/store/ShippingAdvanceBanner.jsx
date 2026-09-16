"use client";

import {
  shippingAdvanceBannerEn,
  shippingAdvanceBannerUr,
} from "@/lib/storePolicyCopy";
import { shippingFloorPKR } from "@/lib/shippingTier";

/**
 * Mobile-first shipping + advance payment notice.
 * @param {{ hasBulky?: boolean | null, className?: string }} props
 *   hasBulky null/undefined = general rule only; boolean adds cart-specific line.
 */
export function ShippingAdvanceBanner({ hasBulky = null, className = "" }) {
  const showCartLine = hasBulky === true || hasBulky === false;
  const cartFee = showCartLine ? shippingFloorPKR(hasBulky) : null;

  return (
    <div
      className={`rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-left ${className}`.trim()}
      role="note"
    >
      <p className="m-0 text-[13px] font-medium leading-snug text-amber-950 sm:text-sm">
        {shippingAdvanceBannerEn()}
      </p>
      <p
        className="mt-1.5 mb-0 text-[12px] leading-snug text-amber-900/90 sm:text-[13px]"
        lang="ur"
        dir="rtl"
      >
        {shippingAdvanceBannerUr()}
      </p>
      {showCartLine ? (
        <p className="mt-1.5 mb-0 text-[12px] font-semibold text-amber-950 sm:text-[13px]">
          Advance delivery for this order: Rs.{" "}
          {Number(cartFee).toLocaleString("en-PK")}
        </p>
      ) : null}
    </div>
  );
}
