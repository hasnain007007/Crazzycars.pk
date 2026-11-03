import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

/**
 * Lightweight liveness probe for Coolify / Traefik — no Mongo, no catalog counts.
 * Use /api/health for a deeper DB check.
 */
export async function GET() {
  return NextResponse.json(
    { ok: true, service: "storecraft-store", ts: new Date().toISOString() },
    { status: 200, headers: NO_STORE }
  );
}

export async function HEAD() {
  return new NextResponse(null, { status: 200, headers: NO_STORE });
}
