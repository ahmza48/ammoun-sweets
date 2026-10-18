import { expect, test } from "@playwright/test";

/**
 * Customer journey, end to end.
 *
 * These run against a built app with a seeded database:
 *   pnpm db:seed --with-admin && pnpm build && pnpm start
 *   pnpm test:e2e
 *
 * They deliberately drive the UI the way a customer does — no direct API
 * calls — because the point is to catch the wiring between the form, the
 * Server Action and the database, which unit tests cannot see.
 */

test.describe("browsing and ordering", () => {
  test("menu lists products from the database", async ({ page }) => {
    await page.goto("/menu");

    await expect(page).toHaveTitle(/Menu/);
    await expect(page.getByRole("heading", { name: /Our Menu of/i })).toBeVisible();

    // Category sections come from the database, not a hardcoded array.
    await expect(page.getByRole("heading", { name: "Signature Favourites" })).toBeVisible();

    const productLinks = page.locator('a[href^="/menu/"]');
    expect(await productLinks.count()).toBeGreaterThan(0);
  });

  test("product page shows a price and an add-to-cart control", async ({ page }) => {
    await page.goto("/menu/baklava-mix");

    await expect(page.getByRole("heading", { level: 1, name: "Baklava Mix" })).toBeVisible();
    await expect(page.getByRole("button", { name: /add to cart/i })).toBeEnabled();
    await expect(page.getByText(/\$\d/).first()).toBeVisible();
  });

  test("adding to the cart opens the drawer and updates the badge", async ({ page }) => {
    await page.goto("/menu/baklava-mix");
    await page.getByRole("button", { name: /add to cart/i }).click();

    const drawer = page.getByRole("dialog", { name: "Your cart" });
    await expect(drawer).toBeVisible();

    /*
     * `exact` matters: the quantity stepper and the remove button carry
     * screen-reader labels containing the product name ("Increase quantity of
     * Baklava Mix, Half kg"), so a substring match finds four elements.
     */
    await expect(drawer.getByText("Baklava Mix", { exact: true })).toBeVisible();
    await expect(drawer.getByText("$30.00").first()).toBeVisible();

    // The header badge reflects the item count.
    await expect(page.getByRole("button", { name: /open cart, 1 item/i })).toHaveCount(1);

    await drawer.getByRole("button", { name: /close cart/i }).click();
    await expect(drawer).toBeHidden();
  });

  test("cart survives a page reload", async ({ page }) => {
    await page.goto("/menu/baklava-mix");
    await page.getByRole("button", { name: /add to cart/i }).click();
    await page.getByRole("button", { name: /close cart/i }).click();

    await page.reload();
    await page.goto("/checkout");

    await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();
    await expect(page.getByText("Baklava Mix").first()).toBeVisible();
  });

  test("completes a pickup order and shows the confirmation", async ({ page }) => {
    await page.goto("/menu/baklava-mix");
    await page.getByRole("button", { name: /add to cart/i }).click();
    await page.goto("/checkout");

    await page.fill("#firstName", "Dana");
    await page.fill("#lastName", "Haddad");
    await page.fill("#email", "dana.e2e@example.com");
    await page.fill("#phone", "0412 345 678");

    await page.getByRole("button", { name: /place order/i }).click();

    await page.waitForURL(/\/orders\/AS-\d+/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: /We've got your order/i })).toBeVisible();
    await expect(page.getByText(/AS-\d+/).first()).toBeVisible();
  });

  test("an empty cart cannot reach checkout", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page.getByRole("heading", { name: /cart is empty/i })).toBeVisible();
  });
});

test.describe("order privacy", () => {
  test("an order cannot be read from another browser without the email", async ({
    page,
    browser,
  }) => {
    await page.goto("/menu/baklava-mix");
    await page.getByRole("button", { name: /add to cart/i }).click();
    await page.goto("/checkout");
    await page.fill("#firstName", "Private");
    await page.fill("#lastName", "Customer");
    await page.fill("#email", "private.e2e@example.com");
    await page.fill("#phone", "0412 000 111");
    await page.getByRole("button", { name: /place order/i }).click();
    await page.waitForURL(/\/orders\/AS-\d+/, { timeout: 30_000 });

    const orderUrl = page.url();

    // A different browser context has no order-access cookie.
    const stranger = await browser.newContext();
    const strangerPage = await stranger.newPage();
    await strangerPage.goto(orderUrl);

    await expect(
      strangerPage.getByRole("heading", { name: /Confirm it/i }),
    ).toBeVisible();
    await expect(strangerPage.getByText("Private Customer")).toHaveCount(0);

    // A wrong email must not reveal whether the order exists.
    await strangerPage.fill("#email", "guess@example.com");
    await strangerPage.getByRole("button", { name: /view my order/i }).click();
    await expect(strangerPage.locator("[role=alert]").first()).toBeVisible();

    await stranger.close();
  });
});

