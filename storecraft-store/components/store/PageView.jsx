import Link from "next/link";
import InfoBar from "./InfoBar";
import { sanitizePageHtml } from "@/lib/sanitizeHtml";

export default function PageView({ page, slug }) {
  if (!page) return null;
  const safeContent = sanitizePageHtml(page.content);

  return (
    <div
      style={{
        background: "#FFFFFF",
        minHeight: "100vh",
      }}
    >
      <div
        style={{
          background: "#F8F8F8",
          borderBottom: "1px solid #E5E5E5",
          padding: "12px 24px",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: "#888888",
          }}
        >
          <a
            href="/"
            style={{
              color: "#D72323",
              textDecoration: "none",
              fontSize: 12,
            }}
          >
            Home
          </a>
          <span style={{ color: "#CCCCCC" }}>&rsaquo;</span>
          <span style={{ color: "#888888" }}>{page.title}</span>
        </div>
      </div>

      <div
        className="pageview-grid store-container"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "32px 24px",
          display: "grid",
          gridTemplateColumns: "220px 1fr",
          gap: 40,
          alignItems: "start",
        }}
      >
        <div className="pageview-sidebar">
          <InfoBar currentSlug={slug || page.slug} />
        </div>

        <div className="pageview-content">
          <h1
            style={{
              fontSize: "clamp(22px, 3vw, 32px)",
              fontWeight: 700,
              color: "#111111",
              margin: "0 0 8px",
              letterSpacing: "0.03em",
              textTransform: "uppercase",
              lineHeight: 1.2,
            }}
          >
            {page.title}
          </h1>

          <div
            style={{
              width: 48,
              height: 2,
              background: "#D72323",
              marginBottom: 28,
            }}
          />

          {safeContent ? (
            <div
              className="article-content"
              style={{
                fontSize: 15,
                lineHeight: 1.9,
                color: "#444444",
              }}
              dangerouslySetInnerHTML={{
                __html: safeContent,
              }}
            />
          ) : (
            <p
              style={{
                color: "#888888",
                fontSize: 15,
              }}
            >
              No content available yet.
            </p>
          )}

          <div
            style={{
              marginTop: 48,
              paddingTop: 24,
              borderTop: "1px solid #E5E5E5",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <a
              href="/"
              style={{
                color: "#D72323",
                textDecoration: "none",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              &larr; Back to Home
            </a>
            <a
              href="/shop"
              style={{
                padding: "10px 24px",
                background: "#111111",
                color: "#FFFFFF",
                textDecoration: "none",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                borderRadius: 2,
              }}
            >
              Shop Collection &rarr;
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
