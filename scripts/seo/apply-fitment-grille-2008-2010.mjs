#!/usr/bin/env node
/** Wrapper — run from storecraft-store so mongoose resolves. */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const script = path.join(root, "storecraft-store/scripts/seo/apply-fitment-grille-2008-2010.mjs");
const r = spawnSync(process.execPath, [script, ...process.argv.slice(2)], {
  cwd: path.join(root, "storecraft-store"),
  stdio: "inherit",
  env: process.env,
});
process.exit(r.status ?? 1);
