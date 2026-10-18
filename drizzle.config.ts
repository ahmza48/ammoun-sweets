import { defineConfig } from "drizzle-kit";

/**
 * drizzle-kit only ever generates SQL here — it never pushes to a live
 * database. `dialect: postgresql` is correct for both drivers, because PGlite
 * *is* PostgreSQL; the generated migrations run unmodified against either.
 */
export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  casing: "snake_case",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://localhost:5432/ammoun_sweets",
  },
  verbose: true,
  strict: true,
});
