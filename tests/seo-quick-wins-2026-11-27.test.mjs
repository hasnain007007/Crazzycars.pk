// Run: node --import ./tests/alias-loader.mjs --test tests/seo-quick-wins-2026-11-27.test.mjs
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { productSeoTitle } from "../storecraft-store/lib/seo/productSeoMeta.js";
import { productFirstTitle, withVariantLabel } from "../storecraft-store/lib/seo/productTitleFit.js";
import { blogAuthorJsonLd, isStoreAuthorName, resolveBlogAuthor } from "../storecraft-store/lib/seo/blogAuthor.js";
import { exceptionsAreOwnCars, repairSet } from "../ops/scripts/fix-semi-universal-own-car.mjs";

describe("product titles keep the product type", () => {
  const car = "Toyota Corolla Altis Local facelift · 2018–2026";
  const names = [
    `${car} Carbon-look Batman front splitter`,
    `${car} Carbon-look Batman rear splitter pair`,
    `${car} Carbon-look side skirts`,
  ];

  test("three sibling products get three different titles, all ≤ 60", () => {
    const titles = names.map((name) => productSeoTitle({ name, metaTitle: "" }));
    assert.equal(new Set(titles).size, 3, titles.join(" / "));
    for (const t of titles) assert.ok(t.length <= 60, t);
    assert.match(titles[0], /^Carbon-look Batman front splitter – Toyota Corolla/);
    assert.match(titles[1], /rear splitter pair/);
    assert.match(titles[2], /side skirts/);
  });

  test("years are kept before trailing vehicle words are", () => {
    assert.equal(
      productFirstTitle("Honda City GD facelift · 2006–2009 Carbon-look Batman front splitter"),
      "Carbon-look Batman front splitter – Honda City GD 2006–2009"
    );
  });

  test("names that already fit are untouched", () => {
    assert.equal(productFirstTitle("Honda City GD · 2003–2006 Carbon-look side skirts"), "");
    assert.equal(
      productSeoTitle({ name: "Floor Mats", metaTitle: "" }),
      "Floor Mats | CrazzyCars.pk"
    );
  });

  test("colour variants keep their colour, even with a stored title", () => {
    const stored = "Deepal S05 Console Organizer Kit | CrazzyCars.pk";
    const black = productSeoTitle({ name: "Deepal S05 Console Organizer Kit– Black", metaTitle: stored });
    const orange = productSeoTitle({
      name: "Deepal S05 Cup Holder & Charging Pad Set– Orange / terracotta",
      metaTitle: "Deepal S05 Cup Holder & Charging Pad Set",
    });
    assert.equal(black, "Deepal S05 Console Organizer Kit – Black | CrazzyCars.pk");
    assert.equal(orange, "Deepal S05 Cup Holder & Charging Pad Set – Orange");
  });

  test("non-colour dash tails are not treated as variants", () => {
    const t = "Stainless Steel Exhaust Tip | Price in PKR";
    assert.equal(withVariantLabel(t, "Stainless Steel Exhaust Tip– Universal Car Muffler"), t);
  });

  test("colour goes before a '| …' part of a stored title", () => {
    assert.equal(
      withVariantLabel("Corolla 2015–2026 Side Shutter Covers | Price in PKR", "Corolla Side Shutter Covers– Black"),
      "Corolla 2015–2026 Side Shutter Covers – Black | Price in PKR"
    );
  });
});

describe("blog author", () => {
  test("store-name or empty author becomes the founder", () => {
    for (const n of ["", "CrazzyCars", "CrazzyCars.pk", "admin", undefined]) assert.ok(isStoreAuthorName(n), String(n));
    const a = resolveBlogAuthor({ name: "CrazzyCars" });
    assert.equal(a.name, "Hussnain Kamran");
    assert.equal(a.url, "/founder");
    assert.ok(a.bio.length > 20);
  });

  test("founder JSON-LD links to the site Person node", () => {
    const ld = blogAuthorJsonLd({ name: "CrazzyCars" }, "https://crazzycars.pk/");
    assert.equal(ld["@id"], "https://crazzycars.pk/founder#person");
    assert.equal(ld.url, "https://crazzycars.pk/founder");
    assert.equal(ld.name, "Hussnain Kamran");
  });

  test("a real guest author is kept", () => {
    assert.deepEqual(blogAuthorJsonLd({ name: "Ali Raza" }, "https://crazzycars.pk"), { "@type": "Person", name: "Ali Raza" });
  });
});

describe("semi-universal repair", () => {
  const byd = { make: "BYD", model: "Atto 2", yearFrom: 2025, yearTo: 2026, generationId: "g1" };
  const imported = {
    compatibleCars: [{ make: "BYD", model: "Atto 2" }],
    compatibleVehicles: ["g1"],
    vehicleCompatibility: { fitmentType: "semi-universal", universalNote: "Confirm layout.", vehicles: [byd] },
  };

  test("own car listed as the exception is repaired", () => {
    assert.equal(exceptionsAreOwnCars(imported), true);
    assert.deepEqual(repairSet(imported), { "vehicleCompatibility.fitmentType": "specific", isUniversal: false });
  });

  test("stored universal fitment is rebuilt as fits", () => {
    const set = repairSet({ ...imported, fitment: { universal: true, fits: [], doesNotFit: ["BYD Atto 2"] } });
    assert.equal(set.fitment.universal, false);
    assert.deepEqual(set.fitment.fits, [{ make: "BYD", model: "Atto 2", yearFrom: 2025, yearTo: 2026 }]);
    assert.deepEqual(set.fitment.doesNotFit, []);
    assert.equal(set.fitment.fitmentNote, "Confirm layout.");
  });

  test("genuine exceptions (not the product's own cars) are left alone", () => {
    const real = {
      compatibleCars: [],
      compatibleVehicles: [],
      vehicleCompatibility: { fitmentType: "semi-universal", vehicles: [{ make: "Suzuki", model: "Mehran" }] },
    };
    assert.equal(exceptionsAreOwnCars(real), false);
    assert.equal(exceptionsAreOwnCars({ ...imported, vehicleCompatibility: { ...imported.vehicleCompatibility, fitmentType: "specific" } }), false);
  });
});
