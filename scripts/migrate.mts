/** Applies pending migrations. Run this on deploy, before the app boots. */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

const { db, databaseKind } = await import("../src/server/db/index");
const { runMigrations } = await import("../src/server/db/migrate");

const applied = await runMigrations(db);
console.log(
  applied.length > 0
    ? `  Applied ${applied.length} migration(s) to ${databaseKind()}: ${applied.join(", ")}`
    : `  Database is up to date (${databaseKind()}).`,
);
process.exit(0);
