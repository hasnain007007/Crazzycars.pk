import Link from "next/link";
import CopyButton from "@/components/store/CopyButton";
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
    "How the Cash on Delivery booking advance works at CrazzyCars.pk, our official JazzCash and bank accounts, and how to send your payment screenshot.",
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
      .map((m) => ({
        key: m.key,
        name: m.key === "bankTransfer" && m.bankName ? `Bank ${m.bankName}`.replace(/^Bank Bank /, "Bank ") : m.label || METHOD_NAMES[m.key] || m.key,
        type: m.key === "jazzcash" || m.key === "easypaisa" ? "Mobile wallet" : "Bank account",
        rows: [
          m.accountNumber && { label: "Account number", value: m.accountNumber, copy: true },
          (m.accountTitle || m.accountName) && { label: "Account title", value: m.accountTitle || m.accountName },
          m.iban && { label: "IBAN", value: m.iban, copy: true },
        ].filter(Boolean),
      }));
  } catch (e) {
    console.error("advance-payment accounts:", e);
    return [];
  }
}

export default async function AdvancePaymentPage() {
  const c = advancePaymentCopy();
  const accounts = await loadAccounts();
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
        <span className="adv-hero__badge">🔒 Official payment page</span>
        <h1>{c.pageTitle}</h1>
        <p>{c.pageIntro}</p>
      </header>

      <section className="adv-section" aria-labelledby="adv-tiers-h">
        <h2 id="adv-tiers-h">Booking advance for Cash on Delivery</h2>
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
      </section>
      <div className="adv-tier adv-tier--prepaid">
        <div>
          <p className="adv-tier__title">{c.prepaid.title}</p>
          <p className="adv-tier__value">{c.prepaid.value}</p>
        </div>
        <p className="adv-tier__note">{c.prepaid.note}</p>
      </div>
      <p className="adv-deducted">✓ {c.deductedNote}</p>

      <section className="adv-section" aria-labelledby="adv-accounts">
        <h2 id="adv-accounts">Our official accounts</h2>
        {accounts.length ? (
          <div className="adv-accounts">
            {accounts.map((a) => (
              <div key={a.key} className="adv-account">
                <div className="adv-account__head">
                  <p className="adv-account__name">{a.name}</p>
                  <span className="adv-account__type">{a.type}</span>
                </div>
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
              </div>
            ))}
          </div>
        ) : (
          <p className="adv-muted">Account details are shown at checkout after you choose a payment method.</p>
        )}
        <p className="adv-safety">⚠️ {c.safety}</p>
      </section>

      <section className="adv-section" aria-labelledby="adv-steps">
        <h2 id="adv-steps">How it works</h2>
        <ol className="adv-steps">
          {c.steps.map((s, i) => (
            <li key={i}>
              <span className="adv-steps__n">{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
        <a className="adv-wa" href={waLink} target="_blank" rel="noopener noreferrer">
          📲 Send screenshot on WhatsApp
        </a>
        <p className="adv-muted">Questions? WhatsApp us at {STORE_CONTACT.whatsapp}.</p>
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
          See also our <Link href="/shipping-policy">shipping policy</Link> and{" "}
          <Link href="/returns-policy">returns policy</Link>.
        </p>
      </section>
    </div>
  );
}
