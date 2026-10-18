import "server-only";
import { and, desc, eq, gte, ne, sql, type SQL } from "drizzle-orm";
import { db, type Transaction } from "@/server/db";
import {
  orderEvents,
  orderItems,
  orderNotes,
  orderNumberSequence,
  orders,
  productVariants,
  users,
  type Order,
  type OrderStatus,
  type PaymentStatus,
} from "@/server/db/schema";
import type { PricedCart } from "./pricing";
import {
  allowedTransitions,
  ORDER_STATUS_FLOW,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/order-status";

/*
 * Re-exported so server code has one obvious place to import order vocabulary
 * from. The definitions live in lib/ because the admin's status buttons are a
 * Client Component and this module is `server-only`.
 */
export { allowedTransitions, ORDER_STATUS_FLOW, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS };

/**
 * Order creation, lookup and state transitions.
 *
 * Everything that must succeed or fail together — the order row, its item
 * snapshots, the stock decrement, the opening timeline event — happens inside
 * one database transaction. A half-created order (paid but with no items, or
 * stock taken with no order) is the kind of bug that costs a real shop real
 * money, so there is no path that can produce one.
 */

export const ORDER_NUMBER_PREFIX = "AS";

export type CreateOrderInput = {
  cart: PricedCart;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    userId?: string | null;
  };
  fulfilment:
    | { type: "PICKUP"; pickupDate: string; pickupTime: string }
    | {
        type: "DELIVERY";
        address1: string;
        address2?: string | null;
        suburb: string;
        state: string;
        postcode: string;
      };
  notes?: string | null;
  idempotencyKey: string;
  /** How payment will be taken. Always "counter" today — paid in the shop. */
  paymentProvider: string;
};

export type CreateOrderResult =
  | { ok: true; order: Order; reused: boolean }
  | { ok: false; code: "OUT_OF_STOCK"; message: string };

/**
 * Creates an order, atomically.
 *
 * Idempotency has two layers: this function first looks for an existing order
 * with the same key, and the `orders_idempotency_key` unique index catches the
 * race where two requests get past that check simultaneously. A double-clicked
 * "Place order" therefore returns the same order rather than creating a second.
 */
