"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

export function AccountRegisterView() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/account/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, phone, password }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Registration failed");
        return;
      }
      toast.success("Account created!");
      router.push("/account");
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold text-zinc-900">Create account</h1>
      <p className="mt-1 text-sm text-zinc-600">Save your details for faster checkout next time.</p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <input required className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
        <input required type="email" className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm" placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input required type="password" minLength={8} className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm" placeholder="Password (8+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit" disabled={loading} className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50">
          {loading ? "Creating…" : "Register"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-600">
        Already have an account?{" "}
        <Link href="/account/login" className="font-semibold text-emerald-700 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
