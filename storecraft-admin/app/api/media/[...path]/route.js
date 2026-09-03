import { createReadStream, existsSync, statSync } from "fs";
import { NextResponse } from "next/server";
import { Readable } from "stream";
import { contentTypeForExt, resolveMediaFilePath } from "@/lib/mediaStorage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function serveMedia(params) {
  const parts = params?.path;
  const rel = Array.isArray(parts) ? parts.join("/") : String(parts || "");
  const abs = resolveMediaFilePath(rel);
  if (!abs || !existsSync(abs)) {
    return new NextResponse("Not found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  try {
    const st = statSync(abs);
    if (!st.isFile()) {
      return new NextResponse("Not found", {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
      });
    }
    const stream = createReadStream(abs);
    const webStream = Readable.toWeb(stream);
    return new NextResponse(webStream, {
      status: 200,
      headers: {
        "Content-Type": contentTypeForExt(abs),
        "Content-Length": String(st.size),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
}

export async function GET(_request, context) {
  const params = await context.params;
  return serveMedia(params);
}
