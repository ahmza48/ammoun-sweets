/**
 * CLI entry point for the database seed.
 *   pnpm db:seed              → catalogue + settings
 *   pnpm db:seed --with-admin → also create the first admin from env
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

const { seed } = await import("../src/server/db/seed");

const withAdmin = process.argv.includes("--with-admin");
await seed({ withAdmin });
console.log("\n  Done.\n");
process.exit(0);
