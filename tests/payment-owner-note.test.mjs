import { test } from "node:test";
import assert from "node:assert/strict";
import { ownerTitles, ownerTitleNote } from "../storecraft-store/lib/paymentOwnerNote.js";

test("brand-titled accounts need no note", () => {
  assert.equal(ownerTitleNote(["CrazzyCars", "Crazzycars.pk", "Crazy Cars", ""]), "");
});

test("personal-name accounts get one de-duplicated owner note", () => {
  const titles = ["CrazzyCars", "Hussnain Kamran", "CrazzyCars", "hussnain  kamran"];
  assert.deepEqual(ownerTitles(titles), ["Hussnain Kamran"]);
  const note = ownerTitleNote(titles);
  assert.match(note, /“Hussnain Kamran” is the owner of CrazzyCars\.pk/);
});

test("two different personal names are both listed", () => {
  assert.match(ownerTitleNote(["Ali Raza", "Hussnain Kamran"]), /“Ali Raza” and “Hussnain Kamran” are the owner/);
});
