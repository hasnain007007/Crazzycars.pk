/**
 * GET /api/finance/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import { buildFinanceSummary } from "@/lib/financeSummary";
import { karachiDayKey } from "@/lib/karachiDay";

export async function GET(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessCapability(user, "canViewFinancials");
    if (denied) return denied;

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const today = karachiDayKey();
    const from = searchParams.get("from") || `${today.slice(0, 7)}-01`;
    const to = searchParams.get("to") || today;

    const summary = await buildFinanceSummary({ from, to });
    return NextResponse.json({ success: true, summary });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Finance summary failed." },
      { status: 500 }
    );
  }
}
