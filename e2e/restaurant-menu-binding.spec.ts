import { expect, test, type Page, type Response } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { observeInterpretation } from "./helpers/interpretation-diagnostics";
import {
  assertIsolatedProviderRun,
  controlPlaneUrl,
  currentPreview,
  expectCompletedPhase,
  interpretationTimeoutMs,
  observeDirectRestaurantOutcome,
  stopPreview,
  stringAt,
} from "./helpers/restaurant-delivery";

// Authored business fixtures; provider material is checked only in memory.
const name = "Cedar Kitchen";
const items = [
  { description: null, name: "Garden bowl", priceMinor: 1125 },
  { description: null, name: "Roasted squash", priceMinor: 1850 },
  { description: null, name: "Herb plate", priceMinor: 2375 },
];
const parameters = {
  apiVersion: "factory.restaurant-menu-parameters/v1",
  currency: "USD",
  items,
  mode: "provided",
};
const parameterChecksum = `sha256:${createHash("sha256").update(JSON.stringify(parameters)).digest("hex")}`;
const brief =
  "Build a local Restaurant ordering app named Cedar Kitchen. Use my menu: Garden bowl USD 11.25, Roasted squash USD 18.50, and Herb plate USD 23.75. Customers place table orders, kitchen staff prepare them, and managers operate the restaurant. Use simulated payments.";
test.describe.configure({ retries: 0 });

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function matchesParameters(value: unknown): boolean {
  const menu = record(value);
  return (
    Object.keys(menu).length === 4 &&
    menu.apiVersion === parameters.apiVersion &&
    menu.currency === "USD" &&
    menu.mode === "provided" &&
    Array.isArray(menu.items) &&
    menu.items.length === items.length &&
    menu.items.every((value, index) => {
      const item = record(value);
      return (
        Object.keys(item).length === 3 &&
        item.name === items[index]!.name &&
        item.description === null &&
        item.priceMinor === items[index]!.priceMinor
      );
    })
  );
}
function kitchenOrigin(project: string): string {
  expect(project).toMatch(/^factory-preview-[a-z0-9-]+$/u);
  const ids = execFileSync(
    "docker",
    [
      "ps",
      "--filter",
      `label=com.docker.compose.project=${project}`,
      "--filter",
      "label=com.docker.compose.service=kitchen",
      "--format",
      "{{.ID}}",
    ],
    { encoding: "utf8" },
  )
    .trim()
    .split(/\r?\n/u);
  expect(ids).toHaveLength(1);
  const address = execFileSync("docker", ["port", ids[0]!, "3002"], {
    encoding: "utf8",
  }).trim();
  expect(address).toMatch(/^127\.0\.0\.1:\d+$/u);
  return `http://${address}`;
}

