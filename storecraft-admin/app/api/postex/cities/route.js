import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { fetchPostexOperationalCities, resolvePostexApiKey } from "@/lib/postex";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    if (!getRequestUser(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();
    const settings =
      (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean()) ||
      (await Settings.findOne({}).lean()) ||
      {};
    const apiKey = resolvePostexApiKey(settings.courier);
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Postex API key not configured.", cities: [] },
        { status: 400 }
      );
    }
    const cities = await fetchPostexOperationalCities(apiKey);
    return NextResponse.json({ success: true, cities });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Failed to load cities.", cities: [] },
      { status: 500 }
    );
  }
}
