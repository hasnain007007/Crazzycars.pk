import assert from "node:assert/strict";
import test from "node:test";
import { tryOnStyleFor } from "../storecraft-store/lib/tryOnStyle.js";

const s = (name) => tryOnStyleFor({ name });

test("front splitters get a try-on style", () => {
  assert.equal(s("Universal Front Splitter Spike D5 Carbon Fiber Canard 3PCS").finish, "carbon");
  assert.equal(s("Universal Front Splitter Spike D5 Carbon Fiber Canard 3PCS").fins, 5);
  assert.equal(s("Universal Front Bumper Splitter Canard 1PCS Matt Black ABS").finish, "matt");
  assert.equal(s("Toyota Corolla 2009-2014 Sportline Front Splitter Canards Red Black").accent, "red");
  assert.equal(s("Batman Style Front Bumper Splitter ABS 3PCS").wings, "pointed");
  assert.equal(s("Universal 3-Piece Front Bumper Splitter Ground Style ABS").pieces, 3);
  assert.ok(s("Honda Civic 11th Gen 2022-2026 Front Bumper Lip Splitter"));
});

test("non front-lip products get none", () => {
  for (const name of [
    "Honda Civic X 2016-2021 Side Splitter ABS",
    "Car Rear Bumper Splitter Cut Style Universal Lip",
    "Honda City 2010-2020 Mugen Style Trunk Lip Spoiler",
    "Complete Body Kit – Front Splitter Side Skirts Rear Lip",
    "Universal Carbon Fiber Steering Wheel Cover Trims Anti-Slip 2PCS",
    "MG Logo Seat Belt Clip 2pcs Set",
    "Lime Green H11 LED Fog Light Bulbs (Pair) - Universal",
  ]) {
    assert.equal(s(name), null, name);
  }
});
