"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStorePayment } from "@/context/StoreSettingsContext";
import { PREPAID_DISCOUNT_PERCENT } from "@/config/checkout-money";
import { advancePaymentCopy } from "@/lib/storePolicyCopy";

const HIDDEN_ON = ["/checkout", "/advance-payment"];

/** Site-wide band under the header: COD booking advance tiers + link to /advance-payment. */
export default function AdvancePayStrip() {
  const pathname = usePathname() || "/";
  const storePayment = useStorePayment();
  if (HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;
  const prepaidPercent =
    Number(storePayment?.advancePaymentDiscountPercent) || PREPAID_DISCOUNT_PERCENT;
  const c = advancePaymentCopy({ prepaidPercent, hasAccounts: true });

  return (
    <div className="adv-band" role="note" aria-label="Cash on Delivery booking advance">
      <div className="adv-band__inner">
        <span className="adv-band__icon" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </span>
        <div className="adv-band__text">
          <p className="adv-band__title">{c.stripTitle}</p>
          <p className="adv-band__sub">{c.stripSub}</p>
        </div>
        <div className="adv-band__tiers">
          {c.chips.map((chip) => (
            <span key={chip.label} className="adv-band__tier">
              <strong>{chip.value}</strong>
              <small>{chip.compactLabel || chip.label}</small>
            </span>
          ))}
        </div>
        <Link href="/advance-payment" className="adv-band__cta">
          How to pay <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  );
}
