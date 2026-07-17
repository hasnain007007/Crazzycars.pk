/**
 * Allocate next order number from Settings (atomic) and format from saved rules.
 */
import { dbConnect } from "./db";
import Settings, { SETTINGS_SINGLETON_KEY } from "./models/Settings.model";
import { formatOrderNumber, normalizeOrderNumberConfig } from "./orderNumberFormat";

/**
 * Legacy allocation when Settings row is unavailable (same as old scan behavior).
 */
async function allocateLegacyScan() {
  const { default: Order } = await import("./models/Order.model");
  const year = new Date().getUTCFullYear();
  const prefix = `ORD-${year}-`;
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rows = await Order.find({ orderNumber: new RegExp(`^${escaped}`) })
    .select("orderNumber")
    .lean();
  let max = 0;
  for (const r of rows) {
    const n = parseInt(String(r.orderNumber).replace(prefix, ""), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(5, "0")}`;
}

export async function allocateOrderNumber() {
  try {
    await dbConnect();
    const filter = { singletonKey: SETTINGS_SINGLETON_KEY };
    const pipeline = [
      {
        $set: {
          "orderNumber.currentSequence": {
            $max: [
              { $add: [{ $ifNull: ["$orderNumber.currentSequence", 0] }, 1] },
              { $ifNull: ["$orderNumber.startingNumber", 1] },
            ],
          },
        },
      },
    ];

    const doc = await Settings.findOneAndUpdate(filter, pipeline, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }).lean();

    if (!doc?.orderNumber) {
      return allocateLegacyScan();
    }

    const cfg = normalizeOrderNumberConfig(doc.orderNumber);
    const seq = cfg.currentSequence;
    return formatOrderNumber(cfg, seq, new Date());
  } catch {
    try {
      return await allocateLegacyScan();
    } catch {
      const y = new Date().getUTCFullYear();
      return `ORD-${y}-00001`;
    }
  }
}

export { formatOrderNumber, normalizeOrderNumberConfig, previewNextSequence } from "./orderNumberFormat";
