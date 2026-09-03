import { existsSync, readFileSync, statSync } from "fs";
import { NextResponse } from "next/server";
import { contentTypeForExt, resolveMediaFilePath } from "@/lib/mediaStorage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function notFound() {
  return new NextResponse("Not found", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

async function serveMedia(params) {
  const parts = params?.path;
  const rel = Array.isArray(parts) ? parts.join("/") : String(parts || "");
  const abs = resolveMediaFilePath(rel);
  if (!abs || !existsSync(abs)) return notFound();

  try {
    const st = statSync(abs);
    if (!st.isFile()) return notFound();
    const buf = readFileSync(abs);
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentTypeForExt(abs),
        "Content-Length": String(buf.length),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("[media]", rel, err?.message || err);
    return notFound();
  }
}

export async function GET(_request, context) {
  const params = await context.params;
  return serveMedia(params);
}
