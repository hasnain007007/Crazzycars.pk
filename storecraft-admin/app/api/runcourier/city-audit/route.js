import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import {
  auditRunCourierLane,
  couriersCoveringCity,
  fetchRunCourierCarriers,
  fetchRunCourierCities,
  fetchRunCourierCitiesForVendor,
  getRunCourierCityList,
  matchVendorCity,
  pickPreferredCoveringCourier,
  resolveRunCourierApiVendor,
} from "@/lib/runcourier";

export const dynamic = "force-dynamic";

async function loadSettings() {
  return (
    (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean()) ||
    (await Settings.findOne({}).lean()) ||
    {}
  );
}

/**
 * Optional per-carrier coverage for the selected Select API.
 * Returns whether that courier lists the destination, who else does, and a suggested pick.
 */
async function buildCoverage({ destination, selectedApi, settingsCourier }) {
  const dest = String(destination || "").trim();
  if (!dest) {
    return {
      selectedCovers: null,
      coveredBy: [],
      suggestedApi: "",
      suggestedCity: "",
    };
  }

  const carriersRes = await fetchRunCourierCarriers({ settingsCourier }).catch(() => ({
    carriers: [],
    rows: [],
  }));
  // Need Digi rows (id + gateway_id) for per-courier GetCitiesByApi coverage.
  const carrierRows = Array.isArray(carriersRes?.rows) ? carriersRes.rows : [];
  const apiVendor = resolveRunCourierApiVendor(selectedApi, carrierRows);

  let selectedCovers = null;
  let selectedCity = "";
  if (apiVendor) {
    const vendorCities = await fetchRunCourierCitiesForVendor(apiVendor, settingsCourier).catch(
      () => []
    );
    if (vendorCities.length) {
      selectedCity = matchVendorCity(dest, vendorCities) || "";
      selectedCovers = Boolean(selectedCity);
    }
  }

  const coveredBy = await couriersCoveringCity(
    dest,
    carrierRows,
    settingsCourier,
    selectedCovers ? "" : apiVendor
  ).catch(() => []);

  // If selected already covers, still include it for UI clarity.
  const allCovering =
    selectedCovers && selectedCity && apiVendor
      ? [
          {
            vendor: apiVendor,
            title: String(selectedApi || "").trim(),
            city: selectedCity,
          },
          ...coveredBy.filter((r) => r.vendor !== apiVendor),
        ]
      : coveredBy;

  const pick =
    selectedCovers && selectedCity
      ? { title: String(selectedApi || "").trim(), city: selectedCity }
      : pickPreferredCoveringCourier(allCovering);

  return {
    selectedCovers,
    selectedCity,
    coveredBy: allCovering,
    suggestedApi: pick?.title || "",
    suggestedCity: pick?.city || "",
  };
}

/**
 * GET ?destination=Narowal&origin=Gujranwala&selectedApi=Leopard2
 * POST { destination, origin?, selectedApi?, refresh?, includeCities? }
 *
 * Audits order/origin cities against live Run Courier GetCitiesList,
 * and optionally reports which Select API covers the destination.
 */
export async function GET(request) {
  try {
    if (!getRequestUser(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();
    const settings = await loadSettings();
    const courier = settings.courier || {};
    const { searchParams } = new URL(request.url);
    const destination = String(
      searchParams.get("destination") || searchParams.get("city") || ""
    ).trim();
    const origin = String(
      searchParams.get("origin") || courier.runCourierOriginCity || courier.originCity || "Gujranwala"
    ).trim();
    const selectedApi = String(searchParams.get("selectedApi") || searchParams.get("api") || "").trim();
    const refresh = searchParams.get("refresh") === "1";
    const includeCities = searchParams.get("includeCities") === "1";

    const cityList = refresh
      ? (await fetchRunCourierCities({ settingsCourier: courier })).cities || []
      : await getRunCourierCityList(courier);

    const audit = auditRunCourierLane({ origin, destination, cityList });
    const coverage = selectedApi
      ? await buildCoverage({
          destination: audit.destination?.matched || destination,
          selectedApi,
          settingsCourier: courier,
        })
      : null;

    return NextResponse.json({
      success: true,
      ...audit,
      ...(coverage ? { coverage } : {}),
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
    const settings = await loadSettings();
    const courier = settings.courier || {};
    const body = await request.json().catch(() => ({}));
    const destination = String(body.destination || body.city || "").trim();
    const origin = String(
      body.origin || courier.runCourierOriginCity || courier.originCity || "Gujranwala"
    ).trim();
    const selectedApi = String(body.selectedApi || body.api || "").trim();

    const cityList = body.refresh
      ? (await fetchRunCourierCities({ settingsCourier: courier })).cities || []
      : await getRunCourierCityList(courier);

    const audit = auditRunCourierLane({ origin, destination, cityList });
    const coverage = selectedApi
      ? await buildCoverage({
          destination: audit.destination?.matched || destination,
          selectedApi,
          settingsCourier: courier,
        })
      : null;

    return NextResponse.json({
      success: true,
      ...audit,
      ...(coverage ? { coverage } : {}),
      ...(body.includeCities ? { cities: cityList } : {}),
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "City audit failed." },
      { status: 500 }
    );
  }
}
