import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { fetchPostexTracking } from "@/lib/postex";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    if (!getRequestUser(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const trackingNumber = String(searchParams.get("trackingNumber") || "").trim();
    if (!trackingNumber) {
      return NextResponse.json(
        { success: false, error: "Invalid tracking number" },
        { status: 400 }
      );
    }

    await dbConnect();
    const settings =
      (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean()) ||
      (await Settings.findOne({}).lean());

    const result = await fetchPostexTracking(trackingNumber, {
      settingsCourier: settings?.courier,
    });
    const status = result.success ? 200 : result.error === "Tracking unavailable" ? 503 : 404;
    return NextResponse.json(result, { status });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Could not connect to courier" },
      { status: 500 }
    );
  }
}
