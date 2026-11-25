/**
 * Meet-the-founder: public-safe owner identity, verified profiles, Google data.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FOUNDER, FOUNDER_PATH, founderInitials, founderLdId, founderSameAs } from "../storecraft-store/config/founder.js";
import { STORE_NAP } from "../storecraft-store/config/store-nap.js";

const read = (p) => readFileSync(new URL(`../storecraft-store/${p}`, import.meta.url), "utf8");

test("founder config holds no private contact details", () => {
  const blob = JSON.stringify(FOUNDER);
  assert.doesNotMatch(blob, /0341|5787933|gmail\.com|cnic/i, "personal number/email must never be published");
  assert.doesNotMatch(blob, /\b03\d{2}[\s-]?\d{7}\b/, "no phone numbers in founder config (use the official WhatsApp)");
  assert.equal(FOUNDER.photo === null || /^(\/|https:)/.test(FOUNDER.photo), true);
});

test("founder profiles are real URLs and feed the Person sameAs", () => {
  assert.equal(FOUNDER.profiles.linkedin, "https://www.linkedin.com/in/hussnainkamran/");
  // Clean profile URL — no QR / tracking query string.
  assert.equal(FOUNDER.profiles.instagram, "https://www.instagram.com/_muhammad_hasnain/");
  assert.deepEqual(founderSameAs(), [FOUNDER.profiles.linkedin, FOUNDER.profiles.instagram]);
  for (const u of founderSameAs()) assert.match(u, /^https:\/\//);
  assert.equal(founderLdId("https://crazzycars.pk/"), "https://crazzycars.pk/founder#person");
  assert.equal(founderInitials(), "HK");
  assert.equal(FOUNDER_PATH, "/founder");
});

test("site links the REAL Facebook page, not the old duplicate with a personal number", () => {
  assert.equal(STORE_NAP.facebookUrl, "https://www.facebook.com/profile.php?id=61587132488377");
  assert.ok(!STORE_NAP.sameAs.includes("https://www.facebook.com/crazzycars.pk"));
  // ContactPageView reads [1] Instagram and [2] TikTok by index.
  assert.match(STORE_NAP.sameAs[1], /instagram\.com\/crazzycars\.pk/);
  assert.match(STORE_NAP.sameAs[2], /tiktok\.com\/@crazzycars\.pk/);
  assert.ok(STORE_NAP.sameAs.includes("https://www.linkedin.com/company/crazzycars-pk/"));
});

test("founder page is wired into Google data, sitemap, About, footer and payment page", () => {
  assert.match(read("lib/seo/jsonld.js"), /ld\.founder = \{/);
  assert.match(read("app/founder/page.jsx"), /"@type": "ProfilePage"/);
  // Owner asked to remove the "Visit our shop" section (26 Nov 2026).
  assert.doesNotMatch(read("app/founder/page.jsx"), /Visit our shop/);
  assert.match(read("app/founder/page.jsx"), /worksFor: \{ "@id": `\$\{SITE\}\/#org` \}/);
  assert.match(read("lib/sitemap/entries.js"), /"\/founder"/);
  assert.match(read("components/store/AboutPageView.jsx"), /href=\{FOUNDER_PATH\}/);
  assert.match(read("components/store/StoreFooterMedico.jsx"), /Founded by \{FOUNDER\.name\}/);
  assert.match(read("app/advance-payment/page.jsx"), /href="\/founder"/);
});
