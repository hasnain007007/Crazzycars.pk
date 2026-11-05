import { NextResponse } from "next/server";
import { getServerStoreSettings } from "@/lib/serverSettings";

export const dynamic = "force-dynamic";

/**
 * /review → permanent redirect to Google review URL when set; otherwise 404.
 */
export async function GET() {
  try {
    const settings = await getServerStoreSettings();
    const url = String(
      settings?.general?.googleReviewUrl || settings?.googleReviewUrl || ""
    ).trim();
    if (url && /^https?:\/\//i.test(url)) {
      return NextResponse.redirect(url, 301);
    }
  } catch (e) {
    console.error("[/review]", e?.message || e);
  }
  return new NextResponse("Not found", { status: 404 });
}
