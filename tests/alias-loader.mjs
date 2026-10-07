/**
 * Resolve Next.js `@/` imports for storecraft-store then storecraft-admin under node:test.
 * Usage: node --import ./tests/alias-loader.mjs --test tests/cod-booking-advance.test.js
 */
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const bases = [
  path.join(root, "storecraft-store"),
  path.join(root, "storecraft-admin"),
];

register(
  `data:text/javascript,${encodeURIComponent(`
    import { existsSync } from "node:fs";
    import path from "node:path";
    import { pathToFileURL } from "node:url";
    const bases = ${JSON.stringify(bases)};
    export async function resolve(specifier, context, nextResolve) {
      if (specifier.startsWith("@/")) {
        const rel = specifier.slice(2);
        for (const base of bases) {
          for (const candidate of [rel + ".js", rel + ".jsx", rel]) {
            const abs = path.join(base, candidate);
            if (existsSync(abs)) {
              return { shortCircuit: true, url: pathToFileURL(abs).href };
            }
          }
        }
      }
      return nextResolve(specifier, context);
    }
  `)}`,
  pathToFileURL("./")
);

// Keep imports referenced so bundlers don't strip.
void existsSync;
void path;
