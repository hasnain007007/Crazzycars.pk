/**
 * Admin orders list.
 */
import { Suspense } from "react";
import { OrdersPage } from "@/components/orders/OrdersPage";

export default function OrdersListPage() {
  return (
    <div className="w-full max-w-none">
      <Suspense
        fallback={
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Loading orders…
          </div>
        }
      >
        <OrdersPage />
      </Suspense>
    </div>
  );
}
