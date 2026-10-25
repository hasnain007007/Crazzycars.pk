"use client";

import { useState } from "react";

export function OrderReviewForm({
  orderId,
  token,
  products = [],
  defaultName = "",
  defaultLocation = "",
  googleReviewUrl = "",
}) {
  const [productKey, setProductKey] = useState(() => {
    const first = products[0];
    return first ? `${first.productId || ""}|${first.slug || ""}` : "";
  });
  const [name, setName] = useState(defaultName);
  const [location, setLocation] = useState(defaultLocation);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    const selected = products.find((p) => `${p.productId || ""}|${p.slug || ""}` === productKey);
    if (!selected) {
      setError("Please choose a product.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          token,
          productId: selected.productId || undefined,
          productSlug: selected.slug || undefined,
          name,
          location,
          rating,
          title,
          body,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setError(data.error || "Could not submit review.");
        return;
      }
      setDone(true);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    const gbp = String(googleReviewUrl || "").trim();
    return (
      <div
        style={{
          marginTop: 28,
          padding: 20,
          borderRadius: 10,
          border: "1px solid #86efac",
          background: "#f0fdf4",
          color: "#166534",
        }}
      >
        <strong>Thank you!</strong> Your review is pending approval and will appear on the product
        page once moderated.
        {gbp ? (
          <p style={{ margin: "16px 0 0" }}>
            <a
              href={gbp}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                padding: "10px 16px",
                borderRadius: 8,
                background: "#111",
                color: "#fff",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Also review us on Google
            </a>
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} style={{ marginTop: 28, display: "grid", gap: 14 }}>
      <label style={{ display: "grid", gap: 6, fontSize: 14, fontWeight: 600 }}>
        Product
        <select
          value={productKey}
          onChange={(e) => setProductKey(e.target.value)}
          required
          style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd" }}
        >
          {products.map((p) => (
            <option key={`${p.productId}|${p.slug}`} value={`${p.productId || ""}|${p.slug || ""}`}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: "grid", gap: 6, fontSize: 14, fontWeight: 600 }}>
        Your name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd" }}
        />
      </label>

      <label style={{ display: "grid", gap: 6, fontSize: 14, fontWeight: 600 }}>
        City (optional)
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd" }}
        />
      </label>

      <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
        <legend style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Rating</legend>
        <div style={{ display: "flex", gap: 8 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={`${n} stars`}
              style={{
                fontSize: 22,
                lineHeight: 1,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: n <= rating ? "#C41E1E" : "#d1d5db",
              }}
            >
              ★
            </button>
          ))}
        </div>
      </fieldset>

      <label style={{ display: "grid", gap: 6, fontSize: 14, fontWeight: 600 }}>
        Title (optional)
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd" }}
        />
      </label>

      <label style={{ display: "grid", gap: 6, fontSize: 14, fontWeight: 600 }}>
        Your review
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          minLength={10}
          rows={4}
          placeholder="Fitment, quality, delivery — whatever helps the next buyer."
          style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd", resize: "vertical" }}
        />
      </label>

      {error ? (
        <p style={{ margin: 0, color: "#b91c1c", fontSize: 14 }} role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        style={{
          padding: "12px 18px",
          borderRadius: 8,
          border: "none",
          background: "#C41E1E",
          color: "#fff",
          fontWeight: 700,
          cursor: submitting ? "wait" : "pointer",
        }}
      >
        {submitting ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}
