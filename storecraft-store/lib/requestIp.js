import { clientIpFromHeaders } from "@/lib/customerIp";

/** @deprecated Prefer clientIpFromHeaders — kept for existing imports. */
export function requestIp(request) {
  try {
    return clientIpFromHeaders(request);
  } catch {
    return "";
  }
}
