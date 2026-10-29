import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  evaluatePreviewDbName,
  evaluatePreviewMongoContainer,
  evaluatePreviewMongoTarget,
  parseMongoUri,
  PROD_URI_FINGERPRINT,
} from "../storecraft-store/scripts/previewMongoGuard.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assertScript = path.join(root, "storecraft-store/scripts/assert-preview-mongo.mjs");
const seedScript = path.join(root, "scripts/preview-seed.sh");

describe("previewMongoGuard", () => {
  it("accepts preview host + db", () => {
    const p = parseMongoUri(
      "mongodb://u:p@crazzycars-preview-mongo:27017/crazzycars_store_preview?authSource=crazzycars_store_preview"
    );
    assert.equal(p.host, "crazzycars-preview-mongo");
    assert.equal(p.dbName, "crazzycars_store_preview");
    assert.equal(evaluatePreviewMongoTarget(p).ok, true);
  });

  it("rejects sialkot-mongo host even with preview db name", () => {
    const p = parseMongoUri("mongodb://sialkot-mongo:27017/crazzycars_store_preview");
    const r = evaluatePreviewMongoTarget(p);
    assert.equal(r.ok, false);
    assert.match(r.reason, /sialkot-mongo/);
  });

  it("rejects production DB name and fingerprint", () => {
    const legacy = parseMongoUri("mongodb://sialkot-mongo:27017/sialkot_motorsports");
    assert.equal(evaluatePreviewMongoTarget(legacy).ok, false);
    assert.equal(evaluatePreviewDbName("sialkot_motorsports").ok, false);
    const live = parseMongoUri("mongodb://sialkot-mongo:27017/crazzycars_motorsports");
    assert.equal(live.fingerprint, PROD_URI_FINGERPRINT);
    assert.equal(evaluatePreviewMongoTarget(live).ok, false);
    assert.equal(evaluatePreviewDbName("crazzycars_motorsports").ok, false);
  });

  it("rejects container names that are not preview", () => {
    assert.equal(evaluatePreviewMongoContainer("sialkot-mongo").ok, false);
    assert.equal(evaluatePreviewMongoContainer("mongo").ok, false);
    assert.equal(evaluatePreviewMongoContainer("crazzycars-preview-mongo").ok, true);
  });
});

describe("assert-preview-mongo.mjs CLI", () => {
  it("exits 0 for preview URI", () => {
    const r = spawnSync(
      process.execPath,
      [assertScript],
      {
        env: {
          ...process.env,
          MONGODB_URI: "mongodb://u:p@crazzycars-preview-mongo:27017/crazzycars_store_preview",
        },
        encoding: "utf8",
      }
    );
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /PREVIEW_GUARD OK/);
  });

  it("exits 1 for production URI", () => {
    const r = spawnSync(
      process.execPath,
      [assertScript],
      {
        env: {
          ...process.env,
          MONGODB_URI: "mongodb://sialkot-mongo:27017/sialkot_motorsports",
        },
        encoding: "utf8",
      }
    );
    assert.equal(r.status, 1);
    assert.match(r.stderr, /PREVIEW_GUARD FAIL/);
  });
});

describe("preview-seed.sh --dry-run-guard (self-contained bash)", () => {
  it("passes with preview defaults", () => {
    const r = spawnSync("bash", [seedScript, "--dry-run-guard"], {
      env: {
        ...process.env,
        PREVIEW_MONGO_CONTAINER: "crazzycars-preview-mongo",
        PREVIEW_DB: "crazzycars_store_preview",
        SOURCE_DB: "sialkot_motorsports",
      },
      encoding: "utf8",
    });
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.match(r.stdout, /Guards OK/);
  });

  it("refuses sialkot-mongo container", () => {
    const r = spawnSync("bash", [seedScript, "--dry-run-guard"], {
      env: {
        ...process.env,
        PREVIEW_MONGO_CONTAINER: "sialkot-mongo",
        PREVIEW_DB: "crazzycars_store_preview",
        SOURCE_DB: "sialkot_motorsports",
      },
      encoding: "utf8",
    });
    assert.equal(r.status, 1);
    assert.match(r.stderr + r.stdout, /sialkot/);
  });

  it("refuses production MONGODB_URI even with preview container env", () => {
    const r = spawnSync("bash", [seedScript, "--dry-run-guard"], {
      env: {
        ...process.env,
        PREVIEW_MONGO_CONTAINER: "crazzycars-preview-mongo",
        PREVIEW_DB: "crazzycars_store_preview",
        SOURCE_DB: "sialkot_motorsports",
        MONGODB_URI: "mongodb://sialkot-mongo:27017/sialkot_motorsports",
      },
      encoding: "utf8",
    });
    assert.equal(r.status, 1);
    assert.match(r.stderr + r.stdout, /production|sialkot/i);
  });
});
