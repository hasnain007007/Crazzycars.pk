"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function AccountHubView() {
  const router = useRouter();
  const [customer, setCustomer] = useState(undefined);

  useEffect(() => {
    fetch("/api/customer/me", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setCustomer(j.customer);
        else setCustomer(null);
      })
      .catch(() => setCustomer(null));
  }, []);

  if (customer === undefined) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <div className="h-8 w-40 animate-pulse rounded bg-[#1A1A1A]" />
      </div>
    );
  }

  if (!customer) {
    router.replace("/account/login");
    return null;
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-12 text-[#E8E8E8]">
      <h1 className="text-2xl font-bold text-[#E8E8E8]">Hello, {customer.name}</h1>
      <p className="text-sm text-[#B0B0B0]">{customer.email}</p>
      <div className="grid gap-3">
        <Link href="/account/orders" className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] px-4 py-3 font-medium text-[#E8E8E8] shadow-sm hover:bg-[#1A1A1A]">
          My orders
        </Link>
        <Link href="/account/profile" className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] px-4 py-3 font-medium text-[#E8E8E8] shadow-sm hover:bg-[#1A1A1A]">
          Profile &amp; address
        </Link>
        <button
          type="button"
          className="rounded-xl border border-[rgba(248,113,113,0.35)] bg-[#111111] px-4 py-3 text-left font-medium text-[#f87171] hover:bg-[rgba(248,113,113,0.08)]"
          onClick={async () => {
            await fetch("/api/customer/logout", { method: "POST", credentials: "include" });
            router.replace("/");
            router.refresh();
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
