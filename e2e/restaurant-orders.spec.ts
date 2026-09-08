import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

type RunningServer = { port: number; close: () => Promise<void> };
test.describe.configure({ retries: 0 });

test("customers can read orders and refresh visible fulfilment without generating again", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);
  const root = await mkdtemp(join(tmpdir(), "archeform-order-browser-"));
  const servers: RunningServer[] = [];
  try {
    // Build @factory/compiler first. Run its actual ESM entry and authored
    // fixture outside Playwright's CommonJS module transform/cache.
    const bundle = JSON.parse(
      execFileSync(
        process.execPath,
        [
          "--experimental-strip-types",
          "--input-type=module",
          "-e",
          `import { generateRestaurantProductApplicationBundle } from './packages/compiler/dist/index.js';
       import { restaurantProductV3Fixture } from './packages/compiler/test/fixtures/restaurant-product-v3.ts';
       const { publishedGraph, compositionLock } = restaurantProductV3Fixture();
       process.stdout.write(JSON.stringify(generateRestaurantProductApplicationBundle({ publishedGraph, compositionLock })));`,
        ],
        { encoding: "utf8", maxBuffer: 5 * 1024 * 1024, timeout: 30_000 },
      ),
    ) as {
      files: { path: string; content: string }[];
    };
    for (const file of bundle.files) {
      const target = resolve(root, file.path);
      const within = relative(root, target);
      if (
        within.startsWith("..") ||
        isAbsolute(within) ||
        resolve(root, within) !== target
      )
        throw new Error("Generated path escaped acceptance root.");
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, file.content, "utf8");
    }
    const runtime = await import(
      pathToFileURL(join(root, "src/server.mjs")).href
    );
    for (const principalRole of ["customer", "kitchen"]) {
      servers.push(
        await runtime.startRestaurantServer({
          statePath: join(root, "state.json"),
          host: "127.0.0.1",
          port: 0,
          principalRole,
        }),
      );
    }
    let browserMutations = 0;
    page.on("request", (outgoing) => {
      if (!["GET", "HEAD"].includes(outgoing.method())) browserMutations += 1;
    });
    const customer = `http://127.0.0.1:${servers[0]!.port}`;
    const kitchen = `http://127.0.0.1:${servers[1]!.port}`;
    const assetFailures: string[] = [];
    const pageErrors: string[] = [];
    const externalRequests: string[] = [];
    page.on("request", (outgoing) => {
      if (new URL(outgoing.url()).origin !== customer)
        externalRequests.push(new URL(outgoing.url()).origin);
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("requestfailed", (failed) =>
      assetFailures.push(new URL(failed.url()).pathname),
    );
    page.on("response", (response) => {
      if (response.status() >= 400)
        assetFailures.push(new URL(response.url()).pathname);
    });
    await page.goto(`${customer}/orders`);
    await page.waitForLoadState("networkidle");
    const styles = await request.get(`${customer}/customer/styles.css`);
    expect(styles.status()).toBe(200);
    expect(styles.headers()["content-type"]).toContain("text/css");
    console.info(
      "FACTORY_CUSTOMER_STYLE_DIAGNOSIS",
      await page.evaluate(() => ({
        stylesheets: document.styleSheets.length,
        background: getComputedStyle(document.documentElement).backgroundColor,
        bodyMargin: getComputedStyle(document.body).margin,
        navigationPosition: getComputedStyle(
          document.querySelector(".customer-tabs")!,
        ).position,
        currentPageLinks: document.querySelectorAll('[aria-current="page"]')
          .length,
      })),
    );
    expect(assetFailures).toEqual([]);
    expect(pageErrors).toEqual([]);
    await expect(
      page
        .getByRole("navigation", { name: "Customer" })
        .getByRole("link", { name: "Orders", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      page.getByText("No orders yet", { exact: true }),
    ).toBeVisible();
    const tabs = page.getByRole("navigation", { name: "Customer" });
    for (const link of await tabs.getByRole("link").all()) {
      const icon = link.locator("svg");
      await expect(icon).toBeVisible();
      await expect(icon).toHaveAttribute("aria-hidden", "true");
      await expect(icon).toHaveAttribute("focusable", "false");
      expect(await link.innerText()).not.toBe("");
    }
    await expect(
      page.locator(".customer-orders-empty svg.lucide-receipt-text"),
    ).toBeVisible();
    const output = resolve("acceptance-artifacts/d1.6");
    await mkdir(output, { recursive: true });
    await page.setViewportSize({ width: 390, height: 900 });
    await page.screenshot({
      path: join(output, "orders-empty-390.png"),
      fullPage: true,
    });
    const cartResponse = await request.get(`${customer}/api/cart`);
    expect(cartResponse.ok()).toBeTruthy();
    const cart = (await cartResponse.json()).cart;
    const added = await request.post(`${customer}/api/cart/items`, {
      data: {
        itemId: "margherita-pizza",
        quantity: 1,
        expectedVersion: cart.version,
      },
      headers: { "idempotency-key": "orders-browser-add" },
    });
    expect(added.ok()).toBeTruthy();
    const nextCart = (await (await request.get(`${customer}/api/cart`)).json())
      .cart;
    const checkout = await request.post(`${customer}/api/checkout`, {
      data: { expectedVersion: nextCart.version, method: "simulated-card" },
      headers: { "idempotency-key": "orders-browser-pay" },
    });
    expect(checkout.ok()).toBeTruthy();
    const orderId = (await checkout.json()).order.id;
    await page
      .getByRole("link", { name: "Refresh status", exact: true })
      .click();
    await expect(page.getByText("Margherita pizza")).toBeVisible();
    await expect(page.getByText("No orders yet", { exact: true })).toHaveCount(
      0,
    );
    for (const [action, expectedVersion] of [
      ["accept", 1],
      ["start-preparing", 2],
      ["mark-ready", 3],
    ] as const) {
      const response = await request.post(
        `${kitchen}/api/merchant/kitchen/${orderId}/actions`,
        {
          data: { action, expectedVersion },
          headers: { "idempotency-key": `orders-browser-${action}` },
        },
      );
      expect(response.ok(), action).toBeTruthy();
    }
    const refresh = page.getByRole("link", {
      name: "Refresh status",
      exact: true,
    });
    await refresh.focus();
    await expect(refresh).toBeFocused();
    await refresh.press("Enter");
    await expect(page.getByText("Ready", { exact: true })).toBeVisible();
    await expect(
      page.locator(".customer-order-status svg.lucide-circle-check"),
    ).toBeVisible();
    await expect(
      page.getByText("Paid (simulated)", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("USD 14.00", { exact: true })).toBeVisible();
    const detail = page.getByRole("link", {
      name: "Order detail",
      exact: true,
    });
    await expect(detail).toHaveAttribute(
      "href",
      `/orders/${encodeURIComponent(orderId)}`,
    );
    await detail.click();
    await expect(page.getByText("Ready", { exact: true })).toBeVisible();
    await expect(page.getByText("Margherita pizza")).toBeVisible();
    await expect(page.getByText("USD 14.00", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Refresh status", exact: true }),
    ).toHaveAttribute("href", `/orders/${encodeURIComponent(orderId)}`);
    await page.screenshot({
      path: join(output, "order-detail-390.png"),
      fullPage: true,
    });
    await page.goto(`${customer}/orders`);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const navigation = page.getByRole("navigation", { name: "Customer" });
      for (const link of await navigation.getByRole("link").all()) {
        const box = await link.boundingBox();
        expect(box!.height).toBeGreaterThanOrEqual(44);
        expect(box!.width).toBeGreaterThanOrEqual(44);
      }
      await expect(page.locator("body")).toHaveCSS("margin", "0px");
      if (width < 768) {
        await expect(navigation).toHaveCSS("position", "fixed");
        const navBox = await navigation.boundingBox();
        expect(navBox!.y + navBox!.height).toBeLessThanOrEqual(900);
        await detail.scrollIntoViewIfNeeded();
        const actionBox = await detail.boundingBox();
        expect(actionBox!.y + actionBox!.height).toBeLessThanOrEqual(navBox!.y);
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(width);
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      if (width === 390 || width === 1440) {
        await page.mouse.move(0, 0);
        await page.screenshot({
          path: join(output, `orders-${width}.png`),
          fullPage: true,
        });
      }
    }
    expect(
      browserMutations,
      "order reads and refresh must not submit mutations",
    ).toBe(0);
    expect(assetFailures).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(externalRequests).toEqual([]);
    console.info(
      "FACTORY_ORDER_BROWSER_EVIDENCE",
      JSON.stringify({
        providerCalls: 0,
        statusVisible: true,
        viewports: [320, 390, 768, 1440],
        assetFailures: 0,
        pageErrors: 0,
      }),
    );
  } finally {
    const closed = await Promise.allSettled(
      servers.map((server) => server.close()),
    );
    await rm(root, { recursive: true, force: true });
    await expect(access(root)).rejects.toThrow();
    if (closed.some((result) => result.status === "rejected"))
      throw new Error("Acceptance server cleanup failed.");
  }
});
