import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Settings from "@/lib/models/Settings.model";

export async function GET() {
  try {
    await dbConnect();
    const settings = await Settings.findOne({}).select("payment").lean();

    const clientId = settings?.payment?.paypal?.clientId || "";
    const mode = settings?.payment?.paypal?.mode || "sandbox";

    return NextResponse.json({
      success: true,
      clientId,
      mode,
      enabled: !!clientId,
    });
  } catch {
    return NextResponse.json({
      success: false,
      clientId: "",
      enabled: false,
    });
  }
}
