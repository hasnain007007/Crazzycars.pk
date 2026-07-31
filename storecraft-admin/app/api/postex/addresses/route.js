import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { fetchPostexMerchantAddresses, resolvePostexApiKey } from "@/lib/postex";

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
        { success: false, error: "Postex API key not configured.", addresses: [] },
        { status: 400 }
      );
    }
    const addresses = await fetchPostexMerchantAddresses(apiKey);
    const selectedCode = String(settings.courier?.postexAddressCode || "").trim();
    const selected = addresses.find((a) => a.addressCode === selectedCode) || null;
    return NextResponse.json({
      success: true,
      addresses,
      selectedCode,
      selected,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Failed to load addresses.", addresses: [] },
      { status: 500 }
    );
  }
}
