"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CategoryEditor } from "@/components/categories/CategoryEditor";

function NewCategoryPageInner() {
  const searchParams = useSearchParams();
  const initialParentId = searchParams.get("parent") || "";

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ margin: 0, fontSize: 14, color: "#6b7280" }}>Catalog / Categories / New Category</p>
        <Link href="/catalog/categories" style={{ color: "#0f766e", fontWeight: 600 }}>
          ← Back
        </Link>
      </div>
      <CategoryEditor initialParentId={initialParentId} />
    </div>
  );
}

export default function NewCategoryPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: "#9ca3af" }}>Loading...</div>}>
      <NewCategoryPageInner />
    </Suspense>
  );
}
