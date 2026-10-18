import { defineConfig } from "vitest/config";
import path from "node:path";

const root = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));

/**
 * Vitest.
 *
 * `server-only` is aliased to an empty module. That package deliberately
 * throws when imported outside a React Server Component, which is the right
 * behaviour in the app and the wrong behaviour in a test runner — stubbing it
 * lets the tests import service code directly instead of mocking around it.
 * (The `react-server` export condition does the same job for the CLI scripts,
 * but Vitest resolves test modules through its own SSR pipeline.)
 *
 * Integration tests run against PGlite — real PostgreSQL, in-process — so they
 * exercise genuine constraints and transactions. A single fork keeps each
 * file's database isolated without them fighting over memory.
 */
export default defineConfig({
  resolve: {
    conditions: ["react-server", "node", "import"],
    alias: {
      "server-only": path.resolve(root, "tests/helpers/server-only-stub.ts"),
      "@": path.resolve(root, "src"),
    },
  },
  ssr: {
    resolve: {
      conditions: ["react-server", "node", "import"],
    },
    /*
     * `pg` is CommonJS with a class-extends pattern that Vite's ESM interop
     * turns into `class X extends [object Module]`. Leaving it external means
     * Node loads it natively, the way the real server does. The tests never
     * connect through it — they run on PGlite — but drizzle-orm's
     * node-postgres entry imports it.
     */
    external: ["pg", "pg-native", "@electric-sql/pglite"],
  },
  test: {
    environment: "node",
    globals: false,
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    pool: "forks",
    maxForks: 1,
    minForks: 1,
    server: {
      deps: { external: [/\/pg\//, "pg", "@electric-sql/pglite"] },
    },
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
