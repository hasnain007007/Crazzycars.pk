import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  cloudinarySrcSet,
  editorialCoverUrl,
  heroImageUrl,
  heroImageUrlMobile,
  pdpImageUrl,
} from "../storecraft-store/lib/cloudinaryImage.js";

const SRC =
  "https://res.cloudinary.com/dquier8fv/image/upload/v1785632978/storecraft/banners/e3ihft6xztej5sb63ok0.png";

describe("hero / PDP Cloudinary transforms", () => {
  test("mobile hero is slot-sized, not lossless 2560", () => {
    const mobile = heroImageUrlMobile(SRC);
    const desktop = heroImageUrl(SRC);
    assert.match(mobile, /w_828/);
    assert.match(mobile, /q_auto:good/);
    assert.doesNotMatch(mobile, /q_100/);
    assert.doesNotMatch(mobile, /w_2560|w_1280/);
    assert.match(desktop, /w_1920/);
    assert.match(desktop, /q_auto:good/);
    assert.doesNotMatch(desktop, /q_100/);
  });

  test("PDP srcset uses contain-fit widths", () => {
    const url = pdpImageUrl(SRC, 720);
    assert.match(url, /w_720/);
    assert.match(url, /c_limit/);
    const set = cloudinarySrcSet(SRC, [480, 720], { crop: "limit" });
    assert.match(set, /w_480/);
    assert.match(set, /720w/);
    assert.doesNotMatch(set, /h_480/);
  });

  test("editorial cover is a graded fill crop", () => {
    const url = editorialCoverUrl(SRC);
    assert.match(url, /w_1600/);
    assert.match(url, /c_fill/);
    assert.match(url, /e_saturation:-18/);
    assert.match(url, /q_auto:good/);
  });
});
