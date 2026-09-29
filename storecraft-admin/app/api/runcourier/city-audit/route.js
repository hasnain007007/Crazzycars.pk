import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import {
  auditRunCourierLane,
  fetchRunCourierCities,
  getRunCourierCityList,
} from "@/lib/runcourier";

export const dynamic = "force-dynamic";

/**
 * GET ?destination=Narowal&origin=Gujranwala
 * POST { destination, origin?, refresh?, includeCities? }
 *
 * Audits order/origin cities against live Run Courier GetCitiesList.
 */
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
    const courier = settings.courier || {};
    const { searchParams } = new URL(request.url);
    const destination = String(searchParams.get("destination") || searchParams.get("city") || "").trim();
    const origin = String(
      searchParams.get("origin") || courier.runCourierOriginCity || courier.originCity || "Gujranwala"
    ).trim();
    const refresh = searchParams.get("refresh") === "1";
    const includeCities = searchParams.get("includeCities") === "1";

    const cityList = refresh
      ? (await fetchRunCourierCities({ settingsCourier: courier })).cities || []
      : await getRunCourierCityList(courier);

    const audit = auditRunCourierLane({ origin, destination, cityList });
    return NextResponse.json({
      success: true,
      ...audit,
      ...(includeCities ? { cities: cityList } : {}),
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "City audit failed." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    if (!getRequestUser(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();
    const settings =
      (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean()) ||
      (await Settings.findOne({}).lean()) ||
      {};
    const courier = settings.courier || {};
    const body = await request.json().catch(() => ({}));
    const destination = String(body.destination || body.city || "").trim();
    const origin = String(
      body.origin || courier.runCourierOriginCity || courier.originCity || "Gujranwala"
    ).trim();

    const cityList = body.refresh
      ? (await fetchRunCourierCities({ settingsCourier: courier })).cities || []
      : await getRunCourierCityList(courier);

    const audit = auditRunCourierLane({ origin, destination, cityList });
    return NextResponse.json({
      success: true,
      ...audit,
      ...(body.includeCities ? { cities: cityList } : {}),
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "City audit failed." },
      { status: 500 }
    );
  }
}
