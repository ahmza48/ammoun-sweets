import { beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase, seedBaseline, schema } from "../helpers/db";
import type { Database } from "@/server/db";
import { fakeVerify, hashPassword, needsRehash, verifyPassword } from "@/server/auth/password";
import { clearFailedLogins, isAdmin, isStaff, noteFailedLogin } from "@/server/auth/session";
import { eq } from "drizzle-orm";
import { rateLimit, clearRateLimit } from "@/server/services/security";
import { validatePickupSlot, validateDelivery, shopToday } from "@/server/services/fulfilment";
import { getStoreSettings, updateStoreSettings } from "@/server/services/settings";
import type { StoreSettings } from "@/server/db/schema";

/**
 * Password hashing, authorisation, throttling and fulfilment rules.
 */

let db: Database;
let settings: StoreSettings;

beforeAll(async () => {
  db = await createTestDatabase();
  await seedBaseline(db);
  settings = await getStoreSettings();
});

describe("password hashing", () => {
  it("verifies a correct password and rejects a wrong one", async () => {
    const hash = await hashPassword("a-perfectly-fine-passphrase");
    expect(await verifyPassword("a-perfectly-fine-passphrase", hash)).toBe(true);
    expect(await verifyPassword("not-the-password", hash)).toBe(false);
  });

  it("salts every hash, so identical passwords never collide", async () => {
    const a = await hashPassword("same-password-here");
    const b = await hashPassword("same-password-here");
    expect(a).not.toBe(b);
    expect(await verifyPassword("same-password-here", a)).toBe(true);
    expect(await verifyPassword("same-password-here", b)).toBe(true);
  });

  it("never stores the password in the hash string", async () => {
    const hash = await hashPassword("literal-secret-value");
    expect(hash).not.toContain("literal-secret-value");
    expect(hash.startsWith("scrypt$")).toBe(true);
  });

  it("rejects a malformed or tampered hash instead of throwing", async () => {
    expect(await verifyPassword("x", "")).toBe(false);
    expect(await verifyPassword("x", "notahash")).toBe(false);
    expect(await verifyPassword("x", "scrypt$1$2$3$bad")).toBe(false);
    // An attacker truncating the stored hash must not produce a match.
    expect(await verifyPassword("x", "scrypt$131072$8$1$c2FsdA==$")).toBe(false);
  });

  it("flags hashes made with weaker parameters for upgrade", async () => {
    expect(needsRehash(await hashPassword("current-parameters"))).toBe(false);
    expect(needsRehash("scrypt$16384$8$1$c2FsdA==$aGFzaA==")).toBe(true);
    expect(needsRehash("bcrypt$whatever")).toBe(true);
  });

  it("burns comparable time when there is no account", async () => {
    // Without this, "no such user" returns far faster than "wrong password"
    // and the login endpoint becomes an account-enumeration oracle.
    const hash = await hashPassword("timing-check-password");

    const realStart = performance.now();
    await verifyPassword("wrong-password-attempt", hash);
    const realMs = performance.now() - realStart;

    const fakeStart = performance.now();
    await fakeVerify();
    const fakeMs = performance.now() - fakeStart;

    // Same order of magnitude is what matters, not exact equality.
    expect(fakeMs).toBeGreaterThan(realMs * 0.25);
    expect(fakeMs).toBeLessThan(realMs * 4);
  });
});

describe("role checks", () => {
  const make = (role: "ADMIN" | "STAFF" | "CUSTOMER") => ({
    id: "1",
    email: "x@example.com",
    firstName: null,
    lastName: null,
    role,
  });

  it("separates staff from admin and excludes customers", () => {
    expect(isStaff(make("ADMIN"))).toBe(true);
    expect(isStaff(make("STAFF"))).toBe(true);
    expect(isStaff(make("CUSTOMER"))).toBe(false);
    expect(isStaff(null)).toBe(false);

    expect(isAdmin(make("ADMIN"))).toBe(true);
    // Staff can run the kitchen but must not reprice the menu.
    expect(isAdmin(make("STAFF"))).toBe(false);
    expect(isAdmin(null)).toBe(false);
  });
});

