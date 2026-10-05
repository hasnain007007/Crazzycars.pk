/**
 * Web path (default) vs mobile keepPostexUnavailable option.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
register(pathToFileURL(path.join(__dirname, "../scripts/ab-checkout/alias-loader.mjs")).href);

const {
  isTrackingUnavailableError,
  shouldKeepPostexUnavailable,
  afterPostexAttempt,
} = await import("../storecraft-store/lib/resolvePublicTracking.js");

const unavailable = { success: false, error: "Tracking unavailable" };
const okPx = { success: true, status: "In Transit" };

describe("resolvePublicTracking — web vs mobile PostEx branch", () => {
  it("detects Tracking unavailable (not connect errors)", () => {
    assert.equal(isTrackingUnavailableError(unavailable), true);
    assert.equal(isTrackingUnavailableError({ error: "Could not connect to courier" }), false);
  });

  it("web default (keepPostexUnavailable=false): fall through to RunCourier", () => {
    const d = afterPostexAttempt(unavailable, false, false);
    assert.equal(d.action, "fallback_runcourier");
  });

  it("mobile (keepPostexUnavailable=true): return unavailable immediately", () => {
    const d = afterPostexAttempt(unavailable, false, true);
    assert.equal(d.action, "return");
    assert.equal(d.result.error, "Tracking unavailable");
  });

  it("successful PostEx is used on both paths", () => {
    assert.equal(afterPostexAttempt(okPx, false, false).action, "use");
    assert.equal(afterPostexAttempt(okPx, false, true).action, "use");
  });

  it("shouldKeepPostexUnavailable helper matches mobile gate", () => {
    assert.equal(shouldKeepPostexUnavailable(unavailable, false), true);
    assert.equal(shouldKeepPostexUnavailable(unavailable, true), false);
  });
});