test("three supplied USD dishes reach an immutable app and complete an order at the supplied price", async ({
  page,
  context,
  request,
}) => {
  test.setTimeout(1_800_000);
  assertIsolatedProviderRun();
  const finishDiagnostics = observeInterpretation(page);
  let generated: Page | undefined;
  let compilationId: string | null = null;
  let previewId: string | null = null;
  let verificationId: string | null = null;
  let published: unknown;
  let reviewId: string | null = null;
  let productParametersMatch = false;
  const reads = new Set<Promise<void>>();
  const observe = (response: Response) => {
    if (response.request().method() !== "POST") return;
    const path = new URL(response.url()).pathname;
    let reading: Promise<void>;
    reading = (async () => {
      if (path === "/product/requirements") {
        productParametersMatch = matchesParameters(
          record(response.request().postDataJSON()).businessParameters,
        );
        reviewId = stringAt(await response.json(), ["review", "id"]);
      } else if (/\/published-revisions$/u.test(path))
        published = await response.json();
      else if (path === "/compilations")
        compilationId = stringAt(await response.json(), ["id"]);
      else if (/\/verification-runs$/u.test(path))
        verificationId = stringAt(await response.json(), ["verificationRunId"]);
      else if (/\/preview-runs$/u.test(path))
        previewId = stringAt(await response.json(), ["id"]);
    })()
      .catch(() => undefined)
      .finally(() => reads.delete(reading));
    reads.add(reading);
  };
  page.on("response", observe);
  let startedAt = 0;
  try {
    await page.goto("/");
    await page.getByLabel("Requirement brief").fill(brief);
    const interpreted = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/requirements/interpret",
      { timeout: interpretationTimeoutMs },
    );
    void interpreted.catch(() => undefined);
    startedAt = Date.now();
    await page.getByRole("button", { name: "Create product" }).click();
    const response = await interpreted;
    const body = record(await response.json());
    const parameterMatch = matchesParameters(body.businessParameters);
    const outcome = await observeDirectRestaurantOutcome(page);
    console.info(
      "FACTORY_MENU_INTERPRETATION_EVIDENCE",
      JSON.stringify({
        status: response.status(),
        wrapperVersionMatches:
          body.apiVersion === "factory.requirement-interpretation-result/v1",
        parameterMatch,
        titleMatches:
          stringAt(body, ["interpretation", "blueprint", "title"]) === name,
        ...outcome,
      }),
    );
    expect(response.status()).toBe(200);
    expect(
      body.apiVersion === "factory.requirement-interpretation-result/v1",
    ).toBe(true);
    expect(parameterMatch).toBe(true);
    expect(outcome.outcome === "delivery" && outcome.questionCount === 0).toBe(
      true,
    );
    await expectCompletedPhase(
      page,
      async () => {
        await Promise.all([...reads]);
        return Boolean(compilationId && reviewId && published);
      },
      600_000,
    );
    expect(productParametersMatch).toBe(true);
    const persisted = await request.get(
      controlPlaneUrl(`/product/requirements/${encodeURIComponent(reviewId!)}`),
    );
    expect(persisted.ok()).toBeTruthy();
    const review = record(record(await persisted.json()).review);
    expect(matchesParameters(review.businessParameters)).toBe(true);
    expect(review.businessParametersChecksum === parameterChecksum).toBe(true);
    expect(Object.hasOwn(review, "businessParametersProvided")).toBe(false);
    const graph = record(record(record(published).graph).graph);
    expect(record(graph.metadata).name === name).toBe(true);
    const seeds = record(graph.domain).seedData;
    expect(Array.isArray(seeds)).toBe(true);
    const menuSeeds = (seeds as unknown[])
      .map(record)
      .filter((seed) => seed.entity === "menu-item");
    expect(menuSeeds.length).toBe(3);
    expect(
      menuSeeds.every(
        (seed, index) =>
          seed.id === `menu-item-${String(index + 1).padStart(3, "0")}` &&
          record(seed.values).name === items[index]!.name &&
          record(seed.values).price === items[index]!.priceMinor / 100,
      ),
    ).toBe(true);
    expect(
      (seeds as unknown[])
        .map(record)
        .some(
          (seed) =>
            seed.entity === "menu-option" ||
            seed.entity === "menu-option-group",
        ),
    ).toBe(false);
    const scenarios = graph.seedScenarios as unknown[];
    expect(Array.isArray(scenarios) && scenarios.length === 1).toBe(true);
    expect(
      isDeepStrictEqual(
        record(scenarios[0]).records,
        (seeds as unknown[]).map((seed) => ({
          entityKey: record(seed).entity,
          values: record(seed).values,
        })),
      ),
    ).toBe(true);
    await expectCompletedPhase(
      page,
      async () => {
        await Promise.all([...reads]);
        return Boolean(verificationId && previewId);
      },
      910_000,
    );
    const verified = await request.get(
      controlPlaneUrl(
        `/verification-runs/${encodeURIComponent(verificationId!)}`,
      ),
    );
    expect(verified.ok()).toBeTruthy();
    const verification = record(await verified.json());
    expect(
      verification.status === "succeeded" &&
        Array.isArray(record(verification.evidence).steps) &&
        (record(verification.evidence).steps as unknown[]).length > 0,
    ).toBe(true);
    await expectCompletedPhase(
      page,
      async () =>
        (await currentPreview(request, compilationId!))?.status === "ready",
      315_000,
    );
    const previewResponse = await request.get(
      controlPlaneUrl(
        `/compilations/${encodeURIComponent(compilationId!)}/preview-runs/current`,
      ),
    );
    const preview = record(await previewResponse.json());
    expect(preview.id === previewId).toBe(true);
    const origin = new URL(String(preview.previewUrl));
    expect(["127.0.0.1", "localhost", "[::1]"]).toContain(origin.hostname);
    const compiledResponse = await request.get(
      controlPlaneUrl(`/compilations/${encodeURIComponent(compilationId!)}`),
    );
    const compiled = record(await compiledResponse.json());
    expect(
      compiled.publishedRevisionId === record(published).id &&
        compiled.inputGraphHash === record(published).graphHash &&
        record(compiled.result).status === "succeeded",
    ).toBe(true);
    const readyAt = Date.now();
    generated = await context.newPage();
    await generated.goto(origin.toString());
    await expect(generated).toHaveTitle(name);
    await expect(
      generated.getByRole("heading", { name: items[2]!.name, exact: true }),
    ).toBeVisible();
    await expect(generated.locator("#content img")).toHaveCount(0);
    expect(
      await generated.locator("#content svg.lucide-utensils-crossed").count(),
    ).toBe(3);
    const manager = `http://127.0.0.1:${preview.apiPort}`;
    const merchantCatalog = await request.get(
      `${manager}/api/merchant/catalog`,
    );
    expect(merchantCatalog.ok()).toBeTruthy();
    const catalog = record(await merchantCatalog.json()).items as unknown[];
    expect(
      catalog.length === 3 &&
        catalog.every(
          (value, index) =>
            record(value).name === items[index]!.name &&
            record(value).price === items[index]!.priceMinor,
        ),
    ).toBe(true);
    await generated.goto(new URL("/menu/menu-item-003", origin).toString());
    const addResponse = generated.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/cart/items",
    );
    const addedReload = generated.waitForNavigation();
    void addedReload.catch(() => undefined);
    await generated.getByRole("button", { name: "Add to order" }).click();
    expect((await addResponse).ok()).toBeTruthy();
    await addedReload;
    await generated.goto(new URL("/checkout", origin).toString());
    const payResponse = generated.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/checkout",
    );
    const paidReload = generated.waitForNavigation();
    void paidReload.catch(() => undefined);
    await generated.getByRole("button", { name: "Pay", exact: true }).click();
    const pay = await payResponse;
    expect(pay.ok()).toBeTruthy();
    await paidReload;
    const orderResponse = await request.get(
      new URL("/api/orders", origin).toString(),
    );
    expect(orderResponse.ok()).toBeTruthy();
    const orders = record(await orderResponse.json()).orders as unknown[];
    expect(Array.isArray(orders) && orders.length === 1).toBe(true);
    const order = record(orders[0]);
    expect(order.total === items[2]!.priceMinor).toBe(true);
    const kitchen = kitchenOrigin(String(preview.composeProjectName));
    for (const [action, expectedVersion] of [
      ["accept", 1],
      ["start-preparing", 2],
      ["mark-ready", 3],
    ] as const) {
      const updated = await request.post(
        `${kitchen}/api/merchant/kitchen/${encodeURIComponent(String(order.id))}/actions`,
        {
          data: { action, expectedVersion },
          headers: { "idempotency-key": `menu-live-${action}` },
        },
      );
      expect(updated.ok()).toBeTruthy();
    }
    await generated.goto(
      new URL(
        `/orders/${encodeURIComponent(String(order.id))}`,
        origin,
      ).toString(),
    );
    await expect(
      generated.getByText(items[2]!.name, { exact: true }),
    ).toBeVisible();
    await expect(
      generated.getByText("USD 23.75", { exact: true }),
    ).toBeVisible();
    await expect(generated.getByText("Ready", { exact: true })).toBeVisible();
    console.info(
      "FACTORY_MENU_DELIVERY_EVIDENCE",
      JSON.stringify({
        questionCount: 0,
        itemCount: 3,
        exactSuppliedPrice: true,
        persistedChecksumMatches: true,
        immutableBindingMatches: true,
        orderReady: true,
        elapsedToReadyMs: readyAt - startedAt,
        elapsedToTaskMs: Date.now() - startedAt,
      }),
    );
  } finally {
    page.off("response", observe);
    await Promise.all([...reads]);
    await generated?.close().catch(() => undefined);
    await page.close().catch(() => undefined);
    if (compilationId) {
      const current = await currentPreview(request, compilationId);
      const exact = previewId ?? current?.id;
      if (exact) await stopPreview(request, compilationId, exact);
    }
    await finishDiagnostics();
  }
});

