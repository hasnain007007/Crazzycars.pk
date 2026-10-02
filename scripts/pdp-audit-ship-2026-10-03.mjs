/**
 * PDP audit ship — A1/A2/B3/D (read then write). Run inside store container.
 * Backs up touched docs to /tmp before updates.
 */
import { MongoClient, ObjectId } from "mongodb";
import { writeFileSync } from "fs";

const E140_ID = new ObjectId("6a5cd43ceb06d36eb2ac1cd7");
const CIVIC_X_ID = new ObjectId("6a5cd43deb06d36eb2ac1cde");
const ALTO_2020_ID = new ObjectId("6a5cd43eeb06d36eb2ac1ce6");

const META_UPDATES = {
  "CC-BRV-MIR-BAT":
    "Batman-style ABS side mirror covers for Honda BR-V 2017–present. Carbon-fiber or gloss black finish; clip-on pair. Cash on Delivery nationwide.",
  "CC-RAI-MIR-BAT":
    "Batman-style side mirror covers for Toyota Raize (VC 2019–present; title highlights 2025). Carbon-fiber or gloss black ABS pair. COD nationwide.",
  "CC-HAV-MIR-BAT":
    "Batman-style side mirror covers for Haval H6 2021–present. Choose carbon-fiber or gloss black ABS finish. Cash on Delivery nationwide.",
  "CC-PRI-MIR-BAT-17":
    "Batman-style carbon-look side mirror covers for Toyota Prius (title 2017–2021; VC 2016–2022). ABS pair, clip-on install. COD nationwide.",
  "CC-YXC-MIR-BAT":
    "Batman-style carbon-look side mirror covers for Toyota Yaris Cross 2020–2026. ABS pair with clip-on fit. Cash on Delivery nationwide.",
  "CC-SPO-MIR-BAT":
    "Batman-style side mirror covers for KIA Sportage 2019–2024. Carbon-fiber or gloss black ABS finish. Cash on Delivery nationwide.",
  "CC-OX7-MIR-BAT":
    "Batman-style side mirror covers for Changan Oshan X7 2022–present. Carbon-fiber or gloss black options. Cash on Delivery nationwide.",
  "CC-S05-MIR-BAT":
    "Batman-style side mirror covers for Deepal S05 2024–present. Carbon-fiber or gloss black ABS pair. Cash on Delivery nationwide.",
  "CC-CIV-SPLR-MUG-RR":
    "Mugen RR-style rear trunk spoiler for Honda Civic Reborn 2006–2012 (title 2007–2011). Unpainted ABS — paint to match. COD nationwide.",
  "CC-CIV-SPLR-ES":
    "Unpainted ABS rear trunk spoiler for Honda Civic 2001–2005. Paint to match your body colour. Cash on Delivery nationwide.",
  "CC-UNI-CANARD-1":
    "Universal matt black ABS front bumper splitter canard (1 pc). Sporty aero add-on; confirm look against your bumper photos. COD nationwide.",
  "CC-UNI-LED-REFL":
    "Universal LED reflector bumper side marker light for style and visibility. Check fit on your bumper before ordering. COD nationwide.",
  "CC-CIV-GRL-RBTH":
    "Premium front show grille for Honda Civic Rebirth 2012–2016 (title 2012–2015). Sharp styling upgrade. Cash on Delivery nationwide.",
  "CC-PRI-LOUV-12":
    "Carbon-look Lamborghini-style quarter glass louvers for Toyota Prius XW30 2009–2015. ABS pair. Cash on Delivery nationwide.",
  "CC-CIV-DIFF-X-LED":
    "Gloss black rear bumper diffuser with LED for Honda Civic X 2016–2021. Aggressive aero look. Cash on Delivery nationwide.",
  "CC-COR-GRL-DIA-08":
    "Diamond-style chrome-look ABS front grille for Toyota Corolla (title 2008–2010; VC spans E120/E140). Confirm generation before order. COD.",
  "CC-COR-GRL-SET-08":
    "Front chrome grille set (unpainted steel) for Toyota Corolla (title 2008–2011; VC E120/E140). Confirm generation before order. COD.",
  "CC-COR-GRL-TRD-09":
    "TRD-style front grill for Toyota Corolla E140 2009–2014 (title 2009–2013). Sporty mesh look. Cash on Delivery nationwide.",
  "CC-ALS-SPLR-LIP":
    "Trunk lip spoiler for Changan Alsvin 2021–present (VC 2021–2026). ABS styling upgrade — check product photos for your boot shape. Cash on Delivery nationwide.",
  "CC-SWF-DHC-CF":
    "Carbon-style ABS door handle covers for Suzuki Swift (title 2022–2025; VC spans 2018–2024 and 2025–present). Clip-on set. Cash on Delivery nationwide.",
  "CC-VEZ-LED-RBL":
    "Rear bumper brake lamp for Honda Vezel (title 2013–2018; VC 2013–2026). LED-style lighting upgrade. Cash on Delivery nationwide.",
  "CC-VEZ-DRL-HD011":
    "Fog-lamp / DRL cover style HD011-L2 for Honda Vezel (title 2013–2018; VC to 2026). Front lighting upgrade. COD nationwide.",
  "CC-VEZ-TRUNK-PVC":
    "Custom-fit PVC trunk mat for Honda Vezel (title 2013–2018; VC 2013–2026). Protects the cargo floor. COD nationwide.",
};

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  const col = db.collection("products");
  const results = [];

  const skus = [
    "CC-HCX-INT-STC-CF",
    "CC-EXT-201",
    "CC-0019",
    "CC-0168",
    "CC-0012",
    "CC-EXT-106",
    "CC-0018",
    ...Object.keys(META_UPDATES),
  ];
  const before = await col.find({ articleNo: { $in: [...new Set(skus)] } }).toArray();
  writeFileSync(
    "/tmp/pdp-audit-ship-backup-2026-10-03.json",
    JSON.stringify(before, null, 2)
  );
  console.log("backup", before.length, "docs → /tmp/pdp-audit-ship-backup-2026-10-03.json");

  // A1 prices
  for (const [sku, saleClear] of [
    ["CC-HCX-INT-STC-CF", true],
    ["CC-EXT-201", true],
  ]) {
    const r = await col.updateOne(
      { articleNo: sku },
      { $set: { "pricing.salePrice": null, updatedAt: new Date() } }
    );
    results.push({ op: "A1_clear_sale", sku, matched: r.matchedCount, modified: r.modifiedCount });
  }

  // A2 meta titles (do not touch securityHold/status)
  const titleFixes = {
    "CC-0019": "Toyota Corolla Grande 2014-2018 Carbon Fiber | CrazzyCars",
    "CC-0168": "Honda City 2012-2016 Carbon Fiber Side Mirror | CrazzyCars",
  };
  for (const [sku, title] of Object.entries(titleFixes)) {
    const r = await col.updateOne(
      { articleNo: sku },
      {
        $set: {
          metaTitle: title,
          "seo.metaTitle": title,
          updatedAt: new Date(),
        },
      }
    );
    results.push({ op: "A2_metaTitle", sku, title, matched: r.matchedCount, modified: r.modifiedCount });
  }

  // B1 CC-0012 — Alto VC (keep hub; years from title 2018–2023; Bucket 2 for hub year drift)
  {
    const sku = "CC-0012";
    const vcRow = {
      make: "Suzuki",
      model: "Alto",
      yearFrom: 2018,
      yearTo: 2023,
      bodyStyle: "All",
      notes: "Suzuki Alto (2018–2023)",
    };
    const carRow = {
      make: "Suzuki",
      model: "Alto",
      generation: "Suzuki Alto (2018–2023)",
      yearFrom: 2018,
      yearTo: 2023,
    };
    const r = await col.updateOne(
      { articleNo: sku },
      {
        $set: {
          "vehicleCompatibility.fitmentType": "specific",
          "vehicleCompatibility.vehicles": [vcRow],
          compatibleCars: [carRow],
          // keep existing Alto hub if present; ensure Alto 2020 hub is linked
          compatibleVehicles: [ALTO_2020_ID],
          updatedAt: new Date(),
        },
      }
    );
    results.push({ op: "B_CC-0012", matched: r.matchedCount, modified: r.modifiedCount });
  }

  // B2 CC-EXT-106 — Corolla E140
  {
    const sku = "CC-EXT-106";
    const vcRow = {
      make: "Toyota",
      model: "Corolla",
      yearFrom: 2009,
      yearTo: 2014,
      bodyStyle: "Sedan",
      notes: "Toyota Corolla E140 (2009–2014)",
    };
    const carRow = {
      make: "Toyota",
      model: "Corolla",
      generation: "Toyota Corolla E140 (2009–2014)",
      yearFrom: 2009,
      yearTo: 2014,
    };
    const r = await col.updateOne(
      { articleNo: sku },
      {
        $set: {
          "vehicleCompatibility.fitmentType": "specific",
          "vehicleCompatibility.vehicles": [vcRow],
          compatibleCars: [carRow],
          compatibleVehicles: [E140_ID],
          updatedAt: new Date(),
        },
      }
    );
    results.push({ op: "B_CC-EXT-106", matched: r.matchedCount, modified: r.modifiedCount });
  }

  // B3 CC-0018 — Civic X only
  {
    const sku = "CC-0018";
    const vcRow = {
      make: "Honda",
      model: "Civic",
      yearFrom: 2016,
      yearTo: 2021,
      bodyStyle: "All",
      notes: "Honda Civic X (2016–2021)",
    };
    const carRow = {
      make: "Honda",
      model: "Civic",
      generation: "Honda Civic X (2016–2021)",
      yearFrom: 2016,
      yearTo: 2021,
    };
    const r = await col.updateOne(
      { articleNo: sku },
      {
        $set: {
          "vehicleCompatibility.fitmentType": "specific",
          "vehicleCompatibility.vehicles": [vcRow],
          compatibleCars: [carRow],
          compatibleVehicles: [CIVIC_X_ID],
          updatedAt: new Date(),
        },
      }
    );
    results.push({ op: "B_CC-0018", matched: r.matchedCount, modified: r.modifiedCount });
  }

  // D metas
  for (const [sku, desc] of Object.entries(META_UPDATES)) {
    const r = await col.updateOne(
      { articleNo: sku },
      {
        $set: {
          metaDescription: desc,
          "seo.metaDescription": desc,
          updatedAt: new Date(),
        },
      }
    );
    results.push({ op: "D_metaDesc", sku, matched: r.matchedCount, modified: r.modifiedCount });
  }

  // verify
  const verifySkus = [
    "CC-HCX-INT-STC-CF",
    "CC-EXT-201",
    "CC-0019",
    "CC-0168",
    "CC-0012",
    "CC-EXT-106",
    "CC-0018",
    "CC-ALS-SPLR-LIP",
    "CC-BRV-MIR-BAT",
  ];
  const after = await col
    .find({ articleNo: { $in: verifySkus } })
    .project({
      articleNo: 1,
      status: 1,
      securityHold: 1,
      pricing: 1,
      metaTitle: 1,
      "seo.metaTitle": 1,
      metaDescription: 1,
      "seo.metaDescription": 1,
      vehicleCompatibility: 1,
      compatibleCars: 1,
      compatibleVehicles: 1,
    })
    .toArray();

  console.log(JSON.stringify({ results, after }, null, 2));
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
