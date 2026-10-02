# Proposal (not shipped) — fitment-aware `loadRelatedProducts`

**File:** `storecraft-store/app/[slug]/page.jsx`  
**Status:** Review only — do not merge until approved.

## Proposed replacement

```js
async function loadRelatedProducts(product) {
  try {
    const curated = relatedFromRecommended(product);
    if (curated.length) {
      return JSON.parse(JSON.stringify(curated.map(serializeStoreProductSummary)));
    }

    const select =
      "name slug media pricing inventory featured newArrival categories rating averageRating ratingAverage reviewCount totalReviews numReviews shortDescription articleNo createdAt tags";
    const base = {
      status: "active",
      securityHold: { $ne: true },
      _id: { $ne: product._id },
    };

    // 1) Same vehicle hub (compatibleVehicles ObjectIds)
    const vehicleIds = (product?.compatibleVehicles || [])
      .map((v) => {
        if (v == null) return null;
        if (typeof v === "object" && v._id) return v._id;
        return v;
      })
      .filter(Boolean);

    if (vehicleIds.length) {
      const byHub = await Product.find({
        ...base,
        compatibleVehicles: { $in: vehicleIds },
      })
        .select(select)
        .sort({ createdAt: -1 })
        .limit(6)
        .lean();
      if (byHub.length) {
        return JSON.parse(JSON.stringify(byHub.map(serializeStoreProductSummary)));
      }
    }

    // 2) Overlapping make+model on compatibleCars / vehicleCompatibility.vehicles
    const fitmentRows = [
      ...(Array.isArray(product?.compatibleCars) ? product.compatibleCars : []),
      ...(Array.isArray(product?.vehicleCompatibility?.vehicles)
        ? product.vehicleCompatibility.vehicles
        : []),
    ].filter((r) => r?.make && r?.model);

    if (fitmentRows.length) {
      const or = [];
      for (const row of fitmentRows.slice(0, 8)) {
        const make = String(row.make).trim();
        const model = String(row.model).trim();
        if (!make || !model) continue;
        const makeRe = new RegExp(`^${make.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
        const modelRe = new RegExp(`^${model.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
        or.push({ compatibleCars: { $elemMatch: { make: makeRe, model: modelRe } } });
        or.push({
          "vehicleCompatibility.vehicles": { $elemMatch: { make: makeRe, model: modelRe } },
        });
      }
      if (or.length) {
        const byFitment = await Product.find({ ...base, $or: or })
          .select(select)
          .sort({ createdAt: -1 })
          .limit(6)
          .lean();
        if (byFitment.length) {
          return JSON.parse(JSON.stringify(byFitment.map(serializeStoreProductSummary)));
        }
      }
    }

    // 3) Category newest (unchanged fallback)
    const categoryIds = (product?.categories || [])
      .map((c) => {
        if (c == null) return null;
        if (typeof c === "object" && c._id) return c._id;
        return c;
      })
      .filter(Boolean);

    const filter = { ...base };
    if (categoryIds.length) filter.categories = { $in: categoryIds };

    const rows = await Product.find(filter)
      .select(select)
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    return JSON.parse(JSON.stringify(rows.map(serializeStoreProductSummary)));
  } catch (err) {
    console.error("[loadRelatedProducts]", err?.message || err);
    return [];
  }
}
```

## Extra before/after samples (Mongo dry-run, 2026-10-03)

| PDP | Before (category-newest) | After (fitment) |
|-----|--------------------------|-----------------|
| CC-0001 Corolla door handles | City/Civic carbon interiors | Corolla RGB/bumper/fog cluster |
| CC-0202 Civic X Batman mirrors | Other cars’ Batman mirrors | Civic X diffuser / key covers / fog |
| CC-HCX-INT-STC-CF Civic X steering trim | Unrelated City carbon | Civic X cluster (same as above) |
| CC-0095 Civic Reborn handbrake | Newest in category mix | Reborn-era Civic parts |
| CC-TCR-EXT-SMC-CF-15 Corolla Batman mirrors | Cross-car Batman rail | Corolla E170 accessories |
| CC-S05-MIR-BAT Deepal S05 | Unrelated carbon interiors | Category fallback (only Deepal SKU) |
| CC-EXT-201 universal eyes spoiler | Newest spoilers/misc | Category fallback (universal / no VC) |

Universal / single-SKU vehicles keep category fallback by design.
