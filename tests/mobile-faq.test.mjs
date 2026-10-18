/**
 * Mobile FAQ endpoint uses the same getFaqItems() as web /faq.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
register(pathToFileURL(path.join(__dirname, "../scripts/ab-checkout/alias-loader.mjs")).href);

const { getFaqItems } = await import("../storecraft-store/lib/storePolicyCopy.js");

describe("mobile FAQ source (getFaqItems)", () => {
  it("returns non-empty question/answer pairs", () => {
    const items = getFaqItems();
    assert.ok(Array.isArray(items) && items.length >= 3);
    for (const row of items) {
      assert.equal(typeof row.question, "string");
      assert.equal(typeof row.answer, "string");
      assert.ok(row.question.trim().length > 0);
      assert.ok(row.answer.trim().length > 0);
    }
  });
});
