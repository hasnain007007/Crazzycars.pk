import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  altBelongsToProduct,
  imageBelongsToProduct,
} from "../storecraft-admin/lib/mediaAltGuard.js";

const BUMPER = {
  name: "Toyota Corolla RGB Side Style + Back Bumper Light",
  slug: "toyota-corolla-rgb-side-style-and-back-bumper-light",
};

describe("media alt guard", () => {
  it("rejects dragon-style side-mirror leftovers on the bumper-light SKU", () => {
    const alt = "Toyota Corolla 2015-2026 RGB Side Mirror Indicator Dragon Style";
    assert.equal(altBelongsToProduct(alt, BUMPER), false);
    assert.equal(
      imageBelongsToProduct(
        {
          url: "https://res.cloudinary.com/dquier8fv/image/upload/v1/storecraft/products/toyota-corolla-2015-2026-rgb-side-mirror-indicator-dragon-1.webp",
          altText: alt,
        },
        BUMPER
      ),
      false
    );
  });

  it("keeps a matching bumper photo", () => {
    assert.equal(
      imageBelongsToProduct(
        {
          url: "https://res.cloudinary.com/dquier8fv/image/upload/v1/storecraft/products/toyota-corolla-rgb-side-style-and-back-bumper-light-1.webp",
          altText: "Toyota Corolla RGB Side Style Back Bumper Light",
        },
        BUMPER
      ),
      true
    );
  });

  it("keeps a City listing alt that only adds Audio Control", () => {
    const city = {
      name: "Honda City 2009-2021 Multimedia Steering Wheel Buttons",
      slug: "honda-city-2009-2021-multimedia-steering-wheel-buttons",
    };
    assert.equal(
      altBelongsToProduct(
        "Honda City 2009-2021 Multimedia Steering Wheel Audio Control Buttons Pakistan – CrazzyCars.pk",
        city
      ),
      true
    );
    assert.equal(
      imageBelongsToProduct(
        {
          url: "https://res.cloudinary.com/x/storecraft/products/honda-city-2009-2021-multimedia-steering-wheel-buttons-0-cdf26f2d71c9.jpg",
          altText:
            "Honda City 2009-2021 Multimedia Steering Wheel Audio Control Buttons Pakistan – CrazzyCars.pk",
        },
        city
      ),
      true
    );
    assert.equal(
      imageBelongsToProduct(
        {
          url: "https://res.cloudinary.com/x/storecraft/products/honda-civic-reborn-2006-2012-multimedia-steering-wheel-audio-0-c8e258f207f7.jpg",
          altText:
            "Honda Civic Reborn 2006-2012 Multimedia Steering Wheel Audio Control Buttons Pakistan – CrazzyCars.pk",
        },
        city
      ),
      false
    );
  });

  it("keeps a shared key-cover filename when the alt matches this SKU", () => {
    const cover = {
      name: "Honda Civic 3 Button Premium Metal Key Cover",
      slug: "honda-civic-3-button-premium-metal-key-cover",
    };
    assert.equal(
      imageBelongsToProduct(
        {
          url: "https://res.cloudinary.com/x/storecraft/products/metal-key-cover-universal.webp",
          altText: "Honda Civic 3 Button Premium Metal Key Cover",
        },
        cover
      ),
      true
    );
  });

  it("rejects X-Dynamic bumper leftovers on the RGB bumper SKU", () => {
    assert.equal(
      imageBelongsToProduct(
        {
          url: "https://res.cloudinary.com/x/storecraft/products/toyota-corolla-x-dynamic-back-bumper-light-rgb-2022-2023-1.webp",
          altText: "Toyota Corolla X Dynamic Back Bumper Light RGB",
        },
        BUMPER
      ),
      false
    );
  });

  it("keeps a Civic SI grille photo with color/material filename extras", () => {
    const grille = {
      name: "Honda Civic Diamond Style SI Grille 2016-2021 Glossy Black ABS",
      slug: "honda-civic-diamond-style-si-grille-2016-2021-glossy-black-abs",
    };
    assert.equal(
      imageBelongsToProduct(
        {
          url: "https://res.cloudinary.com/x/storecraft/products/honda-civic-diamond-style-si-grille-2016-2021-glossy-black-abs-1.webp",
          altText: "Honda Civic Diamond Style SI Grille 2016-2021 Glossy Black ABS",
        },
        grille
      ),
      true
    );
  });

  it("keeps a City photo whose filename matches even if the alt was copied from Grande", () => {
    const city = {
      name: "Honda City 2021-2026 Carbon Fiber Steering Wheel Paddle Shifters Pair",
      slug: "honda-city-2021-2026-carbon-fiber-steering-wheel-paddle-shifters-pair",
    };
    assert.equal(
      imageBelongsToProduct(
        {
          url: "https://res.cloudinary.com/x/storecraft/products/honda-city-2021-2026-carbon-fiber-steering-wheel-paddle-shif-0-1a3238147202.jpg",
          altText: "Toyota Corolla Grande 2014-2018 Carbon Fiber Steering Wheel Paddle Shifters Pair Pakistan",
        },
        city
      ),
      true
    );
  });

  it("drops foreign rows the same way admin save does", () => {
    const rows = [
      {
        url: "https://res.cloudinary.com/x/storecraft/products/toyota-corolla-2015-2026-rgb-side-mirror-indicator-dragon-1.webp",
        altText: "Toyota Corolla 2015-2026 RGB Side Mirror Indicator Dragon Style",
      },
      {
        url: "https://res.cloudinary.com/x/storecraft/products/toyota-corolla-rgb-side-style-and-back-bumper-light-1.webp",
        altText: "Toyota Corolla RGB Side Style Back Bumper Light",
      },
    ];
    const kept = rows.filter((img) => imageBelongsToProduct(img, BUMPER));
    assert.equal(kept.length, 1);
    assert.match(kept[0].url, /back-bumper-light/);
  });
});
