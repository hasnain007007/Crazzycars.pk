import Link from "next/link";

export default function BlogNotFound() {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "100px 24px",
        maxWidth: 500,
        margin: "0 auto",
      }}
    >
      <div style={{ fontSize: 64, marginBottom: 16 }}>📝</div>
      <h1
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: "#E8E8E8",
          marginBottom: 12,
        }}
      >
        Blog Not Found
      </h1>
      <p
        style={{
          color: "#B0B0B0",
          marginBottom: 28,
          lineHeight: 1.6,
        }}
      >
        The blog entry you are looking for does not exist or may have been removed.
      </p>
      <Link
        href="/blogs"
        style={{
          display: "inline-block",
          background: "#D4AF37",
          color: "#0A0A0A",
          padding: "12px 28px",
          borderRadius: 50,
          textDecoration: "none",
          fontWeight: 600,
          fontSize: 15,
        }}
      >
        ← Back to Blog
      </Link>
    </div>
  );
}
