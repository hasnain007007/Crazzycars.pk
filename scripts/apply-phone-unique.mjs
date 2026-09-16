#!/usr/bin/env node
/**
 * Phase A: normalize phones, resolve duplicates, create unique sparse phone index.
 * Policy: keep passworded account if any; else newest. Clear phone on losers.
 * Multiple passworded same phone → keep oldest passworded; clear others + flag.
 *
 * Usage (store container): node apply-phone-unique.mjs [--dry-run]
 */
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(
  fs.existsSync("/app/package.json") ? "/app/package.json" : process.cwd() + "/package.json"
);
const { MongoClient, ObjectId } = require("mongodb");

const dryRun = process.argv.includes("--dry-run");

function digitsOnly(raw) {
  return String(raw || "").replace(/\D/g, "");
}

function normalizePkMobile(raw) {
  let d = digitsOnly(raw);
  if (!d) return "";
  if (d.startsWith("92") && d.length >= 12) d = `0${d.slice(2)}`;
  if (d.length === 10 && d.startsWith("3")) d = `0${d}`;
  if (!/^03\d{9}$/.test(d)) return "";
  return d;
}

function hasPassword(doc) {
  return Boolean(String(doc.passwordHash || "").trim() || String(doc.password || "").trim());
}

function pickKeeper(group) {
  const passworded = group.filter(hasPassword).sort(
    (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
  );
  if (passworded.length) {
    return {
      keeper: passworded[0],
      multiPassworded: passworded.length > 1,
      passwordedLosers: passworded.slice(1),
    };
  }
  const byNewest = [...group].sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  );
  return { keeper: byNewest[0], multiPassworded: false, passwordedLosers: [] };
}

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const col = client.db().collection("customers");
  const docs = await col.find({}).toArray();

  const report = {
    dryRun,
    at: new Date().toISOString(),
    scanned: docs.length,
    normalized: [],
    clearedInvalid: [],
    dupGroups: [],
    passwordedConflicts: [],
    clears: [],
    indexCreated: false,
  };

  // 1) Normalize every phone (or clear invalid)
  for (const doc of docs) {
    const raw = doc.phone;
    const next = normalizePkMobile(raw);
    const prev = String(raw || "");
    if (prev === next) continue;
    if (!next && prev) {
      report.clearedInvalid.push({
        id: String(doc._id),
        email: doc.email,
        from: prev,
      });
      if (!dryRun) {
        await col.updateOne({ _id: doc._id }, { $unset: { phone: "" }, $set: { updatedAt: new Date() } });
      }
      doc.phone = "";
      continue;
    }
    if (next && next !== prev) {
      report.normalized.push({ id: String(doc._id), email: doc.email, from: prev, to: next });
      if (!dryRun) {
        await col.updateOne(
          { _id: doc._id },
          { $set: { phone: next, updatedAt: new Date() } }
        );
      }
      doc.phone = next;
    }
  }

  // Reload after normalize for accurate groups
  const after = dryRun
    ? docs.map((d) => ({ ...d, phone: normalizePkMobile(d.phone) || "" }))
    : await col.find({}).toArray();

  const byPhone = new Map();
  for (const d of after) {
    const p = normalizePkMobile(d.phone);
    if (!p) continue;
    if (!byPhone.has(p)) byPhone.set(p, []);
    byPhone.get(p).push(d);
  }

  for (const [phone, group] of byPhone) {
    if (group.length < 2) continue;
    const { keeper, multiPassworded, passwordedLosers } = pickKeeper(group);
    const losers = group.filter((g) => String(g._id) !== String(keeper._id));
    report.dupGroups.push({
      phone,
      keep: { id: String(keeper._id), email: keeper.email, passworded: hasPassword(keeper) },
      clear: losers.map((l) => ({
        id: String(l._id),
        email: l.email,
        passworded: hasPassword(l),
      })),
      multiPassworded,
    });
    if (multiPassworded) {
      report.passwordedConflicts.push({
        phone,
        kept: String(keeper._id),
        clearedPassworded: passwordedLosers.map((l) => String(l._id)),
      });
    }
    for (const loser of losers) {
      report.clears.push({ id: String(loser._id), email: loser.email, phone });
      if (!dryRun) {
        await col.updateOne(
          { _id: loser._id },
          { $unset: { phone: "" }, $set: { updatedAt: new Date() } }
        );
      }
    }
  }

  if (!dryRun) {
    try {
      await col.dropIndex("phone_1");
    } catch {
      /* may not exist */
    }
    await col.createIndex(
      { phone: 1 },
      {
        unique: true,
        name: "phone_unique_nonzero",
        partialFilterExpression: { phone: { $type: "string", $gt: "" } },
      }
    );
    report.indexCreated = true;
  }

  const out = "/tmp/phone-unique-phase-a.json";
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        ok: true,
        dryRun,
        out,
        scanned: report.scanned,
        normalized: report.normalized.length,
        clearedInvalid: report.clearedInvalid.length,
        dupGroups: report.dupGroups.length,
        clears: report.clears.length,
        passwordedConflicts: report.passwordedConflicts.length,
        indexCreated: report.indexCreated,
      },
      null,
      2
    )
  );
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
