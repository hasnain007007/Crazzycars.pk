"use client";

import { useEffect, useState } from "react";
import { normalizePkMobile } from "@/lib/pkPhone";

/**
 * Structured contact/address capture for WhatsApp / email / convert flows.
 * Replaces brittle window.prompt chains (AC-09).
 */
export function AbandonedCartContactModal({
  open,
  mode = "contact", // contact | whatsapp | email | convert
  cart,
  onClose,
  onSubmit,
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !cart) return;
    setName(String(cart.customer?.name || cart.shippingAddress?.name || "").trim());
    setPhone(String(cart.customer?.phone || cart.shippingAddress?.phone || "").trim());
    setEmail(String(cart.customer?.email || cart.shippingAddress?.email || "").trim());
    setStreet(String(cart.shippingAddress?.street || "").trim());
    setCity(String(cart.shippingAddress?.city || "").trim());
    setState(String(cart.shippingAddress?.state || "").trim());
    setError("");
  }, [open, cart]);

  if (!open || !cart) return null;

  const title =
    mode === "whatsapp"
      ? "WhatsApp contact"
      : mode === "email"
        ? "Recovery email"
        : mode === "convert"
          ? "Convert to order — customer details"
          : "Edit contact";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const nextName = String(name || "").trim();
    const nextPhone = String(phone || "").trim();
    const nextEmail = String(email || "").trim().toLowerCase();
    const nextStreet = String(street || "").trim();
    const nextCity = String(city || "").trim();
    const nextState = String(state || "").trim();

    if (mode === "whatsapp" || mode === "convert") {
      if (!nextPhone) {
        setError("Phone / WhatsApp number is required.");
        return;
      }
      const pk = normalizePkMobile(nextPhone);
      if (!pk.ok) {
        setError("Enter a valid Pakistani mobile (e.g. 03XX XXXXXXX).");
        return;
      }
    }
    if (mode === "convert" && !nextName) {
      setError("Customer name is required to create an order.");
      return;
    }
    if (mode === "email") {
      if (!nextEmail.includes("@") || nextEmail.startsWith("guest+")) {
        setError("Enter a real email address.");
        return;
      }
    }

    setSaving(true);
    try {
      await onSubmit?.({
        name: nextName,
        phone: nextPhone,
        email: nextEmail,
        street: nextStreet,
        city: nextCity,
        state: nextState,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0 bg-slate-900/50" aria-label="Close" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl dark:bg-slate-900"
      >
        <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
        <p className="mt-1 text-xs text-slate-500">
          Saved onto this cart session for recovery. Does not message the customer by itself.
        </p>
        <div className="mt-4 space-y-3">
          {mode !== "email" ? (
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                autoComplete="name"
              />
            </label>
          ) : null}
          {mode !== "email" ? (
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Phone / WhatsApp
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                placeholder="03XX XXXXXXX"
                inputMode="tel"
                autoComplete="tel"
              />
            </label>
          ) : null}
          {mode === "email" || mode === "convert" || mode === "contact" ? (
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Email
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                autoComplete="email"
              />
            </label>
          ) : null}
          {mode === "convert" || mode === "contact" ? (
            <>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Street address
                <input
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  City
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Province
                  <input
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                  />
                </label>
              </div>
            </>
          ) : null}
          {error ? <p className="text-xs font-semibold text-red-600">{error}</p> : null}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold dark:border-slate-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[#1d6fb8] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : mode === "convert" ? "Continue" : "Save & continue"}
          </button>
        </div>
      </form>
    </div>
  );
}
