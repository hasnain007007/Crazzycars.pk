import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Lightweight liveness probe for Coolify / Docker / Traefik.
 * Must stay fast and DB-free so a slow homepage or Mongo blip cannot
 * mark the container unhealthy and drop it from the load balancer.
 */
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: "storecraft-store",
      ts: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}

export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
