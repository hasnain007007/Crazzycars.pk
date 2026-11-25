import Link from "next/link";
import { STORE_CONTACT } from "@/config/store-policy";
import { STORE_NAP } from "@/config/store-nap";
import {
  FOUNDER,
  FOUNDER_PATH,
  founderInitials,
  founderLdId,
  founderSameAs,
} from "@/config/founder";
import { buildPageMetadata } from "@/lib/pageMetadata";
import { withSafeMetadata } from "@/lib/safeMetadata";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { getSiteUrl } from "@/lib/siteUrl";
import WhyBookingAdvance from "@/components/store/WhyBookingAdvance";

const SITE = getSiteUrl().replace(/\/+$/, "");
const TITLE = `Meet the Founder – ${FOUNDER.name} | CrazzyCars.pk`;
const DESCRIPTION = `${FOUNDER.name} founded CrazzyCars.pk in ${FOUNDER.foundedYear} in ${FOUNDER.city}. His story, our promise to you, and how to reach the owner directly.`;

export const generateMetadata = withSafeMetadata(async function founderMetadata() {
  return buildPageMetadata({
    title: TITLE,
    description: DESCRIPTION,
    path: FOUNDER_PATH,
    absoluteTitle: true,
    ...(FOUNDER.photo ? { images: [{ url: FOUNDER.photo, alt: FOUNDER.photoAlt }] } : {}),
  });
});

const WA_DIGITS = String(STORE_CONTACT.phoneE164 || "+923284010007").replace(/\D/g, "");
const WA_DISPLAY = STORE_CONTACT.whatsapp || "03284010007";
const EMAIL = STORE_CONTACT.email || "info@crazzycars.pk";
const WA_HREF = `https://wa.me/${WA_DIGITS}?text=${encodeURIComponent(
  "Assalam-o-Alaikum, complaint for the owner. My order number is: "
)}`;

/* ---------- icons (inline SVG, no extra requests) ---------- */
const ICONS = {
  linkedin: (
    <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5zM.22 8h4.56v14H.22V8zm7.4 0h4.37v1.92h.06c.61-1.15 2.1-2.36 4.32-2.36 4.62 0 5.47 3.04 5.47 7v7.44h-4.56v-6.6c0-1.57-.03-3.6-2.2-3.6-2.2 0-2.53 1.72-2.53 3.49V22H7.62V8z" />
  ),
  instagram: (
    <path d="M12 2.2c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.64.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85C2.38 3.92 3.9 2.38 7.15 2.23 8.42 2.17 8.8 2.16 12 2.16zM12 0C8.74 0 8.33.01 7.05.07 2.7.27.27 2.69.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.2 4.36 2.62 6.78 6.98 6.98C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c4.35-.2 6.78-2.62 6.98-6.98.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.2-4.35-2.62-6.78-6.98-6.98C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 100 12.32 6.16 6.16 0 000-12.32zM12 16a4 4 0 110-8 4 4 0 010 8zm6.4-11.85a1.44 1.44 0 100 2.88 1.44 1.44 0 000-2.88z" />
  ),
  facebook: (
    <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.5h-2.8V24C19.62 23.1 24 18.1 24 12.07z" />
  ),
  tiktok: (
    <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
  ),
  google: (
    <path d="M12 0C7.31 0 3.5 3.81 3.5 8.5c0 6.38 8.5 15.5 8.5 15.5s8.5-9.12 8.5-15.5C20.5 3.81 16.69 0 12 0zm0 11.5a3 3 0 110-6 3 3 0 010 6z" />
  ),
  whatsapp: (
    <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.05 21.8h-.01a9.87 9.87 0 01-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 01-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 012.89 6.99c0 5.45-4.44 9.88-9.88 9.88zM20.46 3.49A11.82 11.82 0 0012.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 005.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.48-8.42z" />
  ),
  mail: (
    <path d="M2 4h20a2 2 0 012 2v12a2 2 0 01-2 2H2a2 2 0 01-2-2V6a2 2 0 012-2zm10 8.5L2.4 6.2V18h19.2V6.2L12 12.5zM3.6 6l8.4 5.4L20.4 6H3.6z" />
  ),
  check: <path d="M9 16.2l-3.5-3.5L4 14.2l5 5 11-11-1.5-1.5z" />,
  shield: (
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 15l-4-4 1.41-1.41L11 13.17l5.59-5.58L18 9l-7 7z" />
  ),
  chat: (
    <path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
  ),
  return: <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />,
};

function Icon({ name, size = 18, className = "" }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden className={className}>
      {ICONS[name]}
    </svg>
  );
}

const PROMISE_ICONS = ["chat", "return", "shield"];

