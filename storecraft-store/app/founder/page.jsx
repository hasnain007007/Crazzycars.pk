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

const SITE = getSiteUrl().replace(/\/+$/, "");
const TITLE = `Meet the Founder – ${FOUNDER.name} | CrazzyCars.pk`;
const DESCRIPTION = `${FOUNDER.name} founded CrazzyCars.pk in ${FOUNDER.foundedYear} in ${FOUNDER.city}. Who runs the shop, our promise, how to reach the owner and where to find us.`;

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

const COMPANY_LINKS = [
  ["Facebook", STORE_NAP.facebookUrl],
  ["Instagram", STORE_NAP.sameAs.find((u) => /instagram\.com/.test(u))],
  ["TikTok", STORE_NAP.sameAs.find((u) => /tiktok\.com/.test(u))],
  ["LinkedIn", FOUNDER.companyProfiles.linkedin],
  ["Google reviews", STORE_NAP.mapUrl],
].filter(([, href]) => Boolean(href));

const FOUNDER_LINKS = [
  ["LinkedIn", FOUNDER.profiles.linkedin],
  ["Instagram", FOUNDER.profiles.instagram],
].filter(([, href]) => Boolean(href));

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

function Section({ title, children }) {
  return (
    <section className="mt-10">
      <h2 className="font-heading text-xl font-bold text-[#111111]">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function LinkPills({ links }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {links.map(([label, href]) => (
        <li key={label}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer me"
            className="inline-flex items-center rounded-full border border-[#E5E5E5] px-4 py-2 text-sm font-semibold text-[#111111] hover:border-[#C41E1E] hover:text-[#C41E1E]"
          >
            {label} ↗
          </a>
        </li>
      ))}
    </ul>
  );
}

export default function FounderPage() {
  return (
    <div style={{ background: "#FFFFFF", minHeight: "60vh" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(profileLd()) }} />
      <article className="store-container" style={{ maxWidth: 860, padding: "40px 16px 56px" }}>
        <nav aria-label="Breadcrumb" className="text-sm text-[#6B7280]">
          <Link href="/" className="hover:underline">
            Home
          </Link>{" "}
          /{" "}
          <Link href="/about" className="hover:underline">
            About
          </Link>{" "}
          / Meet the founder
        </nav>

        <header className="mt-6 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          {FOUNDER.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={FOUNDER.photo}
              alt={FOUNDER.photoAlt}
              width={144}
              height={144}
              className="h-36 w-36 rounded-full object-cover shadow-md"
            />
          ) : (
            <div
              aria-hidden
              className="flex h-36 w-36 items-center justify-center rounded-full bg-[#111111] font-heading text-4xl font-bold text-white"
            >
              {founderInitials()}
            </div>
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#C41E1E]">Meet the founder</p>
            <h1 className="font-heading mt-1 text-3xl font-bold text-[#111111]">{FOUNDER.name}</h1>
            <p className="mt-1 text-[15px] text-[#444444]">
              {FOUNDER.jobTitle}, CrazzyCars.pk · {FOUNDER.city} · since {FOUNDER.foundedYear}
            </p>
            {FOUNDER_LINKS.length ? (
              <div className="mt-3">
                <LinkPills links={FOUNDER_LINKS} />
              </div>
            ) : null}
          </div>
        </header>

        <section className="mt-8 space-y-4 text-[15px] leading-relaxed text-[#333333]">
          {FOUNDER.intro.map((p) => (
            <p key={p.slice(0, 40)}>{p}</p>
          ))}
        </section>

        <Section title="My promise to you">
          <ul className="grid gap-4 sm:grid-cols-3">
            {FOUNDER.promises.map((p) => (
              <li key={p.title} className="rounded-lg border border-[#E5E5E5] p-4">
                <p className="font-semibold text-[#111111]">{p.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-[#555555]">{p.text}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Problem with an order? Tell me directly">
          <div className="rounded-lg bg-[#FFF5F5] p-5 text-[15px] leading-relaxed text-[#333333]">
            <p>
              Send your <strong>order number</strong> and a photo of the issue on WhatsApp{" "}
              <a
                href={`https://wa.me/${WA_DIGITS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#C41E1E] underline"
              >
                {WA_DISPLAY}
              </a>{" "}
              or email{" "}
              <a href={`mailto:${EMAIL}`} className="font-semibold text-[#C41E1E] underline">
                {EMAIL}
              </a>
              . Write <strong>“Complaint for owner”</strong> and it comes to me.
            </p>
            <p className="mt-2 text-sm text-[#6B7280]">
              Returns follow our{" "}
              <Link href="/returns-policy" className="underline">
                returns policy
              </Link>
              . We never ask for payment outside the accounts on{" "}
              <Link href="/advance-payment" className="underline">
                How to pay
              </Link>
              .
            </p>
          </div>
        </Section>

        <Section title="Visit our shop">
          <p className="text-[15px] leading-relaxed text-[#333333]">
            {STORE_NAP.streetAddress}, {STORE_NAP.addressLocality}, {STORE_NAP.addressRegion}
            {STORE_NAP.mapUrl ? (
              <>
                {" · "}
                <a
                  href={STORE_NAP.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#C41E1E] underline"
                >
                  Open in Google Maps
                </a>
              </>
            ) : null}
          </p>
        </Section>

        <Section title="CrazzyCars online">
          <LinkPills links={COMPANY_LINKS} />
        </Section>

        <p className="mt-12 text-sm text-[#6B7280]">
          More about the shop on our{" "}
          <Link href="/about" className="font-semibold text-[#C41E1E] underline">
            About page
          </Link>
          .
        </p>
      </article>
    </div>
  );
}
