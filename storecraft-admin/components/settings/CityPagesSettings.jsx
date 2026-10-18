"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { CITY_LANDING_SLUGS, CITY_NAMES } from "@/lib/cityLandingDefaults";

const emptyCity = () => ({
  h1: "",
  introHtml: "",
  deliveryNote: "",
  deliveryDays: "",
  metaTitle: "",
  metaDescription: "",
  topCategorySlugs: "",
  faqText: "",
});

function faqToText(faq) {
  if (!Array.isArray(faq) || !faq.length) return "";
  return faq
    .map((f) => `Q: ${f.question || ""}\nA: ${f.answer || ""}`)
    .join("\n\n");
}

function textToFaq(text) {
  const blocks = String(text || "")
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);
  const out = [];
  for (const block of blocks) {
    const qm = block.match(/^Q:\s*([\s\S]*?)\nA:\s*([\s\S]*)$/i);
    if (qm) {
      out.push({ question: qm[1].trim(), answer: qm[2].trim() });
    }
  }
  return out;
}

export default function CityPagesSettings() {
  const [city, setCity] = useState("gujranwala");
  const [form, setForm] = useState(emptyCity());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [all, setAll] = useState({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/settings", { credentials: "include" });
        const data = await res.json();
        if (!cancelled && data.success) {
          const pages = data.settings?.cityPages || data.data?.cityPages || {};
          setAll(pages && typeof pages === "object" ? pages : {});
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const row = all[city] || {};
    setForm({
      h1: row.h1 || "",
      introHtml: row.introHtml || "",
      deliveryNote: row.deliveryNote || "",
      deliveryDays: row.deliveryDays || "",
      metaTitle: row.metaTitle || "",
      metaDescription: row.metaDescription || "",
      topCategorySlugs: Array.isArray(row.topCategorySlugs)
        ? row.topCategorySlugs.join(", ")
        : String(row.topCategorySlugs || ""),
      faqText: faqToText(row.faq),
    });
  }, [city, all]);

  async function save() {
    setSaving(true);
    try {
      const next = {
        ...all,
        [city]: {
          h1: form.h1.trim(),
          introHtml: form.introHtml.trim(),
          deliveryNote: form.deliveryNote.trim(),
          deliveryDays: form.deliveryDays.trim(),
          metaTitle: form.metaTitle.trim(),
          metaDescription: form.metaDescription.trim(),
          topCategorySlugs: form.topCategorySlugs
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          faq: textToFaq(form.faqText),
        },
      };
      const res = await fetch("/api/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cityPages: next }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Save failed");
      setAll(next);
      toast.success(`Saved ${CITY_NAMES[city] || city} city page`);
    } catch (e) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading city pages…</p>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">City landing pages</h2>
        <p className="mt-1 text-sm text-slate-500">
          Unique copy for <code className="text-xs">/car-accessories-{"{city}"}</code>. Leave a field
          blank to keep the built-in default for that city (defaults are not identical templates).
          LocalBusiness JSON-LD is emitted only on Gujranwala.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {CITY_LANDING_SLUGS.map((slug) => (
          <button
            key={slug}
            type="button"
            onClick={() => setCity(slug)}
            className="rounded-lg px-3 py-1.5 text-sm font-semibold"
            style={{
              background: city === slug ? "#C41E1E" : "#f1f5f9",
              color: city === slug ? "#fff" : "#0f172a",
              border: "none",
              cursor: "pointer",
            }}
          >
            {CITY_NAMES[slug]}
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-500">
        Live URL:{" "}
        <a
          href={`https://crazzycars.pk/car-accessories-${city}`}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-red-700 underline"
        >
          /car-accessories-{city}
        </a>
      </p>

      {[
        ["h1", "H1", "text"],
        ["metaTitle", "Meta title", "text"],
        ["metaDescription", "Meta description", "textarea"],
        ["deliveryDays", "Delivery time", "text"],
        ["deliveryNote", "Delivery fee note", "text"],
        ["topCategorySlugs", "Top category slugs (comma-separated)", "text"],
        ["introHtml", "Intro HTML (unique body copy)", "textarea"],
        ["faqText", "FAQ (blocks of Q: … / A: …)", "textarea"],
      ].map(([key, label, kind]) => (
        <label key={key} className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          {label}
          {kind === "textarea" ? (
            <textarea
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              rows={key === "introHtml" || key === "faqText" ? 8 : 3}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
            />
          ) : (
            <input
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
            />
          )}
        </label>
      ))}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {saving ? "Saving…" : `Save ${CITY_NAMES[city]} overrides`}
      </button>
    </div>
  );
}
