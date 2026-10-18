import type { FulfilmentType, OrderStatus, PaymentStatus } from "@/server/db/schema";

/**
 * Order status vocabulary and the legal transitions between states.
 *
 * This lives in `lib/` rather than in the order *service* because the admin's
 * status buttons are a Client Component, and importing anything from a module
 * marked `server-only` would drag database code into the browser bundle. These
 * are pure data and pure functions — no database, no secrets — so they are
 * safe on both sides, and the service re-exports them so server code still has
 * one obvious import.
 */

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Pending payment",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  READY_FOR_PICKUP: "Ready for pickup",
  OUT_FOR_DELIVERY: "Out for delivery",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Pending",
  PAID: "Paid",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
  PARTIALLY_REFUNDED: "Partially refunded",
  REFUNDED: "Refunded",
};

/**
 * Which fulfilment states an order may move to next.
 *
 * Encoded as data rather than scattered `if`s so the admin UI can render only
 * the legal buttons, and the server can reject an illegal jump — someone
 * POSTing "COMPLETED" on an unpaid order, for instance.
 */
export const ORDER_STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  // Nothing sets PENDING_PAYMENT any more — there is no online payment, so a
  // placed order starts CONFIRMED. The row stays so any order created before
  // that change still has somewhere legal to go.
  PENDING_PAYMENT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "COMPLETED", "CANCELLED"],
  READY_FOR_PICKUP: ["COMPLETED", "CANCELLED"],
  OUT_FOR_DELIVERY: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

/** Next states, filtered to those that make sense for this fulfilment type. */
export function allowedTransitions(order: {
  orderStatus: OrderStatus;
  fulfilmentType: FulfilmentType;
}): OrderStatus[] {
  return ORDER_STATUS_FLOW[order.orderStatus].filter((next) => {
    if (next === "READY_FOR_PICKUP") return order.fulfilmentType === "PICKUP";
    if (next === "OUT_FOR_DELIVERY") return order.fulfilmentType === "DELIVERY";
    return true;
  });
}
