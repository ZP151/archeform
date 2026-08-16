import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { restaurantProductV3Fixture } from "./fixtures/restaurant-product-v3.js";
import { planRestaurantProduct } from "../src/targets/restaurant-v3/plan.js";
import { renderRestaurantCustomerRuntime } from "../src/targets/restaurant-v3/runtime-api.js";

const roots: string[] = [];
afterEach(async () =>
  Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  ),
);

async function generatedRuntime(
  mutatePlan?: (plan: ReturnType<typeof planRestaurantProduct>) => void,
) {
  const fixture = restaurantProductV3Fixture();
  const plan = structuredClone(
    planRestaurantProduct({
      publishedGraph: fixture.publishedGraph,
      compositionLock: fixture.compositionLock,
    }),
  );
  mutatePlan?.(plan);
  const source = renderRestaurantCustomerRuntime(plan);
  const root = await mkdtemp(join(tmpdir(), "archeform-merchant-runtime-"));
  roots.push(root);
  for (const [name, content] of Object.entries({
    "state.mjs": source.stateModule,
    "api.mjs": source.apiModule,
    "seed.mjs": source.seedModule,
    "server.mjs": source.serverModule,
  }))
    await writeFile(join(root, name), content, "utf8");
  const module = await import(
    `${pathToFileURL(join(root, "server.mjs")).href}?v=${Date.now()}`
  );
  return { root, statePath: join(root, "state.json"), module, plan };
}

async function start(
  app: Awaited<ReturnType<typeof generatedRuntime>>,
  role: string,
) {
  const server = await app.module.startRestaurantServer({
    statePath: app.statePath,
    principalRole: role,
    host: "127.0.0.1",
    port: 0,
  });
  return { server, base: `http://127.0.0.1:${server.port}` };
}

async function json(base: string, path: string, init: RequestInit = {}) {
  const response = await fetch(base + path, init);
  return { response, body: await response.json() };
}

const mutation = (body: unknown, key: string, headers = {}) => ({
  method: "POST",
  headers: {
    "content-type": "application/json",
    "idempotency-key": key,
    ...headers,
  },
  body: JSON.stringify(body),
});

