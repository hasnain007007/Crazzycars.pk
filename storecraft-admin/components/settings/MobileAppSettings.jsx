"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { clearAdminSettingsCache } from "@/lib/adminSettingsCache";

const DEFAULTS = {
  bikesLive: false,
  maintenanceMode: false,
  maintenanceMessage: "App is under maintenance. Please try again later.",
  minVersionAndroid: "1.0.0",
  minVersionIos: "1.0.0",
  recommendedVersionAndroid: "",
  recommendedVersionIos: "",
  androidStoreUrl: "",
  iosStoreUrl: "",
};

const VERSION_RE = /^\d+\.\d+\.\d+$/;

/** Mobile app controls: Bikes store switch, maintenance, version gates, store links. */
export default function MobileAppSettings() {
  const [form, setForm] = useState(DEFAULTS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings", { credentials: "include" });
        const data = await res.json();
        const m = data?.settings?.mobileApp || data?.data?.mobileApp;
        if (m) setForm((prev) => ({ ...prev, ...m }));
      } catch {
        /* keep defaults */
      }
    })();
  }, []);

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const save = async () => {
    for (const key of ["minVersionAndroid", "minVersionIos"]) {
      if (!VERSION_RE.test(String(form[key] || ""))) {
        toast.error("Minimum versions must look like 1.0.0");
        return;
      }
    }
    for (const key of ["recommendedVersionAndroid", "recommendedVersionIos"]) {
      if (form[key] && !VERSION_RE.test(String(form[key]))) {
        toast.error("Recommended versions must look like 1.2.0, or be left empty");
        return;
      }
    }
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ mobileApp: form }),
      });
      const data = await res.json();
      if (data.success) {
        clearAdminSettingsCache();
        toast.success("Mobile app settings saved");
      } else {
        toast.error(data.error || "Save failed");
      }
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const input = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800";
  const label = "mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200";
  const hint = "mt-1 text-xs text-slate-500";

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h3 className="text-base font-semibold">Stores</h3>
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-1 h-4 w-4" checked={Boolean(form.bikesLive)} onChange={set("bikesLive")} />
          <span>
            <span className="block text-sm font-medium">Show Bikes store in the app</span>
            <span className={hint}>
              Adds a Cars | Bikes switch at the top of the app. Turn on once bike products are loaded (set Store to
              Bikes on each product and category).
            </span>
          </span>
        </label>
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold">Maintenance</h3>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4"
            checked={Boolean(form.maintenanceMode)}
            onChange={set("maintenanceMode")}
          />
          <span>
            <span className="block text-sm font-medium">Put the app in maintenance mode</span>
            <span className={hint}>Customers see the message below instead of the store. The website is not affected.</span>
          </span>
        </label>
        <div>
          <label className={label} htmlFor="ma-msg">Maintenance message</label>
          <input id="ma-msg" className={input} value={form.maintenanceMessage} onChange={set("maintenanceMessage")} />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold">App versions</h3>
        <p className={hint}>
          Minimum: older apps must update before they can shop. Recommended: older apps see a gentle update prompt.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="ma-min-a">Android minimum</label>
            <input id="ma-min-a" className={input} value={form.minVersionAndroid} onChange={set("minVersionAndroid")} />
          </div>
          <div>
            <label className={label} htmlFor="ma-min-i">iPhone minimum</label>
            <input id="ma-min-i" className={input} value={form.minVersionIos} onChange={set("minVersionIos")} />
          </div>
          <div>
            <label className={label} htmlFor="ma-rec-a">Android recommended</label>
            <input
              id="ma-rec-a"
              className={input}
              placeholder="e.g. 1.1.0"
              value={form.recommendedVersionAndroid}
              onChange={set("recommendedVersionAndroid")}
            />
          </div>
          <div>
            <label className={label} htmlFor="ma-rec-i">iPhone recommended</label>
            <input
              id="ma-rec-i"
              className={input}
              placeholder="e.g. 1.1.0"
              value={form.recommendedVersionIos}
              onChange={set("recommendedVersionIos")}
            />
          </div>
          <div>
            <label className={label} htmlFor="ma-url-a">Google Play link</label>
            <input id="ma-url-a" className={input} value={form.androidStoreUrl} onChange={set("androidStoreUrl")} />
          </div>
          <div>
            <label className={label} htmlFor="ma-url-i">App Store link</label>
            <input id="ma-url-i" className={input} value={form.iosStoreUrl} onChange={set("iosStoreUrl")} />
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="rounded-lg bg-[#1d6fb8] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save mobile app settings"}
      </button>
    </div>
  );
}
