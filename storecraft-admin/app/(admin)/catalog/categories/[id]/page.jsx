"use client";

import { useParams } from "next/navigation";
import { CategoryEditor } from "@/components/categories/CategoryEditor";

export default function EditCategoryPage() {
  const params = useParams();
  const id = params?.id ? String(params.id) : "";

  if (!/^[a-f\d]{24}$/i.test(id)) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-[#e5e7eb] bg-white p-8 text-center text-sm text-[#6b7280] shadow-sm">
        Invalid category id.
      </div>
    );
  }

  return <CategoryEditor categoryId={id} />;
}
