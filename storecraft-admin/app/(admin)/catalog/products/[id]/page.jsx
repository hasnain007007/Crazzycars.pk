/**
 * Edit product — full-page editor.
 */
"use client";

import { useParams } from "next/navigation";
import { ProductEditor } from "@/components/products/ProductEditor";

export default function EditProductPage() {
  const params = useParams();
  const id = params?.id ? String(params.id) : "";

  if (!/^[a-f\d]{24}$/i.test(id)) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-[#e5e7eb] bg-white p-8 text-center text-sm text-[#6b7280] shadow-sm">
        Invalid product id.
      </div>
    );
  }

  return <ProductEditor mode="edit" productId={id} />;
}
