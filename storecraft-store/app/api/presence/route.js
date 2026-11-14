import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import DailyVisitor from "@/lib/models/DailyVisitor.model";
import LivePresence from "@/lib/models/LivePresence.model";
import { karachiDayKey } from "@/lib/karachiDay";
import { geoFromRequest } from "@/lib/presenceGeo";
import { cachedIpGeo, clientIpFromHeaders, deviceLabelFromUserAgent } from "@/lib/customerIp";
import { isBotUserAgent, visitSource } from "@/lib/visitSource";
import { PAID_TRAFFIC_COOKIE } from "@/lib/paidTraffic";

const SESSION_RE = /^[a-zA-Z0-9_-]{8,80}$/;

function cleanPath(raw) {
  let path = String(raw || "/").trim().slice(0, 300) || "/";
  if (!path.startsWith("/")) path = `/${path}`;
  return path;
}

/**
 * Storefront heartbeat (LivePresenceBeacon): every 60 s and on each page change.
 * Feeds Admin › Dashboard › Live visitors (who is on the site, from which city, which page)
 * and the daily unique-visitor count.
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const sessionId = String(body.sessionId || "").trim();
    if (!SESSION_RE.test(sessionId)) {
      return NextResponse.json({ success: false, error: "Invalid session." }, { status: 400 });
    }

    const ua = String(request.headers.get("user-agent") || "").slice(0, 300);
    // Googlebot & co. run our JS too; they are not shoppers.
    if (isBotUserAgent(ua)) return NextResponse.json({ success: true, ok: true, skipped: "bot" });

    const path = cleanPath(body.path);
    const isPageView = body.nav === true;
    const now = new Date();
    const dayKey = karachiDayKey(now);
    const ip = clientIpFromHeaders(request);

    const $set = {
      sessionId,
      path,
      lastSeen: now,
      userAgent: ua,
      device: deviceLabelFromUserAgent(ua),
    };
    // Location headers exist only behind Vercel / Cloudflare; otherwise the IP lookup below fills it.
    const headerGeo = geoFromRequest(request);
    if (headerGeo.city) $set.city = headerGeo.city.slice(0, 80);
    if (headerGeo.region) $set.region = headerGeo.region.slice(0, 80);
    if (headerGeo.countryCode) $set.countryCode = headerGeo.countryCode;
    if (headerGeo.country) $set.country = headerGeo.country.slice(0, 80);

    const ownHost = String(request.headers.get("host") || "").split(":")[0];
    const { source, referrerHost } = visitSource({
      referrer: String(body.ref || "").slice(0, 500),
      search: String(body.q || "").slice(0, 500),
      ownHost,
      paidCookie: request.cookies.get(PAID_TRAFFIC_COOKIE)?.value || "",
    });

    await dbConnect();
    const [doc] = await Promise.all([
      LivePresence.findOneAndUpdate(
        { sessionId },
        {
          $set,
          // A new visit (the record expires 10 min after the last heartbeat).
          $setOnInsert: { landingPath: path, firstSeen: now, source, referrerHost },
          ...(isPageView ? { $inc: { pageViews: 1 } } : {}),
        },
        { upsert: true, returnDocument: "after" }
      )
        .select("geoIp city")
        .lean(),
      DailyVisitor.findOneAndUpdate(
        { dayKey, sessionId },
        {
          $set: { lastSeen: now, path },
          $setOnInsert: { dayKey, sessionId, firstSeen: now },
          $inc: { hits: 1 },
        },
        { upsert: true }
      ),
    ]);

    // City lookup once per visit / IP change (cached per IP for a day).
    if (ip && doc && doc.geoIp !== ip && !headerGeo.city) {
      const geo = await cachedIpGeo(ip, { timeoutMs: 2000 });
      if (geo) {
        await LivePresence.updateOne(
          { sessionId },
          {
            $set: {
              geoIp: ip,
              city: geo.city,
              region: geo.region,
              country: geo.country,
              countryCode: geo.countryCode,
              network: geo.isp,
            },
          }
        );
      }
    }

    return NextResponse.json({ success: true, ok: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Presence failed." }, { status: 500 });
  }
}