const FOUNDER_LINKS = [
  { label: "LinkedIn", href: FOUNDER.profiles.linkedin, icon: "linkedin", bg: "#0A66C2" },
  {
    label: "Instagram",
    href: FOUNDER.profiles.instagram,
    icon: "instagram",
    bg: "linear-gradient(45deg,#F58529,#DD2A7B,#8134AF)",
  },
].filter((l) => Boolean(l.href));

const COMPANY_LINKS = [
  { label: "Facebook", href: STORE_NAP.facebookUrl, icon: "facebook", color: "#1877F2" },
  {
    label: "Instagram",
    href: STORE_NAP.sameAs.find((u) => /instagram\.com/.test(u)),
    icon: "instagram",
    color: "#DD2A7B",
  },
  { label: "TikTok", href: STORE_NAP.sameAs.find((u) => /tiktok\.com/.test(u)), icon: "tiktok", color: "#111111" },
  { label: "LinkedIn", href: FOUNDER.companyProfiles.linkedin, icon: "linkedin", color: "#0A66C2" },
  { label: "Google reviews", href: STORE_NAP.mapUrl, icon: "google", color: "#EA4335" },
].filter((l) => Boolean(l.href));

const FACTS = [
  { value: String(FOUNDER.foundedYear), label: "Founded" },
  { value: FOUNDER.city, label: "Based in" },
  { value: "All Pakistan", label: "Delivery" },
  { value: "COD", label: "On eligible items" },
];

const JOURNEY = [
  { when: String(FOUNDER.foundedYear), title: `CrazzyCars starts in ${FOUNDER.city}`, text: "A small shop with one goal: car accessories that actually fit your car." },
  { when: "Built in-house", title: "Our own website & tracking", text: "Car-by-car fitment pages, order tracking and delivery, all built by our own team." },
  { when: "Today", title: "Serving car owners across Pakistan", text: "Body kits, lights and interior upgrades for Civic, Corolla, City, Swift, Alto and more." },
  { when: "Coming soon", title: "The CrazzyCars mobile app", text: "Find the right part, order and track your delivery, right from your phone.", soon: true },
];

function profileLd() {
  const person = {
    "@type": "Person",
    "@id": founderLdId(SITE),
    name: FOUNDER.name,
    jobTitle: FOUNDER.jobTitle,
    url: `${SITE}${FOUNDER_PATH}`,
    worksFor: { "@id": `${SITE}/#org` },
    homeLocation: { "@type": "Place", name: `${FOUNDER.city}, Pakistan` },
    sameAs: founderSameAs(),
  };
  if (FOUNDER.photo) person.image = FOUNDER.photo.startsWith("http") ? FOUNDER.photo : `${SITE}${FOUNDER.photo}`;
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: `${SITE}${FOUNDER_PATH}`,
    name: TITLE,
    mainEntity: person,
  };
}

function Kicker({ children, light = false }) {
  return (
    <p className={`fp-kicker ${light ? "fp-kicker--light" : ""}`}>
      <span aria-hidden className="fp-kicker__bar" />
      {children}
    </p>
  );
}

