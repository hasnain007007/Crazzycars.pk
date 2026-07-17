/**
 * JWT helpers for storefront customers (payload.type === "store_customer").
 */
import jwt from "jsonwebtoken";
import { STORE_JWT_COOKIE_NAME } from "@/lib/constants";

const STORE_JWT_EXPIRY = process.env.STORE_JWT_EXPIRY || "30d";

export function signStoreCustomerToken(customerId) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set.");
  return jwt.sign({ type: "store_customer", sub: String(customerId) }, secret, { expiresIn: STORE_JWT_EXPIRY });
}

export function verifyStoreCustomerToken(token) {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;
    const payload = jwt.verify(token, secret);
    if (payload?.type !== "store_customer" || !payload.sub) return null;
    return { customerId: String(payload.sub) };
  } catch {
    return null;
  }
}

export function readStoreCustomerTokenFromRequest(request) {
  const raw = request.cookies.get(STORE_JWT_COOKIE_NAME)?.value;
  if (!raw) return null;
  return verifyStoreCustomerToken(raw);
}
