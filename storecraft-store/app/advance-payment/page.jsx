import Link from "next/link";
import CopyButton from "@/components/store/CopyButton";
import { paymentQrFor } from "@/config/payment-qr";
import { STORE_CONTACT } from "@/config/store-policy";
import { dbConnect } from "@/lib/db";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { buildStoreSettingsPayload, toPublicClientSettings } from "@/lib/normalizeStoreSettings";
import { getEnabledPakistaniMethods } from "@/lib/pakistaniPaymentMethods";
import { buildPageMetadata } from "@/lib/pageMetadata";
import { advancePaymentCopy } from "@/lib/storePolicyCopy";

export const revalidate = 60;

export const metadata = buildPageMetadata({
  title: "Advance Payment: How to Pay",
  description:
    "Cash on Delivery booking advance at CrazzyCars.pk: amounts by order total, our official JazzCash, Raast QR and bank accounts, and how to send your payment screenshot.",
  path: "/advance-payment",
});

const METHOD_NAMES = {
  jazzcash: "JazzCash",
  easypaisa: "Easypaisa",
  bankTransfer: "Bank transfer",
  hbl: "HBL",
  meezan: "Meezan Bank",
  ubl: "UBL",
};

/** Accent colour per payment brand (card top stripe and badge). */
const BRAND_ACCENT = {
  jazzcash: "#e4002b",
  easypaisa: "#00a651",
  bankTransfer: "#d71e28",
  meezan: "#6f2c91",
  hbl: "#00775a",
  ubl: "#0055a4",
};

/** Official accounts from admin Settings → Payments (only methods with an account number). */
async function loadAccounts() {
  try {
    await dbConnect();
    const raw =
      (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean()) ||
      (await Settings.findOne({}).lean()) ||
      {};
    const pub = toPublicClientSettings(buildStoreSettingsPayload(raw), { includePaymentAccounts: true });
    return getEnabledPakistaniMethods(pub.pakistaniPaymentMethods)
      .filter((m) => m.key !== "cod" && (m.accountNumber || m.iban))
      .map((m) => {
        const qr = paymentQrFor(m.key, m);
        return {
          key: m.key,
          name: m.label || METHOD_NAMES[m.key] || m.key,
          type: m.key === "jazzcash" || m.key === "easypaisa" ? "Mobile wallet" : "Bank account",
          accent: BRAND_ACCENT[m.key] || "#c41e1e",
          qr,
          rows: [
            (m.accountTitle || m.accountName) && { label: "Account title", value: m.accountTitle || m.accountName },
            m.accountNumber && { label: "Account number", value: m.accountNumber, copy: true },
            m.iban && { label: "IBAN", value: m.iban, copy: true },
            qr?.tillId && { label: "Till ID", value: qr.tillId, copy: true },
          ].filter(Boolean),
        };
      });
  } catch (e) {
    console.error("advance-payment accounts:", e);
    return [];
  }
}

