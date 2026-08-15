import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import { afterEach, describe, expect, it } from "vitest";
import { createCapabilityCompositionLock } from "@factory/capabilities";
import { hashApplicationGraphV3 } from "@factory/graph";

import { restaurantProductV3Fixture } from "./fixtures/restaurant-product-v3.js";
import { planRestaurantProduct } from "../src/targets/restaurant-v3/plan.js";
import { renderRestaurantCustomerRuntime } from "../src/targets/restaurant-v3/runtime-api.js";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

function canonicalPlan() {
  const fixture = restaurantProductV3Fixture();
  return planRestaurantProduct({
    publishedGraph: fixture.publishedGraph,
    compositionLock: fixture.compositionLock,
  });
}

function restaurantV6Plan() {
  const fixture = restaurantProductV3Fixture();
  const graph = fixture.publishedGraph.graph;
  graph.metadata.name = "Maison Rivage";
  graph.page.pages.find(({ id }) => id === "customer-menu")!.title =
    "Seasonal Menu";
  const home = graph.page.pages.find(({ id }) => id === "customer-home")!;
  home.blocks = [home.blocks[2]!, home.blocks[0]!, home.blocks[1]!];
  home.recipe.regions[0]!.blockIds = [
    "home-items",
    "home-hero",
    "home-categories",
  ];
  const seedIndex = graph.domain.seedData!.findIndex(
    ({ entity, id }) => entity === "menu-item" && id === "margherita-pizza",
  );
  graph.domain.seedData![seedIndex]!.values.name = "Heirloom tomato pizza";
  graph.seedScenarios[0]!.records[seedIndex]!.values.name =
    "Heirloom tomato pizza";
  graph.experience.theme.mode = "dark";
  fixture.publishedGraph.graphHash = hashApplicationGraphV3(graph);
  fixture.compositionLock = createCapabilityCompositionLock({
    graphChecksum: fixture.publishedGraph.graphHash,
    selections: graph.integration.compositionSelections ?? [],
  });
  return planRestaurantProduct({
    publishedGraph: fixture.publishedGraph,
    compositionLock: fixture.compositionLock,
  });
}

async function seedForPlan(plan: ReturnType<typeof canonicalPlan>) {
  const source = renderRestaurantCustomerRuntime(plan).seedModule;
  return (
    await import(
      `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}#${Date.now()}-${Math.random()}`
    )
  ).restaurantSeed;
}

async function startRuntime(
  principalRole = "customer",
  plan = canonicalPlan(),
) {
  const source = renderRestaurantCustomerRuntime(plan);
  const root = await mkdtemp(join(tmpdir(), "archeform-restaurant-runtime-"));
  roots.push(root);
  for (const [name, content] of Object.entries({
    "state.mjs": source.stateModule,
    "api.mjs": source.apiModule,
    "seed.mjs": source.seedModule,
    "server.mjs": source.serverModule,
  }))
    await writeFile(join(root, name), content, "utf8");
  for (const name of ["state.mjs", "api.mjs", "seed.mjs", "server.mjs"]) {
    const checked = spawnSync(process.execPath, ["--check", join(root, name)], {
      encoding: "utf8",
    });
    if (checked.status !== 0) throw new Error(checked.stderr);
  }
  const statePath = join(root, "state", "restaurant.json");
  const runtime = await import(
    `${pathToFileURL(join(root, "server.mjs")).href}?v=${Date.now()}`
  );
  const started = await runtime.startRestaurantServer({
    statePath,
    port: 0,
    host: "127.0.0.1",
    principalRole,
  });
  const base = `http://127.0.0.1:${started.port}`;
  return { root, statePath, started, base, runtime, plan };
}

async function json(base: string, path: string, init: RequestInit = {}) {
  const response = await fetch(`${base}${path}`, init);
  const body = await response.json();
  return { response, body };
}

