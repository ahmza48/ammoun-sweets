import { expect, test } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "./auth";

/**
 * Admin journey.
 *
 * The signed-in tests reuse the session saved by the `setup` project (see
 * playwright.config.ts) instead of logging in each time, so the login
 * throttle is not spent on the test suite. The describes that need to be
 * anonymous opt out of that saved state explicitly.
 */

const ANONYMOUS = { cookies: [], origins: [] };

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/admin/login");
  await page.fill("#email", ADMIN_EMAIL);
  await page.fill("#password", ADMIN_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/admin(?!\/login)/, { timeout: 30_000 });
}

test.describe("access control", () => {
  // These assert what a visitor with no session sees.
  test.use({ storageState: ANONYMOUS });

  test("admin routes redirect anonymous visitors to the login page", async ({ page }) => {
    for (const path of ["/admin", "/admin/orders", "/admin/products", "/admin/settings"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin\/login/);
    }
  });

  test("the login page itself does not redirect", async ({ page }) => {
    // Regression: the login page originally sat inside the guarded layout and
    // redirected to itself forever.
    const response = await page.goto("/admin/login");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: /Ammoun Sweets/i })).toBeVisible();
  });

  /*
   * Only the unknown-email case is exercised here. Sending deliberate wrong
   * passwords at the *real* admin account would trip the account lockout and
   * leave every later test unable to sign in — the security feature working
   * as designed. The lockout itself is covered in the integration suite, where
   * the database can be reset between cases.
   */
  test("an unknown email is rejected with a non-specific message", async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill("#email", "nobody-at-all@example.com");
    await page.fill("#password", "some-password-value");
    await page.getByRole("button", { name: /sign in/i }).click();

    const alert = page.locator("form [role=alert]");
    await expect(alert).toBeVisible();
    // Must not reveal whether the account exists.
    await expect(alert).toContainText(/email or password|too many attempts/i);
  });
});

test.describe("signed in", () => {
  test("dashboard shows the shop's figures", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { level: 1, name: "Today" })).toBeVisible();
    await expect(page.getByText("Orders today")).toBeVisible();
    await expect(page.getByText("Takings today")).toBeVisible();
  });

  test("products list renders with sizes and prices", async ({ page }) => {
    await page.goto("/admin/products");
    await expect(page.getByRole("heading", { level: 1, name: "Products" })).toBeVisible();
    await expect(page.getByRole("link", { name: /add product/i })).toBeVisible();
    await expect(page.getByText("Baklava Mix").first()).toBeVisible();
  });

  test("a product can be marked sold out and restored", async ({ page }) => {
    await page.goto("/admin/products");

    const toggle = page.locator('input[type="checkbox"]').first();
    const wasAvailable = await toggle.isChecked();

    try {
      await toggle.click();
      await page.waitForTimeout(1500);
      await page.reload();

      const after = page.locator('input[type="checkbox"]').first();
      expect(await after.isChecked()).toBe(!wasAvailable);
    } finally {
      /*
       * Restore in a finally block. Without it, a failed assertion leaves a
       * product sold out, and every later checkout test fails for a reason
       * that has nothing to do with what it is testing.
       */
      await page.goto("/admin/products");
      const restore = page.locator('input[type="checkbox"]').first();
      if ((await restore.isChecked()) !== wasAvailable) {
        await restore.click();
        await page.waitForTimeout(1500);
      }
    }
  });

  test("orders list and detail are reachable", async ({ page }) => {
    await page.goto("/admin/orders");
    await expect(page.getByRole("heading", { level: 1, name: "Orders" })).toBeVisible();

    const firstOrder = page.locator('a[href^="/admin/orders/"]').first();
    if ((await firstOrder.count()) > 0) {
      await firstOrder.click();
      await expect(page.getByRole("heading", { name: "Customer" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Items" })).toBeVisible();
      // Only legal transitions are offered.
      await expect(page.getByRole("button", { name: "Out for delivery" })).toHaveCount(0);
    }
  });

  test("an unpaid order can be marked paid in the shop, once", async ({ page }) => {
    /*
     * Places its own order rather than picking the first row in the list. An
     * earlier version did the latter and skipped itself whenever that row
     * happened to be paid already — a test that silently tests nothing.
     */
    await page.goto("/menu/baklava-mix");
    await page.getByRole("button", { name: /add to cart/i }).click();
    await page.goto("/checkout");
    await page.fill("#firstName", "Counter");
    await page.fill("#lastName", "Payment");
    await page.fill("#email", "counter.pay.e2e@example.com");
    await page.fill("#phone", "0412 345 222");
    await page.getByRole("button", { name: /place order/i }).click();
    await page.waitForURL(/\/orders\/AS-\d+/, { timeout: 30_000 });

    const orderNumber = new URL(page.url()).pathname.split("/").pop()!;
    expect(orderNumber).toMatch(/^AS-\d+$/);

    await page.goto("/admin/orders");
    await page
      .locator('a[href^="/admin/orders/"]')
      .filter({ hasText: orderNumber })
      .first()
      .click();

    await expect(page.getByRole("heading", { name: "Customer" })).toBeVisible();

    const payCash = page.getByRole("button", { name: "Paid — cash" });
    await expect(payCash).toBeVisible();

    await payCash.click();
    await expect(page.getByRole("status")).toContainText(/marked as paid/i);

    await page.reload();
    /*
     * The controls are gone because the order is no longer unpaid — which is
     * also what stops a second tap recording a second payment.
     */
    await expect(page.getByRole("button", { name: "Paid — cash" })).toHaveCount(0);
    await expect(page.getByText("Paid", { exact: true }).first()).toBeVisible();
  });

  test("settings page loads and delivery postcodes are editable", async ({ page }) => {
    await page.goto("/admin/settings");
    await expect(page.getByRole("heading", { level: 1, name: "Store settings" })).toBeVisible();
    await expect(page.locator("#deliveryPostcodes")).toBeVisible();
    await expect(page.getByText(/GST-free/i)).toBeVisible();
  });

});

test.describe("signing out", () => {
  /*
   * This one signs in for itself. Sign-out revokes the session in the
   * database, so doing it with the shared saved state would log every other
   * test out too — the tests would fail for a reason unrelated to what they
   * assert.
   */
  test.use({ storageState: ANONYMOUS });

  test("signing out revokes access", async ({ page }) => {
    await signIn(page);

    await page.goto("/admin");
    await page.getByRole("button", { name: /sign out/i }).click();
    await page.waitForURL(/\/admin\/login/, { timeout: 30_000 });

    // The cookie is gone from the browser and the session row is revoked.
    await page.goto("/admin/orders");
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
