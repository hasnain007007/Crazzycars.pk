import { createReadStream, existsSync, statSync } from "fs";
import { Readable } from "stream";
import { NextResponse } from "next/server";
import { contentTypeForExt, resolveMediaFilePath } from "@/lib/mediaStorage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CACHE = "public, max-age=31536000, immutable";

function notFound() {
  return new NextResponse("Not found", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function mediaHeaders(abs, size) {
  return {
    "Content-Type": contentTypeForExt(abs),
    "Content-Length": String(size),
    "Cache-Control": CACHE,
    "X-Content-Type-Options": "nosniff",
    // Hint browsers/CDNs this is immutable hashed media.
    "Accept-Ranges": "bytes",
  };
}

async function serveMedia(params) {
  const parts = params?.path;
  const rel = Array.isArray(parts) ? parts.join("/") : String(parts || "");
  const abs = resolveMediaFilePath(rel);
  if (!abs || !existsSync(abs)) return notFound();

  try {
    const st = statSync(abs);
    if (!st.isFile()) return notFound();
    // Stream instead of readFileSync — keeps memory flat under concurrent image loads.
    const nodeStream = createReadStream(abs);
    const webStream = Readable.toWeb(nodeStream);
    return new NextResponse(webStream, {
      status: 200,
      headers: mediaHeaders(abs, st.size),
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

export async function HEAD(_request, context) {
  const params = await context.params;
  const parts = params?.path;
  const rel = Array.isArray(parts) ? parts.join("/") : String(parts || "");
  const abs = resolveMediaFilePath(rel);
  if (!abs || !existsSync(abs)) return new NextResponse(null, { status: 404 });
  try {
    const st = statSync(abs);
    if (!st.isFile()) return new NextResponse(null, { status: 404 });
    return new NextResponse(null, {
      status: 200,
      headers: mediaHeaders(abs, st.size),
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
