import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { isDeepStrictEqual } from "node:util";
import {
  assertIsolatedProviderRun,
  controlPlaneUrl,
  currentPreview,
  stopPreview,
} from "./helpers/restaurant-delivery";

test("an existing immutable Restaurant keeps its URLs and fulfilled order across container restart", async ({
  page,
  request,
}) => {
  test.setTimeout(300_000);
  assertIsolatedProviderRun();
  const compilationId = process.env.FACTORY_E2E_EXISTING_COMPILATION_ID;
  expect(compilationId).toMatch(/^[a-z0-9-]+$/u);
  let previewId: string | undefined;
  const docker = (args: string[]) =>
    execFileSync("docker", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  try {
    const started = await request.post(
      controlPlaneUrl(`/compilations/${compilationId}/preview-runs`),
      { data: {} },
    );
    expect(started.ok()).toBeTruthy();
    const created = await started.json();
    previewId = created.id;
    expect(previewId).toMatch(/^preview-[a-z0-9-]+$/u);
    await expect
      .poll(
        async () => (await currentPreview(request, compilationId!))?.status,
        { timeout: 120_000 },
      )
      .not.toBe("starting");
    const response = await request.get(
      controlPlaneUrl(`/compilations/${compilationId}/preview-runs/current`),
    );
    const preview = await response.json();
    expect(preview.id).toBe(previewId);
    expect(preview.status).toBe("ready");
    expect(preview.composeProjectName).toMatch(/^factory-preview-[a-z0-9-]+$/u);
    const container = (service: string) => {
      const ids = docker([
        "ps",
        "--filter",
        `label=com.docker.compose.project=${preview.composeProjectName}`,
        "--filter",
        `label=com.docker.compose.service=${service}`,
        "--format",
        "{{.ID}}",
      ])
        .split(/\r?\n/u)
        .filter(Boolean);
      expect(ids).toHaveLength(1);
      expect(ids[0]).toMatch(/^[a-f0-9]+$/u);
      return ids[0]!;
    };
    const binding = (id: string, port: string) => {
      const value = docker(["port", id, port]);
      expect(value).toMatch(/^127\.0\.0\.1:\d+$/u);
      return `http://${value}`;
    };
    const webId = container("web"),
      apiId = container("api");
    const customer = binding(webId, "3000"),
      manager = binding(apiId, "3001");
    expect(customer).toBe(preview.previewUrl);
    expect(manager).toBe(`http://127.0.0.1:${preview.apiPort}`);
    const post = async (url: string, data: unknown, key: string) => {
      const result = await request.post(url, {
        data,
        headers: { "idempotency-key": key },
      });
      expect(result.ok()).toBeTruthy();
      return result.json();
    };
    const cart = await (await request.get(`${customer}/api/cart`)).json();
    const added = await post(
      `${customer}/api/cart/items`,
      {
        itemId: "margherita-pizza",
        quantity: 1,
        expectedVersion: cart.cart.version,
      },
      "restart-order-add",
    );
    const paid = await post(
      `${customer}/api/checkout`,
      { method: "simulated-card", expectedVersion: added.cart.version },
      "restart-order-pay",
    );
    expect(paid.order.total).toBe(1400);
    const kitchen = binding(container("kitchen"), "3002");
    for (const [action, expectedVersion] of [
      ["accept", 1],
      ["start-preparing", 2],
      ["mark-ready", 3],
    ] as const) {
      await post(
        `${kitchen}/api/merchant/kitchen/${paid.order.id}/actions`,
        { action, expectedVersion },
        `restart-order-${action}`,
      );
    }
    const orderUrl = `${customer}/api/orders/${paid.order.id}`;
    const before = await (await request.get(orderUrl)).json();
    expect(before.order.status).toBe("ready");
    docker(["restart", "--time", "5", webId, apiId]);
    const sameCustomerUrl = binding(webId, "3000") === customer;
    const sameManagerUrl = binding(apiId, "3001") === manager;
    console.info(
      "FACTORY_EXISTING_COMPILATION_RESTART",
      JSON.stringify({ sameCustomerUrl, sameManagerUrl, providerCalls: 0 }),
    );
    expect(sameCustomerUrl).toBe(true);
    expect(sameManagerUrl).toBe(true);
    await expect
      .poll(
        async () => {
          try {
            const restored = await request.get(orderUrl);
            return (
              restored.ok() && isDeepStrictEqual(await restored.json(), before)
            );
          } catch {
            return false;
          }
        },
        { timeout: 30_000 },
      )
      .toBe(true);
    const merchant = await (
      await request.get(`${manager}/api/merchant/orders`)
    ).json();
    expect(
      merchant.orders.some((order: unknown) =>
        isDeepStrictEqual(order, before.order),
      ),
    ).toBe(true);
    await page.goto(`${customer}/orders/${paid.order.id}`);
    await expect(page.getByText("Ready", { exact: true })).toBeVisible();
    console.info(
      "FACTORY_EXISTING_COMPILATION_RESTART_COMPLETE",
      JSON.stringify({
        originalUrlsRetained: true,
        completeOrderRetained: true,
        customerVisibleReady: true,
        providerCalls: 0,
      }),
    );
  } finally {
    await page.close().catch(() => undefined);
    if (previewId && compilationId)
      await stopPreview(request, compilationId, previewId);
  }
});
