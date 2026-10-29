/**
 * Coerce settings fields that may be string | object | missing into a trimmed string.
 * Never call .trim() on a non-string (live bug: general.address = { city: "Gujranwala" }).
 */
export function asSettingsString(value, fallback = "") {
  if (value == null) return fallback;
  if (typeof value === "string") {
    const t = value.trim();
    return t || fallback;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "object") {
    if (Array.isArray(value)) {
      const joined = value.map((x) => asSettingsString(x, "")).filter(Boolean).join(", ");
      return joined || fallback;
    }
    const parts = [
      value.line1,
      value.line2,
      value.street,
      value.streetAddress,
      value.address,
      value.city,
      value.addressLocality,
      value.region,
      value.addressRegion,
      value.state,
      value.postalCode,
      value.country,
      value.addressCountry,
      value.name,
      value.label,
      value.text,
      value.title,
      value.url,
    ]
      .map((x) => (typeof x === "string" ? x.trim() : ""))
      .filter(Boolean);
    if (parts.length) return [...new Set(parts)].join(", ");
  }
  return fallback;
}

/** Optional string: empty when missing/invalid (no fallback). */
export function asOptionalSettingsString(value) {
  return asSettingsString(value, "");
}
