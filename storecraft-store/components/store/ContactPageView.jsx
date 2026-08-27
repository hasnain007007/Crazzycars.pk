import Link from "next/link";
import ContactForm from "@/components/store/ContactForm";
import { NEEDS_INPUT } from "@/lib/homefyBrand";

const STORE = process.env.NEXT_PUBLIC_STORE_NAME || "Homefy.pk";

const DEFAULT_HERO = {
  badge: "Get In Touch",
  title: "We Would Love to Hear From You",
  subtitle: "Questions about an order, product advice, or just want to say hello? We are always happy to help.",
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

export default function ContactPageView({ contactPage, general = {} }) {
  const contact = contactPage && typeof contactPage === "object" ? contactPage : {};
  const hero = pick(contact.hero, DEFAULT_HERO);

  const email = String(contact.email || general.email || "support@homefy.pk").trim();
  const rawPhone = String(contact.phone || general.phone || "").trim();
  const phone = /fill in/i.test(rawPhone) ? "" : rawPhone;
  const whatsapp = digitsOnly(contact.whatsapp || phone);
  const responseTime = String(contact.responseTime || "We reply to all emails within 24 hours").trim();

  const address = contact.address && typeof contact.address === "object" ? contact.address : {};
  const addressLines = [address.line1, address.line2, [address.city, address.country].filter(Boolean).join(", ")]
    .map((l) => String(l || "").trim())
    .filter((l) => l && !/fill in/i.test(l));

  const hours = contact.hours && typeof contact.hours === "object" ? contact.hours : {};
  const hourLines = [hours.weekdays, hours.weekend, hours.closed]
    .map((l) => String(l || "").trim())
    .filter(Boolean);

  const social = contact.socialLinks && typeof contact.socialLinks === "object" ? contact.socialLinks : {};
  const socialEntries = [
    ["Instagram", social.instagram || ""],
    ["Facebook", social.facebook || ""],
    ["TikTok", social.tiktok || ""],
  ].map(([label, url]) => [label, String(url || "").trim()]);

  const faq = Array.isArray(contact.faq) ? contact.faq.filter((f) => f?.question) : [];

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
            <div style={{ width: 40, height: 3, background: "#C6633B", marginTop: 10, marginBottom: 24 }} />

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {email ? (
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase" }}>
                    Email
                  </p>
                  <a href={`mailto:${email}`} style={{ color: "#C6633B", fontSize: 15, textDecoration: "none" }}>
                    {email}
                  </a>
                </div>
              ) : null}

              {phone ? (
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase" }}>
                    Phone
                  </p>
                  <a href={`tel:${digitsOnly(phone)}`} style={{ color: "#111111", fontSize: 15, textDecoration: "none" }}>
                    {phone}
                  </a>
                </div>
              ) : (
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase" }}>
                    Phone
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: 14, color: "#6B7280" }}>{NEEDS_INPUT.phone}</p>
                </div>
              )}

              {whatsapp ? (
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase" }}>
                    WhatsApp
                  </p>
                  <a
                    href={`https://wa.me/${whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#25D366", fontSize: 15, fontWeight: 600, textDecoration: "none" }}
                  >
                    Chat on WhatsApp
                  </a>
                </div>
              ) : null}

              {addressLines.length > 0 ? (
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase" }}>
                    Address
                  </p>
                  {addressLines.map((line) => (
                    <p key={line} style={{ margin: "4px 0 0", fontSize: 15, color: "#374151", lineHeight: 1.5 }}>
                      {line}
                    </p>
                  ))}
                </div>
              ) : (
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase" }}>
                    Address
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: 14, color: "#6B7280" }}>{NEEDS_INPUT.address}</p>
                </div>
              )}

              {hourLines.length > 0 ? (
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase" }}>
                    Hours
                  </p>
                  {hourLines.map((line) => (
                    <p key={line} style={{ margin: "4px 0 0", fontSize: 14, color: "#374151" }}>
                      {line}
                    </p>
                  ))}
                </div>
              ) : null}

              {responseTime ? (
                <p style={{ margin: 0, fontSize: 13, color: "#6B7280", lineHeight: 1.5 }}>{responseTime}</p>
              ) : null}

              <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase" }}>
                    Follow {STORE}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
                    {socialEntries.map(([label, url]) =>
                      url ? (
                        <a
                          key={label}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: 14, color: "#C6633B", textDecoration: "none", fontWeight: 600 }}
                        >
                          {label}
                        </a>
                      ) : (
                        <span key={label} style={{ fontSize: 13, color: "#6B7280" }}>
                          {label}: {label === "Instagram" ? NEEDS_INPUT.instagram : `[NEEDS INPUT — ${label} URL]`}
                        </span>
                      )
                    )}
                  </div>
                </div>
            </div>
          </aside>

          <div>
            <h2 className="font-heading text-[24px] font-bold" style={{ color: "#111111", margin: "0 0 8px" }}>
              Send a message
            </h2>
            <p style={{ margin: "0 0 24px", fontSize: 14, color: "#6B7280" }}>
              Prefer email? Use the form and we will reply to the address you provide.
            </p>
            <ContactForm />
          </div>
        </div>
      </section>

      {faq.length > 0 ? (
        <section style={{ background: "#FAFAFA", padding: "28px 0", borderTop: "1px solid #E5E5E5" }}>
          <div className="store-container" style={{ maxWidth: 720 }}>
            <h2 className="font-heading text-xl font-bold md:text-[28px]" style={{ color: "#111111", margin: 0 }}>
              Common questions
            </h2>
            <div style={{ width: 48, height: 3, background: "#C6633B", marginTop: 10, marginBottom: 28 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {faq.map((item, i) => (
                <details key={`${item.question}-${i}`} style={{ borderBottom: "1px solid #E5E5E5", paddingBottom: 12 }}>
                  <summary
                    className="font-heading cursor-pointer list-none text-base font-semibold"
                    style={{ color: "#111111", padding: "8px 0" }}
                  >
                    {item.question}
                  </summary>
                  <p style={{ margin: "0 0 8px", fontSize: 14, lineHeight: 1.7, color: "#6B7280" }}>
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
            <p style={{ marginTop: 24, fontSize: 14, color: "#6B7280" }}>
              Looking for shipping or returns info?{" "}
              <Link href="/about" style={{ color: "#C6633B", fontWeight: 600, textDecoration: "none" }}>
                Visit our About page
              </Link>
              .
            </p>
          </div>
        </section>
      ) : null}

      <style>{`
        @media (max-width: 768px) {
          .contact-layout {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }
        }
      `}</style>
    </div>
  );
}
