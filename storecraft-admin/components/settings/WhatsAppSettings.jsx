"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { clearStorefrontBrowserCache } from "@/lib/clearStorefrontBrowserCache";
import { clearAdminSettingsCache } from "@/lib/adminSettingsCache";

export default function WhatsAppSettings() {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    enabled: false,
    number: "",
    message: "Hi! I have a question about Homefy.pk.",
    showInNav: false,
    showInFooter: true,
    showFloating: true,
    position: "bottom-left",
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/settings", { credentials: "include" });
        const data = await res.json();
        const wa = data?.settings?.whatsapp || data?.data?.whatsapp;
        if (wa) setForm((prev) => ({ ...prev, ...wa }));
      } catch {
        /* ignore */
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ whatsapp: form }),
      });
      const data = await res.json();
      if (data.success) {
        clearStorefrontBrowserCache();
        clearAdminSettingsCache();
        toast.success("WhatsApp settings saved!");
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
    padding: "10px 14px",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    fontSize: 14,
    color: "#111827",
    outline: "none",
    boxSizing: "border-box",
    background: "#fff",
    fontFamily: "inherit",
  };

  const labelStyle = {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 6,
  };

  const whatsappUrl = `https://wa.me/${String(form.number || "").replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
    form.message || ""
  )}`;

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
          <p style={{ fontSize: 14, fontWeight: 600, color: "#166534", margin: 0 }}>WhatsApp Settings</p>
          <p style={{ fontSize: 12, color: "#16a34a", margin: "2px 0 0" }}>Control WhatsApp button across your store</p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          style={{
            padding: "10px 24px",
            background: saving ? "#9ca3af" : "#25D366",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: saving ? "default" : "pointer",
          }}
        >
          {saving ? "Saving..." : "💾 Save Settings"}
        </button>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: "0 0 4px", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 24 }}>💬</span>
              Enable WhatsApp
            </p>
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Show WhatsApp contact button on your store</p>
          </div>
          <label style={{ position: "relative", display: "inline-block", width: 52, height: 28, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
              style={{ display: "none" }}
            />
            <span style={{ position: "absolute", inset: 0, background: form.enabled ? "#25D366" : "#d1d5db", borderRadius: 99, transition: "background 0.2s" }} />
            <span style={{ position: "absolute", top: 3, left: form.enabled ? 27 : 3, width: 22, height: 22, background: "#fff", borderRadius: "50%", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
          </label>
        </div>
      </div>

      {form.enabled ? (
        <>
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 24, marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 16px", paddingBottom: 12, borderBottom: "1px solid #f3f4f6" }}>Contact Details</h3>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>WhatsApp Number *</label>
              <input style={inputStyle} placeholder="923244220007" value={form.number} onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))} />
              <p style={{ fontSize: 11, color: "#9ca3af", margin: "4px 0 0" }}>Include country code e.g. 92 for Pakistan (no + in wa.me links)</p>
            </div>
            <div>
              <label style={labelStyle}>Default Message</label>
              <textarea
                style={{ ...inputStyle, minHeight: 80, resize: "vertical", lineHeight: 1.6 }}
                placeholder="Hi! I have a question about Homefy.pk."
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              />
              <p style={{ fontSize: 11, color: "#9ca3af", margin: "4px 0 0" }}>Pre-filled message when customer opens WhatsApp</p>
            </div>
          </div>

          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 24, marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 16px", paddingBottom: 12, borderBottom: "1px solid #f3f4f6" }}>Display Options</h3>
            {[
              { key: "showFloating", label: "🟢 Floating Button", desc: "Fixed button on bottom of every page" },
              { key: "showInNav", label: "📱 Show in Navigation", desc: "WhatsApp icon in the header navbar" },
              { key: "showInFooter", label: "🦶 Show in Footer", desc: "WhatsApp link in the footer section" },
            ].map((opt) => (
              <div key={opt.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: "1px solid #f9fafb" }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: "0 0 2px" }}>{opt.label}</p>
                  <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>{opt.desc}</p>
                </div>
                <label style={{ position: "relative", display: "inline-block", width: 44, height: 24, cursor: "pointer" }}>
                  <input type="checkbox" checked={form[opt.key]} onChange={(e) => setForm((f) => ({ ...f, [opt.key]: e.target.checked }))} style={{ display: "none" }} />
                  <span style={{ position: "absolute", inset: 0, background: form[opt.key] ? "#25D366" : "#d1d5db", borderRadius: 99, transition: "background 0.2s" }} />
                  <span style={{ position: "absolute", top: 2, left: form[opt.key] ? 22 : 2, width: 20, height: 20, background: "#fff", borderRadius: "50%", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                </label>
              </div>
            ))}
            {form.showFloating ? (
              <div style={{ marginTop: 16 }}>
                <label style={labelStyle}>Floating Button Position</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {[
                    { value: "bottom-left", label: "↙ Bottom Left" },
                    { value: "bottom-right", label: "↘ Bottom Right" },
                  ].map((pos) => (
                    <button
                      key={pos.value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, position: pos.value }))}
                      style={{
                        padding: "8px 20px",
                        border: "2px solid",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 600,
                        borderColor: form.position === pos.value ? "#25D366" : "#e5e7eb",
                        background: form.position === pos.value ? "#f0fdf4" : "#fff",
                        color: form.position === pos.value ? "#16a34a" : "#374151",
                      }}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#166534", margin: "0 0 12px" }}>Preview</p>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "12px 24px", background: "#25D366", color: "#fff", borderRadius: 50, textDecoration: "none", fontSize: 14, fontWeight: 700 }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Chat on WhatsApp
            </a>
            <p style={{ fontSize: 11, color: "#16a34a", margin: "8px 0 0" }}>Test link above to verify it works</p>
          </div>
        </>
      ) : null}
    </div>
  );
}