test.describe("responsive", () => {
  /*
   * Width sweeps run on the desktop project only. Resizing a context that is
   * already emulating a phone (isMobile, device pixel ratio, its own visual
   * viewport) gives inconsistent scrollWidth/clientWidth readings — the
   * measurement stops describing the page and starts describing the
   * emulation. The mobile project checks its own natural viewport instead.
   */
  test.skip(({ isMobile }) => Boolean(isMobile), "width sweep is desktop-only");

  for (const width of [320, 375, 390, 430, 768]) {
    test(`no horizontal scrolling at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });

      for (const path of ["/", "/menu", "/menu/baklava-mix", "/checkout"]) {
        /*
         * `domcontentloaded`, not `load`: the Visit section embeds a Google
         * map, and waiting for every third-party iframe to settle makes this
         * check hostage to an external service.
         */
        await page.goto(path, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(400);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, `${path} overflows at ${width}px`).toBeLessThanOrEqual(0);
      }
    });
  }
});

test.describe("mobile device", () => {
  test.skip(({ isMobile }) => !isMobile, "runs on the emulated phone only");

  test("key pages fit the phone viewport", async ({ page }) => {
    for (const path of ["/", "/menu", "/menu/baklava-mix", "/checkout"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(400);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${path} overflows on mobile`).toBeLessThanOrEqual(0);
    }
  });

  test("the cart is reachable from the mobile header", async ({ page }) => {
    await page.goto("/menu/baklava-mix");
    await page.getByRole("button", { name: /add to cart/i }).click();

    const drawer = page.getByRole("dialog", { name: "Your cart" });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("link", { name: /go to checkout/i })).toBeVisible();
  });
});

test.describe("cart drawer", () => {
  test("Keep Browsing goes to the menu", async ({ page }) => {
    // Regression: this used to be a button that only closed the drawer, so on
    // a product page "Keep Browsing" left you exactly where you already were.
    await page.goto("/menu/baklava-mix");
    await page.getByRole("button", { name: /add to cart/i }).click();

    const drawer = page.getByRole("dialog", { name: "Your cart" });
    await expect(drawer).toBeVisible();

    await drawer.getByRole("link", { name: /keep browsing/i }).click();

    await expect(page).toHaveURL(/\/menu$/);
    await expect(page.getByRole("heading", { name: /Our Menu of/i })).toBeVisible();
  });

  test("shows a running weight total that tracks quantity", async ({ page }) => {
    await page.goto("/menu/baklava-mix");
    await page.getByRole("button", { name: /add to cart/i }).click();

    const drawer = page.getByRole("dialog", { name: "Your cart" });
    // Seeded as a half-kilo tray.
    await expect(drawer.getByText("500 g")).toBeVisible();

    await drawer.getByRole("button", { name: /increase quantity/i }).click();
    await expect(drawer.getByText("1 kg")).toBeVisible();

    await drawer.getByRole("button", { name: /increase quantity/i }).click();
    await expect(drawer.getByText("1.5 kg")).toBeVisible();
  });
});

test.describe("weight through checkout", () => {
  test("the weight follows the order to checkout and confirmation", async ({ page }) => {
    await page.goto("/menu/baklava-mix");
    await page.getByRole("button", { name: /add to cart/i }).click();
    await page.getByRole("button", { name: /close cart/i }).click();

    await page.goto("/checkout");
    await expect(page.getByText("Total weight")).toBeVisible();
    await expect(page.getByText("500 g")).toBeVisible();

    await page.fill("#firstName", "Weight");
    await page.fill("#lastName", "Check");
    await page.fill("#email", "weight.e2e@example.com");
    await page.fill("#phone", "0412 345 999");
    await page.getByRole("button", { name: /place order/i }).click();

    await page.waitForURL(/\/orders\/AS-\d+/, { timeout: 30_000 });
    await expect(page.getByText("Total weight")).toBeVisible();
    await expect(page.getByText("500 g")).toBeVisible();
  });
});

test.describe("payment", () => {
  /*
   * There is no online payment and no gateway to configure. The shop takes the
   * money at the counter, so the only correct behaviour is to say so plainly
   * and never claim an order is paid.
   */
  test("says payment is on collection and offers no way to pay online", async ({ page }) => {
    await page.goto("/menu/baklava-mix");
    await page.getByRole("button", { name: /add to cart/i }).click();
    await page.goto("/checkout");

    await expect(page.getByText(/payment is taken in the shop/i)).toBeVisible();

    await page.fill("#firstName", "Unpaid");
    await page.fill("#lastName", "Customer");
    await page.fill("#email", "unpaid.e2e@example.com");
    await page.fill("#phone", "0412 345 888");
    await page.getByRole("button", { name: /place order/i }).click();
    await page.waitForURL(/\/orders\/AS-\d+/, { timeout: 30_000 });

    await expect(page.getByText("Payment on collection")).toBeVisible();
    // Nothing may claim the order is paid.
    await expect(page.getByText("Paid", { exact: true })).toHaveCount(0);
    // And there must be no payment widget of any kind.
    await expect(page.locator('script[src*="paypal"]')).toHaveCount(0);
    await expect(page.locator('script[src*="stripe"]')).toHaveCount(0);
    await expect(page.getByRole("button", { name: /pay now|pay with/i })).toHaveCount(0);
  });

  test("an order is confirmed straight away, not left pending payment", async ({ page }) => {
    await page.goto("/menu/baklava-mix");
    await page.getByRole("button", { name: /add to cart/i }).click();
    await page.goto("/checkout");

    await page.fill("#firstName", "Straight");
    await page.fill("#lastName", "Away");
    await page.fill("#email", "straightaway.e2e@example.com");
    await page.fill("#phone", "0412 345 777");
    await page.getByRole("button", { name: /place order/i }).click();
    await page.waitForURL(/\/orders\/AS-\d+/, { timeout: 30_000 });

    /*
     * `exact` matters: a substring match also hits the customer's email
     * address wherever it contains the word.
     */
    await expect(page.getByText("Confirmed", { exact: true })).toBeVisible();
    await expect(page.getByText("Pending payment")).toHaveCount(0);
  });
});