describe("generated Restaurant merchant runtime", () => {
  it("shares customer orders, kitchen progress, catalog, and settings across trusted role startups", async () => {
    const app = await generatedRuntime();
    const customer = await start(app, "customer");
    await json(
      customer.base,
      "/api/cart/items",
      mutation(
        { itemId: "margherita-pizza", quantity: 1, expectedVersion: 1 },
        "add",
      ),
    );
    const checkout = await json(
      customer.base,
      "/api/checkout",
      mutation({ expectedVersion: 2, method: "simulated-card" }, "checkout"),
    );
    expect(checkout.body.order).toMatchObject({
      status: "paid",
      priority: "normal",
      kitchenStatus: "queued",
    });
    await customer.server.close();

    const manager = await start(app, "manager");
    expect(
      (await json(manager.base, "/api/merchant/orders")).body.orders[0].id,
    ).toBe("order-0001");
    const catalog = await json(
      manager.base,
      "/api/merchant/catalog/margherita-pizza",
      {
        ...mutation(
          { expectedVersion: 2, available: false, stock: 6 },
          "catalog",
        ),
        method: "PATCH",
      },
    );
    expect(catalog.body.item).toMatchObject({
      available: false,
      stock: 6,
      version: 3,
    });
    const settings = await json(manager.base, "/api/merchant/settings", {
      ...mutation(
        {
          expectedVersion: 1,
          name: "Maison Deux",
          currency: "SGD",
          taxRate: 9,
          serviceChargeRate: 10,
          timezone: "Asia/Singapore",
          logoUrl: "https://example.invalid/logo.png",
          serviceOpen: true,
        },
        "settings",
      ),
      method: "PUT",
    });
    expect(settings.body.settings).toMatchObject({
      name: "Maison Deux",
      version: 2,
    });
    await manager.server.close();

    const kitchen = await start(app, "kitchen");
    for (const [action, version, status] of [
      ["accept", 1, "accepted"],
      ["start-preparing", 2, "preparing"],
      ["mark-ready", 3, "ready"],
    ] as const) {
      const result = await json(
        kitchen.base,
        "/api/merchant/kitchen/order-0001/actions",
        mutation({ action, expectedVersion: version }, `kitchen-${action}`),
      );
      expect(result.body.order).toMatchObject({
        version: version + 1,
        status,
        kitchenStatus: status,
      });
    }
    await kitchen.server.close();

    const restartedCustomer = await start(app, "customer");
    expect(
      (await json(restartedCustomer.base, "/api/catalog")).body.items[0],
    ).toMatchObject({ available: false, stock: 6 });
    expect(
      (await json(restartedCustomer.base, "/api/orders/order-0001")).body.order,
    ).toMatchObject({ status: "ready", kitchenStatus: "ready" });
    await restartedCustomer.server.close();
    const persisted = JSON.parse(await readFile(app.statePath, "utf8"));
    expect(persisted.settings.name).toBe("Maison Deux");
  });

  it("enforces exact roles, nonspoofable principals, read-only users, conflicts, receipts, and audit", async () => {
    const app = await generatedRuntime();
    const manager = await start(app, "manager");
    const principalList = await json(manager.base, "/api/merchant/principals");
    expect(
      principalList.body.principals.map((value: any) => value.role),
    ).toEqual(["manager", "kitchen", "cashier"]);
    for (const method of ["POST", "PATCH", "PUT", "DELETE"]) {
      const denied = await json(
        manager.base,
        "/api/merchant/principals/manager-1",
        {
          method,
          headers: { "content-type": "application/json" },
          body: method === "DELETE" ? undefined : "{}",
        },
      );
      expect([404, 405]).toContain(denied.response.status);
    }
    const payload = {
      expectedVersion: 1,
      available: false,
      stock: 7,
      role: "kitchen",
      principalRole: "kitchen",
    };
    const first = await json(
      manager.base,
      "/api/merchant/catalog/mushroom-risotto",
      { ...mutation(payload, "same"), method: "PATCH" },
    );
    const replay = await json(
      manager.base,
      "/api/merchant/catalog/mushroom-risotto",
      { ...mutation(payload, "same"), method: "PATCH" },
    );
    expect(replay.body).toEqual(first.body);
    expect(
      (
        await json(manager.base, "/api/merchant/catalog/mushroom-risotto", {
          ...mutation({ ...payload, stock: 8 }, "same"),
          method: "PATCH",
        })
      ).response.status,
    ).toBe(409);
    expect(
      (
        await json(manager.base, "/api/merchant/catalog/mushroom-risotto", {
          ...mutation({ expectedVersion: 1, stock: 8 }, "other"),
          method: "PATCH",
        })
      ).response.status,
    ).toBe(409);
    await manager.server.close();

    for (const role of ["customer", "kitchen", "cashier"]) {
      const server = await start(app, role);
      const denied = await json(
        server.base,
        "/api/merchant/catalog/mushroom-risotto",
        {
          ...mutation(
            { expectedVersion: 2, available: true },
            `denied-${role}`,
            { "x-role": "manager" },
          ),
          method: "PATCH",
        },
      );
      expect(denied.response.status).toBe(403);
      await server.server.close();
    }
    const state = JSON.parse(await readFile(app.statePath, "utf8"));
    expect(state.audit).toHaveLength(1);
    expect(state.audit[0]).toMatchObject({
      actorRole: "manager",
      action: "catalog.updated",
      revisionId: app.plan.publishedRevisionId,
    });
  });

  it("pins manager, kitchen, cashier, and table transition action boundaries", async () => {
    const app = await generatedRuntime();
    const customer = await start(app, "customer");
    await json(
      customer.base,
      "/api/cart/items",
      mutation(
        { itemId: "mushroom-risotto", quantity: 1, expectedVersion: 1 },
        "add-order",
      ),
    );
    await json(
      customer.base,
      "/api/checkout",
      mutation({ expectedVersion: 2, method: "simulated-card" }, "make-order"),
    );
    await customer.server.close();
    const manager = await start(app, "manager");
    const priority = await json(
      manager.base,
      "/api/merchant/orders/order-0001/actions",
      mutation(
        { action: "set-priority", priority: "high", expectedVersion: 1 },
        "priority",
      ),
    );
    expect(priority.body.order.priority).toBe("high");
    const table = await json(
      manager.base,
      "/api/merchant/tables/table-1/actions",
      mutation({ action: "activate", expectedVersion: 1 }, "table"),
    );
    expect(table.body.table).toMatchObject({ status: "active", version: 2 });
    await manager.server.close();
    const cashier = await start(app, "cashier");
    expect(
      (
        await json(
          cashier.base,
          "/api/merchant/orders/order-0001/actions",
          mutation({ action: "pay", expectedVersion: 2 }, "pay-again"),
        )
      ).response.status,
    ).toBe(409);
    await cashier.server.close();
    const kitchen = await start(app, "kitchen");
    expect(
      (
        await json(
          kitchen.base,
          "/api/merchant/orders/order-0001/actions",
          mutation({ action: "cancel", expectedVersion: 2 }, "wrong-action"),
        )
      ).response.status,
    ).toBe(403);
    await kitchen.server.close();
  });

  it("denies non-manager order-priority mutation", async () => {
    const app = await generatedRuntime();
    const kitchen = await start(app, "kitchen");
    const result = await json(
      kitchen.base,
      "/api/merchant/orders/order-0001/actions",
      mutation(
        { action: "set-priority", priority: "high", expectedVersion: 1 },
        "kitchen-priority",
      ),
    );
    expect(result.response.status).toBe(403);
    await kitchen.server.close();
  });

  it("denies fields whose exact Graph binding or client authority is absent", async () => {
    const app = await generatedRuntime((plan) => {
      const available = plan.bindingPolicies.filter(
        (policy) =>
          policy.pageId === "merchant-menu-management" &&
          policy.kind === "domain-field" &&
          policy.fieldKey === "available",
      ) as any[];
      available.forEach((policy) => {
        policy.access = "read";
      });
      const logo = plan.fieldAuthorities.find(
        (authority) =>
          authority.entityKey === "restaurant-location" &&
          authority.fieldKey === "logoUrl",
      ) as any;
      logo.authority = "server";
    });
    const manager = await start(app, "manager");
    const catalog = await json(
      manager.base,
      "/api/merchant/catalog/margherita-pizza",
      {
        ...mutation({ expectedVersion: 1, available: false }, "drift-catalog"),
        method: "PATCH",
      },
    );
    expect(catalog.response.status).toBe(403);
    const settings = await json(manager.base, "/api/merchant/settings", {
      ...mutation(
        {
          expectedVersion: 1,
          name: "Maison",
          currency: "SGD",
          taxRate: 9,
          serviceChargeRate: 10,
          timezone: "Asia/Singapore",
          logoUrl: "https://example.invalid/logo.png",
          serviceOpen: true,
        },
        "drift-settings",
      ),
      method: "PUT",
    });
    expect(settings.response.status).toBe(403);
    const state = JSON.parse(await readFile(app.statePath, "utf8"));
    expect(state.audit).toEqual([]);
    await manager.server.close();
  });

  it("shares the r.6 Graph catalog and merchant mutation through one persisted state", async () => {
    const app = await generatedRuntime((plan) => {
      const seedIndex = plan.domain.seedData!.findIndex(
        ({ entity, id }) => entity === "menu-item" && id === "margherita-pizza",
      );
      plan.domain.seedData![seedIndex]!.values.name = "Heirloom tomato pizza";
      plan.seedScenarios[0]!.records[seedIndex]!.values.name =
        "Heirloom tomato pizza";
    });
    const customer = await start(app, "customer");
    expect(
      (await json(customer.base, "/api/catalog")).body.items[0],
    ).toMatchObject({
      id: "margherita-pizza",
      name: "Heirloom tomato pizza",
      price: 1400,
    });
    await customer.server.close();

    const manager = await start(app, "manager");
    const merchantCatalog = await json(manager.base, "/api/merchant/catalog");
    expect(merchantCatalog.body.items[0]).toMatchObject({
      id: "margherita-pizza",
      name: "Heirloom tomato pizza",
      price: 1400,
    });
    const changed = await json(
      manager.base,
      "/api/merchant/catalog/margherita-pizza",
      {
        ...mutation(
          { expectedVersion: 1, name: "Heirloom tomato pizza tonight" },
          "r6-name",
        ),
        method: "PATCH",
      },
    );
    expect(changed.body.item).toMatchObject({
      name: "Heirloom tomato pizza tonight",
      version: 2,
    });
    await manager.server.close();

    const restarted = await start(app, "customer");
    expect(
      (await json(restarted.base, "/api/catalog")).body.items[0].name,
    ).toBe("Heirloom tomato pizza tonight");
    await restarted.server.close();
  });
});
