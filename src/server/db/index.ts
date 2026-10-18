import { createRequire } from "node:module";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

/*
 * Both drizzle adapters are imported for their *types* only. A value import of
 * `drizzle-orm/node-postgres` pulls in the `pg` driver at module load, which
 * defeats the point of choosing a driver at runtime and breaks the PGlite-only
 * test process outright. The adapters are loaded below, inside the branch that
 * actually needs them.
 */

/**
 * Database connection.
 *
 * ── Why two drivers ───────────────────────────────────────────────────────
 * Production points at a managed PostgreSQL over `node-postgres`. Local
 * development and the whole test suite run on PGlite — the real PostgreSQL
 * engine compiled to WebAssembly, in-process, no server and no Docker.
 *
 * That matters more than convenience: it means the tests exercise genuine
 * Postgres behaviour — CHECK constraints, partial unique indexes, `FOR
 * UPDATE` row locks, real transaction rollback — rather than the
 * approximations you get from SQLite or a mocked repository. The same
 * migration SQL is applied to both, so there is one dialect, not two.
 *
 * Selection is by `DATABASE_URL`:
 *   postgres://… or postgresql://…  → node-postgres
 *   unset, or file:… / memory://    → PGlite
 */

/**
 * One nominal type, not a union of the two drivers.
 *
 * A union would be more "honest", but it collapses Drizzle's method overloads:
 * `.returning({ … })` and `.transaction(tx => …)` stop type-checking because
 * TypeScript can't pick an overload that satisfies both driver shapes. Since
 * we only ever use the portable query API — never a driver-specific escape
 * hatch — the PGlite instance is cast to this type at the boundary below.
 */
export type Database = NodePgDatabase<typeof schema>;

/** The transaction handle Drizzle hands to `db.transaction(tx => …)`. */
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

const globalForDb = globalThis as unknown as {
  __ammounDb?: Database;
  __ammounDbKind?: DatabaseKind;
};

export type DatabaseKind = "node-postgres" | "pglite";

export function resolveDatabaseKind(url = process.env.DATABASE_URL): DatabaseKind {
  if (!url) return "pglite";
  return /^postgres(ql)?:\/\//i.test(url) ? "node-postgres" : "pglite";
}

function createDatabase(): { db: Database; kind: DatabaseKind } {
  const url = process.env.DATABASE_URL;
  const kind = resolveDatabaseKind(url);

  if (kind === "node-postgres") {
    /*
     * `createRequire` rather than a bare `require`: bundlers hoist a plain
     * `require()` into a static import, which would pull the `pg` driver —
     * and its native bindings — into every process, including the PGlite-only
     * test runner where it fails to initialise. This keeps the load genuinely
     * lazy and only on the branch that needs it.
     */
    const nodeRequire = createRequire(import.meta.url);
    const { Pool } = nodeRequire("pg") as typeof import("pg");
    const { drizzle: drizzleNodePg } =
      nodeRequire("drizzle-orm/node-postgres") as typeof import("drizzle-orm/node-postgres");
    const pool = new Pool({
      connectionString: url,
      // Managed Postgres (Neon, Supabase, RDS) terminates plaintext.
      ssl: process.env.DATABASE_SSL === "false" ? undefined : { rejectUnauthorized: false },
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    });
    return { db: drizzleNodePg(pool, { schema, casing: "snake_case" }), kind };
  }

  const nodeRequire = createRequire(import.meta.url);
  const { PGlite } = nodeRequire("@electric-sql/pglite") as typeof import("@electric-sql/pglite");
  const { drizzle: drizzlePglite } =
    nodeRequire("drizzle-orm/pglite") as typeof import("drizzle-orm/pglite");
  // `file:./path` persists to disk; anything else is a fresh in-memory store.
  const dataDir = url?.startsWith("file:") ? url.slice("file:".length) : undefined;
  const client = new PGlite(dataDir);
  // Safe: PGlite is PostgreSQL, and the query API we use is identical.
  const pglite = drizzlePglite(client, { schema, casing: "snake_case" });
  return { db: pglite as unknown as Database, kind };
}

/**
 * Cached on `globalThis` so Next's dev server doesn't open a new pool — or a
 * whole new in-memory Postgres — on every hot reload.
 */
function getDb(): Database {
  if (!globalForDb.__ammounDb) {
    const { db, kind } = createDatabase();
    globalForDb.__ammounDb = db;
    globalForDb.__ammounDbKind = kind;
  }
  return globalForDb.__ammounDb;
}

export const db: Database = new Proxy({} as Database, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb() as object, prop, receiver);
  },
}) as Database;

export function databaseKind(): DatabaseKind {
  getDb();
  return globalForDb.__ammounDbKind ?? "pglite";
}

/** Replaces the cached connection — used by the test harness. */
export function __setTestDatabase(next: Database | undefined, kind: DatabaseKind = "pglite") {
  globalForDb.__ammounDb = next;
  globalForDb.__ammounDbKind = kind;
}

export { schema };
