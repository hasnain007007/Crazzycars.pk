/**
 * "Try it on your car photo": which products get the drag-and-fit preview, and how the
 * front lip is drawn. Read from the product name so every front splitter gets it with no
 * admin work. Returns null for anything that is not a front lip / splitter.
 */
export function tryOnStyleFor(product) {
  const n = String(product?.name || "").toLowerCase();
  if (!/(splitter|lip|canard)/.test(n)) return null;
  if (/(side splitter|side skirt|rear|trunk|spoiler|body kit|diffuser|steering|caliper|seat|mud flap)/.test(n)) {
    return null;
  }
  if (!/(front|bumper|canard|chin)/.test(n)) return null;

  return {
    finish: /carbon/.test(n) ? "carbon" : /\bmatte?\b/.test(n) ? "matt" : "gloss",
    accent: /\bred\b/.test(n) ? "red" : "",
    fins: /spike/.test(n) ? 5 : 0,
    wings: /batman/.test(n) ? "pointed" : "swept",
    pieces: /(3\s*-?\s*pcs|3-piece|3 piece|4\s*pcs)/.test(n) ? 3 : 1,
  };
}
