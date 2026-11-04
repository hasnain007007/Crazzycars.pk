import BlogPost from "@/lib/models/BlogPost.model";
import { createNeighborsGetHandler } from "@/lib/neighborsApi";

export const GET = createNeighborsGetHandler(BlogPost, {
  orderBy: { publishedAt: -1, createdAt: -1 },
  labelField: "title",
});
