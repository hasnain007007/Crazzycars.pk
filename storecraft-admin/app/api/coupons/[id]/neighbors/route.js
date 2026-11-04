import Coupon from "@/lib/models/Coupon.model";
import { createNeighborsGetHandler } from "@/lib/neighborsApi";

export const GET = createNeighborsGetHandler(Coupon, {
  orderBy: { createdAt: -1 },
  labelField: "code",
});
