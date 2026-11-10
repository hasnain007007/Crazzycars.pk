/**
 * DB-grounded 120–200 word intro for /cars/[slug] hubs.
 * Uses only vehicle fields + listed products — never invents fitment years or stock.
 */

function yearLabel(vehicle) {
  const from = vehicle?.yearFrom;
  const to = vehicle?.yearTo;
  if (from && to && from !== to) return `${from}–${to}`;
  if (from && to && from === to) return String(from);
  if (from) return `${from}–present`;
  if (to) return `up to ${to}`;
  return "";
}

function topCategoryNames(products, limit = 3) {
  const counts = new Map();
  for (const p of products || []) {
    for (const c of p?.categories || []) {
      const name = String(c?.name || "").trim();
      if (!name) continue;
      counts.set(name, (counts.get(name) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([name]) => name);
}

function wordCount(s) {
  return String(s || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function clampWords(text, min = 120, max = 200) {
  const words = String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  if (words.length <= max) return words.join(" ");
  // Prefer ending on a sentence boundary inside the window
  let cut = words.slice(0, max).join(" ");
  const lastStop = Math.max(cut.lastIndexOf("."), cut.lastIndexOf("!"), cut.lastIndexOf("?"));
  if (lastStop > 80) cut = cut.slice(0, lastStop + 1);
  return cut;
  // min is a target for callers — we do not pad with invented facts
}

/**
 * @param {object} vehicle
 * @param {{ products?: object[], priceLine?: string, productCount?: number }} [opts]
 * @returns {string} plain intro paragraph (no HTML)
 */
export function buildVehicleIntro(vehicle, opts = {}) {
  if (!vehicle) return "";
  const name = String(vehicle.displayName || `${vehicle.make || ""} ${vehicle.model || ""}`).trim();
  const years = yearLabel(vehicle);
  const generation = String(vehicle.generation || vehicle.nickname || "").trim();
  const products = opts.products || [];
  const count =
    Number.isFinite(opts.productCount) ? opts.productCount : products.length;
  const cats = topCategoryNames(products, 3);
  const popular = (Array.isArray(vehicle.popularAccessories) ? vehicle.popularAccessories : [])
    .map((s) => String(s || "").trim())
    .filter(Boolean)
    .slice(0, 6);
  const priceLine = String(opts.priceLine || "").trim();

  // Prefer a real DB/catalog description when it is long enough and not a one-liner.
  const rawDesc = String(vehicle.description || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (wordCount(rawDesc) >= 80) {
    const base = clampWords(rawDesc, 120, 200);
    if (wordCount(base) >= 100) return base;
  }

  const bodyBits = [];
  bodyBits.push(
    years
      ? `Shop ${name} accessories in Pakistan for the ${years} generation${
          generation ? ` (${generation})` : ""
        }.`
      : `Shop ${name} accessories in Pakistan${generation ? ` (${generation})` : ""}.`
  );

  if (count > 0) {
    bodyBits.push(
      `This hub lists ${count} compatible product${count === 1 ? "" : "s"} assigned to this car in our catalogue — not universal guesswork.`
    );
  } else {
    bodyBits.push(
      `Compatible products appear here once they are assigned to this car in our catalogue.`
    );
  }

  if (cats.length) {
    const catList =
      cats.length === 1
        ? cats[0]
        : cats.length === 2
          ? `${cats[0]} and ${cats[1]}`
          : `${cats[0]}, ${cats[1]}, and ${cats[2]}`;
    bodyBits.push(
      `The most stocked part families on this page right now are ${catList}.`
    );
  } else if (popular.length) {
    bodyBits.push(`Popular categories for this car include ${popular.slice(0, 3).join(", ")}.`);
  }

  bodyBits.push(
    `Open any product to confirm make, model, and years on the vehicle compatibility table before you order.`
  );

  if (priceLine) {
    bodyBits.push(priceLine.replace(/\s+/g, " ").trim());
  }

  bodyBits.push(
    `Cash on Delivery is available on eligible items with a small booking advance; bulky lines such as mats or spoilers use the higher delivery band shown at checkout. Returns follow our published 7-day policy for defective or wrong items only.`
  );

  let text = bodyBits.join(" ");
  if (wordCount(text) < 120 && popular.length > 3) {
    text += ` Buyers often look for ${popular.slice(0, 5).join(", ")} when upgrading this generation.`;
  }
  return clampWords(text, 120, 200);
}
