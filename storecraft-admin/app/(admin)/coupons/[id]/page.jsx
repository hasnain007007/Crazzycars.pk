"use client";

import { useParams } from "next/navigation";
import { CouponForm } from "@/components/coupons/CouponForm";

export default function Page() {
  const params = useParams();
  const id = params?.id ? String(params.id) : "";
  if (!/^[a-f\d]{24}$/i.test(id)) return <p className="text-sm text-red-600">Invalid id</p>;
  return (
    <div className="mx-auto max-w-3xl py-2">
      <CouponForm couponId={id} />
    </div>
  );
}
