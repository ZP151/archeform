import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { restaurantProductV3Fixture } from "./fixtures/restaurant-product-v3.js";
import { planRestaurantProduct } from "../src/targets/restaurant-v3/plan.js";
import { renderRestaurantMerchantContribution } from "../src/targets/restaurant-v3/merchant-target.js";

const roots: string[] = [];
afterEach(async () =>
  Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  ),
);

function contribution() {
  const fixture = restaurantProductV3Fixture();
  return renderRestaurantMerchantContribution(
    planRestaurantProduct({
      publishedGraph: fixture.publishedGraph,
      compositionLock: fixture.compositionLock,
    }),
  );
}

async function materialize() {
  const value = contribution();
  const root = await mkdtemp(join(tmpdir(), "archeform-merchant-target-"));
  roots.push(root);
  for (const file of value.files) {
    const path = join(root, file.path);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, file.content, "utf8");
  }
  return {
    value,
    root,
    app: await import(
      `${pathToFileURL(join(root, "src/merchant/app.mjs")).href}?v=${Date.now()}`
    ),
  };
}

describe("Restaurant merchant V3 contributor", () => {
  it("renders the exact seven routes, sidebar, source, and no customer closure", () => {
    const value = contribution();
    expect(value.surface.pages.map(({ route }) => route)).toEqual([
      "/merchant",
      "/merchant/menu",
      "/merchant/orders",
      "/merchant/kitchen",
      "/merchant/tables",
      "/merchant/users",
      "/merchant/settings",
    ]);
    expect(value.surface.navigation.map(({ label }) => label)).toEqual([
      "Dashboard",
      "Menu Management",
      "Orders",
      "Kitchen Queue",
      "Tables",
      "Users/Roles",
      "Settings",
    ]);
    expect(
      value.surface.pages.every(
        ({ recipe }) => recipe.layoutKey === "merchant-workspace-shell",
      ),
    ).toBe(true);
    expect(value.files.map(({ path }) => path)).toEqual([
      "src/generated/merchant-restaurant-ui.mjs",
      "src/merchant/app.mjs",
      "src/merchant/styles.css",
      "test/merchant-journey.test.mjs",
    ]);
    expect(value.files.map(({ content }) => content).join("\n")).not.toMatch(
      /customerRoutes|renderMobileProductShell|src\/customer/,
    );
  });

  it("materializes all pages and pins Graph ports, APIs, and role-controlled actions", async () => {
    const { app } = await materialize();
    expect(app.merchantRoutes).toEqual([
      "/merchant",
      "/merchant/menu",
      "/merchant/orders",
      "/merchant/kitchen",
      "/merchant/tables",
      "/merchant/users",
      "/merchant/settings",
    ]);
    expect(app.declaredMerchantApis).toEqual([
      "/api/merchant/dashboard",
      "/api/merchant/catalog",
      "/api/merchant/orders",
      "/api/merchant/kitchen",
      "/api/merchant/tables",
      "/api/merchant/principals",
      "/api/merchant/settings",
    ]);
    expect(Object.values(app.declaredMerchantActionPorts)).toEqual([
      "restaurant-inventory-ledger:recorded:record-manager-adjustment:recorded",
      "restaurant-order:submitted:cancel:cancelled",
      "restaurant-order:paid:cancel:cancelled",
      "order.priority",
      "restaurant-order:submitted:pay:paid",
      "restaurant-order:paid:accept:accepted",
      "restaurant-order:accepted:start-preparing:preparing",
      "restaurant-order:preparing:mark-ready:ready",
      "restaurant-table-session:open:activate:active",
      "restaurant-table-session:active:close:closed",
      "restaurant-table-session:open:expire:closed",
      "restaurant-table-session:active:expire:closed",
      "manager:restaurant-location:update",
    ]);
    const state = {
      catalog: [
        {
          id: "dish-1",
          version: 1,
          name: "Dish <script>",
          description: "Safe",
          price: 100,
          available: true,
          stock: 2,
          preparationMinutes: 5,
        },
      ],
      orders: [
        {
          id: "order-1",
          version: 1,
          total: 100,
          status: "paid",
          paymentStatus: "simulated-paid",
          priority: "normal",
          kitchenStatus: "queued",
        },
      ],
      tables: [
        {
          id: "table-1",
          version: 1,
          code: "T1",
          number: 1,
          capacity: 2,
          status: "open",
          active: true,
        },
      ],
      principals: [
        {
          id: "manager-1",
          subjectRef: "local",
          displayName: "Manager",
          role: "manager",
          active: true,
        },
      ],
      settings: {
        version: 1,
        name: "Maison",
        currency: "SGD",
        taxRate: 9,
        serviceChargeRate: 10,
        timezone: "Asia/Singapore",
        logoUrl: "javascript:alert(1)",
        serviceOpen: true,
      },
      dashboard: {
        orderCount: 1,
        openOrderCount: 1,
        availableItemCount: 1,
        activeTableCount: 1,
      },
    };
    for (const route of app.merchantRoutes) {
      const html = app.renderMerchantPage(route, state, "manager");
      expect(html).toContain('<main class="factory-screen merchant-shell"');
      expect(html).not.toContain("<script>");
      if (route === "/merchant/users")
        expect(html).not.toContain("data-merchant-action");
    }
    expect(
      app.renderMerchantPage("/merchant/menu", state, "manager"),
    ).toContain(">Save menu item</button>");
    expect(
      app.renderMerchantPage("/merchant/menu", state, "manager"),
    ).not.toMatch(/<button type="submit" data-merchant-action=/);
    expect(
      app.renderMerchantPage("/merchant/settings", state, "manager"),
    ).not.toContain("javascript:");
    expect(
      app.renderMerchantPage("/merchant/settings", state, "manager"),
    ).toContain('name="serviceOpen"');
    expect(
      app.renderMerchantPage("/merchant/kitchen", state, "manager"),
    ).toMatch(/disabled|data-policy="false"/);
    expect(
      app.renderMerchantPage("/merchant/kitchen", state, "kitchen"),
    ).toContain("data-merchant-action");
    const kitchenHtml = app.renderMerchantPage(
      "/merchant/kitchen",
      state,
      "kitchen",
    );
    for (const [action, label] of [
      ["kitchen.accept", "Accept order"],
      ["kitchen.start-preparing", "Start preparing"],
      ["kitchen.mark-ready", "Mark ready"],
    ])
      expect(kitchenHtml).toMatch(
        new RegExp(`data-merchant-action="${action}"[^>]*>${label}`),
      );
    const tableHtml = app.renderMerchantPage(
      "/merchant/tables",
      state,
      "manager",
    );
    for (const [action, label] of [
      ["table.activate", "Activate table"],
      ["table.close", "Close table"],
      ["table.expire-open", "Expire open session"],
      ["table.expire-active", "Expire active session"],
    ])
      expect(tableHtml).toMatch(
        new RegExp(`data-merchant-action="${action}"[^>]*>${label}`),
      );
  });

  it("loads exact data and delegates payloads without role or authority fields", async () => {
    const { app } = await materialize();
    const calls: any[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (path: any, init: any = {}) => {
      calls.push([String(path), init]);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };
    try {
      await app.loadMerchantData("/merchant/menu");
      await app.invokeMerchantAction("catalog.update", {
        itemId: "dish-1",
        expectedVersion: 1,
        price: "1200",
        available: "on",
        stock: "4",
        preparationMinutes: "12",
        role: "manager",
        total: 1,
        idempotencyKey: "menu",
      });
      await app.invokeMerchantAction("kitchen.accept", {
        orderId: "order-1",
        expectedVersion: 1,
        idempotencyKey: "accept",
      });
      await app.invokeMerchantAction("order.set-priority", {
        orderId: "order-1",
        expectedVersion: 1,
        priority: "high",
        role: "manager",
        idempotencyKey: "priority",
      });
      await app.invokeMerchantAction("settings.update", {
        expectedVersion: 1,
        name: "Maison",
        currency: "SGD",
        taxRate: 9,
        serviceChargeRate: 10,
        timezone: "Asia/Singapore",
        logoUrl: "https://example.invalid/logo.png",
        serviceOpen: true,
        actorRole: "manager",
        idempotencyKey: "settings",
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
    expect(calls[0][0]).toBe("/api/merchant/catalog");
    expect(JSON.parse(calls[1][1].body)).toEqual({
      expectedVersion: 1,
      price: 1200,
      available: true,
      stock: 4,
      preparationMinutes: 12,
    });
    expect(JSON.parse(calls[2][1].body)).toEqual({
      action: "accept",
      expectedVersion: 1,
    });
    expect(JSON.parse(calls[3][1].body)).toEqual({
      action: "set-priority",
      expectedVersion: 1,
      priority: "high",
    });
    expect(JSON.parse(calls[4][1].body)).not.toHaveProperty("actorRole");
  });
});
