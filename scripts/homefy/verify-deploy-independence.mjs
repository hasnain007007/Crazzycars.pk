#!/usr/bin/env node
/**
 * Verify Homefy deploy targets are independent from CrazzyCars.
 * Does not print secrets.
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const fails = [];
const ok = [];

function check(name, cond, detail = "") {
  if (cond) ok.push(name + (detail ? ` (${detail})` : ""));
  else fails.push(name + (detail ? ` — ${detail}` : ""));
}

const CRAZZY_MONGO = /yg8dcwr|sialkot_motorsports|crazzycars/i;
const HOMEFY_MONGO = /g8tmzmx|homefy_pk|127\.0\.0\.1:27027/;

function readEnv(path) {
  if (!existsSync(path)) return null;
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    out[t.slice(0, i)] = t.slice(i + 1);
  }
  return out;
}

function hostOf(uri = "") {
  const m = uri.match(/@([^/?]+)/);
  return m ? m[1] : "(none)";
}

for (const app of ["storecraft-store", "storecraft-admin"]) {
  const link = resolve(root, app, ".vercel/project.json");
  const pj = existsSync(link) ? JSON.parse(readFileSync(link, "utf8")) : null;
  check(
    `${app} linked to Homefy Vercel`,
    pj && /^homefy-pk-(store|admin)$/.test(pj.projectName || ""),
    pj ? pj.projectName : "missing .vercel"
  );
  check(
    `${app} not linked to CrazzyCars Vercel`,
    !(pj && /^storecraft-(store|admin)$/.test(pj.projectName || "")),
    pj?.projectName || ""
  );

  const env = readEnv(resolve(root, app, ".env.local"));
  if (env?.MONGODB_URI) {
    check(
      `${app} Mongo is Homefy`,
      HOMEFY_MONGO.test(env.MONGODB_URI) && !CRAZZY_MONGO.test(env.MONGODB_URI),
      hostOf(env.MONGODB_URI)
    );
  } else {
    fails.push(`${app} .env.local missing MONGODB_URI`);
  }
}

const pack = readEnv(resolve(root, ".local/homefy-vercel-env/store.env"));
if (pack?.MONGODB_URI) {
  check(
    "Vercel env pack Homefy Mongo",
    HOMEFY_MONGO.test(pack.MONGODB_URI) && !CRAZZY_MONGO.test(pack.MONGODB_URI),
    hostOf(pack.MONGODB_URI)
  );
}

check(
  "deploy docs exist",
  existsSync(resolve(root, "docs/HOMEFY-DEPLOY.md"))
);

try {
  const remotes = require("child_process")
    .execSync("git remote -v", { cwd: root, encoding: "utf8" });
  check(
    "homefy remote → private homefy.pk",
    /homefy\s+https:\/\/github\.com\/hasnain007007\/homefy\.pk\.git/.test(remotes)
  );
  check(
    "origin still CrazzyCars (not overwritten)",
    /origin\s+https:\/\/github\.com\/hasnain007007\/Crazzycars\.pk\.git/.test(remotes)
  );
} catch {
  fails.push("could not read git remotes");
}

console.log("OK:");
for (const x of ok) console.log("  ✓", x);
if (fails.length) {
  console.log("FAIL:");
  for (const x of fails) console.log("  ✗", x);
  process.exit(1);
}
console.log("\nHomefy deploy independence checks passed.");
