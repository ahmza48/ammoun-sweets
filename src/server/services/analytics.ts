import "server-only";
import { and, count, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { cateringEnquiries, orders, productVariants, products } from "@/server/db/schema";
import { shopToday } from "./fulfilment";

/**
 * Dashboard figures.
 *
 * "Today" means today *at the shop* (Australia/Sydney), not UTC. Using UTC
 * would roll the day over at 10 or 11am local time, which would make the
 * takings figure nonsense for most of the trading day.
 */

export type DashboardStats = {
  ordersToday: number;
  revenueToday: number;
  pendingPayment: number;
  preparing: number;
  readyForPickup: number;
  outForDelivery: number;
  newEnquiries: number;
  lowStock: { productName: string; variantName: string; stock: number }[];
  unpricedProducts: number;
};

/** Start of the shop's current day, as an absolute instant. */
function shopDayBounds(now = new Date()): { start: Date; end: Date } {
  const today = shopToday(now);
  // Sydney is UTC+10/+11; taking a generous window and filtering by the
  // formatted local date would be exact but slow. Instead, anchor on the
  // local midnight by probing the offset at that moment.
  const guess = new Date(`${today}T00:00:00Z`);
  const offsetMinutes = localOffsetMinutes(guess);
  const start = new Date(guess.getTime() - offsetMinutes * 60_000);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

/** Minutes that Australia/Sydney is ahead of UTC at a given instant. */
function localOffsetMinutes(at: Date): number {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: "Australia/Sydney",
    timeZoneName: "longOffset",
  }).formatToParts(at);
  const raw = formatted.find((p) => p.type === "timeZoneName")?.value ?? "GMT+10:00";
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(raw);
  if (!match) return 600;
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3]));
}

export async function getDashboardStats(now = new Date()): Promise<DashboardStats> {
  const { start, end } = shopDayBounds(now);

  const [todayRows, statusRows, enquiryRows, lowStockRows, unpricedRows] = await Promise.all([
    db
      .select({
        orders: count(),
        revenue: sql<number>`coalesce(sum(${orders.total}), 0)::int`,
      })
      .from(orders)
      .where(
        and(
          gte(orders.createdAt, start),
          lt(orders.createdAt, end),
          // Cancelled orders are not takings.
          sql`${orders.orderStatus} <> 'CANCELLED'`,
        ),
      ),

    db
      .select({ status: orders.orderStatus, total: count() })
      .from(orders)
      .where(
        inArray(orders.orderStatus, [
          "PENDING_PAYMENT",
          "CONFIRMED",
          "PREPARING",
          "READY_FOR_PICKUP",
          "OUT_FOR_DELIVERY",
        ]),
      )
      .groupBy(orders.orderStatus),

    db
      .select({ total: count() })
      .from(cateringEnquiries)
      .where(eq(cateringEnquiries.status, "NEW")),

    db
      .select({
        productName: products.name,
        variantName: productVariants.name,
        stock: productVariants.stockQuantity,
      })
      .from(productVariants)
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(
        and(
          eq(productVariants.inventoryTracked, true),
          eq(productVariants.active, true),
          sql`${productVariants.stockQuantity} <= 5`,
        ),
      )
      .orderBy(productVariants.stockQuantity)
      .limit(8),

    db
      .select({ total: count() })
      .from(productVariants)
      .where(and(eq(productVariants.price, 0), eq(productVariants.active, false))),
  ]);

  const byStatus = new Map(statusRows.map((r) => [r.status, Number(r.total)]));

  return {
    ordersToday: Number(todayRows[0]?.orders ?? 0),
    revenueToday: Number(todayRows[0]?.revenue ?? 0),
    pendingPayment: byStatus.get("PENDING_PAYMENT") ?? 0,
    preparing: (byStatus.get("CONFIRMED") ?? 0) + (byStatus.get("PREPARING") ?? 0),
    readyForPickup: byStatus.get("READY_FOR_PICKUP") ?? 0,
    outForDelivery: byStatus.get("OUT_FOR_DELIVERY") ?? 0,
    newEnquiries: Number(enquiryRows[0]?.total ?? 0),
    lowStock: lowStockRows,
    unpricedProducts: Number(unpricedRows[0]?.total ?? 0),
  };
}

export async function getRecentOrders(limit = 10) {
  return db.select().from(orders).orderBy(desc(orders.createdAt)).limit(limit);
}

/** Customer list, aggregated from orders so guests appear too. */
export async function getCustomerSummaries(search?: string) {
  const pattern = search?.trim()
    ? `%${search.trim().replace(/[%_]/g, (m) => `\\${m}`)}%`
    : null;

  const rows = await db
    .select({
      email: orders.email,
      firstName: sql<string>`max(${orders.firstName})`,
      lastName: sql<string>`max(${orders.lastName})`,
      phone: sql<string>`max(${orders.phone})`,
      orderCount: count(),
      totalSpend: sql<number>`coalesce(sum(case when ${orders.paymentStatus} = 'PAID' then ${orders.total} else 0 end), 0)::int`,
      lastOrderAt: sql<Date>`max(${orders.createdAt})`,
    })
    .from(orders)
    .where(
      pattern
        ? sql`(${orders.email} ILIKE ${pattern}
            OR ${orders.phone} ILIKE ${pattern}
            OR (${orders.firstName} || ' ' || ${orders.lastName}) ILIKE ${pattern})`
        : undefined,
    )
    .groupBy(orders.email)
    .orderBy(sql`max(${orders.createdAt}) DESC`)
    .limit(200);

  return rows;
}
