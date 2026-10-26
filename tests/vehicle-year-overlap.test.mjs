import assert from "node:assert/strict";
import test from "node:test";
import { overlapsYear } from "../storecraft-admin/lib/syncCompatibleVehicles.js";

const reborn = { yearFrom: 2006, yearTo: 2012 };
const rebirth = { yearFrom: 2012, yearTo: 2016 };
const e140 = { yearFrom: 2009, yearTo: 2014 };
const e170 = { yearFrom: 2014, yearTo: 2026 };

test("changeover year alone does not pull in the previous generation", () => {
  assert.equal(overlapsYear(reborn, 2012, 2015), false);
  assert.equal(overlapsYear(rebirth, 2012, 2015), true);
  assert.equal(overlapsYear(e140, 2014, 2026), false);
  assert.equal(overlapsYear(e170, 2014, 2026), true);
  assert.equal(overlapsYear(e140, 2009, 2014), true);
});

test("single-year rows and open ranges still match", () => {
  assert.equal(overlapsYear(reborn, 2012, 2012), true);
  assert.equal(overlapsYear(rebirth, 2012, 2012), true);
  assert.equal(overlapsYear({ yearFrom: 2022, yearTo: null }, 2022, null), true);
  assert.equal(overlapsYear(reborn, null, null), true);
  assert.equal(overlapsYear(reborn, 2017, 2020), false);
});
