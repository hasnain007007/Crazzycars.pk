import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  collectCategorySlugs,
  filterLinksToLiveCategories,
  isEmptyCategoryTree,
  isEmptyLeafCategory,
  pruneCategoryTreeWithoutProducts,
} from "../storecraft-store/lib/emptyLeafCategory.js";

describe("soft 404 guards", () => {
  test("empty category tree includes empty parents with empty children", () => {
    assert.equal(isEmptyCategoryTree({ productCount: 0, subcategories: [{ slug: "x" }] }), true);
    assert.equal(isEmptyCategoryTree({ productCount: 0, subcategories: [] }), true);
    assert.equal(isEmptyCategoryTree({ productCount: 3, subcategories: [] }), false);
    assert.equal(isEmptyCategoryTree(null), false);
    assert.equal(isEmptyLeafCategory({ productCount: 0 }), true);
  });

  test("prunes nav nodes with no products in the subtree", () => {
    const withProducts = new Set(["interior"]);
    const tree = [
      {
        _id: "fragrances",
        slug: "fragrances",
        children: [{ _id: "hanging-perfumes", slug: "hanging-perfumes", children: [] }],
      },
      {
        _id: "interior",
        slug: "interior",
        children: [{ _id: "steering", slug: "steering", children: [] }],
      },
    ];
    const pruned = pruneCategoryTreeWithoutProducts(tree, withProducts);
    assert.equal(pruned.length, 1);
    assert.equal(pruned[0].slug, "interior");
    const slugs = collectCategorySlugs(pruned);
    assert.equal(slugs.has("interior"), true);
    assert.equal(
      filterLinksToLiveCategories(
        [{ href: "/categories/fragrances" }, { href: "/categories/interior" }, { href: "/shop" }],
        slugs
      ).map((l) => l.href).join(","),
      "/categories/interior,/shop"
    );
  });
});