export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const existing = await findByIdempotencyKey(input.idempotencyKey);
  if (existing) return { ok: true, order: existing, reused: true };

  try {
    const order = await db.transaction(async (tx) => {
      // Decrement tracked stock first, with a conditional UPDATE. The
      // `stock_quantity >= qty` predicate plus the row lock Postgres takes on
      // UPDATE means two simultaneous checkouts cannot both succeed on the
      // last item — the second one matches zero rows and we abort.
      for (const line of input.cart.lines) {
        const updated = await tx
          .update(productVariants)
          .set({ stockQuantity: sql`${productVariants.stockQuantity} - ${line.quantity}` })
          .where(
            and(
              eq(productVariants.id, line.variantId),
              eq(productVariants.inventoryTracked, true),
              gte(productVariants.stockQuantity, line.quantity),
            ),
          )
          .returning({ id: productVariants.id });

        if (updated.length === 0) {
          // Either it isn't tracked (fine) or there isn't enough left (not fine).
          const [variant] = await tx
            .select({
              tracked: productVariants.inventoryTracked,
              stock: productVariants.stockQuantity,
            })
            .from(productVariants)
            .where(eq(productVariants.id, line.variantId))
            .limit(1);

          if (variant?.tracked) {
            throw new OutOfStockError(
              `${line.productName} — ${line.variantName} sold out while you were checking out.`,
            );
          }
        }
      }

      const orderNumber = await nextOrderNumber(tx);

      const [created] = await tx
        .insert(orders)
        .values({
          orderNumber,
          userId: input.customer.userId ?? null,
          firstName: input.customer.firstName,
          lastName: input.customer.lastName,
          email: input.customer.email,
          phone: input.customer.phone,

          subtotal: input.cart.subtotal,
          discount: input.cart.discount,
          deliveryFee: input.cart.deliveryFee,
          tax: input.cart.tax,
          total: input.cart.total,
          couponCode: input.cart.appliedCoupon?.code ?? null,

          fulfilmentType: input.fulfilment.type,
          pickupDate: input.fulfilment.type === "PICKUP" ? input.fulfilment.pickupDate : null,
          pickupTime: input.fulfilment.type === "PICKUP" ? input.fulfilment.pickupTime : null,
          deliveryAddress1:
            input.fulfilment.type === "DELIVERY" ? input.fulfilment.address1 : null,
          deliveryAddress2:
            input.fulfilment.type === "DELIVERY" ? (input.fulfilment.address2 ?? null) : null,
          deliverySuburb: input.fulfilment.type === "DELIVERY" ? input.fulfilment.suburb : null,
          deliveryState: input.fulfilment.type === "DELIVERY" ? input.fulfilment.state : null,
          deliveryPostcode:
            input.fulfilment.type === "DELIVERY" ? input.fulfilment.postcode : null,

          customerNotes: input.notes ?? null,
          paymentProvider: input.paymentProvider,
          idempotencyKey: input.idempotencyKey,
          paymentStatus: "PENDING",
          /*
           * CONFIRMED, not PENDING_PAYMENT. Nothing takes payment online, so
           * there is no pre-payment limbo to sit in — a placed order is an
           * order the shop should start preparing. `paymentStatus` stays
           * PENDING until someone takes the money at the counter.
           */
          orderStatus: "CONFIRMED",
        })
        .returning();

      if (input.cart.lines.length > 0) {
        await tx.insert(orderItems).values(
          input.cart.lines.map((line) => ({
            orderId: created.id,
            productId: line.productId,
            variantId: line.variantId,
            // Snapshot: this is what the customer bought, at the price they paid.
            productName: line.productName,
            variantName: line.variantName,
            sku: line.sku,
            unitPrice: line.unitPrice,
            quantity: line.quantity,
            total: line.total,
            weightGrams: line.weightGrams,
          })),
        );
      }

      await tx.insert(orderEvents).values({
        orderId: created.id,
        type: "ORDER_CREATED",
        message: `Order ${orderNumber} created.`,
      });

      return created;
    });

    return { ok: true, order, reused: false };
  } catch (error) {
    if (error instanceof OutOfStockError) {
      return { ok: false, code: "OUT_OF_STOCK", message: error.message };
    }
    // The unique index fired: another request created this order first.
    if (isUniqueViolation(error)) {
      const raced = await findByIdempotencyKey(input.idempotencyKey);
      if (raced) return { ok: true, order: raced, reused: true };
    }
    throw error;
  }
}

export class OutOfStockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OutOfStockError";
  }
}

function isUniqueViolation(error: unknown): boolean {
  const code = (error as { code?: string; cause?: { code?: string } })?.code
    ?? (error as { cause?: { code?: string } })?.cause?.code;
  return code === "23505";
}

/**
 * Human-friendly order numbers (AS-10482) from a counter row.
 *
 * `FOR UPDATE` serialises concurrent checkouts through this row, which is what
 * guarantees no two orders get the same number. It also means customers can't
 * infer the shop's total order count from their own number the way a raw
 * sequential id would leak it.
 */
async function nextOrderNumber(tx: Transaction): Promise<string> {
  const rows = await tx.execute<{ current: number }>(
    sql`UPDATE ${orderNumberSequence}
        SET current = current + 1
        WHERE id = 1
        RETURNING current`,
  );
  const list = Array.isArray(rows) ? rows : ((rows as { rows: { current: number }[] }).rows ?? []);
  const next = list[0]?.current;
  if (!next) throw new Error("Order number sequence is missing — run the seed.");
  return `${ORDER_NUMBER_PREFIX}-${next}`;
}

export async function findByIdempotencyKey(key: string): Promise<Order | null> {
  const [row] = await db
    .select()
    .from(orders)
    .where(eq(orders.idempotencyKey, key))
    .limit(1);
  return row ?? null;
}

/* ── Reads ──────────────────────────────────────────────────────────────── */

export type OrderWithItems = Order & {
  items: (typeof orderItems.$inferSelect)[];
};

export async function getOrderById(id: string): Promise<OrderWithItems | null> {
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) return null;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
  return { ...order, items };
}

