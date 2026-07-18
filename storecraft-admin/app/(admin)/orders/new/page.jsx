import { redirect } from "next/navigation";

/** Old path — invoices are no longer orders. */
export default function OrdersNewRedirect() {
  redirect("/invoices/new");
}
