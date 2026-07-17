/**
 * Role checks for admin API routes (JWT payload from getRequestUser).
 */

export function isSuperadmin(user) {
  return Boolean(user && user.role === "superadmin");
}

export function requireAuth(user) {
  return Boolean(user);
}