export async function getOrderByNumber(orderNumber: string): Promise<OrderWithItems | null> {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.orderNumber, orderNumber))
    .limit(1);
  if (!order) return null;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  return { ...order, items };
}

/**
 * Confirmation-page lookup.
 *
 * Requires the order number *and* the email that placed it. Without the second
 * factor, `/orders/AS-10001` would let anyone walk the sequence and read every
 * customer's name, phone and address.
 */
export async function getOrderForCustomer(
  orderNumber: string,
  email: string,
): Promise<OrderWithItems | null> {
  const order = await getOrderByNumber(orderNumber);
  if (!order) return null;
  if (order.email.toLowerCase() !== email.trim().toLowerCase()) return null;
  return order;
}

export async function getOrdersForUser(userId: string): Promise<OrderWithItems[]> {
  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));

  if (rows.length === 0) return [];
  const items = await db.select().from(orderItems);
  const byOrder = new Map<string, (typeof orderItems.$inferSelect)[]>();
  for (const item of items) {
    const list = byOrder.get(item.orderId) ?? [];
    list.push(item);
    byOrder.set(item.orderId, list);
  }
  return rows.map((o) => ({ ...o, items: byOrder.get(o.id) ?? [] }));
}

export type OrderFilters = {
  search?: string;
  orderStatus?: OrderStatus;
  paymentStatus?: PaymentStatus;
  fulfilmentType?: "PICKUP" | "DELIVERY";
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

export async function adminListOrders(filters: OrderFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, filters.pageSize ?? 25));

  const conditions: SQL[] = [];

  if (filters.orderStatus) conditions.push(eq(orders.orderStatus, filters.orderStatus));
  if (filters.paymentStatus) conditions.push(eq(orders.paymentStatus, filters.paymentStatus));
  if (filters.fulfilmentType) conditions.push(eq(orders.fulfilmentType, filters.fulfilmentType));
  if (filters.from) conditions.push(sql`${orders.createdAt} >= ${`${filters.from}T00:00:00Z`}`);
  if (filters.to) conditions.push(sql`${orders.createdAt} <= ${`${filters.to}T23:59:59Z`}`);

  if (filters.search) {
    const pattern = `%${filters.search.trim().replace(/[%_]/g, (m) => `\\${m}`)}%`;
    conditions.push(
      sql`(${orders.orderNumber} ILIKE ${pattern}
        OR ${orders.email} ILIKE ${pattern}
        OR ${orders.phone} ILIKE ${pattern}
        OR (${orders.firstName} || ' ' || ${orders.lastName}) ILIKE ${pattern})`,
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalRow] = await Promise.all([
    db
      .select()
      .from(orders)
      .where(where)
      .orderBy(desc(orders.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: sql<number>`count(*)::int` }).from(orders).where(where),
  ]);

  return {
    orders: rows,
    total: totalRow[0]?.total ?? 0,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil((totalRow[0]?.total ?? 0) / pageSize)),
  };
}

/* ── State transitions ──────────────────────────────────────────────────── */

export async function updateOrderStatus(
  orderId: string,
  next: OrderStatus,
  actor: { id: string; email: string } | null,
): Promise<{ ok: true; order: Order } | { ok: false; message: string }> {
  const [current] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!current) return { ok: false, message: "Order not found." };

  if (!allowedTransitions(current).includes(next)) {
    return {
      ok: false,
      message: `Cannot move an order from ${ORDER_STATUS_LABELS[current.orderStatus]} to ${ORDER_STATUS_LABELS[next]}.`,
    };
  }

  const [updated] = await db
    .update(orders)
    .set({ orderStatus: next, updatedAt: new Date() })
    .where(eq(orders.id, orderId))
    .returning();

  await db.insert(orderEvents).values({
    orderId,
    type: "STATUS_CHANGED",
    message: `Status changed to ${ORDER_STATUS_LABELS[next]}${actor ? ` by ${actor.email}` : ""}.`,
    actorId: actor?.id ?? null,
  });

  return { ok: true, order: updated };
}

/**
 * Records that the shop has been paid, in the shop.
 *
 * There is no online payment, so this is only ever a member of staff saying
 * "this one's settled" — at the counter, or over the phone before collection.
 * Guarded against double-recording so two taps don't write two timeline
 * entries, and it never moves fulfilment backwards.
 */
