"use client";

import Link from "next/link";
import { COD_ADVANCE_AMOUNT, PREPAID_DISCOUNT_PERCENT } from "@/config/checkout-money";
import { useStorePayment } from "@/context/StoreSettingsContext";
import { formatPkrAmount } from "@/lib/storePolicyCopy";

/**
 * Homepage hero: real text (sharp and readable on phones), the brand's white Civic Type R
 * on the right, and a road strip whose lane markings move.
 * Prepaid % comes from live Settings.storePayment (same source as checkout).
 */
export default function BrandHero() {
  const storePayment = useStorePayment();
  const prepaidPercent =
    Number(storePayment?.advancePaymentDiscountPercent) || PREPAID_DISCOUNT_PERCENT;
  return (
    <section className="brand-hero" aria-label="CrazzyCars.pk">
      <div className="brand-hero__inner">
        <div className="brand-hero__copy">
          <p className="brand-hero__kicker">Body kits · LED lighting · Carbon accessories</p>
          <h1 className="brand-hero__seo-h1" style={{ fontSize: "clamp(1.1rem, 2.6vw, 1.45rem)", fontWeight: 700, margin: "0 0 8px", color: "#111" }}>
            Car Accessories in Pakistan – CrazzyCars.pk Gujranwala
          </h1>
          <p className="tagline brand-hero__title">
            Gaari Wohi,
            <br />
            <span>Andaz Naya.</span>
          </p>
          <p className="brand-hero__sub">
            Accessories made for your exact car, delivered across Pakistan with Cash on Delivery.
          </p>
          <div className="brand-hero__offers">
            <span className="brand-hero__coupon">
              <strong>{prepaidPercent}% OFF</strong> when you pay in full
            </span>
            <Link href="/advance-payment" className="brand-hero__offer-link">
              COD booking from {formatPkrAmount(COD_ADVANCE_AMOUNT)}
            </Link>
          </div>
          <div className="brand-hero__actions">
            <Link href="/shop" className="brand-hero__btn brand-hero__btn--primary">
              Shop now <span aria-hidden>→</span>
            </Link>
            <Link href="/cars" className="brand-hero__btn brand-hero__btn--ghost">
              Find parts for my car
            </Link>
          </div>
        </div>
        <div className="brand-hero__visual" aria-hidden>
          <picture>
            <source media="(min-width: 768px)" srcSet="/hero/civic-night-1205.webp" />
            <img
              src="/hero/civic-night-760.webp"
              alt=""
              width={1205}
              height={576}
              fetchPriority="high"
              decoding="async"
              className="brand-hero__car"
            />
          </picture>
        </div>
      </div>
      <div className="brand-hero__road" aria-hidden>
        <span className="brand-hero__lane" />
      </div>
    </section>
  );
}
