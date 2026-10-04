/**
 * Characterization: PostEx unavailable must not be masked by RunCourier miss.
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
} = await import("../storecraft-store/lib/resolvePublicTracking.js");

describe("resolvePublicTracking failure preference", () => {
  it("detects Tracking unavailable", () => {
    assert.equal(isTrackingUnavailableError({ error: "Tracking unavailable" }), true);
    assert.equal(isTrackingUnavailableError({ error: "Invalid tracking number" }), false);
  });

  it("keeps PostEx unavailable without RunCourier fallback", () => {
    assert.equal(
      shouldKeepPostexUnavailable({ success: false, error: "Tracking unavailable" }, false),
      true,
    );
    assert.equal(
      shouldKeepPostexUnavailable({ success: false, error: "Tracking unavailable" }, true),
      false,
    );
    assert.equal(
      shouldKeepPostexUnavailable(
        { success: false, error: "Tracking number not found on Run Courier." },
        false,
      ),
      false,
    );
  });
});
