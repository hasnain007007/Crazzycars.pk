/**
 * Characterization: public account-deletion request page copy (no Mongo, no network).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getAccountDeletionPage } from "../storecraft-store/lib/accountDeletionPage.js";

describe("account deletion request page", () => {
  it("exposes /account-deletion path and in-app + email paths", () => {
    const page = getAccountDeletionPage();
    assert.equal(page.path, "/account-deletion");
    assert.match(page.title, /account deletion/i);
    assert.ok(page.sections.some((s) => /in the crazzycars app/i.test(s.heading)));
    assert.ok(page.sections.some((s) => /email or contact/i.test(s.heading)));
    const blob = JSON.stringify(page);
    assert.match(blob, /Settings/);
    assert.match(blob, /info@crazzycars\.pk/);
    assert.match(blob, /\/contact/);
    assert.doesNotMatch(blob, /hereby|gdpr|liable|warranty/i);
  });
});
