/**
 * Visible FAQ blocks + pairs used for FAQPage JSON-LD elsewhere.
 */
export function FaqSection({ title = "Frequently asked questions", items = [] }) {
  const faqs = (Array.isArray(items) ? items : [])
    .map((f) => ({
      question: String(f?.question || "").trim(),
      answer: String(f?.answer || "").trim(),
    }))
    .filter((f) => f.question && f.answer);
  if (!faqs.length) return null;

  return (
    <section
      className="store-container"
      aria-labelledby="faq-section-heading"
      style={{ padding: "28px 16px 48px" }}
    >
      <h2
        id="faq-section-heading"
        style={{
          margin: "0 0 16px",
          fontFamily: "var(--font-heading), Rajdhani, sans-serif",
          fontSize: 22,
          fontWeight: 700,
          color: "#111",
        }}
      >
        {title}
      </h2>
      <div style={{ display: "grid", gap: 10 }}>
        {faqs.map((f) => (
          <details
            key={f.question}
            style={{
              border: "1px solid #E5E5E5",
              borderRadius: 10,
              padding: "12px 14px",
              background: "#FAFAFA",
            }}
          >
            <summary
              style={{
                cursor: "pointer",
                fontWeight: 650,
                fontSize: 15,
                color: "#111",
                listStylePosition: "outside",
              }}
            >
              {f.question}
            </summary>
            <p style={{ margin: "10px 0 0", fontSize: 14, lineHeight: 1.65, color: "#444" }}>
              {f.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
