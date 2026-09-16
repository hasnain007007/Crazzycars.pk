"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/currency";

export function AccountOrdersView() {
  const router = useRouter();
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    fetch("/api/customer/orders", { credentials: "include" })
      .then((r) => {
        if (r.status === 401) {
          router.replace("/account/login");
          return null;
        }
        return r.json();
      })
      .then((j) => {
        if (j?.success) setOrders(j.orders || []);
        else if (j) setOrders([]);
      });
  }, [router]);

  if (!orders) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="h-40 animate-pulse rounded-2xl bg-[#1A1A1A]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 text-[#E8E8E8]">
      <Link href="/account" className="text-sm font-medium text-[#D4AF37] hover:underline">
        ← Account
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-[#E8E8E8]">My orders</h1>
      {!orders.length ? (
        <p className="mt-6 text-sm text-[#B0B0B0]">You have not placed any orders yet while signed in.</p>
      ) : (
        <ul className="mt-8 space-y-3">
          {orders.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] px-4 py-3 text-sm shadow-sm">
              <div>
                <p className="tabular-nums font-semibold text-[#E8E8E8]">{o.orderNumber}</p>
                <p className="text-xs text-[#707070]">{o.createdAt ? new Date(o.createdAt).toLocaleString() : ""}</p>
              </div>
              <div className="text-right">
                <p className="price font-semibold text-[#D4AF37]">{formatPrice(o.total)}</p>
                <p className="text-xs capitalize text-[#707070]">
                  {o.orderStatus} · {o.paymentStatus}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
