"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { AdminPaymentMethodIcon } from "@/components/ui/PakistaniPaymentIcons";
import {
  DEFAULT_PAKISTANI_PAYMENT_METHODS,
  normalizePakistaniPaymentMethods,
  PAKISTANI_PAYMENT_METHOD_KEYS,
} from "@/lib/pakistaniPaymentMethods";

const INPUT_STYLE = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #E5E7EB",
  borderRadius: 8,
  fontSize: 14,
  color: "#111111",
  background: "#FFFFFF",
  outline: "none",
  boxSizing: "border-box",
};

const LABEL_STYLE = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "#374151",
  marginBottom: 6,
};

function Toggle({ checked, onChange }) {
  return (
    <label
      style={{
        position: "relative",
        display: "inline-block",
        width: 44,
        height: 24,
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ display: "none" }} />
      <span
        style={{
          position: "absolute",
          inset: 0,
          background: checked ? "#C41E1E" : "#d1d5db",
          borderRadius: 99,
          transition: "background 0.2s",
        }}
      />
      <span
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 22 : 2,
          width: 20,
          height: 20,
          background: "#fff",
          borderRadius: "50%",
          transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </label>
  );
}

function Field({ label, value, onChange, placeholder = "" }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={LABEL_STYLE}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={INPUT_STYLE}
      />
    </div>
  );
}

const METHOD_META = {
  cod: {
    title: "Cash on Delivery",
    description: "Customer pays when order arrives",
    fields: null,
  },
  jazzcash: { title: "JazzCash", description: "Mobile wallet payments", fields: "wallet" },
  easypaisa: { title: "Easypaisa", description: "Mobile wallet payments", fields: "wallet" },
  bankTransfer: { title: "Bank Alfalah", description: "Direct bank transfer", fields: "bank" },
  hbl: { title: "HBL", description: "Habib Bank Limited", fields: "account" },
  meezan: { title: "Meezan Bank", description: "Islamic banking", fields: "bank" },
  ubl: { title: "UBL", description: "United Bank Limited", fields: "account" },
};

function MethodCard({ methodKey, data, onChange }) {
  const meta = METHOD_META[methodKey];
  const enabled = data.enabled === true;

  const patch = (updates) => onChange({ ...data, ...updates });

  return (
    <div
      style={{
        background: "#FFFFFF",
        border: `1px solid ${enabled ? "#C41E1E" : "#E5E7EB"}`,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <AdminPaymentMethodIcon methodKey={methodKey} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#111111", margin: "0 0 2px" }}>{meta.title}</p>
          <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>{meta.description}</p>
        </div>
        <Toggle checked={enabled} onChange={(v) => patch({ enabled: v })} />
      </div>

      {enabled ? (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #f3f4f6" }}>
          <Field label="Display label" value={data.label || ""} onChange={(v) => patch({ label: v })} />

          {methodKey === "cod" ? (
            <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
              No account details needed. Customers pay in cash at delivery.
            </p>
          ) : null}

          {meta.fields === "wallet" ? (
            <>
              <Field
                label="Account number"
                value={data.accountNumber || ""}
                onChange={(v) => patch({ accountNumber: v })}
                placeholder="03XX XXXXXXX"
              />
              <Field
                label="Account name"
                value={data.accountName || ""}
                onChange={(v) => patch({ accountName: v })}
                placeholder="Crazzycars.pk"
              />
            </>
          ) : null}

          {meta.fields === "bank" ? (
            <>
              <Field
                label="Bank name"
                value={data.bankName || ""}
                onChange={(v) => patch({ bankName: v })}
                placeholder="e.g. Meezan Bank"
              />
              <Field
                label="Account number"
                value={data.accountNumber || ""}
                onChange={(v) => patch({ accountNumber: v })}
                placeholder="Account number"
              />
              <Field
                label="Account title"
                value={data.accountTitle || ""}
                onChange={(v) => patch({ accountTitle: v })}
                placeholder="Crazzycars.pk"
              />
              <Field label="IBAN (optional)" value={data.iban || ""} onChange={(v) => patch({ iban: v })} placeholder="PK00..." />
            </>
          ) : null}

          {meta.fields === "account" ? (
            <>
              <Field
                label="Account number"
                value={data.accountNumber || ""}
                onChange={(v) => patch({ accountNumber: v })}
                placeholder="Account number"
              />
              <Field
                label="Account title"
                value={data.accountTitle || ""}
                onChange={(v) => patch({ accountTitle: v })}
                placeholder="Crazzycars.pk"
              />
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function PakistaniPaymentSettings({ settings, setSettings, onSave }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => normalizePakistaniPaymentMethods(settings?.pakistaniPaymentMethods));

  useEffect(() => {
    setForm(normalizePakistaniPaymentMethods(settings?.pakistaniPaymentMethods));
  }, [settings?.pakistaniPaymentMethods]);

  const setMethod = useCallback((key, data) => {
    setForm((prev) => ({ ...prev, [key]: data }));
    setSettings((s) => ({
      ...s,
      pakistaniPaymentMethods: { ...(s.pakistaniPaymentMethods || {}), [key]: data },
    }));
  }, [setSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const normalized = normalizePakistaniPaymentMethods(form);
      await onSave({ pakistaniPaymentMethods: normalized });
      setForm(normalized);
      toast.success("Payment methods saved");
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ background: "#FFFFFF", color: "#111111" }}>
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111111", margin: "0 0 6px" }}>Pakistani Payment Methods</h3>
        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Enable payment methods for your Pakistani customers</p>
      </div>

      {PAKISTANI_PAYMENT_METHOD_KEYS.map((key) => (
        <MethodCard key={key} methodKey={key} data={form[key] || DEFAULT_PAKISTANI_PAYMENT_METHODS[key]} onChange={(d) => setMethod(key, d)} />
      ))}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        style={{
          padding: "12px 28px",
          background: saving ? "#9ca3af" : "#C41E1E",
          color: "#FFFFFF",
          border: "none",
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          cursor: saving ? "default" : "pointer",
        }}
      >
        {saving ? "Saving…" : "Save Payment Methods"}
      </button>
    </div>
  );
}
