import Link from "next/link";
import { FOUNDER, FOUNDER_PATH, founderInitials } from "@/config/founder";

/**
 * Homepage "Meet the founder" band — a real face and promise in the trust area
 * (between reviews and Why choose us). Content comes from config/founder.js.
 */
const QUOTE =
  "Every order is someone trusting a shop they have never visited. I never take that trust for granted — if something goes wrong, it is me, and I will make it right.";

export default function HomeFounderSection() {
  return (
    <section className="hfs" aria-labelledby="home-founder-title">
      <div className="store-container hfs__inner">
        <div className="hfs__photo">
          {FOUNDER.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={FOUNDER.photo} alt={FOUNDER.photoAlt} width={168} height={168} loading="lazy" decoding="async" />
          ) : (
            <span className="hfs__initials">{founderInitials()}</span>
          )}
        </div>
        <div className="hfs__body">
          <p className="hfs__kicker">Meet the founder</p>
          <h2 className="hfs__title" id="home-founder-title">
            A real person behind every order
          </h2>
          <blockquote className="hfs__quote">“{QUOTE}”</blockquote>
          <p className="hfs__name">
            <strong>{FOUNDER.name}</strong> · Founder, CrazzyCars.pk · {FOUNDER.city}
          </p>
          <div className="hfs__actions">
            <Link href={FOUNDER_PATH} className="hfs__btn">
              Read my story →
            </Link>
            <Link href={`${FOUNDER_PATH}#why-booking-advance`} className="hfs__link">
              Why we ask for a booking advance
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
