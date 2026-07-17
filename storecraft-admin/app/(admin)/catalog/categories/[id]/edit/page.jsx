"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { CategoryEditor } from "@/components/categories/CategoryEditor";

export default function EditCategoryPage() {
  const { id } = useParams();

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ margin: 0, fontSize: 14, color: "#6b7280" }}>Catalog / Categories / Edit Category</p>
        <Link href="/catalog/categories" style={{ color: "#0f766e", fontWeight: 600 }}>
          ← Back
        </Link>
      </div>
      <CategoryEditor categoryId={id} />
    </div>
  );
}