describe("generated Restaurant customer runtime", () => {
  it("migrates before health and serves catalog and dish detail", async () => {
    const app = await startRuntime();
    const health = await json(app.base, "/health");
    expect(health.response.status).toBe(200);
    expect(health.body).toEqual({ status: "ready", schemaVersion: 1 });
    const catalog = await json(app.base, "/api/catalog");
    expect(catalog.body.items.map((item: any) => item.id)).toEqual([
      "margherita-pizza",
      "mushroom-risotto",
    ]);
    expect(catalog.body.items).toEqual([
      {
        id: "margherita-pizza",
        version: 1,
        categoryKey: "mains",
        name: "Margherita pizza",
        description: "Tomato, mozzarella, and basil",
        price: 1400,
        available: true,
        stock: 12,
        preparationMinutes: 12,
        imageUrl: "/menu/margherita-pizza.jpg",
      },
      {
        id: "mushroom-risotto",
        version: 1,
        categoryKey: "mains",
        name: "Mushroom risotto",
        description: "Arborio rice and mushrooms",
        price: 1800,
        available: true,
        stock: 8,
        preparationMinutes: 18,
        imageUrl: "/menu/mushroom-risotto.jpg",
      },
    ]);
    const detail = await json(app.base, "/api/catalog/margherita-pizza");
    expect(detail.body).toMatchObject({
      id: "margherita-pizza",
      price: 1400,
      available: true,
    });
    await app.started.close();
  });

  it("owns cart totals and supports add, update, and delete", async () => {
    const app = await startRuntime();
    const headers = {
      "content-type": "application/json",
      "x-role": "customer",
      "idempotency-key": "cart-add-1",
    };
    const added = await json(app.base, "/api/cart/items", {
      method: "POST",
      headers,
      body: JSON.stringify({
        itemId: "margherita-pizza",
        quantity: 2,
        expectedVersion: 1,
        unitPrice: 1,
        total: 1,
        status: "paid",
      }),
    });
    expect(added.body.cart).toMatchObject({ total: 2800, version: 2 });
    expect(added.body.cart.items[0]).not.toHaveProperty("status");
    const updated = await json(
      app.base,
      `/api/cart/items/${added.body.cart.items[0].id}`,
      {
        method: "PATCH",
        headers: { ...headers, "idempotency-key": "cart-update-1" },
        body: JSON.stringify({ quantity: 1, expectedVersion: 2, total: 0 }),
      },
    );
    expect(updated.body.cart).toMatchObject({ total: 1400, version: 3 });
    const removed = await json(
      app.base,
      `/api/cart/items/${added.body.cart.items[0].id}`,
      {
        method: "DELETE",
        headers: {
          "x-role": "customer",
          "idempotency-key": "cart-delete-1",
          "x-expected-version": "3",
        },
      },
    );
    expect(removed.body.cart).toMatchObject({
      items: [],
      total: 0,
      version: 4,
    });
    await app.started.close();
  });

  it("exposes the expanded shared schema without changing customer authority", async () => {
    const app = await startRuntime();
    const catalog = await json(app.base, "/api/catalog");
    expect(catalog.body.items[0]).toMatchObject({
      version: 1,
      available: true,
      stock: 12,
    });
    const denied = await json(
      app.base,
      "/api/merchant/catalog/margherita-pizza",
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-role": "manager",
          "idempotency-key": "spoof-manager",
        },
        body: JSON.stringify({
          expectedVersion: 1,
          available: false,
          stock: 0,
          principalRole: "manager",
        }),
      },
    );
    expect(denied.response.status).toBe(403);
    expect((await json(app.base, "/api/catalog")).body.items[0]).toMatchObject({
      version: 1,
      available: true,
      stock: 12,
    });
    await app.started.close();
  });

  it("checks out with simulated payment and exposes orders and profile updates", async () => {
    const app = await startRuntime();
    const headers = {
      "content-type": "application/json",
      "x-role": "customer",
      "idempotency-key": "journey-add",
    };
    await json(app.base, "/api/cart/items", {
      method: "POST",
      headers,
      body: JSON.stringify({
        itemId: "mushroom-risotto",
        quantity: 1,
        expectedVersion: 1,
      }),
    });
    const checkout = await json(app.base, "/api/checkout", {
      method: "POST",
      headers: { ...headers, "idempotency-key": "checkout-1" },
      body: JSON.stringify({
        expectedVersion: 2,
        method: "simulated-card",
        total: 1,
        paymentStatus: "failed",
        audit: [],
      }),
    });
    expect(checkout.body.order).toMatchObject({
      id: "order-0001",
      total: 1800,
      status: "paid",
      paymentStatus: "simulated-paid",
      version: 1,
    });
    const orders = await json(app.base, "/api/orders");
    expect(orders.body.orders).toHaveLength(1);
    const detail = await json(app.base, "/api/orders/order-0001");
    expect(detail.body.order.total).toBe(1800);
    const profile = await json(app.base, "/api/profile", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        "x-role": "customer",
        "idempotency-key": "profile-1",
      },
      body: JSON.stringify({
        displayName: "Aurelia Guest",
        locale: "en-SG",
        marketingOptIn: true,
        role: "manager",
        expectedVersion: 1,
      }),
    });
    expect(profile.body.profile).toMatchObject({
      displayName: "Aurelia Guest",
      role: "customer",
      version: 2,
    });
    await app.started.close();
  });

  it("denies roles, conflicts versions, and enforces idempotency payload identity", async () => {
    const app = await startRuntime();
    const payload = JSON.stringify({
      itemId: "margherita-pizza",
      quantity: 1,
      expectedVersion: 1,
    });
    for (const role of ["manager", "anonymous"]) {
      const deniedApp = await startRuntime(role);
      const denied = await json(deniedApp.base, "/api/cart/items", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-role": role,
          "idempotency-key": `deny-${role}`,
        },
        body: payload,
      });
      expect(denied.response.status).toBe(403);
      expect(denied.body).toEqual({ error: "Request denied." });
      await deniedApp.started.close();
    }
    const headers = {
      "content-type": "application/json",
      "x-role": "manager",
      "idempotency-key": "same-key",
    };
    const first = await json(app.base, "/api/cart/items", {
      method: "POST",
      headers,
      body: payload,
    });
    const replay = await json(app.base, "/api/cart/items", {
      method: "POST",
      headers,
      body: payload,
    });
    expect(replay.body).toEqual(first.body);
    const conflictReplay = await json(app.base, "/api/cart/items", {
      method: "POST",
      headers,
      body: JSON.stringify({
        itemId: "margherita-pizza",
        quantity: 2,
        expectedVersion: 1,
      }),
    });
    expect(conflictReplay.response.status).toBe(409);
    const version = await json(
      app.base,
      `/api/cart/items/${first.body.cart.items[0].id}`,
      {
        method: "PATCH",
        headers: { ...headers, "idempotency-key": "bad-version" },
        body: JSON.stringify({ quantity: 2, expectedVersion: 1 }),
      },
    );
    expect(version.response.status).toBe(409);
    const crossAction = await json(app.base, "/api/checkout", {
      method: "POST",
      headers,
      body: JSON.stringify({
        expectedVersion: 2,
        method: "simulated-card",
      }),
    });
    expect(crossAction.response.status).toBe(200);
    expect(crossAction.body.order.status).toBe("paid");
    await app.started.close();
  });

  it("persists append-only audit and state across restart", async () => {
    const app = await startRuntime();
    await json(app.base, "/api/cart/items", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-role": "customer",
        "idempotency-key": "persist-1",
      },
      body: JSON.stringify({
        itemId: "margherita-pizza",
        quantity: 1,
        expectedVersion: 1,
      }),
    });
    await app.started.close();
    const before = JSON.parse(await readFile(app.statePath, "utf8"));
    expect(before.audit).toHaveLength(1);
    expect(before.audit[0]).toMatchObject({
      revisionId: app.plan.publishedRevisionId,
      actorRole: "customer",
    });
    const restarted = await app.runtime.startRestaurantServer({
      statePath: app.statePath,
      port: 0,
      host: "127.0.0.1",
    });
    const cart = await json(`http://127.0.0.1:${restarted.port}`, "/api/cart");
    expect(cart.body.cart.total).toBe(1400);
    const after = JSON.parse(await readFile(app.statePath, "utf8"));
    expect(after.audit).toEqual(before.audit);
    await restarted.close();
  });

  it("returns fixed errors for malformed and bounded bodies", async () => {
    const app = await startRuntime();
    const malformed = await fetch(`${app.base}/api/cart/items`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-role": "customer",
        "idempotency-key": "malformed",
      },
      body: "{secret",
    });
    expect(malformed.status).toBe(400);
    expect(await malformed.json()).toEqual({ error: "Invalid request." });
    const oversized = await fetch(`${app.base}/api/cart/items`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-role": "customer",
        "idempotency-key": "oversized",
      },
      body: JSON.stringify({
        itemId: "margherita-pizza",
        expectedVersion: 1,
        note: "x".repeat(70_000),
      }),
    });
    expect(oversized.status).toBe(413);
    expect(await oversized.json()).toEqual({ error: "Request too large." });
    await app.started.close();
  });

  it("serves the admitted r.6 catalog identically to customer and merchant APIs", async () => {
    const app = await startRuntime("customer", restaurantV6Plan());
    expect((await json(app.base, "/api/catalog")).body.items[0]).toEqual({
      id: "margherita-pizza",
      version: 1,
      categoryKey: "mains",
      name: "Heirloom tomato pizza",
      description: "Tomato, mozzarella, and basil",
      price: 1400,
      available: true,
      stock: 12,
      preparationMinutes: 12,
      imageUrl: "/menu/margherita-pizza.jpg",
    });
    await app.started.close();
    const merchant = await app.runtime.startRestaurantServer({
      statePath: app.statePath,
      port: 0,
      host: "127.0.0.1",
      principalRole: "manager",
    });
    const base = `http://127.0.0.1:${merchant.port}`;
    expect(
      (await json(base, "/api/merchant/catalog")).body.items[0],
    ).toMatchObject({
      id: "margherita-pizza",
      name: "Heirloom tomato pizza",
      price: 1400,
    });
    await merchant.close();
  });

  it.each([
    [0, 0],
    [14, 1400],
    [14.5, 1450],
    [14.25, 1425],
    [100_000, 10_000_000],
  ])(
    "converts exact USD major price %s to minor units %s",
    async (price, minor) => {
      const plan = structuredClone(canonicalPlan());
      const seedIndex = plan.domain.seedData!.findIndex(
        ({ entity, id }) => entity === "menu-item" && id === "margherita-pizza",
      );
      plan.domain.seedData![seedIndex]!.values.price = price;
      plan.seedScenarios[0]!.records[seedIndex]!.values.price = price;
      expect((await seedForPlan(plan)).catalog[0].price).toBe(minor);
    },
  );

  it.each([
    "/menu/image.jpg",
    "#menu-image",
    "?image=menu",
    "HTTPS://example.com/menu.jpg",
  ])("admits the safe catalog image URL %s", async (imageUrl) => {
    const plan = structuredClone(canonicalPlan());
    plan.domain.seedData![3]!.values.imageUrl = imageUrl;
    plan.seedScenarios[0]!.records[3]!.values.imageUrl = imageUrl;
    expect((await seedForPlan(plan)).catalog[0].imageUrl).toBe(imageUrl);
  });

  it.each([
    [Number.NaN],
    [Number.POSITIVE_INFINITY],
    [Number.NEGATIVE_INFINITY],
    [-0.01],
    [100_000.01],
    [1.001],
    ["14"],
    [new Number(14)],
  ])("rejects invalid USD major price %s without rounding", (price) => {
    const plan = structuredClone(canonicalPlan()) as any;
    const seedIndex = plan.domain.seedData.findIndex(
      ({ entity, id }: any) =>
        entity === "menu-item" && id === "margherita-pizza",
    );
    plan.domain.seedData[seedIndex].values.price = price;
    plan.seedScenarios[0].records[seedIndex].values.price = price;
    expect(() => renderRestaurantCustomerRuntime(plan)).toThrow(
      new Error("Restaurant product compilation input is invalid."),
    );
  });

  it("rejects hostile price objects without conversion or error echo", () => {
    const plan = structuredClone(canonicalPlan()) as any;
    let calls = 0;
    const hostile = {
      valueOf() {
        calls += 1;
        return 14;
      },
      toString() {
        calls += 1;
        return "HOSTILE_PRICE";
      },
    };
    const seedIndex = plan.domain.seedData.findIndex(
      ({ entity, id }: any) =>
        entity === "menu-item" && id === "margherita-pizza",
    );
    plan.domain.seedData[seedIndex].values.price = hostile;
    plan.seedScenarios[0].records[seedIndex].values.price = hostile;
    expect(() => renderRestaurantCustomerRuntime(plan)).toThrow(
      new Error("Restaurant product compilation input is invalid."),
    );
    expect(calls).toBe(0);
  });

  it.each([
    [
      "untrimmed item name",
      (plan: any) => {
        plan.domain.seedData[3].values.name = " Margherita pizza";
        plan.seedScenarios[0].records[3].values.name = " Margherita pizza";
      },
    ],
    [
      "controlled description",
      (plan: any) => {
        plan.domain.seedData[3].values.description = "bad\u0000description";
        plan.seedScenarios[0].records[3].values.description =
          "bad\u0000description";
      },
    ],
    [
      "boxed available",
      (plan: any) => {
        plan.domain.seedData[3].values.available = new Boolean(true);
        plan.seedScenarios[0].records[3].values.available = new Boolean(true);
      },
    ],
    [
      "fractional stock",
      (plan: any) => {
        plan.domain.seedData[3].values.stock = 1.5;
        plan.seedScenarios[0].records[3].values.stock = 1.5;
      },
    ],
    [
      "zero preparation",
      (plan: any) => {
        plan.domain.seedData[3].values.preparationMinutes = 0;
        plan.seedScenarios[0].records[3].values.preparationMinutes = 0;
      },
    ],
    [
      "unsafe image URL",
      (plan: any) => {
        plan.domain.seedData[3].values.imageUrl = "javascript:alert(1)";
        plan.seedScenarios[0].records[3].values.imageUrl =
          "javascript:alert(1)";
      },
    ],
    [
      "category sort order",
      (plan: any) => {
        plan.domain.seedData[2].values.sortOrder = -1;
        plan.seedScenarios[0].records[2].values.sortOrder = -1;
      },
    ],
    [
      "category active",
      (plan: any) => {
        plan.domain.seedData[2].values.active = "true";
        plan.seedScenarios[0].records[2].values.active = "true";
      },
    ],
    [
      "unresolved category",
      (plan: any) => {
        plan.domain.seedData[3].values.categoryKey = "missing-category";
        plan.seedScenarios[0].records[3].values.categoryKey =
          "missing-category";
      },
    ],
    [
      "mirror mismatch",
      (plan: any) => {
        plan.seedScenarios[0].records[3].values.name = "Different mirror";
      },
    ],
  ])("rejects invalid runtime catalog data: %s", (_label, mutate) => {
    const plan = structuredClone(canonicalPlan());
    mutate(plan);
    expect(() => renderRestaurantCustomerRuntime(plan)).toThrow(
      new Error("Restaurant product compilation input is invalid."),
    );
  });
});
