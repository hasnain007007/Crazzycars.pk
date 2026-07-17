"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { roleBadgeClass } from "@/lib/userUi";

const ROLES = [
  {
    id: "superadmin",
    title: "Super Admin",
    desc: "Full access including settings and user management.",
  },
  {
    id: "admin",
    title: "Admin",
    desc: "Full catalog and orders access; user management restricted.",
  },
  { id: "editor", title: "Editor", desc: "Manage products, orders, and content." },
  { id: "viewer", title: "Viewer", desc: "Read-only access to the admin panel." },
];

function strength(pw) {
  let s = 0;
  if (pw.length >= 8) s += 1;
  if (/[A-Z]/.test(pw)) s += 1;
  if (/[0-9]/.test(pw)) s += 1;
  if (/[^A-Za-z0-9]/.test(pw)) s += 1;
  return s;
}

export function UserForm({ userId }) {
  const router = useRouter();
  const isEdit = Boolean(userId);
  const [me, setMe] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [role, setRole] = useState("editor");
  const [status, setStatus] = useState("active");
  const [saving, setSaving] = useState(false);

  const loadMe = useCallback(async () => {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    const json = await res.json();
    if (json.success) setMe(json.user);
  }, []);

  const loadUser = useCallback(async () => {
    if (!userId) return;
    const res = await fetch(`/api/users/${userId}`, { credentials: "include" });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast.error("Not found");
      return;
    }
    const u = json.user;
    setName(u.name || "");
    setEmail(u.email || "");
    setRole(u.role || "editor");
    setStatus(u.status || "active");
  }, [userId]);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  useEffect(() => {
    if (userId) loadUser();
  }, [userId, loadUser]);

  const self = me?.id && userId && me.id === userId;

  async function save(e) {
    e.preventDefault();
    if (!isEdit && !password) {
      toast.error("Password is required");
      return;
    }
    setSaving(true);
    try {
      const body = { name, email, role, status };
      if (password) body.password = password;
      const url = isEdit ? `/api/users/${userId}` : "/api/users";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Save failed");
        return;
      }
      toast.success("Saved");
      router.push("/users");
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  if (me && me.role !== "superadmin") {
    return <p className="text-sm text-red-600">Superadmin access required.</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/users" className="text-sm text-[#1d6fb8] hover:underline">
        ← Team
      </Link>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{isEdit ? "Edit user" : "New user"}</h1>
      <form onSubmit={save} className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
        <div>
          <label className="text-xs font-medium text-slate-600">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
            required
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
            required
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Password {isEdit ? "(optional)" : ""}</label>
          <div className="mt-1 flex gap-2">
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
            />
            <button type="button" className="rounded border px-2 text-sm" onClick={() => setShowPw((s) => !s)}>
              {showPw ? "Hide" : "Show"}
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500">Strength: {strength(password)}/4</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-600">Role</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                disabled={self}
                onClick={() => setRole(r.id)}
                className={[
                  "rounded-lg border p-3 text-left text-sm transition",
                  role === r.id ? "border-[#1d6fb8] bg-[#eff6ff]" : "border-slate-200 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800",
                  self ? "cursor-not-allowed opacity-80" : "",
                ].join(" ")}
              >
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${roleBadgeClass(r.id)}`}>
                  {r.title}
                </span>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{r.desc}</p>
              </button>
            ))}
          </div>
          {self ? <p className="mt-2 text-xs text-amber-700">You cannot change your own role.</p> : null}
        </div>
        <div className="flex items-center gap-2">
          <input
            id="st"
            type="checkbox"
            checked={status === "active"}
            onChange={(e) => setStatus(e.target.checked ? "active" : "inactive")}
            disabled={self && status === "active"}
          />
          <label htmlFor="st" className="text-sm">
            Active
          </label>
        </div>
        {self ? <p className="text-xs text-amber-700">You cannot deactivate your own account.</p> : null}
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-[#1d6fb8] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save user"}
        </button>
      </form>
    </div>
  );
}
