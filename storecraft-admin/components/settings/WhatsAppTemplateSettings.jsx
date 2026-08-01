"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { clearStorefrontBrowserCache } from "@/lib/clearStorefrontBrowserCache";
import { clearAdminSettingsCache } from "@/lib/adminSettingsCache";
import { DEFAULT_WHATSAPP_TEMPLATES } from "@/lib/whatsappTemplates";

const TEMPLATE_CONFIG = [
  {
    key: "customerOrderConfirmation",
    label: "Customer Order Confirmation",
    description:
      "Sent to the customer when you tap WhatsApp Customer. Must ask if the order is confirmed, with Yes/No links ({confirmOrderUrl} / {cancelOrderUrl}).",
    variables: [
      "customerName",
      "orderNumber",
      "orderDate",
      "itemsList",
      "subtotal",
      "shipping",
      "total",
      "paymentMethod",
      "paymentInstructions",
      "paidAmount",
      "remainingBalance",
      "paymentStatus",
      "address",
      "city",
      "province",
      "customerPhone",
      "trackingSection",
      "trackingNumber",
      "trackingUrl",
      "storePhone",
      "storeName",
      "confirmOrderUrl",
      "cancelOrderUrl",
    ],
  },
  {
    key: "adminNewOrder",
    label: "Admin New Order Alert",
    description: "Notification for store admin when a new order arrives. Admin order link requires login. Confirm/Cancel links show a confirmation page first (safe from WhatsApp link previews).",
    variables: [
      "customerName",
      "customerPhone",
      "orderNumber",
      "city",
      "province",
      "itemsList",
      "productImages",
      "total",
      "paymentMethod",
      "address",
      "adminOrderUrl",
      "confirmOrderUrl",
      "cancelOrderUrl",
    ],
  },
  {
    key: "orderShipped",
    label: "Order Shipped",
    description: "Sent to customer when tracking is added / shipment booked",
    variables: [
      "customerName",
      "orderNumber",
      "courier",
      "trackingNumber",
      "trackingUrl",
      "address",
      "city",
      "storePhone",
    ],
  },
];

function emptyTemplates() {
  return {
    customerOrderConfirmation: { enabled: true, template: "" },
    adminNewOrder: { enabled: true, template: "" },
    orderShipped: { enabled: true, template: "" },
  };
}

function mergeLoadedTemplates(raw) {
  const base = emptyTemplates();
  for (const cfg of TEMPLATE_CONFIG) {
    const saved = raw?.[cfg.key];
    const defaults = DEFAULT_WHATSAPP_TEMPLATES[cfg.key];
    base[cfg.key] = {
      enabled: saved?.enabled !== false,
      template: String(saved?.template || "").trim() || defaults.template,
    };
  }
  return base;
}

export default function WhatsAppTemplateSettings() {
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState(() => mergeLoadedTemplates(null));
  const textareaRefs = useRef({});

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings", { credentials: "include" });
        const data = await res.json();
        const raw = data?.settings?.whatsappTemplates || data?.data?.whatsappTemplates;
        if (raw) setTemplates(mergeLoadedTemplates(raw));
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const setTemplateField = useCallback((key, field, value) => {
    setTemplates((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  }, []);

  const resetTemplate = useCallback((key) => {
    const defaults = DEFAULT_WHATSAPP_TEMPLATES[key];
    if (!defaults) return;
    setTemplates((prev) => ({
      ...prev,
      [key]: { enabled: defaults.enabled, template: defaults.template },
    }));
    toast.success("Template reset to default");
  }, []);

  const insertVariable = useCallback((key, variable) => {
    const token = `{${variable}}`;
    const ref = textareaRefs.current[key];
    const current = templates[key]?.template || "";

    if (ref && typeof ref.selectionStart === "number") {
      const start = ref.selectionStart;
      const end = ref.selectionEnd;
      const next = current.slice(0, start) + token + current.slice(end);
      setTemplateField(key, "template", next);
      requestAnimationFrame(() => {
        ref.focus();
        const pos = start + token.length;
        ref.setSelectionRange(pos, pos);
      });
      return;
    }

    setTemplateField(key, "template", current + token);
  }, [templates, setTemplateField]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ whatsappTemplates: templates }),
      });
      const data = await res.json();
      if (data.success) {
        clearStorefrontBrowserCache();
        clearAdminSettingsCache();
        toast.success("WhatsApp templates saved!");
      } else {
        toast.error(data.error || "Save failed");
      }
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const labelStyle = {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 6,
  };

  const textareaStyle = {
    width: "100%",
    padding: "10px 14px",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    fontSize: 13,
    lineHeight: 1.5,
    fontFamily: "ui-monospace, monospace",
    resize: "vertical",
    boxSizing: "border-box",
  };

  return (
    <div style={{ marginTop: 32, paddingTop: 24, borderTop: "2px solid #e5e7eb" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>
            WhatsApp Message Templates
          </h2>
          <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
            Customize messages sent to customers and admin
          </p>
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
          {saving ? "Saving..." : "Save WhatsApp Templates"}
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {TEMPLATE_CONFIG.map((cfg) => {
          const entry = templates[cfg.key] || { enabled: true, template: "" };
          return (
            <div
              key={cfg.key}
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>
                    {cfg.label}
                  </p>
                  <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>{cfg.description}</p>
                </div>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#374151",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={entry.enabled}
                    onChange={(e) => setTemplateField(cfg.key, "enabled", e.target.checked)}
                  />
                  Enabled
                </label>
              </div>

              <label style={labelStyle}>Message template</label>
              <textarea
                ref={(el) => {
                  textareaRefs.current[cfg.key] = el;
                }}
                rows={12}
                style={textareaStyle}
                value={entry.template}
                onChange={(e) => setTemplateField(cfg.key, "template", e.target.value)}
              />

              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => resetTemplate(cfg.key)}
                  style={{
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    background: "#f9fafb",
                    cursor: "pointer",
                  }}
                >
                  Reset to Default
                </button>
              </div>

              <p style={{ fontSize: 11, color: "#6b7280", margin: "12px 0 6px", fontWeight: 600 }}>
                Available variables (click to insert):
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {cfg.variables.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVariable(cfg.key, v)}
                    style={{
                      padding: "4px 10px",
                      fontSize: 11,
                      fontFamily: "ui-monospace, monospace",
                      background: "#eff6ff",
                      color: "#1d4ed8",
                      border: "1px solid #bfdbfe",
                      borderRadius: 999,
                      cursor: "pointer",
                    }}
                  >
                    {`{${v}}`}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
