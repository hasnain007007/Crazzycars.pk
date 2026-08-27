"use client";

import { useState } from "react";

export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        setError(json.error || "Could not subscribe. Try again.");
        return;
      }
      setDone(true);
    } catch {
      setError("Could not subscribe. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 md:py-10">
      <div
        className="rounded-2xl px-6 py-8 text-center md:px-12"
        style={{ background: "var(--color-neutral-bg)", border: "1px solid #E8D9CC" }}
      >
        <h2 className="font-heading text-xl font-bold text-[#111] md:text-2xl">Join the Homefy list</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-[#6B7280]">
          New kitchen finds, beauty bags and ladies bags — plus COD offers. No spam.
        </p>
        {done ? (
          <p className="mt-6 text-sm font-semibold" style={{ color: "var(--color-primary)" }}>
            Thanks — we will be in touch.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mx-auto mt-6 flex max-w-md flex-col gap-2 sm:flex-row">
            <label htmlFor="homefy-newsletter" className="sr-only">
              Email
            </label>
            <input
              id="homefy-newsletter"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="h-11 flex-1 rounded-lg border border-[#E5E7EB] px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            <button
              type="submit"
              disabled={busy}
              className="h-11 rounded-lg px-5 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: "var(--color-primary)" }}
            >
              {busy ? "Saving…" : "Subscribe"}
            </button>
          </form>
        )}
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </div>
    </section>
  );
}
