import "server-only";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/**
 * Password hashing with scrypt.
 *
 * ── Why scrypt and not a third-party library ──────────────────────────────
 * scrypt is a memory-hard KDF built into Node's core crypto, standardised in
 * RFC 7914, and is one of the three algorithms OWASP currently recommends for
 * password storage. Using it means no native module to compile on Windows, no
 * supply-chain surface, and no auth library whose release cadence we have to
 * track.
 *
 * This is emphatically *not* hand-rolled cryptography: it is a standard
 * primitive, used with per-password random salts, the OWASP-recommended
 * parameters, and a constant-time comparison. The bit that actually goes
 * wrong in DIY auth — session handling — is separated into `session.ts` and
 * uses opaque, server-stored, hashed tokens.
 *
 * Stored format: `scrypt$N$r$p$<salt-b64>$<hash-b64>`. The parameters travel
 * with the hash, so they can be raised later and old hashes still verify —
 * `needsRehash()` flags the stale ones on next successful login.
 */

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/** OWASP baseline: N=2^17, r=8, p=1. ~128MB of memory per hash. */
const PARAMS = { N: 2 ** 17, r: 8, p: 1 } as const;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

// Node's default maxmem (32MB) is below what N=2^17 needs (128 * N * r ≈ 134MB).
function maxmemFor(N: number, r: number) {
  return 256 * N * r;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, {
    ...PARAMS,
    maxmem: maxmemFor(PARAMS.N, PARAMS.r),
  });
  return [
    "scrypt",
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("base64"),
    derived.toString("base64"),
  ].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false;

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[4], "base64");
    expected = Buffer.from(parts[5], "base64");
  } catch {
    return false;
  }
  if (expected.length === 0) return false;

  let derived: Buffer;
  try {
    derived = await scrypt(password.normalize("NFKC"), salt, expected.length, {
      N,
      r,
      p,
      maxmem: maxmemFor(N, r),
    });
  } catch {
    return false;
  }

  // Constant time — a length check first, because timingSafeEqual throws on
  // mismatched lengths and that throw would itself be a timing signal.
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

/** True when a stored hash uses weaker parameters than we now require. */
export function needsRehash(stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return true;
  return Number(parts[1]) < PARAMS.N || Number(parts[2]) < PARAMS.r;
}

/**
 * Burns roughly the same time as a real verification.
 *
 * Called when an email doesn't exist so that "no such user" and "wrong
 * password" take the same time — otherwise the login endpoint quietly becomes
 * an account-enumeration oracle.
 */
export async function fakeVerify(): Promise<void> {
  await scrypt("timing-equaliser", randomBytes(SALT_LENGTH), KEY_LENGTH, {
    ...PARAMS,
    maxmem: maxmemFor(PARAMS.N, PARAMS.r),
  });
}
