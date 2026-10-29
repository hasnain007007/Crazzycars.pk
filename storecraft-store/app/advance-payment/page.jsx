import Link from "next/link";
import CopyButton from "@/components/store/CopyButton";
import { paymentQrFor } from "@/config/payment-qr";
import { STORE_CONTACT } from "@/config/store-policy";
import { PREPAID_DISCOUNT_PERCENT } from "@/config/checkout-money";
import { dbConnect } from "@/lib/db";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { buildStoreSettingsPayload, toPublicClientSettings } from "@/lib/normalizeStoreSettings";
import { getEnabledPakistaniMethods } from "@/lib/pakistaniPaymentMethods";
import { buildPageMetadata } from "@/lib/pageMetadata";
import { advancePaymentCopy } from "@/lib/storePolicyCopy";

export const revalidate = 60;

export const metadata = buildPageMetadata({
  title: "Advance Payment: How to Pay",
  // Keep 140–158 chars for SERP snippets (F5).
  description:
    "COD booking advance at CrazzyCars.pk: amounts by order total, JazzCash, Raast QR and bank details, plus how to send your payment screenshot.",
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

/** Official accounts + prepaid % from admin Settings (SSR — never client-only). */
async function loadPaymentPageData() {
  try {
    await dbConnect();
    const raw =
      (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean()) ||
      (await Settings.findOne({}).lean()) ||
      {};
    const full = buildStoreSettingsPayload(raw);
    const pub = toPublicClientSettings(full, { includePaymentAccounts: true });
    const prepaidPercent =
      Number(full.storePayment?.advancePaymentDiscountPercent) || PREPAID_DISCOUNT_PERCENT;
    const accounts = getEnabledPakistaniMethods(pub.pakistaniPaymentMethods)
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
            (m.accountTitle || m.accountName) && {
              label: "Account title",
              value: m.accountTitle || m.accountName,
            },
            m.accountNumber && { label: "Account number", value: m.accountNumber, copy: true },
            m.iban && { label: "IBAN", value: m.iban, copy: true },
            qr?.tillId && { label: "Till ID", value: qr.tillId, copy: true },
          ].filter(Boolean),
        };
      });
    return { accounts, prepaidPercent };
  } catch (e) {
    console.error("advance-payment accounts:", e);
    return { accounts: [], prepaidPercent: PREPAID_DISCOUNT_PERCENT };
  }
}

export default async function AdvancePaymentPage() {
  const { accounts, prepaidPercent } = await loadPaymentPageData();
  const c = advancePaymentCopy({
    prepaidPercent,
    hasAccounts: accounts.length > 0,
  });
  const hasQr = accounts.some((a) => a.qr);
  const wa = STORE_CONTACT.phoneE164.replace(/\D/g, "");
  const waLink = `https://wa.me/${wa}?text=${encodeURIComponent(
    "Hi CrazzyCars.pk, I've sent the advance for order #____. Screenshot attached."
  )}`;
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: c.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="adv-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <nav className="adv-crumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link> / <span>{c.pageTitle}</span>
      </nav>

      <header className="adv-head">
        <h1>{c.pageTitle}</h1>
        <p>{c.pageIntro}</p>
        <p className="adv-official">This is the official CrazzyCars.pk payment page.</p>
      </header>

      <section className="adv-section" aria-labelledby="adv-amounts">
        <h2 id="adv-amounts">
          <span>1.</span>How much to send
        </h2>
        <table className="adv-table">
          <thead>
            <tr>
              <th scope="col">Order total</th>
              <th scope="col">Booking advance</th>
            </tr>
          </thead>
          <tbody>
            {c.tiers.map((t) => (
              <tr key={t.title}>
                <td>{t.title.replace(/^Order /, "").replace(/^under/, "Under")}</td>
                <td>
                  <strong>{t.value}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="adv-note">{c.higherAdvanceNote}</p>
        <p className="adv-note">
          <strong>Paying in full?</strong> {c.prepaid.note} You save {c.prepaid.value.replace(" OFF", "")}.
        </p>
        <p className="adv-note">{c.deductedNote}</p>
      </section>

      <section className="adv-section" id="adv-accounts" aria-labelledby="adv-accounts-h">
        <h2 id="adv-accounts-h">
          <span>2.</span>Where to send it
        </h2>
        {hasQr ? (
          <p className="adv-note" style={{ marginTop: 0, marginBottom: 14 }}>
            Scan a QR code with your banking app, JazzCash or Easypaisa, or send to the account details. On the same
            phone, save the QR and upload it in your app&apos;s Scan QR screen.
          </p>
        ) : null}
        {accounts.length ? (
          <div className="adv-accounts">
            {accounts.map((a) => (
              <div key={a.key} className="adv-account">
                <h3>{a.name}</h3>
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
                    />
                    <p className="adv-qr__links">
                      <a href={a.qr.src} download>
                        Save QR
                      </a>{" "}
                      ·{" "}
                      <a href={a.qr.src} target="_blank" rel="noopener noreferrer">
                        Open full size
                      </a>
                    </p>
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
              </div>
            ))}
          </div>
        ) : (
          <p className="adv-muted">
            Account details are shown at checkout after you choose a payment method.
          </p>
        )}
        <p className="adv-important">
          <strong>Important:</strong> {c.safety}
        </p>
      </section>

      <section className="adv-section" aria-labelledby="adv-steps">
        <h2 id="adv-steps">
          <span>3.</span>Send us the screenshot
        </h2>
        <ol className="adv-steps">
          {c.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
        <a className="adv-wa" href={waLink} target="_blank" rel="noopener noreferrer">
          Send screenshot on WhatsApp
        </a>
        <p className="adv-muted">WhatsApp: {STORE_CONTACT.whatsapp}</p>
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
