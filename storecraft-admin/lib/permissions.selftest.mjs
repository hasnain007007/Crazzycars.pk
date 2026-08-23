/**
 * Local verification for permission map + JWT role aliases (PERM1).
 * Run: node --experimental-vm-modules lib/permissions.selftest.mjs
 * (or: node lib/permissions.selftest.mjs after build — this file uses dynamic import of .js)
 */
import assert from "node:assert/strict";
import {
  hasCapability,
  normalizeRole,
  listCapabilities,
  ROLE_ALIASES,
} from "./permissions.js";

function user(role) {
  return { role };
}

assert.equal(normalizeRole("superadmin"), "owner");
assert.equal(normalizeRole("admin"), "manager");
assert.equal(normalizeRole("editor"), "staff");
assert.equal(normalizeRole("owner"), "owner");
assert.equal(normalizeRole("weird"), "viewer");

assert.equal(ROLE_ALIASES.superadmin, "owner");

assert.equal(hasCapability(user("superadmin"), "canViewFinancials"), true);
assert.equal(hasCapability(user("admin"), "canViewFinancials"), false);
assert.equal(hasCapability(user("manager"), "canManageCatalog"), true);
assert.equal(hasCapability(user("editor"), "canManageOrders"), true);
assert.equal(hasCapability(user("editor"), "canManageCatalog"), false);
assert.equal(hasCapability(user("staff"), "canManageOrders"), true);
assert.equal(hasCapability(user("viewer"), "canManageOrders"), false);
assert.equal(hasCapability(user("viewer"), "canViewFinancials"), false);
assert.equal(hasCapability(null, "canManageOrders"), false);

assert.ok(listCapabilities("superadmin").includes("canManageUsers"));
assert.ok(!listCapabilities("manager").includes("canManageUsers"));

console.log("permissions.selftest: OK");
