/**
 * JWT + password helpers plus shared activity logger.
 */
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { dbConnect } from "./db";
import ActivityLog from "./models/ActivityLog.model";

/** Default 30d — keep in sync with "remember me" login cookie maxAge. */
export const JWT_EXPIRY = process.env.JWT_EXPIRY || "30d";

/** Cookie max-age in seconds (30 days). */
export const JWT_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 30;

export const JWT_REMEMBER_EXPIRY = "30d";
export const JWT_SESSION_EXPIRY = "1d";
export const JWT_REMEMBER_MAX_AGE_SEC = 30 * 24 * 60 * 60;
export const JWT_SESSION_MAX_AGE_SEC = 24 * 60 * 60;

export function signToken(payload) {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    throw new Error("Please define the JWT_SECRET environment variable.");
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(input) {
  try {
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      return null;
    }
    let token = "";
    if (typeof input === "string") {
      token = input;
    } else if (input?.headers?.get) {
      const authHeader = input.headers.get("authorization") || input.headers.get("Authorization");
      if (!authHeader) return null;
      token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
    }
    if (!token) return null;
    return jwt.verify(token, JWT_SECRET);
  } catch (_error) {
    return null;
  }
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export async function logActivity({
  user,
  userName,
  action,
  resource = "",
  resourceId = "",
  details = {},
  type = "update",
  ip = "",
}) {
  try {
    await dbConnect();
    await ActivityLog.create({
      user: user || null,
      userName: userName || "System",
      action,
      resource,
      resourceId,
      details,
      type,
      ip,
    });
  } catch (_error) {
    // Activity logging should never break user-facing requests.
  }
}
