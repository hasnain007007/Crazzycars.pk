/**
 * Allocate next invoice number: INV-YYYY-00001
 */
import { dbConnect } from "./db";
import Invoice from "./models/Invoice.model";

export async function allocateInvoiceNumber() {
  await dbConnect();
  const year = new Date().getUTCFullYear();
  const prefix = `INV-${year}-`;
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rows = await Invoice.find({ invoiceNumber: new RegExp(`^${escaped}`) })
    .select("invoiceNumber")
    .lean();
  let max = 0;
  for (const r of rows) {
    const n = parseInt(String(r.invoiceNumber).replace(prefix, ""), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(5, "0")}`;
}
