/** Drops and recreates the public schema, then re-seeds. Development only. */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to reset a production database.");
  process.exit(1);
}

const { sql } = await import("drizzle-orm");
const { db } = await import("../src/server/db/index");
const { seed } = await import("../src/server/db/seed");

/*
 * One statement per call. Both drivers send these through the extended query
 * protocol, which allows exactly one command per prepared statement — PGlite
 * rejects the combined version outright with "cannot insert multiple commands
 * into a prepared statement".
 */
await db.execute(sql`DROP SCHEMA public CASCADE`);
await db.execute(sql`CREATE SCHEMA public`);
console.log("  Schema dropped.");
await seed({ withAdmin: true });
process.exit(0);
