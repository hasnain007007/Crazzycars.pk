/** Format customer IP / device fields for admin order UI. */

export function deviceLabelFromUserAgent(ua) {
  const s = String(ua || "");
  if (!s) return "";
  if (/iPhone/i.test(s)) return "iPhone";
  if (/iPad/i.test(s)) return "iPad";
  if (/Android/i.test(s)) return "Android";
  if (/Windows Phone/i.test(s)) return "Windows Phone";
  if (/Macintosh|Mac OS X/i.test(s)) return "Mac";
  if (/Windows NT/i.test(s)) return "Windows";
  if (/Linux/i.test(s)) return "Linux";
  if (/CrOS/i.test(s)) return "ChromeOS";
  return "Device";
}

export function serializeCustomerNetwork(order) {
  const ip = String(order?.customerIp || "").trim();
  const userAgent = String(order?.customerUserAgent || "").trim();
  const device =
    String(order?.customerDevice || "").trim() || deviceLabelFromUserAgent(userAgent);
  const geoRaw = order?.customerIpGeo;
  const geo =
    geoRaw && typeof geoRaw === "object"
      ? {
          city: String(geoRaw.city || "").trim(),
          region: String(geoRaw.region || "").trim(),
          country: String(geoRaw.country || "").trim(),
          countryCode: String(geoRaw.countryCode || "").trim(),
          isp: String(geoRaw.isp || "").trim(),
        }
      : null;
  const hasGeo = geo && (geo.city || geo.region || geo.country || geo.countryCode || geo.isp);
  const location = hasGeo
    ? [geo.city, geo.region, geo.countryCode || geo.country].filter(Boolean).join(", ")
    : "";
  const summaryParts = [];
  if (device) summaryParts.push(device);
  if (ip) summaryParts.push(ip);
  if (location) summaryParts.push(location);
  return {
    customerIp: ip,
    customerUserAgent: userAgent,
    customerDevice: device,
    customerIpGeo: hasGeo ? geo : null,
    customerIpSummary: summaryParts.join(" · "),
  };
}
