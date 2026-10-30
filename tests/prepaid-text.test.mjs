import { test } from "node:test";
import assert from "node:assert/strict";
import { PREPAID_TEXT_LINE, stripCodSentences } from "../storecraft-store/lib/prepaidText.js";
import { scrubPaymentClaims } from "../storecraft-store/lib/paymentCopy.js";
import { TEXT_FIELDS, planPrepaidText } from "../scripts/fix-prepaid-text-2026-10.mjs";

test("COD sentences become the prepaid line once; true statements and questions stay", () => {
  const out = stripCodSentences("Fits City. Cash on Delivery across Pakistan; delivery Rs 500. A Rs 300 booking advance is deducted from your COD total. Shop in Gujranwala.");
  assert.equal(out, `Fits City. ${PREPAID_TEXT_LINE} Shop in Gujranwala.`);
  const html = "<h3>Is Cash on Delivery available for this body kit?</h3><p>No Cash on Delivery for body kits.</p>";
  assert.equal(stripCodSentences(html), html);
  assert.equal(stripCodSentences("Prepaid only (bank transfer). COD available."), "Prepaid only (bank transfer).");
});

test("render guard only rewrites prepaid products", () => {
  const t = "Great kit. Cash on Delivery across Pakistan.";
  assert.equal(scrubPaymentClaims(t, true), t);
  assert.ok(!/cash on delivery/i.test(scrubPaymentClaims(t, false)));
});

test("fix script touches only the text fields of prepaid products", () => {
  const bodyKit = { name: "Honda City Body Kit D2", slug: "honda-city-body-kit-d2", shortDescription: "Kit. COD available.", pricing: { regularPrice: 9000 } };
  const { set } = planPrepaidText(bodyKit);
  assert.deepEqual(Object.keys(set), ["shortDescription"]);
  assert.ok(Object.keys(set).every((k) => TEXT_FIELDS.includes(k)));
  assert.deepEqual(planPrepaidText({ name: "Floor mats", slug: "mats", shortDescription: "COD available." }).set, {});
});
