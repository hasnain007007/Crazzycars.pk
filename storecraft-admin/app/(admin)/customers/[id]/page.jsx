"use client";

import { useParams } from "next/navigation";
import { CustomerDetailPage } from "@/components/customers/CustomerDetailPage";

export default function Page() {
  const params = useParams();
  const id = params?.id ? String(params.id) : "";
  if (!/^[a-f\d]{24}$/i.test(id)) {
    return <div className="text-sm text-red-600">Invalid customer id.</div>;
  }
  return (
    <div className="mx-auto max-w-6xl">
      <CustomerDetailPage customerId={id} />
    </div>
  );
}
