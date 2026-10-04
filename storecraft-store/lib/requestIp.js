export function requestIp(request) {
  try {
    return request?.headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim() || "";
  } catch {
    return "";
  }
}
