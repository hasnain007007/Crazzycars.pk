import { NextResponse } from "next/server";
import { CARRIERS, loadSettings } from "@/lib/orderhub-couriers";
import { requireKey } from "@/lib/orderhub";

export const dynamic = "force-dynamic";

/** Couriers this website can book through (for the Order Hub courier picker). */
export async function GET(req) {
  const denied = requireKey(req, "write");
  if (denied) return denied;
  const settings = await loadSettings();
  return NextResponse.json({ carriers: CARRIERS.map((c) => c.describe(settings.courier || {})) });
}