test("an explicitly non-USD menu cannot silently become a USD application", async ({
  page,
  request,
}) => {
  test.setTimeout(600_000);
  assertIsolatedProviderRun();
  const finishDiagnostics = observeInterpretation(page);
  let mutations = 0;
  let compilationId: string | null = null;
  const reads: Promise<void>[] = [];
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      /^\/(?:product\/requirements|compilations|application-graphs\/[^/]+\/published-revisions)(?:\/|$)/u.test(
        new URL(request.url()).pathname,
      )
    )
      mutations += 1;
  });
  page.on("response", (response) => {
    if (
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/compilations"
    )
      reads.push(
        response
          .json()
          .then((body) => {
            compilationId = stringAt(body, ["id"]);
          })
          .catch(() => undefined),
      );
  });
  try {
    await page.goto("/");
    await page
      .getByLabel("Requirement brief")
      .fill(
        "Build a local Restaurant table-ordering app named Maple Room with Garden bowl GBP 11.25 and Herb plate GBP 23.75. Prices must stay in GBP. Customers order, kitchen staff prepare orders, and managers operate the restaurant. Use simulated payments.",
      );
    const interpreted = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/requirements/interpret",
      { timeout: interpretationTimeoutMs },
    );
    void interpreted.catch(() => undefined);
    const startedAt = Date.now();
    await page.getByRole("button", { name: "Create product" }).click();
    const response = await interpreted;
    const outcome = await observeDirectRestaurantOutcome(page);
    console.info(
      "FACTORY_MENU_CURRENCY_BOUNDARY_EVIDENCE",
      JSON.stringify({
        status: response.status(),
        ...outcome,
        mutations,
        elapsedMs: Date.now() - startedAt,
      }),
    );
    expect(response.status()).toBe(200);
    expect(
      outcome.outcome === "clarification" &&
        outcome.questionCount === 1 &&
        outcome.questionCategories[0] === "data",
    ).toBe(true);
    expect(mutations).toBe(0);
    await expect(
      page.getByRole("link", { name: "Open local app" }),
    ).toHaveCount(0);
  } finally {
    await Promise.all(reads);
    await page.close().catch(() => undefined);
    if (compilationId) {
      const preview = await currentPreview(request, compilationId);
      if (preview) await stopPreview(request, compilationId, preview.id);
    }
    await finishDiagnostics();
  }
});
