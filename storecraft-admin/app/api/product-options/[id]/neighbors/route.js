import ProductOption from "@/lib/models/ProductOption.model";
import { createNeighborsGetHandler } from "@/lib/neighborsApi";

export const GET = createNeighborsGetHandler(ProductOption, {
  orderBy: { sortOrder: 1, createdAt: 1 },
  labelField: "name",
});