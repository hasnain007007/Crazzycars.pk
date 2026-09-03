import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { classifyCloudinaryError } from "../storecraft-admin/lib/cloudinaryErrors.js";
import { cloudNameFromUrl, isForeignCloudinaryUrl } from "../storecraft-store/lib/cloudinaryConfig.js";

describe("cloudinary health classification", () => {
  test("detects disabled customer", () => {
    const r = classifyCloudinaryError({ error: { message: "disabled customer", http_code: 401 } });
    assert.equal(r.code, "disabled");
    assert.match(r.message, /disabled/i);
  });

  test("detects auth failures", () => {
    const r = classifyCloudinaryError({ error: { message: "Invalid Signature", http_code: 401 } });
    assert.equal(r.code, "auth");
  });
});

describe("cloudinary config helpers", () => {
  test("cloudNameFromUrl", () => {
    assert.equal(
      cloudNameFromUrl("https://res.cloudinary.com/dquier8fv/image/upload/v1/x.jpg"),
      "dquier8fv"
    );
    assert.equal(cloudNameFromUrl("/local.png"), "");
  });

  test("isForeignCloudinaryUrl respects env", () => {
    const prev = process.env.CLOUDINARY_CLOUD_NAME;
    process.env.CLOUDINARY_CLOUD_NAME = "dquier8fv";
    delete process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD;
    delete process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    assert.equal(
      isForeignCloudinaryUrl("https://res.cloudinary.com/djmqim946/image/upload/v1/x.jpg"),
      true
    );
    assert.equal(
      isForeignCloudinaryUrl("https://res.cloudinary.com/dquier8fv/image/upload/v1/x.jpg"),
      false
    );
    if (prev == null) delete process.env.CLOUDINARY_CLOUD_NAME;
    else process.env.CLOUDINARY_CLOUD_NAME = prev;
  });
});
