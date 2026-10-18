import { defineConfig, devices } from "@playwright/test";
import { ADMIN_STATE } from "./e2e/auth";

/**
 * Playwright.
 *
 * Runs against a *built* app, not the dev server: Server Actions, caching and
 * the proxy all behave differently in development, and those differences are
 * exactly where production bugs hide.
 *
 * Before the first run: `npx playwright install chromium`
 */
/**
 * Throttle ceilings for the server under test.
 *
 * Every request in the suite arrives from one address, and the suite places
 * several orders and signs in on each run. At the production ceilings a second
 * run inside the window is rejected — the throttle working correctly, but
 * failing the tests rather than an attacker. Raised here so the suite is
 * repeatable; the ceilings themselves are covered in tests/integration.
 *
 * When running against a server you started yourself (E2E_BASE_URL), set these
 * on that server too — see the README.
 */
export const E2E_SERVER_ENV = {
  RATE_LIMIT_CHECKOUT_PER_IP: "500",
  RATE_LIMIT_LOGIN_PER_IP: "500",
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  // A shared database means parallel workers would fight over stock levels.
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  /*
   * `channel: "chromium"` runs the full Chromium build rather than the
   * separate headless-shell download, which some locked-down environments
   * can't fetch. Behaviour is the same; it just uses the browser that
   * `playwright install chromium` already provides.
   */
  projects: [
    /*
     * One sign-in per run, saved and reused. See e2e/auth.setup.ts: the login
     * throttle allows 10 attempts per IP per 15 minutes, and logging in before
     * every admin test used that up and failed the later tests.
     */
    { name: "setup", testMatch: /.*\.setup\.ts/, use: { ...devices["Desktop Chrome"], channel: "chromium" } },

    {
      name: "desktop",
      testIgnore: /admin\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], channel: "chromium" },
    },
    {
      name: "mobile",
      testIgnore: /admin\.spec\.ts/,
      use: { ...devices["Pixel 7"], channel: "chromium" },
    },
    /*
     * Admin runs on desktop only. It is a back-office screen used on a counter
     * laptop, and running it on both projects would double the sign-ins for no
     * extra coverage.
     */
    {
      name: "admin",
      testMatch: /admin\.spec\.ts/,
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], channel: "chromium", storageState: ADMIN_STATE },
    },
  ],

  // Reuses an already-running server locally; starts one in CI.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "pnpm build && pnpm start",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 300_000,
        env: E2E_SERVER_ENV,
      },
});
