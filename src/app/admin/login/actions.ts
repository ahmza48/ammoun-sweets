"use server";

import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { fakeVerify, hashPassword, needsRehash, verifyPassword } from "@/server/auth/password";
import {
  clearFailedLogins,
  createSession,
  destroySession,
  noteFailedLogin,
  setSessionCookie,
} from "@/server/auth/session";
import { loginSchema, toFieldErrors, type FieldErrors } from "@/lib/validation";
import { env } from "@/server/env";
import { audit, clientIp, logInfo, logWarn, rateLimit } from "@/server/services/security";
import { headers } from "next/headers";

/**
 * Admin sign-in.
 *
 * ── Anti-enumeration ──────────────────────────────────────────────────────
 * Wrong email, wrong password and non-staff account all produce the identical
 * message and comparable timing (`fakeVerify` burns the same work when there
 * is no user). Otherwise this endpoint tells an attacker which email
 * addresses have accounts.
 *
 * ── Brute force ───────────────────────────────────────────────────────────
 * Two layers: a per-IP throttle, and a per-account lockout counter that
 * survives an attacker rotating IPs.
 */

export type LoginState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: FieldErrors;
};

const GENERIC_FAILURE = "That email or password isn't right.";
const LOCK_DURATION_MS = 15 * 60 * 1000;

export async function login(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const ip = await clientIp();

  const ipLimit = await rateLimit(`login:ip:${ip}`, env.limits.loginPerIp, 15 * 60);
  if (!ipLimit.allowed) {
    logWarn("auth.login_ip_throttled", { ip });
    return {
      status: "error",
      message: `Too many attempts. Please wait ${Math.ceil(ipLimit.retryAfterSeconds / 60)} minutes.`,
    };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please check the highlighted fields.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const { email, password } = parsed.data;

  const emailLimit = await rateLimit(`login:email:${email}`, 8, 15 * 60);
  if (!emailLimit.allowed) {
    return { status: "error", message: "Too many attempts for this account. Please wait." };
  }

  const [user] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);

  // Burn equivalent time so a missing account is indistinguishable.
  if (!user || !user.passwordHash) {
    await fakeVerify();
    return { status: "error", message: GENERIC_FAILURE };
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    return {
      status: "error",
      message: `This account is locked for another ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    };
  }

  const valid = await verifyPassword(password, user.passwordHash);

  if (!valid) {
    const locked = await noteFailedLogin(user.id, user.failedLoginCount, LOCK_DURATION_MS);
    logWarn("auth.login_failed", { userId: user.id, locked });
    await audit({
      actorId: user.id,
      actorEmail: user.email,
      action: "LOGIN_FAILED",
      entity: "user",
      entityId: user.id,
      metadata: { ip },
    });
    return {
      status: "error",
      message: locked
        ? "Too many failed attempts — this account is locked for 15 minutes."
        : GENERIC_FAILURE,
    };
  }

  // Only staff may sign in here, but the message is the same as a bad
  // password so this page can't be used to discover who is an admin.
  if (user.role !== "ADMIN" && user.role !== "STAFF") {
    logWarn("auth.login_non_staff", { userId: user.id });
    return { status: "error", message: GENERIC_FAILURE };
  }

  // Opportunistically upgrade a hash made with weaker parameters.
  if (needsRehash(user.passwordHash)) {
    await db
      .update(users)
      .set({ passwordHash: await hashPassword(password), updatedAt: new Date() })
      .where(eq(users.id, user.id));
  }

  await clearFailedLogins(user.id);

  const headerList = await headers();
  const { token, expiresAt } = await createSession(user.id, {
    ipAddress: ip,
    userAgent: headerList.get("user-agent"),
  });
  await setSessionCookie(token, expiresAt);

  logInfo("auth.login_success", { userId: user.id, role: user.role });
  await audit({
    actorId: user.id,
    actorEmail: user.email,
    action: "LOGIN",
    entity: "user",
    entityId: user.id,
  });

  const next = String(formData.get("next") ?? "/admin");
  // Only ever redirect within this site — an open redirect here would be a
  // ready-made phishing tool.
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/admin/login");
}
