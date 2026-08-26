"use client";

import { useState } from "react";

export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  function onSubmit(e) {
    e.preventDefault();
    setDone(true);
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 md:py-14">
      <div
        className="rounded-2xl px-6 py-10 text-center md:px-12"
        style={{ background: "var(--color-neutral-bg)", border: "1px solid #E8D9CC" }}
      >
        <h2 className="font-heading text-2xl font-bold text-[#111] md:text-3xl">Join the Homefy list</h2>
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
              className="h-11 rounded-lg px-5 text-sm font-semibold text-white"
              style={{ background: "var(--color-primary)" }}
            >
              Subscribe
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
