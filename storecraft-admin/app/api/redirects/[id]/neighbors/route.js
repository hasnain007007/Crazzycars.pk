import Redirect from "@/lib/models/Redirect.model";
import { createNeighborsGetHandler } from "@/lib/neighborsApi";

export const GET = createNeighborsGetHandler(Redirect, {
  orderBy: { updatedAt: -1 },
  labelField: "fromPath",
});
