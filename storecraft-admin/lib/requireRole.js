/**
 * Role checks for admin API routes (JWT payload from getRequestUser).
 *
 * Prefer denyUnlessCapability for new code.
 * hasMinRole / denyUnlessMinRole remain for transitional call sites; ranks use
 * canonical roles + aliases (superadmin/admin/editor) so old JWTs keep working.
 */
import { NextResponse } from "next/server";
import { denyUnlessAnyCapability, denyUnlessCapability } from "@/lib/denyCapability";
import { hasCapability, normalizeRole } from "@/lib/permissions";

export {
  denyUnlessAnyCapability,
  denyUnlessCapability,
  hasCapability,
  normalizeRole,
};

/** Rank for coarse “at least X” checks. Not used for financials (Manager < Owner there). */
export const ROLE_RANK = {
  viewer: 1,
  staff: 2,
  editor: 2, // alias → staff
  manager: 3,
  admin: 3, // alias → manager
  owner: 4,
  superadmin: 4, // alias → owner
};

export function roleRank(role) {
  const canonical = normalizeRole(role);
  if (ROLE_RANK[canonical] != null) return ROLE_RANK[canonical];
  return ROLE_RANK[String(role || "").toLowerCase()] || 0;
}

export function isOwner(user) {
  return Boolean(user && normalizeRole(user.role) === "owner");
}

/** @deprecated Prefer isOwner — kept for call sites during rename. */
export function isSuperadmin(user) {
  return isOwner(user);
}

export function requireAuth(user) {
  return Boolean(user);
}

/** True if user.role is at least `minRole` on the hierarchy (aliases normalized). */
export function hasMinRole(user, minRole) {
  if (!user) return false;
  return roleRank(user.role) >= roleRank(minRole);
}

/**
 * @returns {NextResponse | null} 401/403 response, or null if allowed
 */
export function denyUnlessMinRole(user, minRole) {
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  // Guard against the historical staff-rank-0 bug: unknown minRole must not mean “anyone”.
  const min = String(minRole || "").toLowerCase();
  if (!ROLE_RANK[min] && !["owner", "manager", "staff", "viewer", "superadmin", "admin", "editor"].includes(min)) {
    return NextResponse.json(
      { success: false, error: `Forbidden. Unknown role gate: ${minRole}.` },
      { status: 403 }
    );
  }
  if (!hasMinRole(user, minRole)) {
    return NextResponse.json(
      {
        success: false,
        error: `Forbidden. Requires ${minRole} role or higher.`,
      },
      { status: 403 }
    );
  }
  return null;
}

/** Map legacy min-role gates that meant “can mutate orders” onto capabilities. */
export function denyUnlessManageOrders(user) {
  return denyUnlessCapability(user, "canManageOrders");
}
