/**
 * Role checks for admin API routes (JWT payload from getRequestUser).
 * Hierarchy: viewer < editor < admin < superadmin
 */
import { NextResponse } from "next/server";

export const ROLE_RANK = {
  viewer: 1,
  editor: 2,
  admin: 3,
  superadmin: 4,
};

export function roleRank(role) {
  return ROLE_RANK[String(role || "").toLowerCase()] || 0;
}

export function isSuperadmin(user) {
  return Boolean(user && user.role === "superadmin");
}

export function requireAuth(user) {
  return Boolean(user);
}

/** True if user.role is at least `minRole` on the hierarchy. */
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
