import { redirect } from "next/navigation";

export const metadata = { title: "Shipping" };

export default function Page() {
  redirect("/shipping");
}
