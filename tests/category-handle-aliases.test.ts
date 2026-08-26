import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  aliasedCategorySlug,
  resolveLegacyDestination,
  rewriteStorePath,
} from "../storecraft-store/lib/categoryHandleAliases.js";

describe("category handle aliases", () => {
  test("maps short body-kit handles to the live category slug", () => {
    assert.equal(aliasedCategorySlug("body-kits"), "body-kits-extensions");
    assert.equal(aliasedCategorySlug("body-kit"), "body-kits-extensions");
    assert.equal(aliasedCategorySlug("/Body-Kits/"), "body-kits-extensions");
    assert.equal(aliasedCategorySlug("lighting"), "led-lighting");
    assert.equal(aliasedCategorySlug("louvers"), "quarter-window-louvers");
  });

  test("rewrites Shopify leftover paths onto the canonical category", () => {
    assert.equal(rewriteStorePath("/categories/body-kits"), "/categories/body-kits-extensions");
    assert.equal(rewriteStorePath("/pages/body-kits"), "/categories/body-kits-extensions");
    assert.equal(rewriteStorePath("/body-kits"), "/categories/body-kits-extensions");
    assert.equal(rewriteStorePath("/collections/body-kits?sort=price"), "/categories/body-kits-extensions?sort=price");
    assert.equal(rewriteStorePath("/categories/car-lighting"), "/categories/led-lighting");
    assert.equal(rewriteStorePath("/categories/car-care"), "/categories/car-care-safety");
    assert.equal(rewriteStorePath("/categories/lighting"), "/categories/led-lighting");
    assert.equal(rewriteStorePath("/deals"), "/sale");
    assert.equal(rewriteStorePath("/pages/deals"), "/sale");
  });

  test("maps leftover car collections onto /cars pages", () => {
    assert.equal(
      resolveLegacyDestination("toyota-aqua-accessories-shop-online-crazzycars-pk"),
      "/cars/toyota-aqua-2012-present"
    );
    assert.equal(
      rewriteStorePath("/collections/haval-h6-accessories-crazzycars-pk"),
      "/cars/haval-h6-2021-present"
    );
    assert.equal(rewriteStorePath("/honda-accessories-shop-by-model-crazzycars-pk"), "/cars");
  });

  test("leaves canonical and unrelated paths unchanged", () => {
    assert.equal(rewriteStorePath("/categories/body-kits-extensions"), "/categories/body-kits-extensions");
    assert.equal(rewriteStorePath("/shop"), "/shop");
    assert.equal(rewriteStorePath("/honda-civic-x-2016-2021-body-kit-d1"), "/honda-civic-x-2016-2021-body-kit-d1");
  });
});
