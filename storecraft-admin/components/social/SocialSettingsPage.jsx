"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { HealthStrip } from "./HealthStrip";
import { COLORS, cardClass, pageStyle } from "./socialTheme";

export function SocialSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [batches, setBatches] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/social/settings", { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setSettings(json.settings || json);
          setBatches(json.importBatches || json.batches || []);
          return;
        }
      }
      const h = await fetch("/api/social/health", { credentials: "include" }).then((r) => r.json());
      if (h.success) {
        setSettings({
          dryRun: h.config?.dryRun,
          defaultSlots: h.config?.defaultSlots || ["10:00", "18:00"],
          timezone: h.config?.timezone || "Asia/Karachi",
          maxHashtags: 30,
          footerEnabled: true,
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(patch) {
    setSaving(true);
    try {
      const res = await fetch("/api/social/settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Save failed — env vars Coolify pe set karein");
        setSettings((s) => ({ ...s, ...patch }));
        return;
      }
      setSettings(json.settings || json);
      toast.success("Settings save");
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function undoBatch(id) {
    if (!window.confirm("Is imported week ko undo karein? Posts delete ho sakti hain.")) return;
    try {
      const res = await fetch(`/api/social/import/batch/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Undo failed");
        return;
      }
      toast.success("Import undo ho gaya");
      load();
    } catch {
      toast.error("Network error");
    }
  }

  const live = settings?.dryRun === false || settings?.mode === "live";

  if (loading) {
    return <p className="p-6 text-sm text-[#6B6B76]" style={pageStyle()}>Loading settings…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-5" style={pageStyle()}>
      <h1 className="text-xl font-bold">Social settings</h1>

      <section className={cardClass("p-4 space-y-4")}>
        <h2 className="text-sm font-semibold">Live / Test</h2>
        <p className="text-xs text-[#6B6B76]">
          Test mode = dry-run (Meta pe post nahi). Live ke liye SOCIAL_DRY_RUN=false on server.
        </p>
        <label className="flex cursor-pointer items-center justify-between rounded-xl bg-[#F6F6F8] px-4 py-3">
          <span className="text-sm font-medium">{live ? "Live posting" : "Test (dry-run)"}</span>
          <input
            type="checkbox"
            className="h-5 w-5 accent-[#ED1C24]"
            checked={live}
            disabled={saving}
            onChange={(e) => save({ dryRun: !e.target.checked, mode: e.target.checked ? "live" : "test" })}
          />
        </label>
      </section>

      <section className={cardClass("p-4 space-y-3")}>
        <h2 className="text-sm font-semibold">Default slots (PKT)</h2>
        <input
          type="text"
          value={(settings?.defaultSlots || []).join(", ")}
          onChange={(e) =>
            setSettings((s) => ({
              ...s,
              defaultSlots: e.target.value.split(",").map((x) => x.trim()),
            }))
          }
          onBlur={() => save({ defaultSlots: settings?.defaultSlots })}
          className="w-full rounded-xl border border-[#E8E8ED] px-3 py-2 text-sm"
          placeholder="10:00, 18:00"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings?.footerEnabled !== false}
            onChange={(e) => save({ footerEnabled: e.target.checked })}
          />
          Caption footer (shop link)
        </label>
        <label className="block text-xs text-[#6B6B76]">Max hashtags</label>
        <input
          type="number"
          min={0}
          max={30}
          value={settings?.maxHashtags ?? 30}
          onChange={(e) => setSettings((s) => ({ ...s, maxHashtags: Number(e.target.value) }))}
          onBlur={() => save({ maxHashtags: settings?.maxHashtags })}
          className="w-24 rounded-xl border border-[#E8E8ED] px-3 py-2 text-sm"
        />
      </section>

      <HealthStrip />

      <section className={cardClass("p-4")}>
        <h2 className="text-sm font-semibold">Developer tools</h2>
        <Link
          href="/social/test"
          className="mt-2 inline-block text-sm font-semibold"
          style={{ color: COLORS.brand }}
        >
          Open social test page →
        </Link>
      </section>

      {batches.length ? (
        <section className={cardClass("p-4")}>
          <h2 className="text-sm font-semibold">Imported weeks</h2>
          <ul className="mt-2 space-y-2">
            {batches.map((b) => (
              <li key={b.id || b._id} className="flex items-center justify-between text-sm">
                <span>{b.label || b.weekStart || b.id}</span>
                <button
                  type="button"
                  onClick={() => undoBatch(b.id || b._id)}
                  className="text-xs font-semibold text-red-600"
                >
                  Undo import
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
