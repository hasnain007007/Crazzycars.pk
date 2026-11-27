import { createReadStream, existsSync, statSync } from "fs";
import { Readable } from "stream";
import { NextResponse } from "next/server";
import { contentTypeForExt, resolveMediaFilePath } from "@/lib/mediaStorage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Only place media cache headers are set (next.config sets CSP only).
// Unique hashed filenames, never overwritten, so a long browser TTL is safe.
const CACHE = "public, max-age=2592000, immutable";
// Shared caches keep media a bit longer than browsers (~7d).
const CDN_CACHE = "public, s-maxage=604800, stale-while-revalidate=86400";
// A missing file may be built minutes later (-800/-1200 copies), so never cache a 404.
const NOT_FOUND_HEADERS = { "Cache-Control": "no-store", "CDN-Cache-Control": "no-store" };

function notFound() {
  return new NextResponse("Not found", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8", ...NOT_FOUND_HEADERS },
  });
}

function mediaHeaders(abs, size) {
  return {
    "Content-Type": contentTypeForExt(abs),
    "Content-Length": String(size),
    "Cache-Control": CACHE,
    "CDN-Cache-Control": CDN_CACHE,
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
  if (!abs || !existsSync(abs)) return new NextResponse(null, { status: 404, headers: NOT_FOUND_HEADERS });
  try {
    const st = statSync(abs);
    if (!st.isFile()) return new NextResponse(null, { status: 404, headers: NOT_FOUND_HEADERS });
    return new NextResponse(null, {
      status: 200,
      headers: mediaHeaders(abs, st.size),
    });
  } catch {
    return new NextResponse(null, { status: 404, headers: NOT_FOUND_HEADERS });
  }
}
