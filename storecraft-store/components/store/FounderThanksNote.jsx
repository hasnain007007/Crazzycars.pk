import Link from "next/link";
import { FOUNDER, FOUNDER_PATH } from "@/config/founder";

/**
 * Personal thank-you from the founder (order success page).
 * `compact`: one short line + small photo (success page stays short).
 */
export default function FounderThanksNote({ compact = false }) {
  return (
    <Link href={FOUNDER_PATH} className={`pj-note${compact ? " pj-note--compact" : ""}`}>
      {FOUNDER.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={FOUNDER.photo} alt="" width={compact ? 34 : 44} height={compact ? 34 : 44} loading="lazy" decoding="async" />
      ) : null}
      <span className="pj-note__body">
        <span className="pj-note__text">
          {compact
            ? "JazakAllah for choosing CrazzyCars — if anything is not right, I’m here."
            : "JazakAllah for choosing CrazzyCars. Your parcel will be packed with care in Gujranwala — and if anything is not right, I’m here."}
        </span>
        <span className="pj-note__sign">
          — {FOUNDER.name}, {FOUNDER.jobTitle}
        </span>
      </span>
    </Link>
  );
}
