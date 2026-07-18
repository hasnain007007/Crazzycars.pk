"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useCustomer } from "@/lib/customerAuth";
import { PAKISTAN_PROVINCES } from "@/lib/constants";

const EMPTY = {
  label: "Home",
  firstName: "",
  lastName: "",
  phone: "",
  street: "",
  street2: "",
  area: "",
  city: "",
  province: "",
  postcode: "",
  country: "Pakistan",
  isDefault: false,
};

export default function AddressesPage() {
  const router = useRouter();
  const { customer, loading } = useCustomer();
  const [addresses, setAddresses] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/customer/addresses", { credentials: "include" });
    const json = await res.json();
    if (json.success) setAddresses(json.addresses || []);
  }, []);

  useEffect(() => {
    if (!loading && !customer) {
      router.push("/account/login");
      return;
    }
    if (customer) load().catch(() => {});
  }, [customer, loading, router, load]);

  const openNew = () => {
    setEditingId(null);
    setForm({
      ...EMPTY,
      firstName: customer?.firstName || "",
      lastName: customer?.lastName || "",
      phone: customer?.phone || "",
      isDefault: addresses.length === 0,
    });
    setShowForm(true);
  };

  const openEdit = (a) => {
    setEditingId(a.id);
    setForm({
      label: a.label || "Home",
      firstName: a.firstName || "",
      lastName: a.lastName || "",
      phone: a.phone || customer?.phone || "",
      street: a.street || "",
      street2: a.street2 || "",
      area: a.area || "",
      city: a.city || "",
      province: a.province || a.state || "",
      postcode: a.postcode || a.zip || "",
      country: a.country || "Pakistan",
      isDefault: Boolean(a.isDefault),
    });
    setShowForm(true);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.street.trim() || !form.city.trim() || !form.province.trim() || !form.phone.trim()) {
      toast.error("Phone, street, city, and province are required.");
      return;
    }
    setSaving(true);
    try {
      const url = editingId ? `/api/customer/addresses/${editingId}` : "/api/customer/addresses";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || "Save failed");
        return;
      }
      setAddresses(json.addresses || []);
      setShowForm(false);
      toast.success(editingId ? "Address updated" : "Address saved");
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this address?")) return;
    try {
      const res = await fetch(`/api/customer/addresses/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || "Delete failed");
        return;
      }
      setAddresses(json.addresses || []);
      toast.success("Address deleted");
    } catch {
      toast.error("Network error");
    }
  };

  const setDefault = async (a) => {
    try {
      const res = await fetch(`/api/customer/addresses/${a.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...a, isDefault: true }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || "Update failed");
        return;
      }
      setAddresses(json.addresses || []);
      toast.success("Default address updated");
    } catch {
      toast.error("Network error");
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
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px", minHeight: "60vh" }}>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <Link href="/account" style={{ fontSize: 13, color: "#888", textDecoration: "none" }}>
            ← Account
          </Link>
          <h1
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: 28,
              fontWeight: 700,
              margin: "8px 0 0",
              color: "#111",
            }}
          >
            My Addresses
          </h1>
          <p style={{ fontSize: 13, color: "#888", margin: "6px 0 0" }}>
            Save delivery addresses for faster checkout
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          style={{
            padding: "10px 18px",
            background: "#111",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
            height: "fit-content",
          }}
        >
          + Add address
        </button>
      </div>

      {showForm ? (
        <form
          onSubmit={save}
          style={{
            background: "#fff",
            border: "1px solid #E5E5E5",
            borderRadius: 12,
            padding: 24,
            marginBottom: 24,
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>
            {editingId ? "Edit address" : "New address"}
          </h2>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Label</label>
                <input
                  style={inputStyle}
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="Home / Office"
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Phone *</label>
                <input
                  style={inputStyle}
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>First name</label>
                <input
                  style={inputStyle}
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Last name</label>
                <input
                  style={inputStyle}
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Street *</label>
              <input
                style={inputStyle}
                value={form.street}
                onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))}
                placeholder="House / street"
                required
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Address line 2</label>
              <input
                style={inputStyle}
                value={form.street2}
                onChange={(e) => setForm((f) => ({ ...f, street2: e.target.value }))}
                placeholder="Apartment, floor, landmark"
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Area</label>
              <input
                style={inputStyle}
                value={form.area}
                onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
                placeholder="Colony / sector / mohalla"
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>City *</label>
                <input
                  style={inputStyle}
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Province *</label>
                <select
                  style={{ ...inputStyle, color: form.province ? "#111" : "#888" }}
                  value={form.province}
                  onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))}
                  required
                >
                  <option value="">Select province…</option>
                  {PAKISTAN_PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Postal code</label>
              <input
                style={inputStyle}
                value={form.postcode}
                onChange={(e) => setForm((f) => ({ ...f, postcode: e.target.value }))}
                placeholder="5-digit (optional)"
                maxLength={5}
              />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
              />
              Set as default delivery address
            </label>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "10px 18px",
                background: "#D72323",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {saving ? "Saving…" : "Save address"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              style={{
                padding: "10px 18px",
                background: "#fff",
                color: "#111",
                border: "1px solid #E5E5E5",
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {!addresses.length && !showForm ? (
        <div
          style={{
            border: "1px dashed #E5E5E5",
            borderRadius: 12,
            padding: 40,
            textAlign: "center",
            color: "#888",
          }}
        >
          No saved addresses yet. Add one for faster checkout.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {addresses.map((a) => (
            <div
              key={a.id}
              style={{
                background: "#fff",
                border: a.isDefault ? "2px solid #111" : "1px solid #E5E5E5",
                borderRadius: 12,
                padding: 20,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>
                    {a.label || "Address"}
                    {a.isDefault ? (
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 11,
                          background: "#111",
                          color: "#fff",
                          padding: "2px 8px",
                          borderRadius: 99,
                          fontWeight: 600,
                        }}
                      >
                        Default
                      </span>
                    ) : null}
                  </p>
                  <p style={{ margin: "8px 0 0", fontSize: 13, color: "#444", lineHeight: 1.5 }}>
                    {[a.firstName, a.lastName].filter(Boolean).join(" ")}
                    {a.phone ? ` · ${a.phone}` : ""}
                    <br />
                    {[a.street, a.street2].filter(Boolean).join(", ")}
                    {a.area ? (
                      <>
                        <br />
                        {a.area}
                      </>
                    ) : null}
                    <br />
                    {[a.city, a.province, a.postcode].filter(Boolean).join(", ")}
                    <br />
                    {a.country || "Pakistan"}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", height: "fit-content" }}>
                  {!a.isDefault ? (
                    <button
                      type="button"
                      onClick={() => setDefault(a)}
                      style={{
                        padding: "6px 12px",
                        fontSize: 12,
                        borderRadius: 6,
                        border: "1px solid #E5E5E5",
                        background: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      Make default
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => openEdit(a)}
                    style={{
                      padding: "6px 12px",
                      fontSize: 12,
                      borderRadius: 6,
                      border: "1px solid #E5E5E5",
                      background: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(a.id)}
                    style={{
                      padding: "6px 12px",
                      fontSize: 12,
                      borderRadius: 6,
                      border: "1px solid #fecaca",
                      background: "#fff",
                      color: "#dc2626",
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
