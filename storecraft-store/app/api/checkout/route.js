/**
 * Web checkout — thin adapter. Behavior must stay identical to pre-extraction.
 * Shared logic: lib/checkout/createStoreOrder.js
 */
import { createStoreOrderFromRequest } from "@/lib/checkout/createStoreOrder";

export const dynamic = "force-dynamic";

export async function POST(request) {
  return createStoreOrderFromRequest(request, {
    orderSource: "site",
    enforceMinOrder: false,
  });
}
