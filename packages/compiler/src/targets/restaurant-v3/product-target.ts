import {
  assertSafeGeneratedFileSet,
  sameGeneratedFileSet,
  type GeneratedFile,
} from "../../core/generated-files.js";
import type {
  GenerateApplicationBundleOptions,
  GeneratedApplicationBundle,
  PublishedApplicationGraphCompilationInput,
} from "../../index.js";
import { assertRestaurantProductCompilationInput } from "./contracts.js";
import {
  renderRestaurantCustomerAppModule,
  renderRestaurantCustomerJourneyTest,
} from "./customer-target.js";
import { renderRestaurantMerchantContribution } from "./merchant-target.js";
import { planRestaurantProduct } from "./plan.js";
import { renderRestaurantCustomerRuntime } from "./runtime-api.js";
import {
  selectRestaurantExperienceSource,
  selectRestaurantSurfaceSource,
} from "./source-registry.js";
import { projectRestaurantSurface } from "./surface-projection.js";

function sharedStateTest(
  plan: ReturnType<typeof planRestaurantProduct>,
): string {
  const primary = plan.domain.seedData!.find(
    ({ entity }) => entity === "menu-item",
  )!;
  return `import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { startRestaurantServer } from "../src/server.mjs";
const request = async (base, path, init = {}) => { const response = await fetch(base + path, init); return { response, body: await response.json() }; };
const post = (body, key) => ({ method: "POST", headers: { "content-type": "application/json", "idempotency-key": key }, body: JSON.stringify(body) });
test("customer and merchant share orders, kitchen, inventory, and settings", async () => {
  const root = await mkdtemp(join(tmpdir(), "restaurant-shared-generated-")); const statePath = join(root, "state.json");
  try {
    let server = await startRestaurantServer({ statePath, principalRole: "customer" }); let base = "http://127.0.0.1:" + server.port;
    const customerItem = (await request(base, "/api/catalog")).body.items[0]; assert.deepEqual({ id: customerItem.id, name: customerItem.name }, { id: ${JSON.stringify(primary.id)}, name: ${JSON.stringify(primary.values.name)} }); assert.equal(customerItem.price, 1400);
    await request(base, "/api/cart/items", post({ itemId: ${JSON.stringify(primary.id)}, quantity: 1, expectedVersion: 1 }, "add")); await request(base, "/api/checkout", post({ expectedVersion: 2, method: "simulated-card" }, "checkout")); await server.close();
    server = await startRestaurantServer({ statePath, principalRole: "manager" }); base = "http://127.0.0.1:" + server.port;
    assert.equal((await request(base, "/api/merchant/orders")).body.orders[0].id, "order-0001");
    const merchantItem = (await request(base, "/api/merchant/catalog")).body.items[0]; assert.equal(merchantItem.name, ${JSON.stringify(primary.values.name)}); assert.equal(merchantItem.price, customerItem.price);
    const updated = await request(base, "/api/merchant/catalog/" + ${JSON.stringify(primary.id)}, { method: "PATCH", headers: { "content-type": "application/json", "idempotency-key": "catalog" }, body: JSON.stringify({ expectedVersion: merchantItem.version, available: false, stock: 5 }) }); assert.equal(updated.body.item.available, false);
    await request(base, "/api/merchant/settings", { method: "PUT", headers: { "content-type": "application/json", "idempotency-key": "settings" }, body: JSON.stringify({ expectedVersion: 1, name: "Maison Shared", currency: "SGD", taxRate: 9, serviceChargeRate: 10, timezone: "Asia/Singapore", logoUrl: "", serviceOpen: true }) }); await server.close();
    server = await startRestaurantServer({ statePath, principalRole: "kitchen" }); base = "http://127.0.0.1:" + server.port;
    for (const [action, expectedVersion] of [["accept", 1], ["start-preparing", 2], ["mark-ready", 3]]) await request(base, "/api/merchant/kitchen/order-0001/actions", post({ action, expectedVersion }, action)); await server.close();
    server = await startRestaurantServer({ statePath, principalRole: "customer" }); base = "http://127.0.0.1:" + server.port;
    assert.equal((await request(base, "/api/orders/order-0001")).body.order.status, "ready"); const restartedItem = (await request(base, "/api/catalog")).body.items[0]; assert.equal(restartedItem.name, ${JSON.stringify(primary.values.name)}); assert.equal(restartedItem.available, false); await server.close();
    server = await startRestaurantServer({ statePath, principalRole: "manager" }); base = "http://127.0.0.1:" + server.port; assert.equal((await request(base, "/api/merchant/settings")).body.settings.name, "Maison Shared"); await server.close();
  } finally { await rm(root, { recursive: true, force: true }); }
});
`;
}