describe("account lockout", () => {
  it("locks an account after five failed attempts and clears on success", async () => {
    const [user] = await db
      .insert(schema.users)
      .values({
        email: `lockout-${crypto.randomUUID()}@example.com`,
        passwordHash: await hashPassword("a-good-enough-passphrase"),
        role: "ADMIN",
      })
      .returning();

    // Four failures: still open.
    let locked = false;
    for (let attempt = 0; attempt < 4; attempt++) {
      locked = await noteFailedLogin(user.id, attempt, 15 * 60 * 1000);
    }
    expect(locked).toBe(false);

    // The fifth trips the lock.
    locked = await noteFailedLogin(user.id, 4, 15 * 60 * 1000);
    expect(locked).toBe(true);

    const [afterLock] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, user.id));
    expect(afterLock.failedLoginCount).toBe(5);
    expect(afterLock.lockedUntil).not.toBeNull();
    expect(afterLock.lockedUntil!.getTime()).toBeGreaterThan(Date.now());

    // A successful login clears both the counter and the lock.
    await clearFailedLogins(user.id);
    const [afterClear] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, user.id));
    expect(afterClear.failedLoginCount).toBe(0);
    expect(afterClear.lockedUntil).toBeNull();
  });
});

describe("rate limiting", () => {
  it("allows up to the limit then blocks", async () => {
    const key = `test:${crypto.randomUUID()}`;

    for (let i = 0; i < 3; i++) {
      const result = await rateLimit(key, 3, 60);
      expect(result.allowed).toBe(true);
    }

    const blocked = await rateLimit(key, 3, 60);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks each key independently and can be cleared", async () => {
    const a = `test:${crypto.randomUUID()}`;
    const b = `test:${crypto.randomUUID()}`;

    await rateLimit(a, 1, 60);
    expect((await rateLimit(a, 1, 60)).allowed).toBe(false);
    // A different subject is unaffected.
    expect((await rateLimit(b, 1, 60)).allowed).toBe(true);

    // Clearing is what a successful login does.
    await clearRateLimit(a);
    expect((await rateLimit(a, 1, 60)).allowed).toBe(true);
  });
});

describe("delivery rules", () => {
  it("refuses a postcode the shop has not opted into", async () => {
    await updateStoreSettings({
      deliveryEnabled: true,
      deliveryPostcodes: ["2197", "2200"],
      deliveryFee: 900,
      deliveryMinimum: 3000,
      freeDeliveryThreshold: null,
    });
    const withDelivery = await getStoreSettings();

    const allowed = validateDelivery("2197", 5000, withDelivery);
    expect(allowed.ok).toBe(true);
    if (allowed.ok) expect(allowed.fee).toBe(900);

    const outside = validateDelivery("3000", 5000, withDelivery);
    expect(outside.ok).toBe(false);
    if (!outside.ok) expect(outside.code).toBe("OUT_OF_AREA");

    const tooSmall = validateDelivery("2197", 1000, withDelivery);
    expect(tooSmall.ok).toBe(false);
    if (!tooSmall.ok) expect(tooSmall.code).toBe("BELOW_MINIMUM");

    await updateStoreSettings({ deliveryEnabled: false, deliveryPostcodes: [] });
    const off = await getStoreSettings();
    const disabled = validateDelivery("2197", 5000, off);
    expect(disabled.ok).toBe(false);
    if (!disabled.ok) expect(disabled.code).toBe("DISABLED");

    settings = await getStoreSettings();
  });
});

describe("pickup slots", () => {
  it("rejects a date in the past and an unknown time", async () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

    const past = await validatePickupSlot(yesterday, "14:00", settings);
    expect(past.ok).toBe(false);

    // A time the shop does not offer, on a valid day.
    const today = shopToday();
    const silly = await validatePickupSlot(today, "03:00", settings);
    expect(silly.ok).toBe(false);
  });

  it("will not book a pickup on a closed day", async () => {
    const target = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);

    await db.insert(schema.storeClosures).values({
      date: target,
      reason: "Public holiday",
      closedAllDay: true,
    });

    const result = await validatePickupSlot(target, "14:00", settings);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("Public holiday");
  });
});