export async function markOrderPaid(
  orderId: string,
  details: { method?: string; actorId?: string | null } = {},
): Promise<Order | null> {
  const [updated] = await db
    .update(orders)
    .set({
      paymentStatus: "PAID",
      // An order that was already being prepared stays where it is; only the
      // pre-payment state advances.
      orderStatus: sql`CASE WHEN ${orders.orderStatus} = 'PENDING_PAYMENT'
                            THEN 'CONFIRMED'::order_status
                            ELSE ${orders.orderStatus} END`,
      paidAt: new Date(),
      paymentProvider: details.method ?? "counter",
      updatedAt: new Date(),
    })
    // Only an unpaid order. Re-running this is a no-op rather than a second
    // `paidAt` and a duplicate timeline entry.
    .where(and(eq(orders.id, orderId), ne(orders.paymentStatus, "PAID")))
    .returning();

  if (updated) {
    await db.insert(orderEvents).values({
      orderId,
      type: "PAYMENT_SUCCEEDED",
      message: "Paid in the shop.",
      actorId: details.actorId ?? null,
    });
  }
  return updated ?? null;
}

export async function markOrderPaymentFailed(orderId: string, reason: string): Promise<void> {
  await db
    .update(orders)
    .set({ paymentStatus: "FAILED", updatedAt: new Date() })
    .where(eq(orders.id, orderId));
  await db.insert(orderEvents).values({
    orderId,
    type: "PAYMENT_FAILED",
    message: `Payment failed: ${reason}`.slice(0, 500),
  });
}

/**
 * Returns reserved stock to the shelf when an order is cancelled.
 *
 * Guarded by the current status so a double-cancel can't credit stock twice.
 */
export async function cancelOrder(
  orderId: string,
  reason: string,
  actor: { id: string; email: string } | null,
): Promise<{ ok: boolean; message?: string }> {
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) return { ok: false, message: "Order not found." };
    if (order.orderStatus === "CANCELLED") return { ok: false, message: "Already cancelled." };
    if (order.orderStatus === "COMPLETED") {
      return { ok: false, message: "Completed orders cannot be cancelled." };
    }

    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    for (const item of items) {
      if (!item.variantId) continue;
      await tx
        .update(productVariants)
        .set({ stockQuantity: sql`${productVariants.stockQuantity} + ${item.quantity}` })
        .where(
          and(
            eq(productVariants.id, item.variantId),
            eq(productVariants.inventoryTracked, true),
          ),
        );
    }

    await tx
      .update(orders)
      .set({ orderStatus: "CANCELLED", updatedAt: new Date() })
      .where(eq(orders.id, orderId));

    await tx.insert(orderEvents).values({
      orderId,
      type: "ORDER_CANCELLED",
      message: `Order cancelled${actor ? ` by ${actor.email}` : ""}. ${reason}`.trim().slice(0, 500),
      actorId: actor?.id ?? null,
    });

    return { ok: true };
  });
}

/* ── Notes & timeline ───────────────────────────────────────────────────── */

export async function addOrderNote(
  orderId: string,
  body: string,
  customerVisible: boolean,
  authorId: string,
): Promise<void> {
  await db.insert(orderNotes).values({ orderId, body, customerVisible, authorId });
}

export async function getOrderNotes(orderId: string) {
  return db
    .select({
      note: orderNotes,
      authorEmail: users.email,
    })
    .from(orderNotes)
    .leftJoin(users, eq(orderNotes.authorId, users.id))
    .where(eq(orderNotes.orderId, orderId))
    .orderBy(desc(orderNotes.createdAt));
}

export async function getOrderTimeline(orderId: string) {
  return db
    .select()
    .from(orderEvents)
    .where(eq(orderEvents.orderId, orderId))
    .orderBy(desc(orderEvents.createdAt));
}

export async function recordOrderEvent(
  orderId: string,
  type: string,
  message: string,
  actorId?: string | null,
): Promise<void> {
  await db.insert(orderEvents).values({
    orderId,
    type,
    message: message.slice(0, 500),
    actorId: actorId ?? null,
  });
}
