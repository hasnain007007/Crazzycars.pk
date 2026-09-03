import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  publicMediaUrl,
  resolveMediaFilePath,
  sanitizeMediaFolder,
  sanitizeMediaFilename,
} from "../storecraft-admin/lib/mediaStorage.js";

describe("mediaStorage", () => {
  test("sanitize folder", () => {
    assert.equal(sanitizeMediaFolder("../etc"), "etc");
    assert.equal(sanitizeMediaFolder("products/rehost"), "products/rehost");
  });

  test("sanitize filename keeps extension", () => {
    const name = sanitizeMediaFilename("Toyota Corolla!.webp");
    assert.match(name, /\.webp$/);
    assert.doesNotMatch(name, /!/);
  });

  test("resolveMediaFilePath blocks traversal", () => {
    process.env.MEDIA_ROOT = "/tmp/ccsms-media-test";
    assert.equal(resolveMediaFilePath("../etc/passwd"), null);
    assert.ok(resolveMediaFilePath("products/a.webp")?.endsWith("products/a.webp"));
  });

  test("publicMediaUrl uses store origin", () => {
    process.env.NEXT_PUBLIC_STORE_URL = "https://crazzycars.pk";
    delete process.env.MEDIA_PUBLIC_BASE_URL;
    assert.equal(publicMediaUrl("products/x.webp"), "https://crazzycars.pk/media/products/x.webp");
  });
});
