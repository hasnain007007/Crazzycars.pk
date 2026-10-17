import { clientIpFromHeaders } from "@/lib/customerIp";

/** @deprecated Prefer clientIpFromHeaders — kept for existing imports. */
export function requestIp(request) {
  return clientIpFromHeaders(request);
}
