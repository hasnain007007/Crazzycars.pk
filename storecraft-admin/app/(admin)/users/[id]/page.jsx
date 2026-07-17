"use client";

import { useParams } from "next/navigation";
import { UserForm } from "@/components/users/UserForm";

export default function Page() {
  const params = useParams();
  const id = params?.id ? String(params.id) : "";
  if (!/^[a-f\d]{24}$/i.test(id)) return <p className="text-sm text-red-600">Invalid id</p>;
  return (
    <div className="mx-auto max-w-2xl py-2">
      <UserForm userId={id} />
    </div>
  );
}