function renderFiles(
  input: PublishedApplicationGraphCompilationInput,
): GeneratedApplicationBundle {
  const captured = assertRestaurantProductCompilationInput(input);
  const plan = planRestaurantProduct(captured);
  const customerSurface = projectRestaurantSurface(plan, "customer-mobile");
  const merchant = renderRestaurantMerchantContribution(plan);
  const customerSource = selectRestaurantSurfaceSource("customer-mobile");
  const experience = selectRestaurantExperienceSource();
  const runtime = renderRestaurantCustomerRuntime(plan);
  const customerStyles =
    ":root{font-family:ui-serif,Georgia,serif;background:var(--surface,#fffaf2);color:var(--text,#20170f)}\n.customer-tabs{position:sticky;bottom:0;display:grid;grid-template-columns:repeat(5,1fr)}\n";
  const merchantFiles = Object.fromEntries(
    merchant.files.map(({ path, content }) => [path, content]),
  );
  const relocatedServer = runtime.serverModule
    .replace('"./state.mjs"', '"./runtime/state.mjs"')
    .replace('"./api.mjs"', '"./runtime/api.mjs"')
    .replace('"./seed.mjs"', '"./runtime/seed.mjs"')
    .replace(
      'import { restaurantSeed } from "./runtime/seed.mjs";',
      'import { restaurantSeed } from "./runtime/seed.mjs";\nimport { readFile } from "node:fs/promises";\nimport { trustedStartupRoles } from "./runtime/policy.mjs";\nimport { matchCustomerRoute, renderCustomerPage } from "./customer/app.mjs";\nimport { matchMerchantRoute, renderMerchantPage } from "./merchant/app.mjs";',
    )
    .replace(
      "  const store = createStateStore(options.statePath, restaurantSeed,",
      '  const principalRole = options.principalRole ?? "customer";\n  if (!trustedStartupRoles.includes(principalRole)) throw new Error("Restaurant runtime principal must be a trusted startup role.");\n  const store = createStateStore(options.statePath, restaurantSeed,',
    )
    .replace(
      'const server = createServer(createRestaurantApiHandler(store, options.principalRole ?? "customer"));',
      `const apiHandler = createRestaurantApiHandler(store, principalRole);
  const server = createServer(async (request, response) => {
    const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
    const assets = { "/customer/styles.css": "./customer/styles.css", "/customer/app.mjs": "./customer/app.mjs", "/generated/customer-restaurant-ui.mjs": "./generated/customer-restaurant-ui.mjs", "/merchant/styles.css": "./merchant/styles.css", "/merchant/app.mjs": "./merchant/app.mjs", "/generated/merchant-restaurant-ui.mjs": "./generated/merchant-restaurant-ui.mjs" };
    if (request.method === "GET" && assets[pathname]) { response.writeHead(200, { "content-type": pathname.endsWith(".css") ? "text/css; charset=utf-8" : "text/javascript; charset=utf-8" }); response.end(await readFile(new URL(assets[pathname], import.meta.url), "utf8")); return; }
    if (request.method === "GET" && matchCustomerRoute(pathname)) { response.writeHead(200, { "content-type": "text/html; charset=utf-8" }); response.end(renderCustomerPage(pathname, await store.read())); return; }
    if (request.method === "GET" && matchMerchantRoute(pathname)) { response.writeHead(200, { "content-type": "text/html; charset=utf-8" }); response.end(renderMerchantPage(pathname, await store.read(), principalRole)); return; }
    return apiHandler(request, response);
  });`,
    )
    .replace(
      'principalRole: "customer"',
      'principalRole: process.argv[2] ?? "customer"',
    );
  const rootDirectory = `restaurant-product-${plan.publishedRevisionId}`;
  const files: GeneratedFile[] = [
    {
      path: "package.json",
      content:
        JSON.stringify(
          {
            name: rootDirectory,
            private: true,
            type: "module",
            scripts: {
              "start:customer": "node src/server.mjs customer",
              "start:merchant": "node src/server.mjs manager",
              test: "node --test test/*.test.mjs",
            },
          },
          null,
          2,
        ) + "\n",
    },
    {
      path: "README.md",
      content: `# ${plan.application.name}\n\nDependency-free dual-surface Restaurant application compiled from immutable Published revision \`${plan.publishedRevisionId}\`. Customer and trusted merchant startup entries share one schema-version-1 atomic local state file.\n`,
    },
    {
      path: "graph/manifest.json",
      content:
        JSON.stringify(
          {
            apiVersion: "factory.restaurant-product-bundle/v1",
            graphHash: plan.graphHash,
            publishedRevisionId: plan.publishedRevisionId,
            runtimeSchemaVersion: 1,
            surfaces: [customerSurface, merchant.surface],
            source: {
              customer: {
                module: customerSource.module,
                digest: customerSource.digest,
                origins: customerSource.origins,
              },
              merchant: {
                module: "src/generated/merchant-restaurant-ui.mjs",
                digest:
                  selectRestaurantSurfaceSource("merchant-desktop").digest,
                origins:
                  selectRestaurantSurfaceSource("merchant-desktop").origins,
              },
              experience: {
                module: experience.module,
                digest: experience.digest,
                origin: experience.origin,
              },
            },
          },
          null,
          2,
        ) + "\n",
    },
    { path: "src/server.mjs", content: relocatedServer },
    { path: "src/runtime/state.mjs", content: runtime.stateModule },
    {
      path: "src/runtime/policy.mjs",
      content:
        'export const trustedStartupRoles = Object.freeze(["customer", "manager", "kitchen", "cashier"]);\n',
    },
    { path: "src/runtime/api.mjs", content: runtime.apiModule },
    { path: "src/runtime/seed.mjs", content: runtime.seedModule },
    { path: customerSource.module, content: customerSource.code },
    {
      path: "src/generated/merchant-restaurant-ui.mjs",
      content: merchantFiles["src/generated/merchant-restaurant-ui.mjs"]!,
    },
    { path: experience.module, content: experience.code },
    {
      path: "src/customer/app.mjs",
      content: renderRestaurantCustomerAppModule(),
    },
    { path: "src/customer/styles.css", content: customerStyles },
    {
      path: "src/merchant/app.mjs",
      content: merchantFiles["src/merchant/app.mjs"]!,
    },
    {
      path: "src/merchant/styles.css",
      content: merchantFiles["src/merchant/styles.css"]!,
    },
    {
      path: "test/customer-journey.test.mjs",
      content: renderRestaurantCustomerJourneyTest(plan),
    },
    {
      path: "test/merchant-journey.test.mjs",
      content: merchantFiles["test/merchant-journey.test.mjs"]!,
    },
    { path: "test/shared-state.test.mjs", content: sharedStateTest(plan) },
    {
      path: "Dockerfile",
      content:
        'FROM node:22-alpine\nWORKDIR /app\nCOPY . .\nCMD ["node", "src/server.mjs", "customer"]\n',
    },
    {
      path: "docker-compose.yml",
      content: `name: \${FACTORY_COMPOSE_PROJECT_NAME:-factory-${rootDirectory}}\n\nservices:\n  web:\n    build: .\n    command: ["node", "src/server.mjs", "customer"]\n    environment:\n      PORT: "3000"\n      HOST: "0.0.0.0"\n    volumes:\n      - shared-state:/app/.restaurant-state\n    ports:\n      - "127.0.0.1:\${FACTORY_WEB_PORT:-0}:3000"\n  api:\n    build: .\n    command: ["node", "src/server.mjs", "manager"]\n    environment:\n      PORT: "3001"\n      HOST: "0.0.0.0"\n    volumes:\n      - shared-state:/app/.restaurant-state\n    ports:\n      - "127.0.0.1:\${FACTORY_API_PORT:-0}:3001"\n  kitchen:\n    build: .\n    command: ["node", "src/server.mjs", "kitchen"]\n    profiles:\n      - acceptance\n    environment:\n      PORT: "3002"\n      HOST: "0.0.0.0"\n    volumes:\n      - shared-state:/app/.restaurant-state\n    ports:\n      - "127.0.0.1:\${FACTORY_KITCHEN_PORT:-0}:3002"\n  cashier:\n    build: .\n    command: ["node", "src/server.mjs", "cashier"]\n    profiles:\n      - acceptance\n    environment:\n      PORT: "3003"\n      HOST: "0.0.0.0"\n    volumes:\n      - shared-state:/app/.restaurant-state\n    ports:\n      - "127.0.0.1:\${FACTORY_CASHIER_PORT:-0}:3003"\n\nvolumes:\n  shared-state:\n`,
    },
  ];
  assertSafeGeneratedFileSet(files);
  return { rootDirectory, graphHash: plan.graphHash, files };
}

export function generateRestaurantProductApplicationBundle(
  input: PublishedApplicationGraphCompilationInput,
  _options: GenerateApplicationBundleOptions = {},
): GeneratedApplicationBundle {
  const first = renderFiles(input);
  const second = renderFiles(input);
  if (
    first.rootDirectory !== second.rootDirectory ||
    first.graphHash !== second.graphHash ||
    !sameGeneratedFileSet(first.files, second.files)
  )
    throw new Error("Restaurant product bundle rendering is nondeterministic.");
  return first;
}
