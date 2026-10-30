import test from "node:test";
import assert from "node:assert/strict";
import { buildUrlSetXml, formatLastMod, safeLastModDate } from "./xml.js";

test("formatLastMod tolerates null, {}, and Invalid Date", () => {
  assert.equal(formatLastMod(null), "");
  assert.equal(formatLastMod(undefined), "");
  assert.equal(formatLastMod({}), "");
  assert.equal(formatLastMod(new Date("not-a-date")), "");
  assert.match(formatLastMod(new Date("2026-01-15T12:00:00.000Z")), /^2026-01-15T/);
});

test("safeLastModDate falls back updatedAt → createdAt → now", () => {
  const created = new Date("2024-06-01T00:00:00.000Z");
  const updated = new Date("2025-01-01T00:00:00.000Z");
  assert.equal(safeLastModDate(updated, created).toISOString(), updated.toISOString());
  assert.equal(safeLastModDate(null, created).toISOString(), created.toISOString());
  assert.equal(safeLastModDate({}, null, created).toISOString(), created.toISOString());
  const nowish = safeLastModDate(null, {}, new Date("invalid"));
  assert.ok(nowish instanceof Date && !Number.isNaN(nowish.getTime()));
});

test("buildUrlSetXml never throws on bad dates and still emits locs", () => {
  const xml = buildUrlSetXml([
    { loc: "https://crazzycars.pk/a", lastmod: null, changefreq: "weekly", priority: 0.7 },
    { loc: "https://crazzycars.pk/b", lastmod: {}, changefreq: "weekly", priority: 0.7 },
    {
      loc: "https://crazzycars.pk/c",
      lastmod: safeLastModDate(null, null),
      changefreq: "weekly",
      priority: 0.7,
    },
  ]);
  assert.match(xml, /https:\/\/crazzycars\.pk\/a/);
  assert.match(xml, /https:\/\/crazzycars\.pk\/b/);
  assert.match(xml, /https:\/\/crazzycars\.pk\/c/);
  assert.match(xml, /<lastmod>/);
  assert.doesNotThrow(() => buildUrlSetXml([{ loc: "https://crazzycars.pk/x", lastmod: {} }]));
});
