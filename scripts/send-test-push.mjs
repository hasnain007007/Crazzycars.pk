#!/usr/bin/env node
/**
 * Send ONE Expo push notification to a token you pass explicitly.
 *
 * Guards:
 * - Never calls production crazzycars.pk / admin.crazzycars.pk.
 * - Only reads a local Mongo URI (localhost / 127.0.0.1) unless
 *   ALLOW_REMOTE_MONGO=1 is set (still never hits production hosts).
 * - Token must be passed on the CLI; no broadcast / no DB scan of all devices.
 *
 * Usage:
 *   MONGODB_URI=mongodb://127.0.0.1:27028/crazzycars_local_verify \
 *     node scripts/send-test-push.mjs --token ExponentPushToken[xxxxxxxx]
 *
 * Optional:
 *   --title "Test" --body "Hello" --url "https://crazzycars.pk/track-order"
 *   --skip-db   (do not look up MobileDevice; send to the token only)
 *
 * Future (NOT built here):
 * - Order-status push: hook admin orderStatus change (wa-action / bulk) →
 *   lookup MobileDevice by customerId → Expo push. Rough: 0.5–1.5d
 *   (message templates, status allowlist, rate limits, quiet hours).
 * - Abandoned-cart push: reuse CartSession + abandonedCart cron path that
 *   already emails; add Expo branch for devices linked by phone/customerId.
 *   Rough: 1–2d (session→device join, dedupe with email, mobile cart sync).
 */
import mongoose from "mongoose";

const BLOCKED_HOSTS = new Set([
  "crazzycars.pk",
  "www.crazzycars.pk",
  "admin.crazzycars.pk",
]);

function parseArgs(argv) {
  const out = {
    token: "",
    title: "CrazzyCars test",
    body: "Local test push from send-test-push.mjs",
    url: "https://crazzycars.pk/",
    skipDb: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--token") out.token = String(argv[++i] || "");
    else if (a === "--title") out.title = String(argv[++i] || out.title);
    else if (a === "--body") out.body = String(argv[++i] || out.body);
    else if (a === "--url") out.url = String(argv[++i] || out.url);
    else if (a === "--skip-db") out.skipDb = true;
  }
  return out;
}

function assertLocalMongo(uri) {
  let u;
  try {
    u = new URL(uri);
  } catch {
    throw new Error("Invalid MONGODB_URI");
  }
  const host = u.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host) || host.endsWith(".crazzycars.pk")) {
    throw new Error(`Refusing Mongo host ${host}`);
  }
  const local =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1";
  if (!local && process.env.ALLOW_REMOTE_MONGO !== "1") {
    throw new Error(
      `Mongo host ${host} is not local. Set ALLOW_REMOTE_MONGO=1 only for preview DBs (never production).`,
    );
  }
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.token || !args.token.includes("ExponentPushToken")) {
    console.error(
      "Usage: node scripts/send-test-push.mjs --token 'ExponentPushToken[…]' [--title …] [--body …] [--url …] [--skip-db]",
    );
    process.exit(1);
  }

  const mongoUri = process.env.MONGODB_URI || "";
  if (!args.skipDb) {
    if (!mongoUri) {
      console.error("MONGODB_URI required unless --skip-db");
      process.exit(1);
    }
    assertLocalMongo(mongoUri);
    await mongoose.connect(mongoUri);
    const col = mongoose.connection.collection("mobiledevices");
    const row = await col.findOne({ token: args.token });
    if (!row) {
      console.error(
        "Token not found in local MobileDevice collection. Register via POST /devices first, or pass --skip-db.",
      );
      await mongoose.disconnect();
      process.exit(1);
    }
    console.log(
      `Found device platform=${row.platform || "?"} customerId=${row.customerId || "guest"}`,
    );
    await mongoose.disconnect();
  }

  const message = {
    to: args.token,
    sound: "default",
    title: args.title,
    body: args.body,
    data: { url: args.url },
  };

  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });
  const json = await res.json().catch(() => ({}));
  console.log("Expo status", res.status);
  console.log(JSON.stringify(json, null, 2));
  if (!res.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
