/**
 * Characterization of mobile JWT claim contract (no Mongo).
 * Cookie JWT_SECRET tokens must not verify as mobile Bearer.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import jwt from "jsonwebtoken";

const MOBILE_SECRET = "test-mobile-secret-not-for-prod";
const COOKIE_SECRET = "test-cookie-jwt-secret-different";
const MOBILE_AUD = "crazzycars-mobile";
const MOBILE_TYP = "mobile_access";

function signMobileAccessToken({ sub, customerId, email }) {
  return jwt.sign(
    {
      sub: String(sub || customerId || ""),
      customerId: String(customerId || sub || ""),
      email: String(email || ""),
      aud: MOBILE_AUD,
      typ: MOBILE_TYP,
      type: "store_customer",
    },
    MOBILE_SECRET,
    { expiresIn: "15m" }
  );
}

function verifyMobileToken(token) {
  try {
    const decoded = jwt.verify(token, MOBILE_SECRET, { audience: MOBILE_AUD });
    if (decoded.typ !== MOBILE_TYP) return null;
    if (decoded.type !== "store_customer") return null;
    return decoded;
  } catch {
    return null;
  }
}

describe("mobile auth claim isolation", () => {
  it("signs access tokens with mobile aud/typ", () => {
    const token = signMobileAccessToken({
      sub: "abc123",
      customerId: "abc123",
      email: "a@b.com",
    });
    const decoded = jwt.verify(token, MOBILE_SECRET, { audience: MOBILE_AUD });
    assert.equal(decoded.aud, MOBILE_AUD);
    assert.equal(decoded.typ, MOBILE_TYP);
    assert.equal(decoded.type, "store_customer");
    assert.equal(decoded.customerId, "abc123");
  });

  it("rejects cookie-shaped JWT signed with JWT_SECRET", () => {
    const cookieToken = jwt.sign(
      {
        customerId: "abc123",
        email: "a@b.com",
        type: "store_customer",
        sub: "abc123",
      },
      COOKIE_SECRET,
      { expiresIn: "30d" }
    );
    assert.equal(verifyMobileToken(cookieToken), null);
  });

  it("rejects token signed with MOBILE secret but wrong typ", () => {
    const bad = jwt.sign(
      {
        sub: "abc123",
        customerId: "abc123",
        email: "a@b.com",
        aud: MOBILE_AUD,
        typ: "not_mobile",
        type: "store_customer",
      },
      MOBILE_SECRET,
      { expiresIn: "15m" }
    );
    assert.equal(verifyMobileToken(bad), null);
  });

  it("accepts a properly signed mobile access token", () => {
    const token = signMobileAccessToken({
      sub: "abc123",
      customerId: "abc123",
      email: "a@b.com",
    });
    const decoded = verifyMobileToken(token);
    assert.ok(decoded);
    assert.equal(decoded.customerId, "abc123");
  });
});
