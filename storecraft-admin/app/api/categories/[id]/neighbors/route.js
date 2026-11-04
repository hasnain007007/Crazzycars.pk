import Category from "@/lib/models/Category.model";
import { createNeighborsGetHandler } from "@/lib/neighborsApi";

export const GET = createNeighborsGetHandler(Category, {
  orderBy: { level: 1, sortOrder: 1, name: 1 },
  labelField: "name",
});
