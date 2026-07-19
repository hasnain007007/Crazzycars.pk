import { Suspense } from "react";
import { InvoicesPage } from "@/components/invoices/InvoicesPage";

export default function InvoicesRoute() {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />}>
      <InvoicesPage />
    </Suspense>
  );
}
