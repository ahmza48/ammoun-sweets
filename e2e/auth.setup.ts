import { expect, test as setup } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_STATE } from "./auth";

/**
 * Signs in once per run and saves the session cookie for the admin project.
 *
 * The login endpoint throttles to 10 attempts per IP per 15 minutes, which is
 * the point of it. Signing in before every admin test spent that budget on the
 * test suite itself: the desktop and mobile projects together made twelve
 * attempts, and the last ones came back "too many attempts" — a green feature
 * failing its own tests. One sign-in, reused, leaves the throttle free to do
 * its job.
 */
setup("authenticate as admin", async ({ page }) => {
  await page.goto("/admin/login");
  await page.fill("#email", ADMIN_EMAIL);
  await page.fill("#password", ADMIN_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();

  await page.waitForURL(/\/admin(?!\/login)/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 1, name: "Today" })).toBeVisible();

  await page.context().storageState({ path: ADMIN_STATE });
});
