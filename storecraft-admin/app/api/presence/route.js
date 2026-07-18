import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { liveSinceDate } from "@/lib/livePresence";
import LivePresence from "@/lib/models/LivePresence.model";

export async function GET(request) {
  try {
    if (!getRequestUser(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const since = liveSinceDate();
    const rows = await LivePresence.find({ lastSeen: { $gte: since } })
      .select("sessionId path lastSeen")
      .sort({ lastSeen: -1 })
      .limit(200)
      .lean();

    const pathCounts = {};
    for (const row of rows) {
      const p = row.path || "/";
      pathCounts[p] = (pathCounts[p] || 0) + 1;
    }
    const topPaths = Object.entries(pathCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([path, count]) => ({ path, count }));

    return NextResponse.json({
      success: true,
      data: {
        liveUsers: rows.length,
        topPaths,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Failed." }, { status: 500 });
  }
}
