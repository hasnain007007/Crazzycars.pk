"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { clearStorefrontBrowserCache } from "@/lib/clearStorefrontBrowserCache";
import { clearAdminSettingsCache } from "@/lib/adminSettingsCache";

export default function MegaMenuSettings() {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    enabled: true,
    trigger: "hover",
    showImages: true,
    showSubcategories: true,
    columns: 4,
    featuredTitle: "Shop By Category",
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings", { credentials: "include" });
        const data = await res.json();
        const menu = data?.settings?.megaMenu || data?.data?.megaMenu || {};
        if (menu && Object.keys(menu).length > 0) {
          setForm((prev) => ({ ...prev, ...menu }));
        }
      } catch {}
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ megaMenu: form }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Mega menu settings saved!");
        clearStorefrontBrowserCache();
        clearAdminSettingsCache();
      } else {
        toast.error("Save failed");
      }
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "9px 12px",
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    fontSize: 14,
    color: "#111827",
    outline: "none",
    boxSizing: "border-box",
    background: "#fff",
    fontFamily: "inherit",
  };

  const Toggle = ({ label, desc, field }) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 0",
        borderBottom: "1px solid #f9fafb",
      }}
    >
      <div>
        <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: "0 0 2px" }}>{label}</p>
        {desc && <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>{desc}</p>}
      </div>
      <label style={{ position: "relative", display: "inline-block", width: 44, height: 24, cursor: "pointer", flexShrink: 0 }}>
        <input
          type="checkbox"
          checked={form[field]}
          onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.checked }))}
          style={{ display: "none" }}
        />
        <span
          style={{
            position: "absolute",
            inset: 0,
            background: form[field] ? "#009688" : "#d1d5db",
            borderRadius: 99,
            transition: "background 0.2s",
          }}
        />
        <span
          style={{
            position: "absolute",
            top: 2,
            left: form[field] ? 22 : 2,
            width: 20,
            height: 20,
            background: "#fff",
            borderRadius: "50%",
            transition: "left 0.2s",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }}
        />
      </label>
    </div>
  );

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: 12,
          padding: "14px 20px",
          marginBottom: 24,
        }}
      >
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#166534", margin: 0 }}>Mega Menu Settings</p>
          <p style={{ fontSize: 12, color: "#16a34a", margin: "2px 0 0" }}>Control the categories dropdown menu</p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          style={{
            padding: "10px 24px",
            background: saving ? "#9ca3af" : "#009688",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: saving ? "default" : "pointer",
          }}
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <h3
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#111827",
            margin: "0 0 4px",
            paddingBottom: 12,
            borderBottom: "1px solid #f3f4f6",
          }}
        >
          General
        </h3>

        <Toggle label="Enable Mega Menu" desc="Show categories dropdown in navigation" field="enabled" />
        <Toggle label="Show Subcategories" desc="Display subcategories under each category" field="showSubcategories" />

        <div style={{ padding: "12px 0", borderBottom: "1px solid #f9fafb" }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: "0 0 8px" }}>Open Trigger</p>
          <div style={{ display: "flex", gap: 10 }}>
            {[
              { value: "hover", label: "Hover" },
              { value: "click", label: "Click" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, trigger: opt.value }))}
                style={{
                  padding: "8px 20px",
                  border: "2px solid",
                  borderColor: form.trigger === opt.value ? "#009688" : "#e5e7eb",
                  borderRadius: 6,
                  background: form.trigger === opt.value ? "#e6f7f5" : "#fff",
                  color: form.trigger === opt.value ? "#009688" : "#374151",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: "12px 0" }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: "0 0 8px" }}>Number of Columns</p>
          <div style={{ display: "flex", gap: 8 }}>
            {[3, 4, 5, 6].map((col) => (
              <button
                key={col}
                type="button"
                onClick={() => setForm((f) => ({ ...f, columns: col }))}
                style={{
                  width: 44,
                  height: 44,
                  border: "2px solid",
                  borderColor: form.columns === col ? "#009688" : "#e5e7eb",
                  borderRadius: 6,
                  background: form.columns === col ? "#e6f7f5" : "#fff",
                  color: form.columns === col ? "#009688" : "#374151",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                {col}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
        <h3
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#111827",
            margin: "0 0 16px",
            paddingBottom: 12,
            borderBottom: "1px solid #f3f4f6",
          }}
        >
          Text
        </h3>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Menu Heading</label>
          <input
            style={inputStyle}
            placeholder="Shop By Category"
            value={form.featuredTitle}
            onChange={(e) => setForm((f) => ({ ...f, featuredTitle: e.target.value }))}
          />
        </div>
      </div>
    </div>
  );
}
