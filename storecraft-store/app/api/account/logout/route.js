import { NextResponse } from "next/server";
import { clearStoreCustomerAuthCookies } from "@/lib/storeAuth";

export async function POST() {
  const res = NextResponse.json({ success: true });
  clearStoreCustomerAuthCookies(res);
  return res;
}
