import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  altBelongsToProduct,
  imageBelongsToProduct,
} from "../storecraft-admin/lib/mediaAltGuard.js";

const BUMPER = {
  name: "Toyota Corolla RGB Side Style + Back Bumper Light",
  slug: "toyota-corolla-rgb-side-style-and-back-bumper-light",
  shortDescription:
    "Buy both together: RGB dragon side-mirror indicators and RGB dynamic back bumper light for Toyota Corolla. COD nationwide.",
};

const SIDE_STYLE = {
  name: "Toyota Corolla 2015-2026 RGB Side Style",
  slug: "toyota-corolla-2015-2026-rgb-side-style",
  shortDescription:
    "RGB dragon-style side mirror indicators for Toyota Corolla 2015–2026. Multi-color lighting; replaces factory indicators.",
};

const PURE_BUMPER = {
  name: "Toyota Corolla RGB Dynamic Back Bumper Light",
  slug: "toyota-corolla-rgb-dynamic-back-bumper-light",
};

describe("media alt guard", () => {
  it("keeps dragon-style photos on the RGB Side Style SKU even when the listing name omits dragon", () => {
    assert.equal(
      imageBelongsToProduct(
        {
          url: "https://res.cloudinary.com/dquier8fv/image/upload/v1/storecraft/products/toyota-corolla-2015-2026-rgb-side-mirror-indicator-dragon-st-1.webp",
          altText: "Toyota Corolla 2015-2026 RGB Side Mirror Indicator Dragon Style",
        },
        SIDE_STYLE
      ),
      true
    );
  });

  it("keeps dragon-style side-mirror photos on the combo kit (it sells both parts)", () => {
    const alt = "Toyota Corolla 2015-2026 RGB Side Mirror Indicator Dragon Style";
    assert.equal(altBelongsToProduct(alt, BUMPER), true);
    assert.equal(
      imageBelongsToProduct(
        {
          url: "https://res.cloudinary.com/dquier8fv/image/upload/v1/storecraft/products/toyota-corolla-2015-2026-rgb-side-mirror-indicator-dragon-st-1.webp",
          altText: alt,
        },
        BUMPER
      ),
      true
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

  it("keeps X-Dynamic bumper photos on the combo kit", () => {
    assert.equal(
      imageBelongsToProduct(
        {
          url: "https://res.cloudinary.com/x/storecraft/products/toyota-corolla-x-dynamic-back-bumper-light-rgb-2022-2023-1.webp",
          altText: "Toyota Corolla X Dynamic Back Bumper Light RGB",
        },
        BUMPER
      ),
      true
    );
  });

  it("rejects dragon leftovers on a bumper-only SKU", () => {
    assert.equal(
      imageBelongsToProduct(
        {
          url: "https://res.cloudinary.com/dquier8fv/image/upload/v1/storecraft/products/toyota-corolla-2015-2026-rgb-side-mirror-indicator-dragon-st-1.webp",
          altText: "Toyota Corolla 2015-2026 RGB Side Mirror Indicator Dragon Style",
        },
        PURE_BUMPER
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

  it("keeps both kit photos on the combo SKU", () => {
    const rows = [
      {
        url: "https://res.cloudinary.com/x/storecraft/products/toyota-corolla-2015-2026-rgb-side-mirror-indicator-dragon-st-1.webp",
        altText: "Toyota Corolla 2015-2026 RGB Side Mirror Indicator Dragon Style",
      },
      {
        url: "https://res.cloudinary.com/x/storecraft/products/toyota-corolla-x-dynamic-back-bumper-light-rgb-2022-2023-1.webp",
        altText: "Toyota Corolla X Dynamic Back Bumper Light RGB",
      },
    ];
    const kept = rows.filter((img) => imageBelongsToProduct(img, BUMPER));
    assert.equal(kept.length, 2);
  });

  it("rejects Honda City sequential files on the Corolla E140 sequential SKU", () => {
    const corolla = {
      name: "Toyota Corolla 2008-2013 Side Mirror Sequential LED Indicators – Dynamic Turn Signals",
      slug: "toyota-corolla-2008-2013-sequential-side-mirror-indicators",
    };
    assert.equal(
      imageBelongsToProduct(
        {
          url: "https://res.cloudinary.com/x/storecraft/products/honda-city-2009-2020-sequential-side-mirror-indicators-0-1f14d219bd16.jpg",
          altText: "Toyota Corolla 2012 LED Side Mirror Turn Signal Sequential Indicator",
        },
        corolla
      ),
      false
    );
    assert.equal(
      imageBelongsToProduct(
        {
          url: "https://cdn.shopify.com/s/files/1/0651/9560/6075/files/LED-Side-Mirror-Turn-Signal-Indicator-for-Toyota-Corolla-2012.webp",
          altText: "Toyota Corolla 2008-2013 LED Mirror Turn Signal Dynamic Indicator Pakistan",
        },
        corolla
      ),
      true
    );
  });
});
