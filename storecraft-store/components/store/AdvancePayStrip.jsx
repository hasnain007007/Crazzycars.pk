"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { advancePaymentCopy } from "@/lib/storePolicyCopy";

const HIDDEN_ON = ["/checkout", "/advance-payment"];

/** Site-wide strip under the header: booking advance, prepaid saving, link to /advance-payment. */
export default function AdvancePayStrip() {
  const pathname = usePathname() || "/";
  if (HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;
  const c = advancePaymentCopy();

  return (
    <div className="advance-strip-wrap">
      <div className="advance-strip" role="note">
        <span className="advance-strip__icon" aria-hidden>
          🚗
        </span>
        <div className="advance-strip__text">
          <p className="advance-strip__title">
            <span className="advance-strip__title-full">{c.stripTitle}</span>
            <span className="advance-strip__title-short">{c.stripTitleShort}</span>
          </p>
          <p className="advance-strip__sub">{c.stripSub}</p>
        </div>
        <div className="advance-strip__chips">
          {c.chips.map((chip) => (
            <span key={chip.label} className="advance-strip__chip">
              <strong>{chip.value}</strong>
              <small>
                <span className="advance-strip__chip-label">{chip.label}</span>
                <span className="advance-strip__chip-compact">{chip.compactLabel}</span>
              </small>
            </span>
          ))}
        </div>
        <Link href="/advance-payment" className="advance-strip__cta">
          How to pay <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  );
}
