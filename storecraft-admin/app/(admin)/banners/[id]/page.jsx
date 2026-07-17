"use client";

import { useParams } from "next/navigation";
import { BannerForm } from "@/components/banners/BannerForm";

export default function Page() {
  const params = useParams();
  const id = params?.id ? String(params.id) : "";
  if (!/^[a-f\d]{24}$/i.test(id)) return <p className="text-sm text-red-600">Invalid id</p>;
  return (
    <div className="p-0" style={{ maxWidth: "none", padding: 0 }}>
      <BannerForm bannerId={id} />
    </div>
  );
}
