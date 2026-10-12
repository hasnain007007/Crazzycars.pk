import { Suspense } from "react";
import { CreateInvoiceForm } from "@/components/invoices/CreateInvoiceForm";

export default function NewInvoicePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl animate-pulse space-y-4 p-4">
          <div className="h-8 w-64 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-40 rounded-xl bg-slate-200 dark:bg-slate-800" />
        </div>
      }
    >
      <CreateInvoiceForm />
    </Suspense>
  );
}
