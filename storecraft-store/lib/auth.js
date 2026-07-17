/**
 * JWT + password helpers plus shared activity logger.
 */
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { dbConnect } from "./db";
import ActivityLog from "./models/ActivityLog.model";

const JWT_EXPIRY = process.env.JWT_EXPIRY || "7d";

export function signToken(payload) {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    throw new Error("Please define the JWT_SECRET environment variable.");
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token) {
  try {
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      return null;
    }
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
