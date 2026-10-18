# Re-apply profit / cost-snapshot onto mobile checkout extraction

Do this **after** the mobile-only commit is merged and the unfinished admin profit work is ready. Apply on top of `createStoreOrder` extraction (HEAD `unitCost` formula).

## 1. `storecraft-store/lib/snapshotProductCost.js`

Add the helper (new file):

```js
export function snapshotProductCost(product, defaultPacking = 0) {
  const raw = product?.pricing?.costPerItem;
  const costNum = Number(raw);
  const configured = Boolean(product?.pricing?.costConfigured);
  const hasPositive = Number.isFinite(costNum) && costNum > 0;
  const unitCostKnown = configured || hasPositive;
  const packingRaw = product?.pricing?.packingCost;
  const packing =
    packingRaw != null && packingRaw !== "" && Number.isFinite(Number(packingRaw))
      ? Math.max(0, Number(packingRaw))
      : Math.max(0, Number(defaultPacking) || 0);

  return {
    unitCost: unitCostKnown ? Math.max(0, Number.isFinite(costNum) ? costNum : 0) : 0,
    unitCostKnown,
    packingSnapshot: packing,
    costMissing: !unitCostKnown,
  };
}
```

## 2. `lib/models/Product.model.js` — under `pricing`

```js
packingCost: { type: Number, default: 0, min: 0 },
costConfigured: { type: Boolean, default: false },
```

## 3. `lib/models/Order.model.js`

On **line items** (next to existing `unitCost`):

```js
unitCostKnown: { type: Boolean, default: false },
packingSnapshot: { type: Number, default: 0, min: 0 },
```

On **order** (alongside `orderSource` — keep `"mobile"` in the enum):

```js
costMissing: { type: Boolean, default: false, index: true },
// plus any other profit-only fields (isDemo, adCostAllocated, resend*, etc.)
```

Expand `orderSource` enum if profit needs `whatsapp|manual|invoice|resend` — do **not** remove `"mobile"`.

## 4. `lib/checkout/createStoreOrder.js`

1. Import:

```js
import { snapshotProductCost } from "@/lib/snapshotProductCost";
```

2. Replace HEAD line:

```js
const unitCost = Math.max(0, Number(p.pricing?.costPerItem) || 0);
```

with:

```js
const costSnap = snapshotProductCost(p, 20);
const unitCost = costSnap.unitCost;
const unitCostKnown = costSnap.unitCostKnown;
const packingSnapshot = costSnap.packingSnapshot;
```

3. On each `lineItems.push({...})`, add:

```js
unitCostKnown,
packingSnapshot,
```

4. After building `lineItems`:

```js
const costMissing = lineItems.some((li) => li.unitCostKnown !== true);
```

5. On `Order.create({...})`, add:

```js
costMissing,
```

(keep existing `orderSource`).

## 5. Verify

- Web `POST /api/checkout` still thin adapter.
- Characterization tests still pass.
- Place a test order; confirm line items have `unitCost` / `unitCostKnown` / `packingSnapshot` and order has `costMissing` when appropriate.
