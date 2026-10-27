/**
 * Mobile-only JWT authentication.
 *
 * ONLY reads Authorization: Bearer <token>.
 * Cookie-based store_customer tokens are intentionally NOT accepted here.
 * Verifies with MOBILE_JWT_SECRET (NOT JWT_SECRET).
 * Access token claims: aud:'crazzycars-mobile', typ:'mobile_access', type:'store_customer'
 */
import jwt from "jsonwebtoken";
import { getMobileJwtSecret } from "@/lib/mobile/jwtSecret";
import { dbConnect } from "@/lib/db";
import Customer from "@/lib/models/Customer.model";

const MOBILE_AUD = "crazzycars-mobile";
const MOBILE_TYP = "mobile_access";
const ACCESS_TTL = "15m";

export { getMobileJwtSecret };

/**
 * Sign a mobile access token (15m TTL).
 * Claims include aud, typ, type, sub, customerId, email.
 */
export function signMobileAccessToken({ sub, customerId, email }) {
  const secret = getMobileJwtSecret();
  return jwt.sign(
    {
      sub: String(sub || customerId || ""),
      customerId: String(customerId || sub || ""),
      email: String(email || ""),
      aud: MOBILE_AUD,
      typ: MOBILE_TYP,
      type: "store_customer",
    },
    secret,
    { expiresIn: ACCESS_TTL }
  );
}

/**
 * Verify a raw JWT string with mobile-specific claims.
 * Returns decoded payload or null (never throws for bad tokens).
 * Throws 500 only when MOBILE_JWT_SECRET is missing.
 */
export function verifyMobileToken(token) {
  const secret = getMobileJwtSecret(); // may throw 500
  try {
    const decoded = jwt.verify(token, secret, { audience: MOBILE_AUD });
    if (decoded.typ !== MOBILE_TYP) return null;
    if (decoded.type !== "store_customer") return null;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Extract the raw bearer token string from Authorization header.
 * Returns null if missing or not a Bearer scheme.
 */
export function extractBearerToken(request) {
  const auth = request.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const t = auth.slice(7).trim();
  return t || null;
}

/**
 * Require a valid mobile Bearer token.
 * Returns { customer, decoded } or throws an error with .statusCode and .code.
 * Never reads cookies.
 */
export async function requireMobileAuth(request) {
  const rawToken = extractBearerToken(request);
  if (!rawToken) {
    throw Object.assign(new Error("Authorization Bearer token required."), {
      statusCode: 401,
      code: "UNAUTHORIZED",
    });
  }

  const decoded = verifyMobileToken(rawToken); // may throw 500
  if (!decoded) {
    throw Object.assign(new Error("Invalid or expired access token."), {
      statusCode: 401,
      code: "TOKEN_INVALID",
    });
  }

  const customerId = decoded.customerId || decoded.sub;
  if (!customerId) {
    throw Object.assign(new Error("Malformed token claims."), {
      statusCode: 401,
      code: "TOKEN_INVALID",
    });
  }

  await dbConnect();
  const customer = await Customer.findById(customerId).select("-password -passwordHash");
  if (!customer || customer.isActive === false) {
    throw Object.assign(new Error("Account not found or inactive."), {
      statusCode: 401,
      code: "ACCOUNT_INACTIVE",
    });
  }

  return { customer, decoded };
}

/**
 * Optional mobile auth — returns { customer, decoded } or null.
 * Never throws for a missing or invalid token; throws 500 only for missing secret.
 */
export async function optionalMobileAuth(request) {
  const rawToken = extractBearerToken(request);
  if (!rawToken) return null;
  try {
    const decoded = verifyMobileToken(rawToken);
    if (!decoded) return null;
    const customerId = decoded.customerId || decoded.sub;
    if (!customerId) return null;
    await dbConnect();
    const customer = await Customer.findById(customerId).select("-password -passwordHash");
    if (!customer || customer.isActive === false) return null;
    return { customer, decoded };
  } catch (e) {
    if (e.statusCode === 500) throw e;
    return null;
  }
}
