import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { restaurantProductV3Fixture } from "./fixtures/restaurant-product-v3.js";
import { planRestaurantProduct } from "../src/targets/restaurant-v3/plan.js";
import { renderRestaurantCustomerRuntime } from "../src/targets/restaurant-v3/runtime-api.js";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function startRuntime(principalRole = "customer") {
  const fixture = restaurantProductV3Fixture();
  const plan = planRestaurantProduct({
    publishedGraph: fixture.publishedGraph,
    compositionLock: fixture.compositionLock,
  });
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
      "dish-truffle-risotto",
      "dish-seared-salmon",
    ]);
    const detail = await json(app.base, "/api/catalog/dish-truffle-risotto");
    expect(detail.body).toMatchObject({
      id: "dish-truffle-risotto",
      price: 3200,
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
        itemId: "dish-truffle-risotto",
        quantity: 2,
        expectedVersion: 1,
        unitPrice: 1,
        total: 1,
        status: "paid",
      }),
    });
    expect(added.body.cart).toMatchObject({ total: 6400, version: 2 });
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
    expect(updated.body.cart).toMatchObject({ total: 3200, version: 3 });
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
      "/api/merchant/catalog/dish-truffle-risotto",
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
        itemId: "dish-seared-salmon",
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
      total: 2800,
      status: "paid",
      paymentStatus: "simulated-paid",
      version: 1,
    });
    const orders = await json(app.base, "/api/orders");
    expect(orders.body.orders).toHaveLength(1);
    const detail = await json(app.base, "/api/orders/order-0001");
    expect(detail.body.order.total).toBe(2800);
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
      itemId: "dish-truffle-risotto",
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
        itemId: "dish-truffle-risotto",
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
        itemId: "dish-truffle-risotto",
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
    expect(cart.body.cart.total).toBe(3200);
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
        itemId: "dish-truffle-risotto",
        expectedVersion: 1,
        note: "x".repeat(70_000),
      }),
    });
    expect(oversized.status).toBe(413);
    expect(await oversized.json()).toEqual({ error: "Request too large." });
    await app.started.close();
  });
});
