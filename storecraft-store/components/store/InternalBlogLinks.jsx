import Link from "next/link";

/**
 * Compact internal-link block for Related guides / From the blog.
 * @param {{ title: string, links: { href: string, title: string }[] }} props
 */
export function InternalBlogLinks({ title, links }) {
  const items = Array.isArray(links) ? links.filter((l) => l?.href && l?.title) : [];
  if (!items.length) return null;
  return (
    <nav
      className="store-container"
      aria-label={title}
      style={{ padding: "20px 16px 8px", maxWidth: 1100, margin: "0 auto" }}
    >
      <h2
        style={{
          fontSize: 18,
          fontWeight: 700,
          margin: "0 0 10px",
          color: "#111",
          fontFamily: "var(--font-rajdhani), sans-serif",
        }}
      >
        {title}
      </h2>
      <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7, color: "#333" }}>
        {items.map((l) => (
          <li key={l.href}>
            <Link href={l.href} style={{ color: "#D72323", textDecoration: "none", fontWeight: 500 }}>
              {l.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
