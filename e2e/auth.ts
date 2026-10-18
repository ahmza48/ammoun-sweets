/**
 * Shared admin credentials and the file the saved session lands in.
 *
 * Credentials come from the environment so nothing is committed. They match
 * the account `pnpm db:seed --with-admin` creates.
 */
export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@ammounsweets.local";
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "change-me-locally-12345";

/*
 * Relative to the project root, which is where Playwright runs. A path built
 * from `import.meta.dirname` fails here: Playwright compiles the config to
 * CommonJS, where `import.meta` does not exist.
 *
 * Git-ignored — this file holds a real session cookie.
 */
export const ADMIN_STATE = "e2e/.auth/admin.json";
