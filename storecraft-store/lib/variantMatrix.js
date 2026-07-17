export function combinationSignature(combination) {
  if (!Array.isArray(combination)) return "";
  return combination.map((s) => String(s ?? "").trim()).join("||");
}

export function combinationsEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  return a.every((x, i) => String(x) === String(b[i]));
}
