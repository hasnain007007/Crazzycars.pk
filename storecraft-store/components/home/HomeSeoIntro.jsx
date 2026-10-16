import Link from "next/link";
import { getHomepageIntroCopy, getHomepageFaqItems } from "@/lib/content/homepageIntro";
import { faqPageJsonLd } from "@/lib/seo/keywordStrategyFaqs";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { BRAND_NAME } from "@/lib/brand";

/**
 * Server-rendered homepage intro + FAQ (no client JS required for the copy).
 * Optional admin override: settings.homepageIntroHtml (trusted HTML string).
 */
export default function HomeSeoIntro({ introHtml = "" }) {
  const copy = getHomepageIntroCopy();
  const faqs = getHomepageFaqItems();
  const faqLd = faqPageJsonLd(faqs);

  return (
    <section className="home-seo-intro store-container" aria-labelledby="home-seo-h1">
      <h1 id="home-seo-h1" className="home-seo-intro__h1">
        {copy.h1}
      </h1>

      {introHtml && String(introHtml).trim() ? (
        <div
          className="home-seo-intro__body prose-store"
          dangerouslySetInnerHTML={{ __html: String(introHtml) }}
        />
      ) : (
        <div className="home-seo-intro__body">
          {copy.paragraphs.map((p) => (
            <p key={p.slice(0, 48)}>{p}</p>
          ))}
          <p className="home-seo-intro__links">
            Popular destinations:{" "}
            {copy.links.map((l, i) => (
              <span key={l.href}>
                {i > 0 ? " · " : null}
                <Link href={l.href}>{l.label}</Link>
              </span>
            ))}
            .
          </p>
        </div>
      )}

      <div className="home-seo-intro__faq">
        <h2 className="home-seo-intro__faq-title">Frequently asked questions</h2>
        <dl className="home-seo-intro__faq-list">
          {faqs.map((item) => (
            <div key={item.question} className="home-seo-intro__faq-item">
              <dt>{item.question}</dt>
              <dd>{item.answer}</dd>
            </div>
          ))}
        </dl>
        <p className="home-seo-intro__faq-more">
          More answers on our <Link href="/faq">FAQ page</Link> · {BRAND_NAME}
        </p>
      </div>

      {faqLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(faqLd) }}
        />
      ) : null}
    </section>
  );
}
