/**
 * Mobile refresh token helpers.
 * Tokens are opaque (random hex). Only the sha256 hash is stored.
 *
 * Rotation: revoke parent, issue child, record replacedByTokenHash + graceExpiresAt.
 * Lost-response grace (~30s): if parent is presented again and the child is still
 * unused, revoke that child, issue a NEW child (we never store opaque tokens),
 * increment graceRetryCount (cap 3). No family revoke inside the window.
 * After window / used child / cap: TOKEN_REUSED + revoke all sessions.
 */
import { randomBytes, createHash } from "crypto";
import { dbConnect } from "@/lib/db";
import CustomerRefreshToken from "@/lib/models/CustomerRefreshToken.model";

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
/** Grace window for retrying a just-rotated parent refresh after a lost response. */
export const REFRESH_GRACE_MS = 30 * 1000;
/** Max grace re-issues per parent token (each issues a new child). */
export const REFRESH_GRACE_MAX_RETRIES = 3;

/** Generate a cryptographically random opaque token (96 hex chars). */
export function generateOpaqueToken() {
  return randomBytes(48).toString("hex");
}

/** sha256 hash of a raw token. */
export function hashRefreshToken(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}

async function familyRevoke(customerId) {
  await CustomerRefreshToken.updateMany(
    { customerId },
    { $set: { isRevoked: true, revokedAt: new Date() } }
  );
}

function tokenReusedError() {
  return Object.assign(
    new Error("Refresh token already used. All sessions have been revoked for security."),
    { code: "TOKEN_REUSED", statusCode: 401 }
  );
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
 * Grace retries of a just-rotated parent (unused child, within window, under cap)
 * issue a replacement child without family revoke.
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

  const now = new Date();

  if (!doc.isRevoked) {
    if (doc.expiresAt < now) {
      throw Object.assign(new Error("Refresh token has expired."), {
        code: "TOKEN_EXPIRED",
        statusCode: 401,
      });
    }

    const newOpaque = generateOpaqueToken();
    const newHash = hashRefreshToken(newOpaque);
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
    const graceExpiresAt = new Date(Date.now() + REFRESH_GRACE_MS);

    await CustomerRefreshToken.create({
      customerId: doc.customerId,
      tokenHash: newHash,
      expiresAt,
    });
    await CustomerRefreshToken.updateOne(
      { _id: doc._id },
      {
        $set: {
          isRevoked: true,
          revokedAt: now,
          replacedByTokenHash: newHash,
          graceExpiresAt,
          graceRetryCount: 0,
        },
      }
    );

    return { opaqueToken: newOpaque, customerId: String(doc.customerId) };
  }

  // Revoked token — grace path (rotated parent) or reject / family revoke
  const withinGrace = doc.graceExpiresAt instanceof Date && doc.graceExpiresAt > now;
  const retries = Number(doc.graceRetryCount) || 0;
  const childHash = String(doc.replacedByTokenHash || "").trim();
  // Parents that went through rotation carry grace metadata; unused children
  // revoked during a grace re-issue do not (soft-reject, no family revoke).
  const lookedLikeRotatedParent =
    doc.graceExpiresAt != null || retries > 0 || Boolean(childHash);

  if (!withinGrace || retries >= REFRESH_GRACE_MAX_RETRIES || !childHash) {
    if (!lookedLikeRotatedParent) {
      throw Object.assign(new Error("Invalid or expired refresh token."), {
        code: "TOKEN_INVALID",
        statusCode: 401,
      });
    }
    await familyRevoke(doc.customerId);
    throw tokenReusedError();
  }

  const child = await CustomerRefreshToken.findOne({ tokenHash: childHash });
  // Child already used (rotated/revoked) or missing → attack or newer rotation
  if (!child || child.isRevoked) {
    await familyRevoke(doc.customerId);
    throw tokenReusedError();
  }

  // Grace: client never received the child — supersede it (no family revoke if replayed)
  await CustomerRefreshToken.updateOne(
    { _id: child._id },
    {
      $set: {
        isRevoked: true,
        revokedAt: now,
        replacedByTokenHash: "",
        graceExpiresAt: null,
        graceRetryCount: 0,
      },
    }
  );

  const newOpaque = generateOpaqueToken();
  const newHash = hashRefreshToken(newOpaque);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
  await CustomerRefreshToken.create({
    customerId: doc.customerId,
    tokenHash: newHash,
    expiresAt,
  });

  await CustomerRefreshToken.updateOne(
    { _id: doc._id },
    {
      $set: {
        replacedByTokenHash: newHash,
        graceExpiresAt: new Date(Date.now() + REFRESH_GRACE_MS),
        graceRetryCount: retries + 1,
      },
    }
  );

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
