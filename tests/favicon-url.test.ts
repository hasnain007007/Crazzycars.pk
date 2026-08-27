/**
 * Favicon Cloudinary transforms: wordmarks crop the left mark; dedicated icons pad.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildFaviconMetadata,
  configuredFaviconUrl,
  faviconVariant,
} from "../storecraft-store/lib/faviconUrl.js";

const LOGO =
  "https://res.cloudinary.com/dquier8fv/image/upload/v1784314661/storecraft/storecraft/logo/kjinhrgave6cbrk8ovpt.webp";
const ICON =
  "https://res.cloudinary.com/dquier8fv/image/upload/v1/storecraft/favicon/mark.webp";

describe("faviconUrl", () => {
  it("crops the left of a Cloudinary wordmark for tab size", () => {
    const out = faviconVariant(LOGO, 32);
    assert.match(out, /e_trim\/c_crop,g_west,ar_1:1,w_32,h_32,f_png/);
    assert.ok(out.includes("/v1784314661/"));
  });

  it("pads a dedicated favicon upload instead of cropping", () => {
    const out = faviconVariant(ICON, 32);
    assert.match(out, /e_trim\/f_png,c_pad,b_white,w_32,h_32/);
  });

  it("uses a dedicated favicon, not the store logo", () => {
    assert.equal(configuredFaviconUrl({ logoUrl: LOGO }), "");
    assert.equal(configuredFaviconUrl({ faviconUrl: ICON, logoUrl: LOGO }), ICON);
  });

  it("emits local ico/png when no dedicated favicon is set", () => {
    const icons = buildFaviconMetadata({ logoUrl: LOGO });
    assert.ok(icons.icon.every((i) => !String(i.url).includes("cloudinary")));
    assert.ok(icons.icon.some((i) => String(i.url).includes("/favicon.ico")));
    assert.ok(icons.icon.some((i) => String(i.url).includes("/icon.png")));
  });

  it("uses Cloudinary variants when a dedicated favicon is set", () => {
    const icons = buildFaviconMetadata({ faviconUrl: ICON, logoUrl: LOGO });
    assert.ok(icons.icon.some((i) => String(i.url).includes("e_trim")));
  });
});
