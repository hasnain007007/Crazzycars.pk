import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  findCatalogModelByExactSlug,
  mergeCatalogCopyOntoVehicle,
} from "../storecraft-store/lib/carCatalogCopy.js";

const MAKES = [
  {
    name: "Honda",
    models: [
      {
        _id: "city-new",
        slug: "honda-city-2021-present",
        name: "City",
        nickname: "City 2021+",
        description:
          "Shop Honda City accessories in Pakistan at CrazzyCars.pk, the car accessories store based in Gujranwala…",
        popularAccessories: ["Grille", "Mats"],
        isActive: true,
      },
      {
        _id: "city-classic",
        slug: "honda-city-classic-2009-2020",
        name: "City",
        nickname: "City Classic",
        description:
          "This page collects every Honda City Classic accessory we list for the 2009–2020 shape.",
        popularAccessories: ["Splitters"],
        isActive: true,
      },
    ],
  },
  {
    name: "Toyota",
    models: [
      {
        _id: "e140",
        slug: "toyota-corolla-e140-2009-2014",
        name: "Corolla",
        nickname: "E140",
        description:
          "Shop Toyota Corolla E140 accessories in Pakistan… Everything here is listed for the Toyota Corolla E140 (2009–2014).",
        isActive: true,
      },
      {
        _id: "axio",
        slug: "toyota-axio-2014-2022",
        name: "Corolla",
        nickname: "Axio",
        description: "Shop Toyota Corolla Axio (2014–2022) accessories in Pakistan at CrazzyCars.pk.",
        isActive: true,
      },
    ],
  },
];

describe("findCatalogModelByExactSlug", () => {
  test("City Classic slug does not resolve to City 2021+", () => {
    const classic = findCatalogModelByExactSlug(MAKES, "honda-city-classic-2009-2020");
    const neu = findCatalogModelByExactSlug(MAKES, "honda-city-2021-present");
    assert.equal(classic?.model?.slug, "honda-city-classic-2009-2020");
    assert.match(classic?.model?.description || "", /City Classic/);
    assert.equal(neu?.model?.slug, "honda-city-2021-present");
    assert.match(neu?.model?.description || "", /Shop Honda City accessories/);
    assert.notEqual(classic?.model?.description, neu?.model?.description);
  });

  test("Axio slug does not resolve to Corolla E140", () => {
    const axio = findCatalogModelByExactSlug(MAKES, "toyota-axio-2014-2022");
    const e140 = findCatalogModelByExactSlug(MAKES, "toyota-corolla-e140-2009-2014");
    assert.equal(axio?.model?.slug, "toyota-axio-2014-2022");
    assert.match(axio?.model?.description || "", /Axio/);
    assert.doesNotMatch(axio?.model?.description || "", /E140 \(2009/);
    assert.match(e140?.model?.description || "", /E140/);
  });

  test("unknown slug returns null (no fuzzy steal)", () => {
    assert.equal(findCatalogModelByExactSlug(MAKES, "honda-city"), null);
    assert.equal(findCatalogModelByExactSlug(MAKES, ""), null);
  });
});

describe("mergeCatalogCopyOntoVehicle", () => {
  test("two City generations keep their own descriptions", () => {
    const base = {
      make: "Honda",
      model: "City",
      slug: "honda-city-classic-2009-2020",
      metaDescription: "Premium Honda City Classic accessories — body kits, front splitters, side skirts.",
    };
    const classic = mergeCatalogCopyOntoVehicle(
      base,
      findCatalogModelByExactSlug(MAKES, "honda-city-classic-2009-2020").model
    );
    const neu = mergeCatalogCopyOntoVehicle(
      { ...base, slug: "honda-city-2021-present" },
      findCatalogModelByExactSlug(MAKES, "honda-city-2021-present").model
    );
    assert.match(classic.description, /This page collects every Honda City Classic/);
    assert.doesNotMatch(classic.description, /body kits, front splitters, side skirts/);
    assert.match(neu.description, /Shop Honda City accessories in Pakistan at CrazzyCars\.pk/);
  });

  test("empty catalog description does not invent sibling text", () => {
    const emptyModel = {
      slug: "toyota-axio-2014-2022",
      name: "Corolla",
      nickname: "Axio",
      description: "",
      popularAccessories: [],
    };
    const merged = mergeCatalogCopyOntoVehicle(
      {
        slug: "toyota-axio-2014-2022",
        metaDescription: "Short Axio blurb",
        description: "Shop Toyota Corolla E140 accessories…", // polluted prior
      },
      emptyModel
    );
    assert.equal(merged.description, "");
  });

  test("Axio merge never carries E140 body copy", () => {
    const axio = mergeCatalogCopyOntoVehicle(
      {
        make: "Toyota",
        model: "Corolla",
        nickname: "Axio",
        slug: "toyota-axio-2014-2022",
        catalogModelSlug: "toyota-corolla-e140-2009-2014", // wrong legacy link
        metaDescription: "short",
      },
      findCatalogModelByExactSlug(MAKES, "toyota-axio-2014-2022").model
    );
    assert.match(axio.description, /Axio \(2014/);
    assert.doesNotMatch(axio.description, /E140 \(2009/);
  });
});
