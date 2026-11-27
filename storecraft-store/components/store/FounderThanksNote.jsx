import Link from "next/link";
import { FOUNDER, FOUNDER_PATH } from "@/config/founder";

/** Short personal thank-you from the founder (order success page, customer-care section). */
export default function FounderThanksNote() {
  return (
    <Link href={FOUNDER_PATH} className="pj-note">
      {FOUNDER.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={FOUNDER.photo} alt="" width={44} height={44} loading="lazy" decoding="async" />
      ) : null}
      <span className="pj-note__body">
        <span className="pj-note__text">
          JazakAllah for choosing CrazzyCars. Your parcel will be packed with care in Gujranwala — and if anything is
          not right, I’m here.
        </span>
        <span className="pj-note__sign">
          — {FOUNDER.name}, {FOUNDER.jobTitle}
        </span>
      </span>
    </Link>
  );
}
