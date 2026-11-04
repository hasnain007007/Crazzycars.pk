import Page from "@/lib/models/Page.model";
import { createNeighborsGetHandler } from "@/lib/neighborsApi";

export const GET = createNeighborsGetHandler(Page, {
  orderBy: { updatedAt: -1 },
  labelField: "title",
});