export default function FounderPage() {
  const [introHello, ...introRest] = FOUNDER.intro;
  return (
    <div className="founder-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(profileLd()) }} />

      {/* ---------- HERO ---------- */}
      <section className="fp-hero">
        <div aria-hidden className="fp-hero__glow" />
        <div className="store-container fp-hero__inner">
          <nav aria-label="Breadcrumb" className="fp-crumbs">
            <Link href="/">Home</Link>
            <span>/</span>
            <Link href="/about">About</Link>
            <span>/</span>
            <span aria-current="page">Meet the founder</span>
          </nav>

          <div className="fp-hero__grid">
            <div className="fp-photo">
              {FOUNDER.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={FOUNDER.photo} alt={FOUNDER.photoAlt} width={240} height={240} />
              ) : (
                <span className="fp-photo__initials">{founderInitials()}</span>
              )}
              <span className="fp-photo__badge">Founder</span>
            </div>

            <div>
              <Kicker light>Meet the founder</Kicker>
              <h1 className="fp-hero__name">{FOUNDER.name}</h1>
              <p className="fp-hero__role">
                Founder of <strong>CrazzyCars.pk</strong> · Software engineer · {FOUNDER.city}
              </p>
              <p className="fp-hero__hello">{introHello}</p>
              {FOUNDER_LINKS.length ? (
                <div className="fp-hero__links">
                  {FOUNDER_LINKS.map((l) => (
                    <a
                      key={l.label}
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer me"
                      className="fp-btn-social"
                      style={{ background: l.bg }}
                    >
                      <Icon name={l.icon} size={16} />
                      {l.label}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <dl className="fp-facts">
            {FACTS.map((f) => (
              <div key={f.label} className="fp-fact">
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ---------- INTRO ---------- */}
      <section className="store-container fp-section fp-intro">
        {introRest.map((p) => (
          <p key={p.slice(0, 40)}>{p}</p>
        ))}
      </section>

      {/* ---------- STORY ---------- */}
      {FOUNDER.story?.length ? (
        <section className="fp-story">
          <div className="store-container fp-story__inner">
            <Kicker>My story</Kicker>
            <h2 className="fp-h2">{FOUNDER.storyTitle || "My story"}</h2>
            <div className="fp-story__body">
              {FOUNDER.story.map((p, i) => (
                <p key={p.slice(0, 40)} className={i === 0 ? "fp-story__lead" : ""}>
                  {p}
                </p>
              ))}
            </div>
            <div className="fp-signature">
              {FOUNDER.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={FOUNDER.photo} alt="" width={48} height={48} />
              ) : null}
              <div>
                <p className="fp-signature__name">{FOUNDER.name}</p>
                <p className="fp-signature__role">Founder, CrazzyCars.pk</p>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* ---------- JOURNEY ---------- */}
      <section className="store-container fp-section">
        <Kicker>The journey</Kicker>
        <h2 className="fp-h2">From one shop to all of Pakistan</h2>
        <ol className="fp-journey">
          {JOURNEY.map((j) => (
            <li key={j.title} className={`fp-journey__item ${j.soon ? "is-soon" : ""}`}>
              <span aria-hidden className="fp-journey__dot" />
              <p className="fp-journey__when">{j.when}</p>
              <p className="fp-journey__title">{j.title}</p>
              <p className="fp-journey__text">{j.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------- PROMISE ---------- */}
      <section className="fp-promise">
        <div className="store-container fp-section">
          <Kicker light>My promise</Kicker>
          <h2 className="fp-h2 fp-h2--light">What you can always expect from us</h2>
          <ul className="fp-promise__grid">
            {FOUNDER.promises.map((p, i) => (
              <li key={p.title} className="fp-promise__card">
                <span className="fp-promise__icon">
                  <Icon name={PROMISE_ICONS[i] || "check"} size={22} />
                </span>
                <p className="fp-promise__title">{p.title}</p>
                <p className="fp-promise__text">{p.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- WHY BOOKING ADVANCE (English + Urdu) ---------- */}
      <section className="store-container fp-section">
        <WhyBookingAdvance
          signature={
            <>
              {FOUNDER.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={FOUNDER.photo}
                  alt=""
                  width={44}
                  height={44}
                  style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", objectPosition: "50% 22%" }}
                />
              ) : null}
              <div>
                <p className="fp-signature__name" style={{ fontSize: 24 }}>{FOUNDER.name}</p>
                <p className="fp-signature__role">Founder, CrazzyCars.pk</p>
              </div>
            </>
          }
        />
      </section>

      {/* ---------- COMPLAINTS ---------- */}
      <section className="store-container fp-section">
        <div className="fp-contact">
          <div>
            <Kicker>Talk to me directly</Kicker>
            <h2 className="fp-h2">Problem with an order? It comes to me.</h2>
            <p className="fp-contact__text">
              Send your <strong>order number</strong> and a photo of the issue, and write{" "}
              <strong>“Complaint for owner”</strong>. Returns follow our{" "}
              <Link href="/returns-policy">returns policy</Link>, and we never ask for payment outside the accounts
              on <Link href="/advance-payment">How to pay</Link>.
            </p>
          </div>
          <div className="fp-contact__actions">
            <a href={WA_HREF} target="_blank" rel="noopener noreferrer" className="fp-btn-wa">
              <Icon name="whatsapp" size={20} />
              WhatsApp {WA_DISPLAY}
            </a>
            <a href={`mailto:${EMAIL}`} className="fp-btn-mail">
              <Icon name="mail" size={18} />
              {EMAIL}
            </a>
          </div>
        </div>
      </section>

      {/* ---------- ONLINE ---------- */}
      <section className="store-container fp-section fp-online">
        <Kicker>CrazzyCars online</Kicker>
        <h2 className="fp-h2">Follow our work</h2>
        <ul className="fp-online__grid">
          {COMPANY_LINKS.map((l) => (
            <li key={l.label}>
              <a href={l.href} target="_blank" rel="noopener noreferrer" className="fp-online__card">
                <span className="fp-online__icon" style={{ background: l.color }}>
                  <Icon name={l.icon} size={18} />
                </span>
                <span className="fp-online__label">{l.label}</span>
                <span aria-hidden className="fp-online__arrow">↗</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="fp-more">
          More about the shop on our <Link href="/about">About page</Link>, or start{" "}
          <Link href="/cars">shopping by your car</Link>.
        </p>
      </section>
    </div>
  );
}
