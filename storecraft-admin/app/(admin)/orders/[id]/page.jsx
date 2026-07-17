/**
 * Single order detail.
 */
"use client";

import { useParams } from "next/navigation";
import { OrderDetail } from "@/components/orders/OrderDetail";

export default function OrderDetailPage() {
  const params = useParams();
  const id = params?.id ? String(params.id) : "";

  if (!/^[a-f\d]{24}$/i.test(id)) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        Invalid order id.
      </div>
    );
  }

  return <OrderDetail orderId={id} />;
}
