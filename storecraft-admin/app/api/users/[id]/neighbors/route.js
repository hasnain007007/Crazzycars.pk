import User from "@/lib/models/User.model";
import { createNeighborsGetHandler } from "@/lib/neighborsApi";

export const GET = createNeighborsGetHandler(User, {
  orderBy: { createdAt: -1 },
  labelField: "name",
});
