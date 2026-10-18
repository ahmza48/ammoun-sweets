import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
import type { Database } from "./index";

/**
 * Applies the generated SQL migrations in `drizzle/`.
 *
 * drizzle-kit ships driver-specific `migrate()` helpers, but we need one path
 * that works identically for node-postgres and PGlite (and inside Vitest,
 * where the bundled helpers fight with the module loader). The migrations are
 * plain SQL, so running them ourselves is both simpler and driver-agnostic.
 *
 * Applied filenames are recorded in `__drizzle_migrations`, so this is safe to
 * call repeatedly — on boot, in a deploy step, or before every test.
 */

const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");

/** drizzle-kit separates statements it must not run in one batch. */
const STATEMENT_BREAKPOINT = "--> statement-breakpoint";

export async function runMigrations(database: Database, dir = MIGRATIONS_DIR) {
  await database.execute(sql`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id serial PRIMARY KEY,
      name text NOT NULL UNIQUE,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const applied = new Set<string>();
  const rows = await database.execute<{ name: string }>(
    sql`SELECT name FROM __drizzle_migrations`,
  );
  // node-postgres returns { rows }, PGlite's drizzle adapter returns the array.
  const list = Array.isArray(rows) ? rows : ((rows as { rows: { name: string }[] }).rows ?? []);
  for (const row of list) applied.add(row.name);

  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const executed: string[] = [];

  for (const file of files) {
    if (applied.has(file)) continue;

    const contents = readFileSync(path.join(dir, file), "utf8");
    const statements = contents
      .split(STATEMENT_BREAKPOINT)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const statement of statements) {
      await database.execute(sql.raw(statement));
    }

    await database.execute(
      sql`INSERT INTO __drizzle_migrations (name) VALUES (${file}) ON CONFLICT (name) DO NOTHING`,
    );
    executed.push(file);
  }

  return executed;
}
