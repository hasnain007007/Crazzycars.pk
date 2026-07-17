/**
 * Shopify-style variant combinations: cartesian product + stable keys.
 */

export function combinationSignature(combination) {
  if (!Array.isArray(combination)) return "";
  return combination.map((s) => String(s ?? "").trim()).join("||");
}

export function cartesianCombinations(orderedTypeNames, valueLists) {
  if (!orderedTypeNames.length) return [];
  if (valueLists.some((l) => !l || !l.length)) return [];
  let acc = valueLists[0].map((v) => [String(v).trim()]);
  for (let i = 1; i < valueLists.length; i += 1) {
    const next = [];
    const row = valueLists[i];
    for (const prefix of acc) {
      for (const v of row) {
        next.push([...prefix, String(v).trim()]);
      }
    }
    acc = next;
  }
  return acc;
}

/**
 * @param {{ name: string, position?: number }[]} typesSorted
 * @param {{ typeName: string, value: string, position?: number }[]} allOptions
 */
export function buildCombinationsFromOptions(typesSorted, allOptions) {
  const typeNames = typesSorted.map((t) => String(t.name || "").trim()).filter(Boolean);
  if (!typeNames.length) return [];
  const byType = new Map();
  for (const tn of typeNames) byType.set(tn, []);
  for (const o of allOptions || []) {
    const tn = String(o.typeName || "").trim();
    if (!byType.has(tn)) continue;
    byType.get(tn).push({ value: String(o.value || "").trim(), position: Number(o.position) || 0 });
  }
  const valueLists = typeNames.map((tn) =>
    (byType.get(tn) || [])
      .filter((x) => x.value)
      .sort((a, b) => a.position - b.position || a.value.localeCompare(b.value))
      .map((x) => x.value)
  );
  return cartesianCombinations(typeNames, valueLists);
}

export function mergeVariantsPreserveIds(incoming, existing) {
  const prev = Array.isArray(existing) ? existing : [];
  const bySig = new Map();
  for (const v of prev) {
    const sig = combinationSignature(v.combination);
    if (sig) bySig.set(sig, v);
  }
  return incoming.map((row) => {
    const sig = combinationSignature(row.combination);
    const old = bySig.get(sig);
    if (old && old._id) return { ...row, _id: old._id };
    return row;
  });
}
