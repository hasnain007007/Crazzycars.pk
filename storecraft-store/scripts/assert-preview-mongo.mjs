#!/usr/bin/env node
/**
 * Preview isolation guard.
 *
 * Prints the Mongo host + database the process would use, then exits non-zero
 * if that target looks like production.
 *
 * Usage:
 *   MONGODB_URI='mongodb://…' node scripts/assert-preview-mongo.mjs
 *
 * Coolify preview: set PREVIEW_GUARD=1 so docker-entrypoint runs this before
 * `node server.js`. Never set PREVIEW_GUARD on production crazzycars.pk.
 */
import {
  evaluatePreviewMongoTarget,
  parseMongoUri,
} from "./previewMongoGuard.mjs";

function die(msg) {
  console.error(`PREVIEW_GUARD FAIL: ${msg}`);
  process.exit(1);
}

let parsed;
try {
  parsed = parseMongoUri(process.env.MONGODB_URI);
} catch (e) {
  die(e.message || String(e));
}

const { host, dbName, fingerprint, port } = parsed;

console.log("=== preview Mongo target ===");
console.log(`host:        ${host}`);
console.log(`port:        ${port}`);
console.log(`database:    ${dbName || "(missing)"}`);
console.log(`uri_sha16:   ${fingerprint}`);
console.log("============================");

const result = evaluatePreviewMongoTarget({ host, dbName, fingerprint });
if (!result.ok) die(result.reason);

console.log("PREVIEW_GUARD OK — not production Mongo.");
process.exit(0);
