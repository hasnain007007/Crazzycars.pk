"use client";

import { useState } from "react";

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  border: "1px solid #E5E5E5",
  borderRadius: 8,
  fontSize: 14,
  color: "#111111",
  background: "#FFFFFF",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const labelStyle = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#374151",
  marginBottom: 6,
};

export default function ContactForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    orderNumber: "",
    message: "",
  });
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to send message. Please try again.");
        setStatus("error");
        return;
      }
      setStatus("success");
      setForm({ name: "", email: "", subject: "", orderNumber: "", message: "" });
    } catch {
      setError("Network error. Please try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div
        style={{
          padding: "28px 24px",
          borderRadius: 12,
          background: "#F0FDF4",
          border: "1px solid #BBF7D0",
        }}
      >
        <p className="font-heading text-lg font-bold" style={{ color: "#166534", margin: 0 }}>
          Message sent
        </p>
        <p style={{ margin: "8px 0 0", fontSize: 14, color: "#15803D", lineHeight: 1.6 }}>
          Thanks for reaching out. We will get back to you as soon as we can.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          style={{
            marginTop: 16,
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid #86EFAC",
            background: "#FFFFFF",
            color: "#166534",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="contact-form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <label style={labelStyle} htmlFor="contact-name">
            Name *
          </label>
          <input
            id="contact-name"
            required
            style={inputStyle}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Your name"
          />
        </div>
        <div>
          <label style={labelStyle} htmlFor="contact-email">
            Email *
          </label>
          <input
            id="contact-email"
            type="email"
            required
            style={inputStyle}
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="you@example.com"
          />
        </div>
      </div>

      <div className="contact-form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <label style={labelStyle} htmlFor="contact-subject">
            Subject
          </label>
          <input
            id="contact-subject"
            style={inputStyle}
            value={form.subject}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            placeholder="How can we help?"
          />
        </div>
        <div>
          <label style={labelStyle} htmlFor="contact-order">
            Order number
          </label>
          <input
            id="contact-order"
            style={inputStyle}
            value={form.orderNumber}
            onChange={(e) => setForm((f) => ({ ...f, orderNumber: e.target.value }))}
            placeholder="Optional"
          />
        </div>
      </div>

      <div>
        <label style={labelStyle} htmlFor="contact-message">
          Message *
        </label>
        <textarea
          id="contact-message"
          required
          rows={5}
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
          value={form.message}
          onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          placeholder="Tell us more…"
        />
      </div>

      {error ? (
        <p style={{ margin: 0, fontSize: 13, color: "#DC2626" }} role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === "sending"}
        className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
        style={{ background: "#C41E1E", border: "none", cursor: status === "sending" ? "default" : "pointer" }}
      >
        {status === "sending" ? "Sending…" : "Send Message"}
      </button>

      <style>{`
        @media (max-width: 640px) {
          .contact-form-row {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </form>
  );
}
