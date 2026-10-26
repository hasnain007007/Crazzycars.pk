/**
 * Build guard: refuse an admin image whose compiled CSS is wrong.
 * A shared Next/Turbopack cache once compiled the storefront's globals.css into the admin
 * (giant headings, uppercase sidebar). Admin CSS must have admin rules and no store rules.
 */
import fs from "node:fs";
import path from "node:path";

const dir = ".next/static/chunks";
const css = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith(".css"))
  .map((f) => fs.readFileSync(path.join(dir, f), "utf8"))
  .join("\n");

const mustHave = [".font-gauge", "html{font-size:15px}"];
const mustNotHave = [".home-hero", ".hero-split-heading", ".store-footer"];
const missing = mustHave.filter((s) => !css.includes(s));
const leaked = mustNotHave.filter((s) => css.includes(s));

if (!css || missing.length || leaked.length) {
  console.error(
    `BUILD GUARD (admin CSS): missing ${JSON.stringify(missing)}, storefront rules ${JSON.stringify(leaked)}`
  );
  process.exit(1);
}
console.log("Admin CSS guard passed.");
