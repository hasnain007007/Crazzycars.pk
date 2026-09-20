/** Pure helpers — safe for client components (no mongoose). */

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function yearsOverlap(aFrom, aTo, bFrom, bTo) {
  const a1 = Number(aFrom);
  const a2 = Number(aTo) || a1;
  const b1 = Number(bFrom);
  const b2 = Number(bTo) || b1;
  if (![a1, a2, b1, b2].every(Number.isFinite)) return true;
  return a1 <= b2 && b1 <= a2;
}

/**
 * Map fitment table row → best matching car link (if any).
 */
export function carLinkForFitmentRow(row, carLinks = []) {
  const makeN = norm(row?.make);
  const modelN = norm(row?.model);
  if (!makeN || !carLinks.length) return null;

  const scored = carLinks
    .map((link) => {
      let score = 0;
      if (norm(link.make) === makeN) score += 2;
      const lm = norm(link.model);
      const ll = norm(link.label);
      if (modelN && (lm === modelN || ll.includes(modelN) || modelN.includes(lm))) score += 3;
      if (/e170|e210/i.test(String(row?.model || "")) && /e170|corolla/i.test(`${ll} ${link.slug}`)) {
        score += 2;
      }
      if (yearsOverlap(row.yearFrom, row.yearTo, link.yearFrom, link.yearTo)) score += 1;
      return { link, score };
    })
    .filter((x) => x.score >= 3)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.link || null;
}
