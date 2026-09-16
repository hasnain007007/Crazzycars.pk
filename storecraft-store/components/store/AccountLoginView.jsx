"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

export function AccountLoginView() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/customer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Login failed");
        return;
      }
      toast.success("Welcome back!");
      router.push("/account");
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16" style={{ color: "#E8E8E8" }}>
      <h1 className="text-2xl font-bold text-[#E8E8E8]">Sign in</h1>
      <p className="mt-1 text-sm text-[#707070]">Access your ${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'} orders and saved profile.</p>
      <form onSubmit={submit} className="mt-8 space-y-4 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] p-5">
        <input
          type="email"
          required
          className="w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#222222] px-3 py-2.5 text-sm text-[#E8E8E8]"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          required
          className="w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#222222] px-3 py-2.5 text-sm text-[#E8E8E8]"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl py-3 text-sm font-semibold text-[#0A0A0A] disabled:opacity-50" style={{ background: "linear-gradient(135deg, #F0C040, #D4AF37, #B01C1C)" }}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-[#707070]">
        No account?{" "}
        <Link href="/account/register" className="font-semibold text-[#D4AF37] hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
