import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isAuthorized(request) {
  const secret = String(process.env.REVALIDATE_SECRET || "").trim();
  if (!secret) return false;
  const header =
    request.headers.get("x-revalidate-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";
  // Query-string secrets rejected — they leak via access logs / Referer.
  return header === secret;
}

/**
 * On-demand purge for storefront settings/homepage ISR + data cache.
 * Called by admin after Settings saves so Brands Carousel etc. update immediately.
 */
export async function POST(request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    let paths = ["/", "/api/settings"];
    try {
      const body = await request.json();
      if (Array.isArray(body?.paths) && body.paths.length) {
        paths = body.paths.map((p) => String(p || "").trim()).filter(Boolean);
      }
    } catch {
      /* empty body is fine */
    }

    revalidateTag("store-settings");
    for (const path of paths) {
      revalidatePath(path);
      // Category listings are ISR — purge the whole segment when catalog changes.
      if (path === "/categories" || path.startsWith("/categories/")) {
        revalidatePath("/categories", "layout");
      }
    }
    revalidatePath("/", "layout");
    revalidatePath("/shop", "layout");

    return NextResponse.json({
      success: true,
      revalidated: true,
      tags: ["store-settings"],
      paths,
      at: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Revalidate failed" },
      { status: 500 }
    );
  }
}