export default async function AdvancePaymentPage() {
  const c = advancePaymentCopy();
  const accounts = await loadAccounts();
  const hasQr = accounts.some((a) => a.qr);
  const wa = STORE_CONTACT.phoneE164.replace(/\D/g, "");
  const waLink = `https://wa.me/${wa}?text=${encodeURIComponent(
    "Hi CrazzyCars.pk, I've sent the advance for order #____. Screenshot attached."
  )}`;
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: c.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <div className="adv-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <nav className="adv-crumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link> <span aria-hidden>/</span> <span>{c.pageTitle}</span>
      </nav>

      <header className="adv-hero">
        <span className="adv-hero__badge">🔒 Official CrazzyCars.pk payment page</span>
        <h1>{c.pageTitle}</h1>
        <p>{c.pageIntro}</p>
        <div className="adv-hero__chips">
          {c.tiers.map((t) => (
            <span key={t.title} className="adv-hero__chip">
              <strong>{t.value}</strong>
              <small>{t.title.replace(/^Order /, "")}</small>
            </span>
          ))}
          <span className="adv-hero__chip adv-hero__chip--green">
            <strong>{c.prepaid.value}</strong>
            <small>{c.prepaid.title}</small>
          </span>
        </div>
        <div className="adv-hero__actions">
          <a href="#adv-accounts" className="adv-btn adv-btn--light">
            {hasQr ? "Pay by QR or account" : "See payment accounts"} ↓
          </a>
          <a href={waLink} target="_blank" rel="noopener noreferrer" className="adv-btn adv-btn--ghost">
            📲 Send screenshot
          </a>
        </div>
      </header>

      <section className="adv-section" aria-labelledby="adv-tiers-h">
        <p className="adv-eyebrow">Step 1</p>
        <h2 id="adv-tiers-h">How much to send</h2>
        <div className="adv-tiers">
          {c.tiers.map((t) => (
            <div key={t.title} className="adv-tier">
              <p className="adv-tier__title">{t.title}</p>
              <p className="adv-tier__value">{t.value}</p>
              {t.note ? <p className="adv-tier__note">{t.note}</p> : null}
            </div>
          ))}
        </div>
        <p className="adv-muted">{c.higherAdvanceNote}</p>
        <div className="adv-tier adv-tier--prepaid">
          <div>
            <p className="adv-tier__title">{c.prepaid.title}</p>
            <p className="adv-tier__value">{c.prepaid.value}</p>
          </div>
          <p className="adv-tier__note">{c.prepaid.note}</p>
        </div>
        <p className="adv-deducted">✓ {c.deductedNote}</p>
      </section>

      <section className="adv-section" id="adv-accounts" aria-labelledby="adv-accounts-h">
        <p className="adv-eyebrow">Step 2</p>
        <h2 id="adv-accounts-h">Pay by QR or to our official account</h2>
        {hasQr ? (
          <p className="adv-lead">
            Scan a QR with any banking app, JazzCash or Easypaisa (Raast). Paying from this same phone? Tap{" "}
            <strong>Save QR</strong>, then in your app choose <em>Scan QR → upload from gallery</em>.
          </p>
        ) : null}
        {accounts.length ? (
          <div className="adv-accounts">
            {accounts.map((a) => (
              <article key={a.key} className="adv-account" style={{ "--acc": a.accent }}>
                <div className="adv-account__head">
                  <h3 className="adv-account__name">{a.name}</h3>
                  <span className="adv-account__type">{a.type}</span>
                </div>
                {a.qr ? (
                  <div className="adv-qr">
                    {/* eslint-disable-next-line @next/next/no-img-element -- static QR; must stay pixel-sharp */}
                    <img
                      src={a.qr.src}
                      alt={a.qr.alt}
                      width={a.qr.width}
                      height={a.qr.height}
                      loading="lazy"
                      decoding="async"
                      className="adv-qr__img"
                    />
                    <div className="adv-qr__actions">
                      <a href={a.qr.src} download className="adv-copy">
                        Save QR
                      </a>
                      <a href={a.qr.src} target="_blank" rel="noopener noreferrer" className="adv-copy">
                        Enlarge
                      </a>
                    </div>
                  </div>
                ) : null}
                <dl>
                  {a.rows.map((r) => (
                    <div key={r.label} className="adv-account__row">
                      <dt>{r.label}</dt>
                      <dd>
                        <span className="adv-account__value">{r.value}</span>
                        {r.copy ? <CopyButton value={r.value} /> : null}
                      </dd>
                    </div>
                  ))}
                </dl>
                {a.qr?.tillHint ? <p className="adv-account__hint">{a.qr.tillHint}</p> : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="adv-muted">Account details are shown at checkout after you choose a payment method.</p>
        )}
        <p className="adv-safety">⚠️ {c.safety}</p>
      </section>

      <section className="adv-section" aria-labelledby="adv-steps">
        <p className="adv-eyebrow">Step 3</p>
        <h2 id="adv-steps">Send the screenshot and you&apos;re done</h2>
        <ol className="adv-steps">
          {c.steps.map((s, i) => (
            <li key={i}>
              <span className="adv-steps__n">{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
        <div className="adv-wa-box">
          <div>
            <p className="adv-wa-box__title">Paid? Send us the screenshot</p>
            <p className="adv-muted">Include your order number. We confirm on WhatsApp and dispatch your order.</p>
          </div>
          <a className="adv-wa" href={waLink} target="_blank" rel="noopener noreferrer">
            📲 Send on WhatsApp
          </a>
        </div>
      </section>

      <section className="adv-section" aria-labelledby="adv-faq">
        <h2 id="adv-faq">Questions</h2>
        <div className="adv-faq">
          {c.faq.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
        <p className="adv-muted">
          Need help? WhatsApp {STORE_CONTACT.whatsapp}. See also our <Link href="/shipping-policy">shipping policy</Link>{" "}
          and <Link href="/returns-policy">returns policy</Link>.
        </p>
      </section>
    </div>
  );
}
