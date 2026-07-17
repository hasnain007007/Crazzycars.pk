"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

const DEFAULT_FORM = {
  requireAccount: false,
  allowGuestCheckout: true,
  showLoginPrompt: true,
};

export default function CheckoutSettings() {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/settings", { credentials: "include" });
      const data = await res.json();
      const checkout = data?.settings?.checkout || data?.data?.checkout || {};
      if (checkout && typeof checkout === "object") {
        setForm((prev) => ({ ...prev, ...checkout }));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        allowGuestCheckout: form.requireAccount ? false : form.allowGuestCheckout,
      };
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ checkout: payload }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Checkout settings saved!");
        setForm((prev) => ({
          ...prev,
          ...payload,
        }));
      } else {
        toast.error(data.error || "Save failed");
      }
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const Toggle = ({ label, desc, field }) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 0",
        borderBottom: "1px solid #f3f4f6",
      }}
    >
      <div style={{ flex: 1, paddingRight: 24 }}>
        <p
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#111827",
            margin: "0 0 4px",
          }}
        >
          {label}
        </p>
        <p
          style={{
            fontSize: 12,
            color: "#6b7280",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {desc}
        </p>
      </div>
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
        <input
          type="checkbox"
          checked={Boolean(form[field])}
          onChange={(e) => {
            const checked = e.target.checked;
            setForm((f) => {
              const next = { ...f, [field]: checked };
              if (field === "requireAccount" && checked) {
                next.allowGuestCheckout = false;
              }
              if (field === "allowGuestCheckout" && !checked) {
                next.requireAccount = true;
              }
              return next;
            });
          }}
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

  const guestBlocked = form.requireAccount || form.allowGuestCheckout === false;

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
          <p
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#166534",
              margin: 0,
            }}
          >
            Checkout Settings
          </p>
          <p
            style={{
              fontSize: 12,
              color: "#16a34a",
              margin: "2px 0 0",
            }}
          >
            Control customer checkout experience
          </p>
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

      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: "4px 20px 8px",
          marginBottom: 20,
        }}
      >
        <Toggle
          label="Require Account to Checkout"
          desc="When enabled, customers must register or login before they can complete a purchase. When disabled, guest checkout is allowed (if also allowed below)."
          field="requireAccount"
        />
        <Toggle
          label="Allow Guest Checkout"
          desc="When disabled, only signed-in customers can check out (same effect as requiring an account)."
          field="allowGuestCheckout"
        />
        <Toggle
          label="Show Login Prompt at Checkout"
          desc="When guest checkout is allowed, show a friendly login prompt at checkout offering customers to sign in or continue as guest."
          field="showLoginPrompt"
        />
      </div>

      <div
        style={{
          background: guestBlocked ? "#fef3c7" : "#f0fdf4",
          border: "1px solid",
          borderColor: guestBlocked ? "#fcd34d" : "#bbf7d0",
          borderRadius: 12,
          padding: 16,
        }}
      >
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: guestBlocked ? "#92400e" : "#166534",
            margin: "0 0 4px",
          }}
        >
          {guestBlocked ? "⚠️ Account Required Mode" : "✓ Guest Checkout Mode"}
        </p>
        <p
          style={{
            fontSize: 12,
            color: guestBlocked ? "#a16207" : "#15803d",
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          {guestBlocked
            ? "Customers must create an account or login before purchasing. This reduces impulse purchases but builds your customer database."
            : "Customers can checkout without an account. This maximizes conversions. A login prompt can still be shown as optional."}
        </p>
      </div>
    </div>
  );
}
