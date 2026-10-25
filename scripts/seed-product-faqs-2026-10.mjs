#!/usr/bin/env node
/**
 * Seed product-specific FAQs (facts already on the PDPs).
 *   node scripts/seed-product-faqs-2026-10.mjs --dry-run
 *   node scripts/seed-product-faqs-2026-10.mjs --apply
 */
import { MongoClient } from "mongodb";

const dryRun = !process.argv.includes("--apply");

const SEEDS = {
  "honda-civic-reborn-2006-2012-carbon-fiber-gear-box-trim": [
    {
      question: "Is this real carbon fiber?",
      answer:
        "No. It is durable ABS plastic with a glossy carbon fiber texture, in 1 piece shaped to the original Reborn gear box surround.",
      sortOrder: 0,
    },
    {
      question: "How is it installed?",
      answer: "With the adhesive provided. No drilling or cutting is needed.",
      sortOrder: 1,
    },
  ],
  "honda-civic-reborn-2006-2012-carbon-interior-combo": [
    {
      question: "Does the combo fit both automatic and manual Reborn?",
      answer:
        "Some pieces are listed for 2006–2011 or 2007–2011/2012 cars, and fit can depend on the gearbox. WhatsApp 0328 4010007 with your year and whether your Civic is automatic or manual before ordering.",
      sortOrder: 0,
    },
    {
      question: "How much do I save with the combo?",
      answer:
        "Bought separately the 5 pieces cost Rs 11,895; the combo is Rs 9,999, a saving of Rs 1,896.",
      sortOrder: 1,
    },
  ],
  "toyota-corolla-2014-2026-carbon-interior-combo": [
    {
      question: "Does it fit Altis, Grande and GLi?",
      answer:
        "The combo is listed for Corolla 2014–2026 Altis/Grande. Some pieces are listed for 2015–2023 or 2015–2024, and the multimedia trim is for the Grande steering wheel. Send your year, variant and gearbox on WhatsApp 0328 4010007 before ordering.",
      sortOrder: 0,
    },
    {
      question: "How much do I save with the combo?",
      answer:
        "Bought separately the 11 items cost Rs 43,390; the combo is Rs 35,999, a saving of Rs 7,391.",
      sortOrder: 1,
    },
  ],
};

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error("Set MONGODB_URI");
    process.exit(1);
  }
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  console.log(`mode=${dryRun ? "dry-run" : "apply"}`);

  for (const [slug, faqs] of Object.entries(SEEDS)) {
    const p = await db.collection("products").findOne({ slug }, { projection: { faqs: 1, name: 1 } });
    if (!p) {
      console.log(`MISSING ${slug}`);
      continue;
    }
    console.log(`${slug} existingFaqs=${(p.faqs || []).length} → set ${faqs.length}`);
    if (!dryRun) {
      await db.collection("products").updateOne({ slug }, { $set: { faqs } });
    }
  }

  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
