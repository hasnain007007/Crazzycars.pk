import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";

async function getPayPalAccessToken(clientId, clientSecret, mode) {
  const baseUrl =
    mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await res.json();
  return data.access_token || null;
}

export async function GET(request) {
  try {
    if (!getRequestUser(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const settings =
      (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).select("payment").lean()) ||
      (await Settings.findOne({}).select("payment").lean());

    const clientId = settings?.payment?.paypal?.clientId || "";
    const clientSecret = settings?.payment?.paypal?.clientSecret || "";
    const mode = settings?.payment?.paypal?.mode || "sandbox";

    if (!clientId || !clientSecret) {
      return NextResponse.json({
        success: false,
        error: "PayPal credentials not configured. Add Client ID and Secret first.",
      });
    }

    const token = await getPayPalAccessToken(clientId, clientSecret, mode);

    if (token) {
      return NextResponse.json({
        success: true,
        message: `PayPal connected successfully (${mode} mode)`,
        mode,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: "Invalid PayPal credentials. Check your Client ID and Secret.",
      });
    }
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "PayPal connection test failed" },
      { status: 400 }
    );
  }
}
