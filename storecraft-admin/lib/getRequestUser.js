/**
 * Reads admin JWT from request cookies and returns payload or null.
 */
import { verifyToken } from "./auth";
import { JWT_COOKIE_NAME } from "./constants";

export function getRequestUser(request) {
  const token = request.cookies.get(JWT_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}
