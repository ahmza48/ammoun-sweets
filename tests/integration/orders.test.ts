import { beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { createProduct, createTestDatabase, seedBaseline, schema } from "../helpers/db";
import type { Database } from "@/server/db";
import { priceCart } from "@/server/services/pricing";
import { getStoreSettings } from "@/server/services/settings";
import {
  allowedTransitions,
  cancelOrder,
  createOrder,
  getOrderByNumber,
  getOrderForCustomer,
  markOrderPaid,
  updateOrderStatus,
} from "@/server/services/orders";
import type { StoreSettings } from "@/server/db/schema";

/**
 * Orders: creation, atomicity, idempotency and state transitions.
 *
 * These are the tests that matter most commercially — a duplicated order or a
 * lost stock decrement costs the shop real money, and an order that can be
 * read by its number alone leaks every customer's address.
 */

let db: Database;
let settings: StoreSettings;

const customer = {
  firstName: "Dana",
  lastName: "Haddad",
  email: "dana@example.com",
  phone: "+61412345678",
};

const pickup = {
  type: "PICKUP" as const,
  pickupDate: "2026-12-01",
  pickupTime: "14:00",
};

beforeAll(async () => {
  db = await createTestDatabase();
  await seedBaseline(db);
  settings = await getStoreSettings();
});

async function cartFor(variantId: string, quantity = 1) {
  return priceCart([{ variantId, quantity }], { settings });
}

describe("createOrder", () => {
  it("writes the order, its items and an opening event atomically", async () => {
    const { variant } = await createProduct(db, {
      name: "Baklava Mix",
      slug: "order-baklava",
      price: 3000,
    });

    const result = await createOrder({
      cart: await cartFor(variant.id, 2),
      customer,
      fulfilment: pickup,
      idempotencyKey: "key-basic-1",
      paymentProvider: "counter",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.order.orderNumber).toMatch(/^AS-\d+$/);
    expect(result.order.total).toBe(6000);
    /*
     * Unpaid but confirmed. Nothing takes payment online, so there is no
     * pre-payment limbo — the shop should start preparing straight away, and
     * the money is collected at the counter.
     */
    expect(result.order.paymentStatus).toBe("PENDING");
    expect(result.order.orderStatus).toBe("CONFIRMED");

    const full = await getOrderByNumber(result.order.orderNumber);
    expect(full?.items).toHaveLength(1);
    expect(full?.items[0].quantity).toBe(2);

    const events = await db
      .select()
      .from(schema.orderEvents)
      .where(eq(schema.orderEvents.orderId, result.order.id));
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("ORDER_CREATED");
  });

  it("snapshots names and prices so later edits don't rewrite history", async () => {
    const { product, variant } = await createProduct(db, {
      name: "Original Name",
      slug: "order-snapshot",
      price: 2500,
    });

    const result = await createOrder({
      cart: await cartFor(variant.id, 1),
      customer,
      fulfilment: pickup,
      idempotencyKey: "key-snapshot",
      paymentProvider: "counter",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // The shop renames and reprices the product afterwards.
    await db
      .update(schema.products)
      .set({ name: "Renamed Product" })
      .where(eq(schema.products.id, product.id));
    await db
      .update(schema.productVariants)
      .set({ price: 9900 })
      .where(eq(schema.productVariants.id, variant.id));

    const full = await getOrderByNumber(result.order.orderNumber);
    expect(full?.items[0].productName).toBe("Original Name");
    expect(full?.items[0].unitPrice).toBe(2500);
    expect(full?.total).toBe(2500);
  });

  it("returns the first order when the same idempotency key is replayed", async () => {
    const { variant } = await createProduct(db, {
      name: "Double Click",
      slug: "order-idempotent",
      price: 1500,
    });

    const key = "key-double-click";
    const first = await createOrder({
      cart: await cartFor(variant.id, 1),
      customer,
      fulfilment: pickup,
      idempotencyKey: key,
      paymentProvider: "counter",
    });
    const second = await createOrder({
      cart: await cartFor(variant.id, 1),
      customer,
      fulfilment: pickup,
      idempotencyKey: key,
      paymentProvider: "counter",
    });

    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;

    expect(second.reused).toBe(true);
    expect(second.order.id).toBe(first.order.id);

    const all = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.idempotencyKey, key));
    expect(all).toHaveLength(1);
  });

  it("gives every order a distinct number", async () => {
    const { variant } = await createProduct(db, {
      name: "Numbered",
      slug: "order-numbered",
      price: 1000,
    });

    const numbers = new Set<string>();
    for (let i = 0; i < 5; i++) {
      const result = await createOrder({
        cart: await cartFor(variant.id, 1),
        customer,
        fulfilment: pickup,
        idempotencyKey: `key-seq-${i}`,
        paymentProvider: "counter",
      });
      if (result.ok) numbers.add(result.order.orderNumber);
    }
    expect(numbers.size).toBe(5);
  });
});

describe("inventory", () => {
  it("decrements tracked stock and refuses to oversell", async () => {
    const { variant } = await createProduct(db, {
      name: "Limited Tray",
      slug: "order-limited",
      price: 5000,
      inventoryTracked: true,
      stockQuantity: 3,
    });

    const first = await createOrder({
      cart: await cartFor(variant.id, 2),
      customer,
      fulfilment: pickup,
      idempotencyKey: "key-stock-1",
      paymentProvider: "counter",
    });
    expect(first.ok).toBe(true);

    const [afterFirst] = await db
      .select()
      .from(schema.productVariants)
      .where(eq(schema.productVariants.id, variant.id));
    expect(afterFirst.stockQuantity).toBe(1);

    // Ask for 3 when only 1 remains. priceCart clamps to 1, so build the
    // over-quantity cart by hand — this is the crafted-request case.
    const priced = await cartFor(variant.id, 1);
    const oversized = {
      ...priced,
      lines: priced.lines.map((l) => ({ ...l, quantity: 3, total: l.unitPrice * 3 })),
    };

    const second = await createOrder({
      cart: oversized,
      customer,
      fulfilment: pickup,
      idempotencyKey: "key-stock-2",
      paymentProvider: "counter",
    });

    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.code).toBe("OUT_OF_STOCK");

    // The failed transaction must not have taken any stock.
    const [afterSecond] = await db
      .select()
      .from(schema.productVariants)
      .where(eq(schema.productVariants.id, variant.id));
    expect(afterSecond.stockQuantity).toBe(1);

    // …and must not have left a half-created order behind.
    const orphan = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.idempotencyKey, "key-stock-2"));
    expect(orphan).toHaveLength(0);
  });

  it("returns stock to the shelf when an order is cancelled", async () => {
    const { variant } = await createProduct(db, {
      name: "Cancellable",
      slug: "order-cancellable",
      price: 2000,
      inventoryTracked: true,
      stockQuantity: 5,
    });

    const result = await createOrder({
      cart: await cartFor(variant.id, 2),
      customer,
      fulfilment: pickup,
      idempotencyKey: "key-cancel",
      paymentProvider: "counter",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const cancelled = await cancelOrder(result.order.id, "Customer changed their mind.", null);
    expect(cancelled.ok).toBe(true);

    const [after] = await db
      .select()
      .from(schema.productVariants)
      .where(eq(schema.productVariants.id, variant.id));
    expect(after.stockQuantity).toBe(5);

    // A second cancel must not credit the stock again.
    const again = await cancelOrder(result.order.id, "Duplicate.", null);
    expect(again.ok).toBe(false);

    const [unchanged] = await db
      .select()
      .from(schema.productVariants)
      .where(eq(schema.productVariants.id, variant.id));
    expect(unchanged.stockQuantity).toBe(5);
  });
});

describe("status transitions", () => {
  it("only offers transitions that make sense for the fulfilment type", async () => {
    const { variant } = await createProduct(db, {
      name: "Transition Test",
      slug: "order-transition",
      price: 1000,
    });

    const result = await createOrder({
      cart: await cartFor(variant.id, 1),
      customer,
      fulfilment: pickup,
      idempotencyKey: "key-transition",
      paymentProvider: "counter",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const paid = await markOrderPaid(result.order.id, { method: "cash" });
    expect(paid?.paymentStatus).toBe("PAID");
    expect(paid?.orderStatus).toBe("CONFIRMED");
    expect(paid?.paymentProvider).toBe("cash");

    await updateOrderStatus(result.order.id, "PREPARING", null);
    const preparing = await getOrderByNumber(result.order.orderNumber);
    expect(preparing?.orderStatus).toBe("PREPARING");

    // A pickup order must never be offered "Out for delivery".
    const next = allowedTransitions(preparing!);
    expect(next).toContain("READY_FOR_PICKUP");
    expect(next).not.toContain("OUT_FOR_DELIVERY");
  });

  it("refuses an illegal jump", async () => {
    const { variant } = await createProduct(db, {
      name: "Illegal Jump",
      slug: "order-illegal",
      price: 1000,
    });

    const result = await createOrder({
      cart: await cartFor(variant.id, 1),
      customer,
      fulfilment: pickup,
      idempotencyKey: "key-illegal",
      paymentProvider: "counter",
    });
    if (!result.ok) return;

    // CONFIRMED → COMPLETED skips preparing, which is not a legal edge.
    const attempt = await updateOrderStatus(result.order.id, "COMPLETED", null);
    expect(attempt.ok).toBe(false);

    const still = await getOrderByNumber(result.order.orderNumber);
    expect(still?.orderStatus).toBe("CONFIRMED");
  });

  it("does not knock a prepared order back, and ignores a second mark-paid", async () => {
    const { variant } = await createProduct(db, {
      name: "Double Tap Paid",
      slug: "order-double-paid",
      price: 1000,
    });

    const result = await createOrder({
      cart: await cartFor(variant.id, 1),
      customer,
      fulfilment: pickup,
      idempotencyKey: "key-late",
      paymentProvider: "counter",
    });
    if (!result.ok) return;

    const first = await markOrderPaid(result.order.id, { method: "cash" });
    expect(first).not.toBeNull();
    const paidAt = first!.paidAt;

    await updateOrderStatus(result.order.id, "PREPARING", null);
    await updateOrderStatus(result.order.id, "READY_FOR_PICKUP", null);

    /*
     * Staff tap "Paid" a second time. It must be a no-op: no new paidAt, no
     * second timeline entry, and the order must not drop back to CONFIRMED.
     */
    const second = await markOrderPaid(result.order.id, { method: "card" });
    expect(second).toBeNull();

    const after = await getOrderByNumber(result.order.orderNumber);
    expect(after?.orderStatus).toBe("READY_FOR_PICKUP");
    expect(after?.paymentStatus).toBe("PAID");
    expect(after?.paidAt?.getTime()).toBe(paidAt?.getTime());
    expect(after?.paymentProvider).toBe("cash");

    const events = await db
      .select()
      .from(schema.orderEvents)
      .where(
        and(
          eq(schema.orderEvents.orderId, result.order.id),
          eq(schema.orderEvents.type, "PAYMENT_SUCCEEDED"),
        ),
      );
    expect(events).toHaveLength(1);
  });
});

describe("customer access", () => {
  it("requires the matching email, not just the order number", async () => {
    const { variant } = await createProduct(db, {
      name: "Private Order",
      slug: "order-private",
      price: 1000,
    });

    const result = await createOrder({
      cart: await cartFor(variant.id, 1),
      customer,
      fulfilment: pickup,
      idempotencyKey: "key-private",
      paymentProvider: "counter",
    });
    if (!result.ok) return;

    const number = result.order.orderNumber;

    expect(await getOrderForCustomer(number, "dana@example.com")).not.toBeNull();
    // Case and whitespace shouldn't lock a real customer out.
    expect(await getOrderForCustomer(number, "  DANA@Example.com ")).not.toBeNull();
    // Someone walking the order-number sequence gets nothing.
    expect(await getOrderForCustomer(number, "attacker@example.com")).toBeNull();
  });
});

describe("weight snapshots", () => {
  it("records the weight each line had at the time of sale", async () => {
    const { variant } = await createProduct(db, {
      name: "Weighed At Sale",
      slug: "order-weight-snapshot",
      price: 3000,
      weightGrams: 500,
    });

    const result = await createOrder({
      cart: await cartFor(variant.id, 3),
      customer,
      fulfilment: pickup,
      idempotencyKey: "key-weight-1",
      paymentProvider: "counter",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const full = await getOrderByNumber(result.order.orderNumber);
    expect(full?.items[0].weightGrams).toBe(500);

    /*
     * Correct the shop's recorded weight afterwards. The order must still show
     * what it weighed when it was sold — the same rule that protects the price.
     */
    await db
      .update(schema.productVariants)
      .set({ weightGrams: 450 })
      .where(eq(schema.productVariants.id, variant.id));

    const after = await getOrderByNumber(result.order.orderNumber);
    expect(after?.items[0].weightGrams).toBe(500);
  });

  it("leaves the weight null for a piece-sold item", async () => {
    const { variant } = await createProduct(db, {
      name: "Pieces Only",
      slug: "order-weight-null",
      price: 600,
      variantName: "6 pieces",
    });

    const result = await createOrder({
      cart: await cartFor(variant.id, 2),
      customer,
      fulfilment: pickup,
      idempotencyKey: "key-weight-2",
      paymentProvider: "counter",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const full = await getOrderByNumber(result.order.orderNumber);
    // Null, not zero: "not sold by weight" is different from "weighs nothing".
    expect(full?.items[0].weightGrams).toBeNull();
  });
});
