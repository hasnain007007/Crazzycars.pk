#!/usr/bin/env node
/** Repo-root wrapper — delegates to storecraft-store script. */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(here, "..", "storecraft-store", "scripts", "assert-preview-mongo.mjs");
const r = spawnSync(process.execPath, [target], { stdio: "inherit", env: process.env });
process.exit(r.status ?? 1);
