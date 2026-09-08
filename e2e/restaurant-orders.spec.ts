import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

type RunningServer = { port: number; close: () => Promise<void> };
test.describe.configure({ retries: 0 });

for (const itemCount of [1, 3, 100]) {
  test(`a supplied ${itemCount}-item menu renders and orders at its exact price`, async ({
    page,
    request,
  }) => {
    test.setTimeout(90_000);
    const root = await mkdtemp(join(tmpdir(), "archeform-menu-browser-"));
    const servers: RunningServer[] = [];
    try {
      const bundle = JSON.parse(
        execFileSync(
          process.execPath,
          [
            "--experimental-strip-types",
            "--input-type=module",
            "-e",
            `import { generateRestaurantProductApplicationBundle } from './packages/compiler/dist/index.js';
         import { hashApplicationGraphV3 } from './packages/graph/dist/index.js';
         import { bindRestaurantMenuParameters, createCapabilityCompositionLock } from './packages/capabilities/dist/index.js';
         import { restaurantProductV3Fixture } from './packages/compiler/test/fixtures/restaurant-product-v3.ts';
         const count = Number(process.argv[1]);
         const { publishedGraph } = restaurantProductV3Fixture();
         publishedGraph.graph.metadata.name = 'Cedar & Sage';
         publishedGraph.graph = bindRestaurantMenuParameters(publishedGraph.graph, {
           apiVersion: 'factory.restaurant-menu-parameters/v1', mode: 'provided', currency: 'USD',
           items: Array.from({length: count}, (_, i) => ({name: 'House dish ' + (i + 1), description: null, priceMinor: 1201 + i * 137}))
         });
         publishedGraph.graphHash = hashApplicationGraphV3(publishedGraph.graph);
         const compositionLock = createCapabilityCompositionLock({graphChecksum: publishedGraph.graphHash, selections: publishedGraph.graph.integration.compositionSelections ?? []});
         process.stdout.write(JSON.stringify(generateRestaurantProductApplicationBundle({publishedGraph, compositionLock})));`,
            String(itemCount),
          ],
          { encoding: "utf8", maxBuffer: 5 * 1024 * 1024, timeout: 30_000 },
        ),
      ) as { files: { path: string; content: string }[] };
      for (const file of bundle.files) {
        const target = resolve(root, file.path);
        const within = relative(root, target);
        if (within.startsWith("..") || isAbsolute(within))
          throw new Error("Generated path escaped acceptance root.");
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, file.content, "utf8");
      }
      const runtime = await import(
        pathToFileURL(join(root, "src/server.mjs")).href
      );
      for (const principalRole of ["customer", "kitchen", "manager"]) {
        servers.push(
          await runtime.startRestaurantServer({
            statePath: join(root, "state.json"),
            host: "127.0.0.1",
            port: 0,
            principalRole,
          }),
        );
      }
      const customer = `http://127.0.0.1:${servers[0]!.port}`;
      const kitchen = `http://127.0.0.1:${servers[1]!.port}`;
      const manager = `http://127.0.0.1:${servers[2]!.port}`;
      let imageRequests = 0;
      let externalRequests = 0;
      let failedAssets = 0;
      let pageErrors = 0;
      page.on("request", (outgoing) => {
        if (outgoing.resourceType() === "image") imageRequests += 1;
        if (new URL(outgoing.url()).origin !== customer) externalRequests += 1;
      });
      page.on("requestfailed", () => {
        failedAssets += 1;
      });
      page.on("pageerror", () => {
        pageErrors += 1;
      });
      page.on("response", (response) => {
        if (response.status() >= 400) failedAssets += 1;
      });
      await page.goto(`${customer}/menu`);
      await expect(page).toHaveTitle("Cedar & Sage");
      const catalogResponse = await request.get(`${customer}/api/catalog`);
      expect(catalogResponse.ok()).toBeTruthy();
      const catalog = (await catalogResponse.json()).items;
      expect(catalog).toHaveLength(itemCount);
      expect(catalog.map((item: { id: string }) => item.id)).toEqual(
        Array.from(
          { length: itemCount },
          (_, i) => `menu-item-${String(i + 1).padStart(3, "0")}`,
        ),
      );
      await expect(page.locator("main img, #content img")).toHaveCount(0);
      expect(
        await page.locator("#content svg.lucide-utensils-crossed").count(),
      ).toBe(itemCount);
      for (const index of [0, itemCount - 1]) {
        expect(catalog[index]).toMatchObject({
          name: `House dish ${index + 1}`,
          price: 1201 + index * 137,
          description: "Description not provided.",
          imageUrl: "#",
        });
        await expect(
          page.getByRole("heading", {
            name: `House dish ${index + 1}`,
            exact: true,
          }),
        ).toBeVisible();
        await expect(
          page.getByText(`USD ${((1201 + index * 137) / 100).toFixed(2)}`, {
            exact: false,
          }),
        ).toBeVisible();
      }
      const selectedIndex = Math.min(2, itemCount - 1);
      const selectedId = `menu-item-${String(selectedIndex + 1).padStart(3, "0")}`;
      const expectedMinor = 1201 + selectedIndex * 137;
      const selectedName = `House dish ${selectedIndex + 1}`;
      await page.goto(`${customer}/menu/${selectedId}`);
      await expect(
        page.getByRole("heading", { name: selectedName, exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText(`USD ${(expectedMinor / 100).toFixed(2)}`, {
          exact: false,
        }),
      ).toBeVisible();
      const added = page.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          new URL(response.url()).pathname === "/api/cart/items",
      );
      const reloaded = page.waitForNavigation();
      void reloaded.catch(() => undefined);
      await page.getByRole("button", { name: "Add to order" }).press("Enter");
      expect((await added).ok()).toBeTruthy();
      await reloaded;
      const cart = (await (await request.get(`${customer}/api/cart`)).json())
        .cart;
      expect(cart.total).toBe(expectedMinor);
      expect(cart.items).toHaveLength(1);
      await page.goto(`${customer}/checkout`);
      const paidResponse = page.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          new URL(response.url()).pathname === "/api/checkout",
      );
      const paidReload = page.waitForNavigation();
      void paidReload.catch(() => undefined);
      await page.getByRole("button", { name: "Pay", exact: true }).click();
      const paid = await paidResponse;
      expect(paid.ok()).toBeTruthy();
      await paidReload;
      const ordersResponse = await request.get(`${customer}/api/orders`);
      expect(ordersResponse.ok()).toBeTruthy();
      const orders = (await ordersResponse.json()).orders;
      expect(orders).toHaveLength(1);
      const paidOrder = orders[0];
      expect(paidOrder.total).toBe(expectedMinor);
      const orderId = paidOrder.id;
      const actionPath = `/api/merchant/kitchen/${orderId}/actions`;
      for (const [action, expectedVersion] of [
        ["accept", 1],
        ["start-preparing", 2],
        ["mark-ready", 3],
      ] as const) {
        const options = {
          data: { action, expectedVersion },
          headers: { "idempotency-key": `menu-browser-${action}` },
        };
        const changed = await request.post(`${kitchen}${actionPath}`, options);
        expect(changed.ok()).toBeTruthy();
        const replay = await request.post(`${kitchen}${actionPath}`, options);
        expect(replay.status()).toBe(changed.status());
        expect(await replay.json()).toEqual(await changed.json());
      }
      const denied = await request.post(`${customer}${actionPath}`, {
        data: { action: "complete", expectedVersion: 4 },
        headers: { "idempotency-key": "menu-browser-denied" },
      });
      expect(denied.status()).toBe(403);
      const merchant = await request.get(`${manager}/api/merchant/catalog`);
      expect(merchant.ok()).toBeTruthy();
      const merchantItem = (await merchant.json()).items[selectedIndex];
      expect(merchantItem).toMatchObject({
        id: selectedId,
        name: selectedName,
        price: expectedMinor,
      });
      const repriced = await request.patch(
        `${manager}/api/merchant/catalog/${selectedId}`,
        {
          data: {
            expectedVersion: merchantItem.version,
            price: expectedMinor + 100,
          },
          headers: { "idempotency-key": "menu-browser-reprice" },
        },
      );
      expect(repriced.ok()).toBeTruthy();
      expect((await repriced.json()).item.price).toBe(expectedMinor + 100);
      await page.goto(`${customer}/orders/${orderId}`);
      await expect(page.getByText(selectedName, { exact: true })).toBeVisible();
      await expect(page.getByText("Ready", { exact: true })).toBeVisible();
      await expect(
        page.getByText(`USD ${(expectedMinor / 100).toFixed(2)}`, {
          exact: true,
        }),
      ).toBeVisible();
      const customerPort = servers[0]!.port;
      await servers[0]!.close();
      servers[0] = await runtime.startRestaurantServer({
        statePath: join(root, "state.json"),
        host: "127.0.0.1",
        port: customerPort,
        principalRole: "customer",
      });
      await page.reload();
      const retainedCatalog = await request.get(`${customer}/api/catalog`);
      expect(retainedCatalog.ok()).toBeTruthy();
      expect((await retainedCatalog.json()).items[selectedIndex].price).toBe(
        expectedMinor + 100,
      );
      await expect(page.getByText("Ready", { exact: true })).toBeVisible();
      await expect(
        page.getByText(`USD ${(expectedMinor / 100).toFixed(2)}`, {
          exact: true,
        }),
      ).toBeVisible();
      if (itemCount === 3) {
        const output = resolve("acceptance-artifacts/d1.9");
        await mkdir(output, { recursive: true });
        for (const width of [390, 768, 1440]) {
          await page.setViewportSize({ width, height: 900 });
          await page.goto(`${customer}/menu`);
          for (const link of await page
            .getByRole("link", { name: "View dish", exact: true })
            .all()) {
            const box = await link.boundingBox();
            expect(box!.height).toBeGreaterThanOrEqual(44);
            expect(box!.width).toBeGreaterThanOrEqual(44);
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
          await page.screenshot({
            path: join(output, `supplied-menu-${width}.png`),
            fullPage: true,
          });
        }
      }
      expect({
        imageRequests,
        externalRequests,
        failedAssets,
        pageErrors,
      }).toEqual({
        imageRequests: 0,
        externalRequests: 0,
        failedAssets: 0,
        pageErrors: 0,
      });
      console.info(
        "FACTORY_SUPPLIED_MENU_BROWSER_EVIDENCE",
        JSON.stringify({
          itemCount,
          providerCalls: 0,
          exactPrice: true,
          orderReady: true,
          replayReconciled: true,
          staffDenied: true,
          restartRetained: true,
          imageRequests: 0,
        }),
      );
    } finally {
      await page.close().catch(() => undefined);
      const closed = await Promise.allSettled(
        servers.map((server) => server.close()),
      );
      const withinTemp = relative(resolve(tmpdir()), resolve(root));
      if (
        withinTemp.startsWith("..") ||
        isAbsolute(withinTemp) ||
        !withinTemp.startsWith("archeform-menu-browser-")
      )
        throw new Error("Acceptance cleanup escaped its temporary root.");
      await rm(root, { recursive: true, force: true });
      await expect(access(root)).rejects.toThrow();
      if (closed.some((result) => result.status === "rejected"))
        throw new Error("Acceptance server cleanup failed.");
    }
  });
}

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
       import { hashApplicationGraphV3 } from './packages/graph/dist/index.js';
       import { createCapabilityCompositionLock } from './packages/capabilities/dist/index.js';
       import { restaurantProductV3Fixture } from './packages/compiler/test/fixtures/restaurant-product-v3.ts';
       const { publishedGraph } = restaurantProductV3Fixture();
       publishedGraph.graph.metadata.name = 'Saffron & Sage';
       publishedGraph.graphHash = hashApplicationGraphV3(publishedGraph.graph);
       const compositionLock = createCapabilityCompositionLock({ graphChecksum: publishedGraph.graphHash, selections: publishedGraph.graph.integration.compositionSelections ?? [] });
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
    for (const principalRole of ["customer", "kitchen", "manager"]) {
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
    const manager = `http://127.0.0.1:${servers[2]!.port}`;
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
    await expect(page).toHaveTitle("Saffron & Sage");
    const settingsResponse = await request.get(
      `${manager}/api/merchant/settings`,
    );
    expect(settingsResponse.ok()).toBeTruthy();
    const settings = (await settingsResponse.json()).settings;
    expect(settings).toMatchObject({ name: "Saffron & Sage", currency: "USD" });
    await expect(
      page.getByText("Saffron & Sage", { exact: true }),
    ).toBeVisible();
    await page.goto(customer);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Saffron & Sage",
        exact: true,
      }),
    ).toBeVisible();
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
    const output = resolve("acceptance-artifacts/d1.8");
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
    const updatedSettings = await request.put(
      `${manager}/api/merchant/settings`,
      {
        data: {
          expectedVersion: settings.version,
          name: "Saffron & Sage Evening",
          currency: settings.currency,
          taxRate: settings.taxRate,
          serviceChargeRate: settings.serviceChargeRate,
          timezone: settings.timezone,
          logoUrl: settings.logoUrl,
          serviceOpen: settings.serviceOpen,
        },
        headers: { "idempotency-key": "orders-browser-name" },
      },
    );
    expect(updatedSettings.ok()).toBeTruthy();
    const customerPort = servers[0]!.port;
    await servers[0]!.close();
    servers[0] = await runtime.startRestaurantServer({
      statePath: join(root, "state.json"),
      host: "127.0.0.1",
      port: customerPort,
      principalRole: "customer",
    });
    await page.goto(`${customer}/orders`);
    await expect(page).toHaveTitle("Saffron & Sage Evening");
    await expect(
      page.getByText("Saffron & Sage Evening", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Ready", { exact: true })).toBeVisible();
    await expect(page.getByText("USD 14.00", { exact: true })).toBeVisible();
    await page.goto(customer);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Saffron & Sage Evening",
        exact: true,
      }),
    ).toBeVisible();
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
        suppliedNameVisible: true,
        renamedAfterRestart: true,
        orderRetainedAfterRestart: true,
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
