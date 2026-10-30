import Link from "next/link";
import ContactForm from "@/components/store/ContactForm";
import { BRAND_NAME } from "@/lib/brand";
import { resolveContactHourLines } from "@/lib/contactHours";

const DEFAULT_HERO = {
  badge: "Get In Touch",
  title: `Contact ${BRAND_NAME} – Gujranwala`,
  subtitle:
    "Questions about an order, product advice, or just want to say hello? We are always happy to help.",
};

function pick(obj, defaults) {
  if (!obj || typeof obj !== "object") return defaults;
  const out = { ...defaults };
  for (const key of Object.keys(defaults)) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) out[key] = v;
  }
  return out;
}

function digitsOnly(s) {
  return String(s || "").replace(/\D/g, "");
}

/**
 * Contact page — address / hours / map from the same settings used for AutoPartsStore JSON-LD.
 */
export default function ContactPageView({ contactPage, general = {}, localBusiness = {} }) {
  const contact = contactPage && typeof contactPage === "object" ? contactPage : {};
  const hero = pick(contact.hero, DEFAULT_HERO);
  // Canonical contact H1 (CMS may still hold the old marketing title).
  const cmsTitle = String(contact?.hero?.title || "").trim();
  hero.title = "Contact CrazzyCars.pk – Gujranwala";
  if (cmsTitle && !/contact crazzycars/i.test(cmsTitle)) {
    hero.subtitle = cmsTitle;
  } else if (!String(hero.subtitle || "").trim()) {
    hero.subtitle = DEFAULT_HERO.subtitle;
  }

  const email = String(contact.email || general.email || "").trim();
  const phone = String(contact.phone || general.phone || "").trim();
  const whatsapp = digitsOnly(contact.whatsapp || localBusiness.whatsapp || phone);
  const responseTime = String(contact.responseTime || "We reply to all emails within 24 hours").trim();

  const street =
    String(localBusiness.streetAddress || "").trim() ||
    String(contact.address?.line1 || "").trim();
  const line2 = String(contact.address?.line2 || "").trim();
  const city =
    String(localBusiness.addressLocality || "").trim() ||
    String(contact.address?.city || "Gujranwala").trim() ||
    "Gujranwala";
  const region = String(localBusiness.addressRegion || "Punjab").trim() || "Punjab";
  const country =
    String(localBusiness.addressCountry || "").trim() ||
    String(contact.address?.country || "Pakistan").trim() ||
    "Pakistan";
  const postal = String(localBusiness.postalCode || "").trim();
  const mapUrl = String(localBusiness.mapUrl || "").trim();

  // Avoid "Gujranwala Gujranwala" when street already names the city.
  const streetClean =
    street && city && new RegExp(`\\b${city}\\b`, "i").test(street) && !/\d/.test(street)
      ? ""
      : street;
  const cityLine = [city, region, postal].filter(Boolean).join(", ");
  const addressLines = [
    streetClean,
    line2,
    cityLine,
    country && country !== "PK" ? country : country === "PK" ? "Pakistan" : "",
  ]
    .map((l) => String(l || "").trim())
    .filter(Boolean);

  // Admin Settings → contactPage.hours only (never invent Mon–Sat 10–18).
  const hourLines = resolveContactHourLines(contact.hours);

  const social = contact.socialLinks && typeof contact.socialLinks === "object" ? contact.socialLinks : {};
  const socialEntries = [
    ["Instagram", social.instagram],
    ["Facebook", social.facebook],
    ["TikTok", social.tiktok],
    ["Twitter / X", social.twitter],
  ].filter(([, url]) => String(url || "").trim());

  const faq = Array.isArray(contact.faq) ? contact.faq.filter((f) => f?.question) : [];
  const googleReviewUrl = String(
    general.googleReviewUrl || localBusiness.googleReviewUrl || ""
  ).trim();

  return (
    <div style={{ background: "#FFFFFF", minHeight: "60vh" }}>
      <section
        style={{
          background: "linear-gradient(180deg, #FAFAFA 0%, #FFFFFF 100%)",
          borderBottom: "1px solid #E5E5E5",
          padding: "28px 0 24px",
        }}
      >
        <div className="store-container" style={{ maxWidth: 900, textAlign: "center" }}>
          {hero.badge ? (
            <span
              className="mb-4 inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide"
              style={{ background: "#FFF8E6", color: "#B45309" }}
            >
              {hero.badge}
            </span>
          ) : null}
          <h1
            className="font-heading font-bold leading-tight"
            style={{ color: "#111111", fontSize: "clamp(22px, 6vw, 48px)", margin: "12px 0 0" }}
          >
            {hero.title}
          </h1>
          {hero.subtitle ? (
            <p
              style={{
                margin: "16px auto 0",
                maxWidth: 640,
                fontSize: 16,
                lineHeight: 1.7,
                color: "#6B7280",
              }}
            >
              {hero.subtitle}
            </p>
          ) : null}
        </div>
      </section>

      <section style={{ padding: "56px 0 40px" }} className="contact-body-section">
        <div
          className="store-container contact-layout"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.2fr)",
            gap: 48,
            alignItems: "start",
          }}
        >
          <aside>
            <h2 className="font-heading text-[24px] font-bold" style={{ color: "#111111", margin: 0 }}>
              Contact details
            </h2>
            <div style={{ width: 40, height: 3, background: "#C41E1E", marginTop: 10, marginBottom: 24 }} />

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {email ? (
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase" }}>
                    Email
                  </p>
                  <a href={`mailto:${email}`} style={{ color: "#C41E1E", fontSize: 15, textDecoration: "none" }}>
                    {email}
                  </a>
                </div>
              ) : null}
              {googleReviewUrl ? (
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase" }}>
                    Reviews
                  </p>
                  <a href="/review" style={{ color: "#C41E1E", fontSize: 15, textDecoration: "none" }}>
                    Review us on Google
                  </a>
                </div>
              ) : null}
              {phone ? (
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase" }}>
                    Phone
                  </p>
                  <a href={`tel:${digitsOnly(phone)}`} style={{ color: "#111", fontSize: 15, textDecoration: "none" }}>
                    {phone}
                  </a>
                </div>
              ) : null}
              {whatsapp ? (
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase" }}>
                    WhatsApp
                  </p>
                  <a
                    href={`https://wa.me/${whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#16A34A", fontSize: 15, textDecoration: "none" }}
                  >
                    {whatsapp}
                  </a>
                </div>
              ) : null}

              {addressLines.length ? (
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase" }}>
                    Address
                  </p>
                  <address style={{ fontStyle: "normal", color: "#374151", fontSize: 15, lineHeight: 1.6 }}>
                    {addressLines.map((line) => (
                      <div key={line}>{line}</div>
                    ))}
                  </address>
                  {mapUrl ? (
                    <p style={{ margin: "8px 0 0" }}>
                      <a href={mapUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#C41E1E" }}>
                        Open in Google Maps
                      </a>
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase" }}>
                  Hours
                </p>
                {hourLines.length ? (
                  <ul style={{ margin: "6px 0 0", padding: 0, listStyle: "none", color: "#374151", fontSize: 15 }}>
                    {hourLines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                ) : null}
              </div>

              {responseTime ? (
                <p style={{ margin: 0, fontSize: 14, color: "#6B7280" }}>{responseTime}</p>
              ) : null}

              {socialEntries.length ? (
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase" }}>
                    Social
                  </p>
                  <ul style={{ margin: "6px 0 0", padding: 0, listStyle: "none" }}>
                    {socialEntries.map(([label, url]) => (
                      <li key={label}>
                        <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "#C41E1E" }}>
                          {label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </aside>

          <div>
            <h2 className="font-heading text-[24px] font-bold" style={{ color: "#111111", margin: 0 }}>
              Send a message
            </h2>
            <div style={{ width: 40, height: 3, background: "#C41E1E", marginTop: 10, marginBottom: 24 }} />
            <ContactForm />
          </div>
        </div>
      </section>

      {faq.length ? (
        <section className="store-container" style={{ paddingBottom: 56, maxWidth: 900 }}>
          <h2 className="font-heading text-[22px] font-bold" style={{ color: "#111" }}>
            Contact FAQ
          </h2>
          <dl>
            {faq.map((item) => (
              <div key={item.question} style={{ marginTop: 16 }}>
                <dt style={{ fontWeight: 700 }}>{item.question}</dt>
                <dd style={{ margin: "4px 0 0", color: "#4B5563" }}>{item.answer}</dd>
              </div>
            ))}
          </dl>
          <p style={{ marginTop: 16, fontSize: 14 }}>
            See also our <Link href="/faq">store FAQ</Link>.
          </p>
        </section>
      ) : null}
    </div>
  );
}
