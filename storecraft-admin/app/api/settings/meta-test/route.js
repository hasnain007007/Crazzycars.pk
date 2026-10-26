/**
 * Check the Meta Pixel + Conversions API settings against Meta.
 * Uses the values typed in the form when given, else the saved ones.
 * Validates the token by reading the pixel (no event sent); when a test event code
 * is set, also sends one PageView for Events Manager → Test Events. A code that does not
 * match an open Test Events session makes Meta process that event normally.
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";

const GRAPH = "https://graph.facebook.com/v21.0";

async function metaJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export async function POST(request) {
  const user = getRequestUser(request);
  const denied = denyUnlessCapability(user, "canManageSettings");
  if (denied) return denied;

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  await dbConnect();
  const doc = await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY })
    .select("seo.facebookPixelId seo.metaCapiAccessToken seo.metaCapiTestEventCode")
    .lean();
  const seo = doc?.seo || {};
  const pixelId = String(body.pixelId || seo.facebookPixelId || "").trim();
  const accessToken = String(body.accessToken || seo.metaCapiAccessToken || "").trim();
  const testEventCode = String(
    body.testEventCode !== undefined ? body.testEventCode : seo.metaCapiTestEventCode || ""
  ).trim();

  if (!/^\d{6,20}$/.test(pixelId)) {
    return NextResponse.json({ ok: false, error: "Pixel ID must be the number from Events Manager." });
  }
  if (!accessToken) {
    return NextResponse.json({
      ok: false,
      error: "No Conversions API token yet. Only the browser Pixel is sending events.",
    });
  }

  try {
    const res = await fetch(
      `${GRAPH}/${encodeURIComponent(pixelId)}?fields=id,name,last_fired_time&access_token=${encodeURIComponent(accessToken)}`,
      { cache: "no-store", signal: AbortSignal.timeout(10000) }
    );
    const data = await metaJson(res);
    // Conversions API tokens from Events Manager may only send events, so reading the
    // pixel answers "(#100) Missing Permission". That still proves Meta accepted the
    // token; a bad or expired token fails with code 190 instead.
    const readOnlyDenied = data.error && Number(data.error.code) === 100;
    if ((!res.ok || data.error) && !readOnlyDenied) {
      return NextResponse.json({
        ok: false,
        error: `Meta rejected the token: ${data.error?.message || `HTTP ${res.status}`}`,
      });
    }

    let testEvent = null;
    if (testEventCode) {
      const evRes = await fetch(`${GRAPH}/${encodeURIComponent(pixelId)}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({
          data: [
            {
              event_name: "PageView",
              event_time: Math.floor(Date.now() / 1000),
              action_source: "website",
              event_source_url: "https://crazzycars.pk/",
              user_data: { client_user_agent: "CrazzyCars admin connection test" },
            },
          ],
          test_event_code: testEventCode,
          access_token: accessToken,
        }),
      });
      const evData = await metaJson(evRes);
      testEvent = evData.error
        ? { ok: false, error: evData.error.message }
        : { ok: true, received: Number(evData.events_received) || 0 };
    }

    return NextResponse.json({
      ok: true,
      pixelName: readOnlyDenied ? "" : data.name || "",
      lastFiredTime: readOnlyDenied ? null : data.last_fired_time || null,
      sendOnlyToken: Boolean(readOnlyDenied),
      testEvent,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: `Could not reach Meta: ${e?.message || e}` });
  }
}
