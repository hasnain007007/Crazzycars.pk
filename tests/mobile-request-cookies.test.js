/**
 * Mobile POST /orders builds a plain Request (no Next.js cookies).
 * Cookie helpers must not throw when cookies is undefined.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { requestIp } from "../storecraft-store/lib/requestIp.js";

/** Mirrors the cookieGet helper added to attribution readers. */
function cookieGet(request, name) {
  try {
    return request?.cookies?.get?.(name)?.value;
  } catch {
    return undefined;
  }
}

describe("request helpers without Next cookies", () => {
  it("cookieGet returns undefined on plain Request", () => {
    const req = new Request("http://127.0.0.1/api/mobile/v1/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    assert.equal(req.cookies, undefined);
    assert.equal(cookieGet(req, "cc_ai_src"), undefined);
  });

  it("cookieGet reads Next-like cookies bag", () => {
    const fake = {
      cookies: {
        get: (name) => (name === "cc_ai_src" ? { value: "chatgpt" } : undefined),
      },
    };
    assert.equal(cookieGet(fake, "cc_ai_src"), "chatgpt");
  });

  it("requestIp tolerates missing headers", () => {
    assert.equal(requestIp({}), "");
    const req = new Request("http://127.0.0.1/", {
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    assert.equal(requestIp(req), "1.2.3.4");
  });
});
