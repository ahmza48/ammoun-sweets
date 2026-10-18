import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, lt } from "drizzle-orm";
import { db } from "@/server/db";
import { sessions, users, type User, type UserRole } from "@/server/db/schema";
import { env } from "@/server/env";

/**
 * Opaque, server-side sessions.
 *
 * The cookie holds 32 bytes of CSPRNG output and nothing else — no user id, no
 * role, no claims. Authority lives entirely in the `sessions` table, which
 * means "log this person out now" is a DELETE that takes effect immediately,
 * rather than waiting for a self-contained JWT to expire.
 *
 * Only the SHA-256 of the token is stored. A leaked database dump therefore
 * can't be replayed as a live login, the same reason password hashes exist.
 * SHA-256 (not scrypt) is right here: the token already has 256 bits of
 * entropy, so there is nothing to brute-force and the lookup stays fast.
 */

export const SESSION_COOKIE = "ammoun_session";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
/** Sliding window: refresh the expiry once a session is over halfway through. */
const REFRESH_THRESHOLD_MS = SESSION_TTL_MS / 2;

export type SessionUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function toSessionUser(user: User): SessionUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  };
}

/** Creates a session row and returns the raw cookie token (shown once). */
export async function createSession(
  userId: string,
  meta: { ipAddress?: string | null; userAgent?: string | null } = {},
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(sessions).values({
    id: hashToken(token),
    userId,
    expiresAt,
    ipAddress: meta.ipAddress?.slice(0, 64) ?? null,
    userAgent: meta.userAgent?.slice(0, 500) ?? null,
  });

  return { token, expiresAt };
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    // Lax still sends the cookie on an ordinary top-level navigation, while
    // blocking it on cross-site POSTs — which is the CSRF vector.
    sameSite: "lax",
    secure: env.isProduction,
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/**
 * Resolves the current session from the cookie.
 *
 * Returns null for a missing, unknown or expired token, and deletes expired
 * rows as it finds them.
 */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const id = hashToken(token);
  const rows = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  if (row.session.expiresAt.getTime() <= Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, id));
    return null;
  }

  // Sliding expiry, so an active user is never logged out mid-shift.
  if (row.session.expiresAt.getTime() - Date.now() < REFRESH_THRESHOLD_MS) {
    await db
      .update(sessions)
      .set({ expiresAt: new Date(Date.now() + SESSION_TTL_MS) })
      .where(eq(sessions.id, id));
  }

  return toSessionUser(row.user);
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
  }
  await clearSessionCookie();
}

/** Invalidates every session for a user — used on password change/reset. */
export async function destroyAllSessionsForUser(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function purgeExpiredSessions(): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}

/* ── Authorisation ──────────────────────────────────────────────────────── */

const STAFF_ROLES: UserRole[] = ["ADMIN", "STAFF"];

export function isStaff(user: SessionUser | null): boolean {
  return Boolean(user && STAFF_ROLES.includes(user.role));
}

export function isAdmin(user: SessionUser | null): boolean {
  return user?.role === "ADMIN";
}

/**
 * Guards for use at the top of every admin server action and admin page.
 *
 * These throw rather than redirect so that forgetting to handle the result is
 * a loud failure, not a silent authorisation bypass. `proxy.ts` also blocks
 * unauthenticated traffic to /admin, but that is defence in depth — the real
 * check is here, next to the data.
 */
export class AuthorizationError extends Error {
  constructor(message = "You do not have permission to do that.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) throw new AuthorizationError("You need to be signed in.");
  return user;
}

export async function requireStaff(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isStaff(user)) throw new AuthorizationError();
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isAdmin(user)) throw new AuthorizationError();
  return user;
}

/** Records a failed-login attempt and returns whether the account is now locked. */
export async function noteFailedLogin(userId: string, attempts: number, lockMs: number) {
  const next = attempts + 1;
  await db
    .update(users)
    .set({
      failedLoginCount: next,
      lockedUntil: next >= 5 ? new Date(Date.now() + lockMs) : null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
  return next >= 5;
}

export async function clearFailedLogins(userId: string) {
  await db
    .update(users)
    .set({ failedLoginCount: 0, lockedUntil: null, updatedAt: new Date() })
    .where(and(eq(users.id, userId)));
}
