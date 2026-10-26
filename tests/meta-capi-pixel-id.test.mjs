import assert from "node:assert/strict";
import test from "node:test";
import { resolveMetaCapiConfig } from "../storecraft-store/lib/metaCapi.js";

test("Conversions API uses the admin Pixel ID even when an env ID is set", async () => {
  const prev = process.env.META_PIXEL_ID;
  process.env.META_PIXEL_ID = "1579459850064303";
  try {
    const cfg = await resolveMetaCapiConfig({ seo: { facebookPixelId: "941277015101099" } });
    assert.equal(cfg.pixelId, "941277015101099");
  } finally {
    if (prev === undefined) delete process.env.META_PIXEL_ID;
    else process.env.META_PIXEL_ID = prev;
  }
});
