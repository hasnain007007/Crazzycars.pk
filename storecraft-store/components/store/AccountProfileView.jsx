"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export function AccountProfileView() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [addr, setAddr] = useState({ street: "", city: "", state: "", country: "", zip: "" });

  useEffect(() => {
    fetch("/api/customer/me", { credentials: "include" })
      .then((r) => {
        if (r.status === 401) {
          router.replace("/account/login");
          return null;
        }
        return r.json();
      })
      .then((j) => {
        if (!j?.success) return;
        const c = j.customer;
        setName(c.name || "");
        setPhone(c.phone || "");
        const a = c.address || {};
        setAddr({
          street: a.street || "",
          city: a.city || "",
          state: a.state || "",
          country: a.country || "",
          zip: a.zip || "",
        });
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { name, phone, address: addr };
      if (password.trim()) body.password = password.trim();
      const res = await fetch("/api/customer/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Save failed");
        return;
      }
      toast.success("Profile saved");
      setPassword("");
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="h-64 animate-pulse rounded-2xl bg-zinc-200" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Link href="/account" className="text-sm font-medium text-emerald-700 hover:underline">
        ← Account
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-zinc-900">Profile</h1>
      <form onSubmit={save} className="mt-8 space-y-4">
        <input required className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
        <input className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" />
        <p className="text-xs font-semibold uppercase text-zinc-500">Default address</p>
        <input className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm" value={addr.street} onChange={(e) => setAddr((s) => ({ ...s, street: e.target.value }))} placeholder="Street" />
        <div className="grid gap-3 sm:grid-cols-2">
          <input className="rounded-xl border border-zinc-200 px-3 py-2 text-sm" value={addr.city} onChange={(e) => setAddr((s) => ({ ...s, city: e.target.value }))} placeholder="City" />
          <input className="rounded-xl border border-zinc-200 px-3 py-2 text-sm" value={addr.state} onChange={(e) => setAddr((s) => ({ ...s, state: e.target.value }))} placeholder="State" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input className="rounded-xl border border-zinc-200 px-3 py-2 text-sm" value={addr.zip} onChange={(e) => setAddr((s) => ({ ...s, zip: e.target.value }))} placeholder="ZIP" />
          <input className="rounded-xl border border-zinc-200 px-3 py-2 text-sm" value={addr.country} onChange={(e) => setAddr((s) => ({ ...s, country: e.target.value }))} placeholder="Country" />
        </div>
        <p className="text-xs font-semibold uppercase text-zinc-500">New password (optional)</p>
        <input type="password" className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave blank to keep current" />
        <button type="submit" disabled={saving} className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50">
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
