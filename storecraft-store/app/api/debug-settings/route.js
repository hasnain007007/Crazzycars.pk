import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Settings from "@/lib/models/Settings.model";

export async function GET() {
  try {
    await dbConnect();
    const settings = await Settings.findOne({}).select("whatsapp general.storeName").lean();
    return NextResponse.json({
      whatsapp: settings?.whatsapp,
      storeName: settings?.general?.storeName,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message });
  }
}
