/**
 * Shared live-visitor window (seconds). Heartbeats older than this are not "live".
 */
export const LIVE_VISITOR_WINDOW_MS = 90_000;

export function liveSinceDate(now = new Date()) {
  return new Date(now.getTime() - LIVE_VISITOR_WINDOW_MS);
}
