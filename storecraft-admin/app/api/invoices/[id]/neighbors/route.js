import Invoice from "@/lib/models/Invoice.model";
import { createNeighborsGetHandler } from "@/lib/neighborsApi";

export const GET = createNeighborsGetHandler(Invoice, {
  orderBy: { createdAt: -1 },
  labelField: "invoiceNumber",
});
