"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useCustomer } from "@/lib/customerAuth";

export default function ProfilePage() {
  const router = useRouter();
  const { customer, loading, setCustomer } = useCustomer();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !customer) {
      router.push("/account/login");
      return;
    }
    if (customer) {
      setForm({
        firstName: customer.firstName || "",
        lastName: customer.lastName || "",
        phone: customer.phone || "",
      });
    }
  }, [customer, loading, router]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/customer/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setCustomer(data.customer);
        toast.success("Profile updated!");
      } else {
        toast.error(data.error || "Update failed");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    border: "1px solid #E5E5E5",
    borderRadius: 6,
    fontSize: 14,
    color: "#111111",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  return (
    <main
      style={{
        maxWidth: 600,
        margin: "0 auto",
        padding: "40px 24px",
        minHeight: "60vh",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 32,
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: 26,
            fontWeight: 700,
            color: "#111111",
            margin: 0,
          }}
        >
          My Profile
        </h1>
        <Link
          href="/account"
          style={{
            fontSize: 13,
            color: "#888888",
            textDecoration: "none",
          }}
        >
          ← Back
        </Link>
      </div>

      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E5E5E5",
          borderRadius: 12,
          padding: 32,
        }}
      >
        <form onSubmit={handleSave}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginBottom: 16,
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 6,
                }}
              >
                First Name
              </label>
              <input
                type="text"
                style={inputStyle}
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 6,
                }}
              >
                Last Name
              </label>
              <input
                type="text"
                style={inputStyle}
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 6,
              }}
            >
              Email Address
            </label>
            <input
              type="email"
              disabled
              style={{
                ...inputStyle,
                background: "#F8F8F8",
                color: "#888888",
                cursor: "not-allowed",
              }}
              value={customer?.email || ""}
            />
            <p
              style={{
                fontSize: 11,
                color: "#9ca3af",
                margin: "4px 0 0",
              }}
            >
              Email cannot be changed
            </p>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 6,
              }}
            >
              Phone Number
            </label>
            <input
              type="tel"
              style={inputStyle}
              placeholder="+92 324 422 0007"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              width: "100%",
              padding: "14px",
              background: saving ? "#888888" : "#111111",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "0.06em",
              cursor: saving ? "not-allowed" : "pointer",
              textTransform: "uppercase",
            }}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </main>
  );
}
