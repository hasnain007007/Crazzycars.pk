import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate" };
const SERVICE = "storecraft-admin";
const PING_MS = 4000;

async function probe() {
  const started = Date.now();
  try {
    await dbConnect();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Mongo connection has no db handle");
    }
    await Promise.race([
      db.admin().command({ ping: 1 }),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Mongo ping timed out")), PING_MS);
      }),
    ]);
    return NextResponse.json(
      {
        ok: true,
        service: SERVICE,
        db: "ok",
        ts: new Date().toISOString(),
        ms: Date.now() - started,
      },
      { status: 200, headers: NO_STORE }
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        service: SERVICE,
        db: "error",
        error: String(err?.message || err).slice(0, 200),
        ts: new Date().toISOString(),
        ms: Date.now() - started,
      },
      { status: 503, headers: NO_STORE }
    );
  }
}

export async function GET() {
  return probe();
}

export async function HEAD() {
  const res = await probe();
  return new NextResponse(null, {
    status: res.status,
    headers: NO_STORE,
  });
}
