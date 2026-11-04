import CourierSettlementBatch from "@/lib/models/CourierSettlementBatch.model";
import { createNeighborsGetHandler } from "@/lib/neighborsApi";

export const GET = createNeighborsGetHandler(CourierSettlementBatch, {
  orderBy: { cprDate: -1, createdAt: -1 },
  labelField: "cprNumber",
});
