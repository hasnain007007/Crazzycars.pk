import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";

describe("absoluteMediaUrl", () => {
  let absoluteMediaUrl;
  let prev = {};

  before(async () => {
    prev = {
      MEDIA_PUBLIC_BASE_URL: process.env.MEDIA_PUBLIC_BASE_URL,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      SITE_URL: process.env.SITE_URL,
      NEXT_PUBLIC_STORE_URL: process.env.NEXT_PUBLIC_STORE_URL,
    };
    process.env.MEDIA_PUBLIC_BASE_URL = "https://crazzycars.pk";
    process.env.NEXT_PUBLIC_SITE_URL = "https://crazzycars.pk";
    process.env.SITE_URL = "https://crazzycars.pk";
    delete process.env.NEXT_PUBLIC_STORE_URL;
    ({ absoluteMediaUrl } = await import("../storecraft-store/lib/mobile/absoluteMediaUrl.js"));
  });

  after(() => {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("leaves Cloudinary https alone", () => {
    const u = "https://res.cloudinary.com/demo/image/upload/v1/x.jpg";
    assert.equal(absoluteMediaUrl(u), u);
  });

  it("absolutizes /media relative paths with https site origin", () => {
    assert.equal(
      absoluteMediaUrl("/media/products/foo.webp"),
      "https://crazzycars.pk/media/products/foo.webp"
    );
  });

  it("absolutizes media/ bare paths", () => {
    assert.equal(
      absoluteMediaUrl("media/banners/hero.webp"),
      "https://crazzycars.pk/media/banners/hero.webp"
    );
  });

  it("upgrades http public URLs to https", () => {
    assert.equal(
      absoluteMediaUrl("http://crazzycars.pk/media/x.webp"),
      "https://crazzycars.pk/media/x.webp"
    );
  });

  it("resolves protocol-relative URLs", () => {
    assert.equal(
      absoluteMediaUrl("//res.cloudinary.com/demo/image/upload/v1/x.jpg"),
      "https://res.cloudinary.com/demo/image/upload/v1/x.jpg"
    );
  });

  it("reads { url } objects (blog featuredImage shape)", () => {
    assert.equal(
      absoluteMediaUrl({ url: "/media/blogs/post.webp", altText: "x" }),
      "https://crazzycars.pk/media/blogs/post.webp"
    );
  });

  it("returns empty for blank", () => {
    assert.equal(absoluteMediaUrl(""), "");
    assert.equal(absoluteMediaUrl(null), "");
  });

  it("leaves opaque cloudinary public ids unchanged", () => {
    assert.equal(absoluteMediaUrl("storecraft/products/abc"), "storecraft/products/abc");
  });
});
