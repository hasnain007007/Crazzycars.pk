import Banner from "@/lib/models/Banner.model";
import { createNeighborsGetHandler } from "@/lib/neighborsApi";

export const GET = createNeighborsGetHandler(Banner, {
  orderBy: { sortOrder: 1, createdAt: -1 },
  labelField: "name",
});
