#!/usr/bin/env node
/** Guards for preview-seed.sh — exit 1 on failure. */
import {
  evaluatePreviewDbName,
  evaluatePreviewMongoContainer,
  evaluatePreviewMongoTarget,
  parseMongoUri,
} from "../storecraft-store/scripts/previewMongoGuard.mjs";

const container = process.env.PREVIEW_MONGO_CONTAINER || "crazzycars-preview-mongo";
const previewDb = process.env.PREVIEW_DB || "crazzycars_store_preview";
const sourceDb = process.env.SOURCE_DB || "sialkot_motorsports";

const c = evaluatePreviewMongoContainer(container);
if (!c.ok) {
  console.error("ERROR:", c.reason);
  process.exit(1);
}
const d = evaluatePreviewDbName(previewDb);
if (!d.ok) {
  console.error("ERROR:", d.reason);
  process.exit(1);
}
if (!String(sourceDb).toLowerCase().includes("sialkot")) {
  console.error("ERROR: SOURCE_DB should be the production catalog DB name (sialkot_*), got", sourceDb);
  process.exit(1);
}
if (process.env.MONGODB_URI) {
  const p = parseMongoUri(process.env.MONGODB_URI);
  const t = evaluatePreviewMongoTarget(p);
  if (!t.ok) {
    console.error("ERROR:", t.reason);
    process.exit(1);
  }
  console.log("MONGODB_URI host=", p.host, "db=", p.dbName);
}
console.log(`Guards OK: container=${container} previewDb=${previewDb} sourceDb=${sourceDb}`);
