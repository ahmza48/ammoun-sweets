import "server-only";
import { headers } from "next/headers";
import { eq, lt, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { auditLogs, rateLimits } from "@/server/db/schema";

/**
 * Rate limiting, audit logging and structured server logs.
 *
 * The rate limiter is database-backed rather than in-memory because a Next.js
 * app runs as many short-lived instances: a per-process Map would reset on
 * every cold start and would not be shared between them, which makes it
 * approximately no protection at all. One table row per bucket is slower than
 * Redis but correct, and the swap to Redis later is confined to this file.
 */

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

/**
 * Fixed-window counter. `key` should already include the subject —
 * `login:ada@example.com`, `checkout:203.0.113.5`.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowSeconds * 1000);

  // One statement: insert a fresh window, or bump the existing one — and reset
  // it if the stored window has already lapsed.
  const rows = await db
    .insert(rateLimits)
    .values({ key, count: 1, expiresAt })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`CASE WHEN ${rateLimits.expiresAt} < ${now.toISOString()}
                        THEN 1 ELSE ${rateLimits.count} + 1 END`,
        expiresAt: sql`CASE WHEN ${rateLimits.expiresAt} < ${now.toISOString()}
                            THEN ${expiresAt.toISOString()} ELSE ${rateLimits.expiresAt} END`,
      },
    })
    .returning({ count: rateLimits.count, expiresAt: rateLimits.expiresAt });

  const row = rows[0];
  const count = row?.count ?? 1;
  const retryAfterSeconds = row
    ? Math.max(0, Math.ceil((row.expiresAt.getTime() - now.getTime()) / 1000))
    : windowSeconds;

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds,
  };
}

export async function clearRateLimit(key: string): Promise<void> {
  await db.delete(rateLimits).where(eq(rateLimits.key, key));
}

export async function purgeExpiredRateLimits(): Promise<void> {
  await db.delete(rateLimits).where(lt(rateLimits.expiresAt, new Date()));
}

/**
 * Best-effort client IP.
 *
 * Only trustworthy behind a proxy that sets these and strips client-supplied
 * copies (Vercel, Cloudflare, most load balancers do). Used for throttling,
 * never for authorisation.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? h.get("cf-connecting-ip") ?? "unknown";
}

/* ── Audit log ──────────────────────────────────────────────────────────── */

export type AuditEntry = {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * Records a privileged action. Never throws: an audit failure must not roll
 * back the business operation it was describing.
 */
export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      actorId: entry.actorId ?? null,
      actorEmail: entry.actorEmail ?? null,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      metadata: entry.metadata ?? null,
    });
  } catch (error) {
    logError("audit.write_failed", error, { action: entry.action });
  }
}

export async function listAuditLogs(limit = 100) {
  return db
    .select()
    .from(auditLogs)
    .orderBy(sql`${auditLogs.createdAt} DESC`)
    .limit(limit);
}

/* ── Structured logging ─────────────────────────────────────────────────── */

/**
 * Anything matching these keys is replaced before a log line is emitted.
 * Passwords, tokens and card data must never reach a log aggregator.
 */
const REDACT = /pass(word)?|token|secret|authorization|cookie|card|cvv|cvc|pan/i;

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    out[key] = REDACT.test(key) ? "[redacted]" : redact(val, depth + 1);
  }
  return out;
}

export function logInfo(event: string, context: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ level: "info", event, ...(redact(context) as object), at: new Date().toISOString() }));
}

export function logWarn(event: string, context: Record<string, unknown> = {}): void {
  console.warn(JSON.stringify({ level: "warn", event, ...(redact(context) as object), at: new Date().toISOString() }));
}

export function logError(
  event: string,
  error: unknown,
  context: Record<string, unknown> = {},
): void {
  const detail =
    error instanceof Error
      ? { message: error.message, stack: error.stack?.split("\n").slice(0, 5).join("\n") }
      : { message: String(error) };

  console.error(
    JSON.stringify({
      level: "error",
      event,
      ...detail,
      ...(redact(context) as object),
      at: new Date().toISOString(),
    }),
  );
}
