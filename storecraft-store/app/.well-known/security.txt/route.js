import { NextResponse } from "next/server";
import { STORE_CONTACT } from "@/config/store-policy";

export const dynamic = "force-dynamic";
export const revalidate = 86400;

/**
 * RFC 9116 security.txt — contact only from confirmed store config.
 * No street address or invented registration numbers.
 */
export async function GET() {
  const email = String(STORE_CONTACT.email || "info@crazzycars.pk").trim();
  const expires = new Date();
  expires.setUTCFullYear(expires.getUTCFullYear() + 1);
  const body = [
    `Contact: mailto:${email}`,
    "Preferred-Languages: en, ur",
    `Expires: ${expires.toISOString()}`,
    "Canonical: https://crazzycars.pk/.well-known/security.txt",
    "",
  ].join("\n");

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
