/**
 * Allocate next receipt number: BR-YYYY-00001
 */
import { dbConnect } from "./db";
import Receipt from "./models/Receipt.model";

export async function allocateReceiptNumber() {
  await dbConnect();
  const year = new Date().getUTCFullYear();
  const prefix = `BR-${year}-`;
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rows = await Receipt.find({ receiptNumber: new RegExp(`^${escaped}`) })
    .select("receiptNumber")
    .lean();
  let max = 0;
  for (const r of rows) {
    const n = parseInt(String(r.receiptNumber).replace(prefix, ""), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(5, "0")}`;
}
