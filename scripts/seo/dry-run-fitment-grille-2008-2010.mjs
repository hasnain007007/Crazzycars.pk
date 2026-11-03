#!/usr/bin/env node
/**
 * Task 15: proposed fitment clamp for Corolla 2008–2010 grille.
 * Default dry-run. Never apply without owner approval (--apply).
 */
const SLUG = "toyota-corolla-2008-2010-diamond-style-chrome-front-grille";
const PROPOSED = [{ make: "Toyota", model: "Corolla", yearFrom: 2008, yearTo: 2010 }];
const apply = process.argv.includes("--apply");

console.log(
  JSON.stringify(
    {
      slug: SLUG,
      apply,
      proposedFitment: PROPOSED,
      note: apply
        ? "REFUSED in this script until owner sets ALLOW_FITMENT_APPLY=1"
        : "dry-run only — no DB writes",
    },
    null,
    2
  )
);

if (apply && process.env.ALLOW_FITMENT_APPLY !== "1") {
  console.error("Refusing --apply without ALLOW_FITMENT_APPLY=1");
  process.exit(2);
}
