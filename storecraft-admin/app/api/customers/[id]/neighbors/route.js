import Customer from "@/lib/models/Customer.model";
import { createNeighborsGetHandler } from "@/lib/neighborsApi";

export const GET = createNeighborsGetHandler(Customer, {
  orderBy: { createdAt: -1 },
  labelField: "name",
});
