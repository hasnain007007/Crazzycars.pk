/**
 * Node custom loader: rewrite `@/` → storecraft-store, add .js for extensionless ESM.
 */
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { accessSync, constants, existsSync } from "fs";

const storeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../storecraft-store");
const storeNm = path.join(storeRoot, "node_modules");

function tryFile(abs) {
  const candidates = [abs, abs + ".js", abs + ".jsx", abs + ".mjs", path.join(abs, "index.js")];
  for (const c of candidates) {
    try {
      accessSync(c, constants.R_OK);
      return c;
    } catch {
      /* next */
    }
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const rel = specifier.slice(2);
    const hit = tryFile(path.join(storeRoot, rel));
    if (hit) return nextResolve(pathToFileURL(hit).href, context);
    return nextResolve(pathToFileURL(path.join(storeRoot, rel + ".js")).href, context);
  }

  if (specifier === "next/server" || specifier.startsWith("next/")) {
    const mapped =
      specifier === "next/server"
        ? path.join(storeNm, "next/server.js")
        : path.join(storeNm, specifier.endsWith(".js") ? specifier : specifier);
    const hit = tryFile(mapped) || (existsSync(mapped) ? mapped : null);
    if (hit) return nextResolve(pathToFileURL(hit).href, context);
  }

  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    // Extensionless relative / absolute imports (Next bundles these; plain Node does not)
    let abs = null;
    if (specifier.startsWith("file://")) {
      abs = fileURLToPath(specifier);
    } else if (specifier.startsWith("/") && !path.extname(specifier)) {
      abs = specifier;
    } else if (specifier.startsWith(".") && context.parentURL) {
      abs = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
    }
    if (abs) {
      const hit = tryFile(abs);
      if (hit) return nextResolve(pathToFileURL(hit).href, context);
    }
    throw err;
  }
}
