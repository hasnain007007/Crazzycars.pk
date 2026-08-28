/**
 * Drop leftover photos copied from another SKU.
 * Keep in sync with storecraft-store/lib/productCardShape.js.
 *
 * Hide an image only when alt or filename positively names another
 * product (different car, or leftover SKU tokens like dragon/dynamic).
 * Do not hide lifestyle shots or generic shared filenames.
 */

const GENERIC_ALTS = new Set(["", "product", "image", "photo", "img", "n/a", "na"]);
const ALT_STOP = new Set([
  "the", "and", "with", "for", "from", "style", "car", "cars", "auto",
  "premium", "quality", "pakistan", "crazzycars",
  "black", "white", "red", "blue", "green", "grey", "gray", "silver", "chrome",
  "gold", "carbon", "glossy", "matte", "matt", "fiber", "glass", "leather",
  "fabric", "vinyl", "plastic", "pair", "pack", "kits", "ultra", "super", "plus",
  "pcs", "piece", "pieces", "detail", "angle", "closeup", "zoom", "view", "shot",
  "thumb", "gallery", "main", "cover", "lifestyle", "studio",
  "plug", "play", "shop", "online", "installed", "genuine", "original",
  "compatible",
]);
const FOREIGN_SIGNAL = new Set(["dragon"]);
const MAKES = new Set([
  "honda", "toyota", "suzuki", "hyundai", "kia", "changan", "haval", "mg",
]);
const MODELS = new Set([
  "civic", "city", "corolla", "alto", "vezel", "fortuner", "hilux", "revo",
  "aqua", "prius", "vitz", "yaris", "premio", "sportage", "tucson", "elantra",
  "sonata", "picanto", "cultus", "swift", "mehran", "bolan", "jimny", "accord",
  "rebirth", "reborn", "prado",
]);

export function significantAltTokens(value) {
  return new Set(
    String(value || "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(
        (t) =>
          t.length >= 4 &&
          !ALT_STOP.has(t) &&
          !/^\d+$/.test(t) &&
          !/^[a-f0-9]{8,}$/i.test(t)
      )
  );
}

function productOwnBlob(product) {
  return `${product?.name || ""} ${product?.slug || ""} ${product?.shortDescription || ""}`.toLowerCase();
}

function ownTokens(product) {
  return new Set([
    ...significantAltTokens(product?.name),
    ...significantAltTokens(product?.slug),
    ...significantAltTokens(product?.shortDescription),
  ]);
}

/** Store listing name is "RGB Side Style"; files/copy still say dragon-style. */
function ownsDragonStyle(product) {
  const own = productOwnBlob(product);
  return own.includes("dragon") || own.includes("rgb-side-style") || /\brgb side style\b/.test(own);
}

function ownsDynamicBumper(product) {
  const own = productOwnBlob(product);
  return (
    own.includes("dynamic") ||
    own.includes("x-dynamic") ||
    own.includes("xdynamic") ||
    (own.includes("side-style") && own.includes("bumper")) ||
    (own.includes("side style") && own.includes("bumper"))
  );
}

function ownHasToken(own, t) {
  if (own.has(t)) return true;
  if (t.endsWith("s") && own.has(t.slice(0, -1))) return true;
  if (own.has(`${t}s`)) return true;
  return false;
}

function isUniversalProduct(product) {
  if (product?.isUniversal) return true;
  const blob = `${product?.name || ""} ${product?.slug || ""}`.toLowerCase();
  return /\buniversal\b/.test(blob);
}

function leftoverSkuMarker(text, product) {
  const s = String(text || "").toLowerCase();
  if (s.includes("dragon") && !ownsDragonStyle(product)) return true;
  if ((s.includes("x-dynamic") || s.includes("xdynamic")) && !ownsDynamicBumper(product)) return true;
  return false;
}

function vehicleConflict(tok, own) {
  const foreignMakes = [...tok].filter((t) => MAKES.has(t) && !ownHasToken(own, t));
  const foreignModels = [...tok].filter((t) => MODELS.has(t) && !ownHasToken(own, t));
  if (foreignMakes.length >= 2) return false;
  if (foreignModels.length) return true;
  if (foreignMakes.length === 1) return true;
  return false;
}

function looksLikeForeignProduct(tok, product) {
  const own = ownTokens(product);
  if (!tok.size || !own.size) return false;
  const allowDragon = ownsDragonStyle(product);
  for (const t of tok) {
    if (t === "dragon" && allowDragon) continue;
    if (!ownHasToken(own, t) && FOREIGN_SIGNAL.has(t)) return true;
  }
  if (isUniversalProduct(product)) return false;
  return vehicleConflict(tok, own);
}

function tokensBelongToProduct(tok, product) {
  const own = ownTokens(product);
  if (!tok.size || !own.size) return false;
  let overlap = 0;
  for (const t of tok) if (own.has(t)) overlap += 1;
  if (overlap < 2) return false;
  return !looksLikeForeignProduct(tok, product);
}

export function altBelongsToProduct(alt, product) {
  return tokensBelongToProduct(significantAltTokens(alt), product);
}

export function imageBelongsToProduct(image, product) {
  const alt = typeof image === "string" ? "" : String(image?.altText || image?.alt || "").trim();
  const url = typeof image === "string" ? image : String(image?.url || "").trim();
  const last = url.split("/").pop() || "";
  const filePart = last.replace(/\.[a-z0-9]+(\?.*)?$/i, "");
  const fileTok = significantAltTokens(filePart);
  if (leftoverSkuMarker(last, product)) return false;
  if (fileTok.size && looksLikeForeignProduct(fileTok, product)) return false;
  if (fileTok.size) return true;
  if (leftoverSkuMarker(alt, product)) return false;
  if (alt && !GENERIC_ALTS.has(alt.toLowerCase()) && looksLikeForeignProduct(significantAltTokens(alt), product)) {
    return false;
  }
  return true;
}
