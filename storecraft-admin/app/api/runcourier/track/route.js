import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { fetchRunCourierTracking } from "@/lib/runcourier";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    if (!getRequestUser(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const trackingNumber = String(
      searchParams.get("trackingNumber") || searchParams.get("tn") || ""
    ).trim();
    if (!trackingNumber) {
      return NextResponse.json({ success: false, error: "Tracking number required." }, { status: 400 });
    }

    await dbConnect();
    const settings =
      (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean()) ||
      (await Settings.findOne({}).lean()) ||
      {};

    const result = await fetchRunCourierTracking(trackingNumber, {
      settingsCourier: settings.courier,
    });
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    if (result.raw) delete result.raw;
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Track failed." },
      { status: 500 }
    );
  }
}
