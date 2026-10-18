/**
 * Test bootstrap.
 *
 * Forces an in-memory PGlite database and a deterministic session secret, so
 * a stray DATABASE_URL in the developer's shell can never point the suite at
 * a real database.
 */
// NODE_ENV is typed readonly by @types/node; Vitest already sets it to "test",
// so this only needs to be defensive rather than assigned.
Object.assign(process.env, { NODE_ENV: "test" });
process.env.DATABASE_URL = "memory://test";
process.env.SESSION_SECRET = "test-secret-not-used-anywhere-real";
process.env.APP_URL = "http://localhost:3000";
delete process.env.RESEND_API_KEY;
