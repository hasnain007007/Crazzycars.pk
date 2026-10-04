/**
 * Mobile refresh token helpers.
 * Tokens are opaque (random hex). Only the sha256 hash is stored.
 * On rotation: revoke old, issue new. On replay of a revoked token: revoke ALL.
 * TTL: 30 days (enforced by MongoDB TTL index on expiresAt).
 */
import { randomBytes, createHash } from "crypto";
import { dbConnect } from "@/lib/db";
import CustomerRefreshToken from "@/lib/models/CustomerRefreshToken.model";

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/** Generate a cryptographically random opaque token (96 hex chars). */
export function generateOpaqueToken() {
  return randomBytes(48).toString("hex");
}

/** sha256 hash of a raw token. */
export function hashRefreshToken(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}

/**
 * Issue a new refresh token for a customer.
 * @returns {{ opaqueToken: string }} — send opaqueToken to client, never the hash.
 */
export async function issueRefreshToken(customerId) {
  await dbConnect();
  const opaqueToken = generateOpaqueToken();
  const tokenHash = hashRefreshToken(opaqueToken);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
  await CustomerRefreshToken.create({ customerId, tokenHash, expiresAt });
  return { opaqueToken };
}

/**
 * Rotate a refresh token: verify the old one, revoke it, issue a new one.
 * Replay of a revoked token triggers full customer session revocation.
 * @returns {{ opaqueToken: string, customerId: string }}
 * @throws error with .code and .statusCode
 */
export async function rotateRefreshToken(opaqueToken) {
  await dbConnect();
  const tokenHash = hashRefreshToken(opaqueToken);
  const doc = await CustomerRefreshToken.findOne({ tokenHash });

  if (!doc) {
    throw Object.assign(new Error("Refresh token not found."), {
      code: "TOKEN_INVALID",
      statusCode: 401,
    });
  }

  if (doc.expiresAt < new Date()) {
    throw Object.assign(new Error("Refresh token has expired."), {
      code: "TOKEN_EXPIRED",
      statusCode: 401,
    });
  }

  if (doc.isRevoked) {
    // Replay attack detected — revoke all tokens for this customer
    await CustomerRefreshToken.updateMany(
      { customerId: doc.customerId },
      { $set: { isRevoked: true, revokedAt: new Date() } }
    );
    throw Object.assign(new Error("Refresh token already used. All sessions have been revoked for security."), {
      code: "TOKEN_REUSED",
      statusCode: 401,
    });
  }

  // Revoke the old token
  await CustomerRefreshToken.updateOne(
    { _id: doc._id },
    { $set: { isRevoked: true, revokedAt: new Date() } }
  );

  // Issue replacement
  const newOpaque = generateOpaqueToken();
  const newHash = hashRefreshToken(newOpaque);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
  await CustomerRefreshToken.create({ customerId: doc.customerId, tokenHash: newHash, expiresAt });

  return { opaqueToken: newOpaque, customerId: String(doc.customerId) };
}

/**
 * Revoke a specific refresh token (logout).
 */
export async function revokeRefreshToken(opaqueToken) {
  await dbConnect();
  const tokenHash = hashRefreshToken(opaqueToken);
  await CustomerRefreshToken.updateOne(
    { tokenHash, isRevoked: { $ne: true } },
    { $set: { isRevoked: true, revokedAt: new Date() } }
  );
}

/**
 * Revoke ALL refresh tokens for a customer (delete account / admin action).
 */
export async function revokeAllRefreshTokens(customerId) {
  await dbConnect();
  await CustomerRefreshToken.updateMany(
    { customerId, isRevoked: { $ne: true } },
    { $set: { isRevoked: true, revokedAt: new Date() } }
  );
}
