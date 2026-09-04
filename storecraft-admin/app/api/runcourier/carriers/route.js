import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import {
  fetchRunCourierCarriers,
  fetchRunCourierCities,
  RUN_COURIER_APIS,
  testRunCourierConnection,
} from "@/lib/runcourier";

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
    const { searchParams } = new URL(request.url);
    const type = String(searchParams.get("type") || "carriers").toLowerCase();

    if (type === "test") {
      const result = await testRunCourierConnection({ settingsCourier: settings.courier });
      return NextResponse.json(result, { status: result.success ? 200 : 400 });
    }

    if (type === "cities") {
      const result = await fetchRunCourierCities({ settingsCourier: settings.courier });
      return NextResponse.json({ success: true, cities: result.cities || [] });
    }

    const carriers = await fetchRunCourierCarriers({ settingsCourier: settings.courier });
    return NextResponse.json({
      success: true,
      carriers: carriers.carriers?.length ? carriers.carriers : RUN_COURIER_APIS,
      source: carriers.source || "fallback",
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Failed.", carriers: RUN_COURIER_APIS },
      { status: 500 }
    );
  }
}
