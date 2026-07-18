import { NextResponse } from "next/server";
import { isShopifyEnabled } from "@/lib/shopify";

export function GET() {
  return NextResponse.json({ enabled: isShopifyEnabled() });
}
