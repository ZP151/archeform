import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { generateRestaurantProductApplicationBundle } from "../packages/compiler/src/index";
import { restaurantProductV3Fixture } from "../packages/compiler/test/fixtures/restaurant-product-v3";

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
    const { publishedGraph, compositionLock } = restaurantProductV3Fixture();
    const bundle = generateRestaurantProductApplicationBundle({
      publishedGraph,
      compositionLock,
    });
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
    await page.goto(`${customer}/orders`);
    await expect(
      page.getByText("No orders yet", { exact: true }),
    ).toBeVisible();
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
    await page.goto(`${customer}/orders`);
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
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
      if (width !== 768) {
        const output = resolve("acceptance-artifacts/d1.4");
        await mkdir(output, { recursive: true });
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
    console.info(
      "FACTORY_ORDER_BROWSER_EVIDENCE",
      JSON.stringify({
        providerCalls: 0,
        statusVisible: true,
        viewports: [390, 768, 1440],
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
