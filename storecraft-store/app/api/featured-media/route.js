import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import FeaturedMedia from "@/lib/models/FeaturedMedia.model";

export async function GET() {
  try {
    await dbConnect();
    const items = await FeaturedMedia.find({ enabled: true }).sort({ sortOrder: 1, createdAt: -1 }).lean();
    return NextResponse.json(
      {
        success: true,
        items: JSON.parse(JSON.stringify(items)),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Failed to load media." }, { status: 500 });
  }
}
