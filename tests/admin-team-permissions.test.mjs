import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { capabilitiesForRole, normalizeRole } from "../storecraft-admin/lib/permissions.js";
import { roleBadgeClass } from "../storecraft-admin/lib/userUi.js";

test("owners (and legacy superadmin) can manage the team; others cannot", () => {
  assert.equal(capabilitiesForRole("owner").canManageUsers, true);
  assert.equal(capabilitiesForRole("superadmin").canManageUsers, true);
  for (const r of ["manager", "staff", "viewer"]) assert.equal(capabilitiesForRole(r).canManageUsers, false, r);
});

test("team list + form gate on the capability, not the old 'superadmin' string", () => {
  const read = (p) => readFileSync(new URL(`../storecraft-admin/${p}`, import.meta.url), "utf8");
  for (const p of ["components/users/UsersPage.jsx", "components/users/UserForm.jsx"]) {
    const src = read(p);
    assert.doesNotMatch(src, /role\s*[!=]==\s*"superadmin"/, p);
    assert.match(src, /capabilitiesForRole\([^)]*\)\.canManageUsers/, p);
  }
  // Form offers the canonical roles a stored user actually has.
  const form = read("components/users/UserForm.jsx");
  for (const id of ["owner", "manager", "staff", "viewer"]) assert.match(form, new RegExp(`id: "${id}"`));
});

test("role badges colour canonical and legacy roles the same", () => {
  assert.equal(roleBadgeClass("owner"), roleBadgeClass("superadmin"));
  assert.equal(roleBadgeClass("staff"), roleBadgeClass("editor"));
  assert.equal(normalizeRole("admin"), "manager");
});

test("admin avatar uses the signed-in name, not hard-coded initials", () => {
  const src = readFileSync(new URL("../storecraft-admin/components/layout/Topbar.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(src, />\s*MI\s*</);
  assert.doesNotMatch(readFileSync(new URL("../storecraft-admin/components/layout/Sidebar.jsx", import.meta.url), "utf8"), /Muhammad Imran/);
});
