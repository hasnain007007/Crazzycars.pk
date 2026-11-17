import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  inventorySourceId,
  resolveInventoryProduct,
  sharedStockQuantity,
  sharedTracksInventory,
} from "../storecraft-store/lib/sharedInventory.js";

describe("shared inventory", () => {
  it("follows parent quantity for alias listings", () => {
    const parent = {
      _id: "p1",
      inventory: { quantity: 12, trackInventory: true, allowBackorder: false },
    };
    const alias = {
      _id: "a1",
      inventorySourceProductId: "p1",
      inventory: { quantity: 0, trackInventory: true },
    };
    const byId = new Map([
      ["p1", parent],
      ["a1", alias],
    ]);
    assert.equal(inventorySourceId(alias), "p1");
    assert.equal(resolveInventoryProduct(alias, byId)._id, "p1");
    assert.equal(sharedStockQuantity(alias, byId), 12);
    assert.equal(sharedTracksInventory(alias, byId), true);
    assert.equal(sharedStockQuantity(parent, byId), 12);
  });

  it("uses embedded inventorySourceProduct when populated", () => {
    const alias = {
      _id: "a1",
      inventorySourceProductId: "p1",
      inventory: { quantity: 0 },
      inventorySourceProduct: {
        _id: "p1",
        inventory: { quantity: 7, trackInventory: true },
      },
    };
    assert.equal(sharedStockQuantity(alias), 7);
  });
});
