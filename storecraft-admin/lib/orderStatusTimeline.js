/** Titles/descriptions for order timeline entries (admin status updates). */

export const ORDER_STATUS_TIMELINE_TITLES = {
  pending: { title: "Order Pending", description: "Order is awaiting processing" },
  confirmed: { title: "Order Confirmed", description: "Order has been confirmed" },
  processing: { title: "Order Processing", description: "Order is being prepared" },
  packed: { title: "Order Packed", description: "Order has been packed and is ready to ship" },
  shipped: { title: "Order Dispatched", description: "Order has been shipped and is on its way" },
  delivered: { title: "Order Delivered", description: "Order has been delivered successfully" },
  returned: { title: "Order Returned", description: "Order was returned by the customer" },
  cancelled: { title: "Order Cancelled", description: "Order has been cancelled" },
  refunded: { title: "Order Refunded", description: "Order has been refunded" },
  disputed: { title: "Order Disputed", description: "Order is under dispute" },
};
