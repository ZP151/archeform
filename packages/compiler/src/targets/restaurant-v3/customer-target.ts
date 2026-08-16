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
import { planRestaurantProduct, type RestaurantProductPlanV1 } from "./plan.js";
import { renderRestaurantCustomerRuntime } from "./runtime-api.js";
import {
  selectRestaurantExperienceSource,
  selectRestaurantSurfaceSource,
} from "./source-registry.js";
import { projectRestaurantSurface } from "./surface-projection.js";

export function renderRestaurantCustomerAppModule(): string {
  return `import { renderMobileProductShell, renderMenuHero, renderCategoryRail, renderMenuItemCard, renderDishConfigurator, renderCartLine, renderOrderSummary, renderPaymentState, renderActiveOrderList, renderOrderTimeline, renderCustomerProfileForm } from "../generated/customer-restaurant-ui.mjs";

export const customerRoutes = Object.freeze(["/", "/menu", "/menu/:itemId", "/cart", "/checkout", "/orders", "/orders/:orderId", "/profile"]);
export const customerTabs = Object.freeze([
  { label: "Home", route: "/" },
  { label: "Menu", route: "/menu" },
  { label: "Cart", route: "/cart" },
  { label: "Orders", route: "/orders" },
  { label: "Profile", route: "/profile" }
]);
export const declaredCustomerApis = Object.freeze(["/api/catalog", "/api/cart", "/api/checkout", "/api/orders", "/api/profile"]);
export const declaredCustomerActionPorts = Object.freeze({
  "customer-dish-detail/dish-configurator/canAdd": "cart.add",
  "customer-cart/cart-lines/quantity": "cart.update",
  "customer-cart/cart-lines/delete": "cart.delete",
  "customer-checkout/checkout-payment/pay": "checkout.pay",
  "customer-profile/customer-profile-form/displayName": "profile.update"
});
export function matchCustomerRoute(pathname) {
  if (customerRoutes.includes(pathname)) return pathname;
  if (/^\\/menu\\/[^/]+$/.test(pathname)) return "/menu/:itemId";
  if (/^\\/orders\\/[^/]+$/.test(pathname)) return "/orders/:orderId";
  return null;
}
export async function loadCustomerData(pathname) {
  const route = matchCustomerRoute(pathname);
  if (route === "/" || route === "/menu") return fetch("/api/catalog").then((value) => value.json());
  if (route === "/menu/:itemId") return fetch("/api/catalog/" + encodeURIComponent(pathname.slice(6))).then((value) => value.json());
  if (route === "/cart" || route === "/checkout") return fetch("/api/cart").then((value) => value.json());
  if (route === "/orders") return fetch("/api/orders").then((value) => value.json());
  if (route === "/orders/:orderId") return fetch("/api/orders/" + encodeURIComponent(pathname.slice(8))).then((value) => value.json());
  return fetch("/api/profile").then((value) => value.json());
}
const mutate = async (path, method, payload, idempotencyKey, expectedVersion) => {
  const response = await fetch(path, { method, headers: { "content-type": "application/json", "idempotency-key": idempotencyKey, ...(expectedVersion === undefined ? {} : { "x-expected-version": String(expectedVersion) }) }, body: payload === undefined ? undefined : JSON.stringify(payload) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Customer action failed.");
  return result;
};
export async function invokeCustomerAction(action, input) {
  if (!Object.values(declaredCustomerActionPorts).includes(action)) throw new Error("Unknown customer action.");
  const key = String(input.idempotencyKey ?? "");
  if (action === "cart.add") return mutate("/api/cart/items", "POST", { itemId: input.itemId, quantity: input.quantity, expectedVersion: input.expectedVersion }, key);
  if (action === "cart.update") return mutate("/api/cart/items/" + encodeURIComponent(input.lineId), "PATCH", { quantity: input.quantity, expectedVersion: input.expectedVersion }, key);
  if (action === "cart.delete") return mutate("/api/cart/items/" + encodeURIComponent(input.lineId), "DELETE", undefined, key, input.expectedVersion);
  if (action === "checkout.pay") return mutate("/api/checkout", "POST", { expectedVersion: input.expectedVersion, method: "simulated-card" }, key);
  return mutate("/api/profile", "PUT", { displayName: input.displayName, locale: input.locale, marketingOptIn: input.marketingOptIn, expectedVersion: input.expectedVersion }, key);
}
export function normalizeCustomerFormAction(values, data) {
  return {
    ...values,
    quantity: Number(values.quantity ?? data.quantity ?? 1),
    expectedVersion: Number(data.expectedVersion),
    idempotencyKey: data.idempotencyKey,
    itemId: data.itemId,
    lineId: data.lineId,
    marketingOptIn: values.marketingOptIn === true || values.marketingOptIn === "true" || values.marketingOptIn === "on"
  };
}
export const customerRenderers = Object.freeze({ renderMobileProductShell, renderMenuHero, renderCategoryRail, renderMenuItemCard, renderDishConfigurator, renderCartLine, renderOrderSummary, renderPaymentState, renderActiveOrderList, renderOrderTimeline, renderCustomerProfileForm });
const navigation = '<nav class="customer-tabs" aria-label="Customer"><a href="/">Home</a><a href="/menu">Menu</a><a href="/cart">Cart</a><a href="/orders">Orders</a><a href="/profile">Profile</a></nav>';
export function renderCustomerPage(pathname, state) {
  const route = matchCustomerRoute(pathname);
  if (!route) return null;
  const item = route === "/menu/:itemId" ? state.catalog.find((value) => value.id === pathname.slice(6)) : state.catalog[0];
  const order = route === "/orders/:orderId" ? state.orders.find((value) => value.id === pathname.slice(8)) : state.orders[0];
  let content = route === "/"
    ? renderMenuHero({ locationName: "Maison Aurelia", serviceOpen: true }) + renderCategoryRail({ categoryName: "Dinner", categoryActive: true }) + state.catalog.map((value) => renderMenuItemCard(value)).join("")
    : route === "/menu" ? state.catalog.map((value) => renderMenuItemCard(value)).join("")
    : route === "/menu/:itemId" ? renderDishConfigurator({ ...item, canAdd: Boolean(item) })
    : route === "/cart" ? state.cart.items.map((value) => renderCartLine(value).replace('<form class="factory-block"', '<form class="factory-block" data-customer-action="cart.update" data-line-id="' + value.id + '" data-expected-version="' + state.cart.version + '"').replace('</form>', '<button type="button" data-customer-action="cart.delete" data-line-id="' + value.id + '" data-expected-version="' + state.cart.version + '">Remove</button></form>')).join("") + renderOrderSummary(state.cart)
    : route === "/checkout" ? renderOrderSummary(state.cart) + renderPaymentState({ amount: state.cart.total, method: "simulated-card", canPay: state.cart.items.length > 0 })
    : route === "/orders" ? state.orders.map((value) => renderActiveOrderList(value)).join("")
    : route === "/orders/:orderId" ? renderOrderSummary(order ?? {}) + renderPaymentState({ amount: order?.total, paymentStatus: order?.paymentStatus }) + renderOrderTimeline(order ?? {})
    : renderCustomerProfileForm(state.profile);
  if (route === "/menu/:itemId") content = content.replace('<form class="factory-block"', '<form class="factory-block" data-customer-action="cart.add" data-item-id="' + (item?.id ?? "") + '" data-expected-version="' + state.cart.version + '"><input type="hidden" name="quantity" value="1" />');
  if (route === "/checkout") content = content.replace('<form class="factory-block"', '<form class="factory-block" data-customer-action="checkout.pay" data-expected-version="' + state.cart.version + '"');
  if (route === "/profile") content = content.replace('<form class="factory-block"', '<form class="factory-block" data-customer-action="profile.update" data-expected-version="' + state.profile.version + '"><input type="hidden" name="marketingOptIn" value="' + String(state.profile.marketingOptIn) + '" />');
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/customer/styles.css"><title>Maison Aurelia</title></head><body>' + renderMobileProductShell({ title: "Maison Aurelia", content, navigation }) + '<script type="module">import { attachCustomerController } from "/customer/app.mjs"; attachCustomerController();</script></body></html>';
}
export function attachCustomerController(root = document) {
  root.addEventListener("submit", async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const action = form.dataset.customerAction;
    if (!action) return;
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    await invokeCustomerAction(action, normalizeCustomerFormAction(values, { ...form.dataset, idempotencyKey: crypto.randomUUID() }));
    location.reload();
  });
  root.addEventListener("click", async (event) => {
    const button = event.target;
    if (!(button instanceof HTMLButtonElement) || button.dataset.customerAction !== "cart.delete") return;
    await invokeCustomerAction("cart.delete", { lineId: button.dataset.lineId, expectedVersion: Number(button.dataset.expectedVersion), idempotencyKey: crypto.randomUUID() });
    location.reload();
  });
}
`;
}

export function renderRestaurantCustomerJourneyTest(
  plan: RestaurantProductPlanV1,
): string {
  const menuItems = plan.domain.seedData!.filter(
    ({ entity }) => entity === "menu-item",
  );
  const primary = menuItems[0]!;
  const secondary = menuItems[1]!;
  return `import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { startRestaurantServer } from "../src/server.mjs";

async function fixture(principalRole = "customer") {
  const root = await mkdtemp(join(tmpdir(), "restaurant-customer-generated-"));
  const statePath = join(root, "state.json");
  const server = await startRestaurantServer({ statePath, port: 0, host: "127.0.0.1", principalRole });
  return { root, statePath, server, base: "http://127.0.0.1:" + server.port };
}
const request = async (base, path, options = {}) => { const response = await fetch(base + path, options); return { response, body: await response.json() }; };

test("customer journey derives totals, pays, persists audit, and cleans up", async () => {
  const app = await fixture();
  try {
    const headers = { "content-type": "application/json", "x-role": "customer", "idempotency-key": "generated-add" };
    const catalog = (await request(app.base, "/api/catalog")).body.items;
    const item = catalog.find((candidate) => candidate.id === ${JSON.stringify(primary.id)});
    assert.equal(item.name, ${JSON.stringify(primary.values.name)});
    const added = await request(app.base, "/api/cart/items", { method: "POST", headers, body: JSON.stringify({ itemId: ${JSON.stringify(primary.id)}, quantity: 2, expectedVersion: 1, total: 1 }) });
    assert.equal(added.body.cart.total, item.price * 2);
    const paid = await request(app.base, "/api/checkout", { method: "POST", headers: { ...headers, "idempotency-key": "generated-checkout" }, body: JSON.stringify({ expectedVersion: 2, method: "simulated-card", status: "failed" }) });
    assert.deepEqual({ total: paid.body.order.total, status: paid.body.order.status }, { total: item.price * 2, status: "paid" });
    const persisted = JSON.parse(await readFile(app.statePath, "utf8"));
    assert.equal(persisted.audit.length, 2);
    for (const route of ["/", "/menu", "/menu/" + ${JSON.stringify(primary.id)}, "/cart", "/checkout", "/orders", "/orders/order-0001", "/profile"]) {
      const page = await fetch(app.base + route);
      assert.equal(page.status, 200);
      assert.match(await page.text(), /<main class="factory-screen mobile-shell"/);
    }
  } finally { await app.server.close(); await rm(app.root, { recursive: true, force: true }); }
});

test("customer boundary denies manager and preserves idempotent replay", async () => {
  const deniedApp = await fixture("manager");
  try {
    const payload = JSON.stringify({ itemId: ${JSON.stringify(secondary.id)}, quantity: 1, expectedVersion: 1 });
    const denied = await request(deniedApp.base, "/api/cart/items", { method: "POST", headers: { "content-type": "application/json", "x-role": "customer", "idempotency-key": "denied" }, body: payload });
    assert.equal(denied.response.status, 403);
  } finally { await deniedApp.server.close(); await rm(deniedApp.root, { recursive: true, force: true }); }
  const app = await fixture("customer");
  try {
    const payload = JSON.stringify({ itemId: ${JSON.stringify(secondary.id)}, quantity: 1, expectedVersion: 1 });
    const headers = { "content-type": "application/json", "x-role": "customer", "idempotency-key": "replay" };
    const first = await request(app.base, "/api/cart/items", { method: "POST", headers, body: payload });
    const replay = await request(app.base, "/api/cart/items", { method: "POST", headers, body: payload });
    assert.deepEqual(replay.body, first.body);
  } finally { await app.server.close(); await rm(app.root, { recursive: true, force: true }); }
});
`;
}

function renderFiles(input: PublishedApplicationGraphCompilationInput): {
  rootDirectory: string;
  graphHash: string;
  files: GeneratedFile[];
} {
  const captured = assertRestaurantProductCompilationInput(input);
  const plan = planRestaurantProduct(captured);
  const surface = projectRestaurantSurface(plan, "customer-mobile");
  const ui = selectRestaurantSurfaceSource("customer-mobile");
  const experience = selectRestaurantExperienceSource();
  const runtime = renderRestaurantCustomerRuntime(plan);
  const rootDirectory = `restaurant-product-${plan.publishedRevisionId}`;
  const customerStyles = `:root{font-family:ui-serif,Georgia,serif;background:var(--surface,#fffaf2);color:var(--text,#20170f)}\n.customer-tabs{position:sticky;bottom:0;display:grid;grid-template-columns:repeat(5,1fr)}\n`;
  const relocatedServer = runtime.serverModule
    .replace('"./state.mjs"', '"./runtime/state.mjs"')
    .replace('"./api.mjs"', '"./runtime/api.mjs"')
    .replace('"./seed.mjs"', '"./runtime/seed.mjs"')
    .replace(
      'import { restaurantSeed } from "./runtime/seed.mjs";',
      'import { restaurantSeed } from "./runtime/seed.mjs";\nimport { readFile } from "node:fs/promises";\nimport { matchCustomerRoute, renderCustomerPage } from "./customer/app.mjs";',
    )
    .replace(
      'const server = createServer(createRestaurantApiHandler(store, options.principalRole ?? "customer"));',
      `const apiHandler = createRestaurantApiHandler(store, options.principalRole ?? "customer");
  const server = createServer(async (request, response) => {
    const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
    if (request.method === "GET" && pathname === "/customer/styles.css") { response.writeHead(200, { "content-type": "text/css; charset=utf-8" }); response.end(${JSON.stringify(customerStyles)}); return; }
    if (request.method === "GET" && pathname === "/customer/app.mjs") { response.writeHead(200, { "content-type": "text/javascript; charset=utf-8" }); response.end(await readFile(new URL("./customer/app.mjs", import.meta.url), "utf8")); return; }
    if (request.method === "GET" && pathname === "/generated/customer-restaurant-ui.mjs") { response.writeHead(200, { "content-type": "text/javascript; charset=utf-8" }); response.end(await readFile(new URL("./generated/customer-restaurant-ui.mjs", import.meta.url), "utf8")); return; }
    if (request.method === "GET" && matchCustomerRoute(pathname)) { const html = renderCustomerPage(pathname, await store.read()); response.writeHead(200, { "content-type": "text/html; charset=utf-8" }); response.end(html); return; }
    return apiHandler(request, response);
  });`,
    );
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
              start: "node src/server.mjs",
              test: "node --test test/customer-journey.test.mjs",
            },
          },
          null,
          2,
        ) + "\n",
    },
    {
      path: "README.md",
      content: `# ${plan.application.name}\n\nDependency-free local Restaurant customer application compiled from Published revision \`${plan.publishedRevisionId}\`. The loopback server uses a versioned file-backed state store, atomic replacement, and simulated payment only.\n\nRun \`node src/server.mjs\` or \`node --test test/customer-journey.test.mjs\`.\n`,
    },
    {
      path: "graph/manifest.json",
      content:
        JSON.stringify(
          {
            apiVersion: "factory.restaurant-customer-bundle/v1",
            graphHash: plan.graphHash,
            publishedRevisionId: plan.publishedRevisionId,
            pages: surface.pages.map(({ id, route, recipe, blocks }) => ({
              id,
              route,
              recipeKey: recipe.key,
              blocks: blocks.map(({ id, type }) => ({ id, type })),
            })),
            source: {
              customer: {
                module: ui.module,
                digest: ui.digest,
                origins: ui.origins,
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
      content: `export const customerPermissions = Object.freeze(["catalog:read", "cart:write", "order:submit", "order:pay", "profile:update"]);\nexport const mayCustomer = (permission) => customerPermissions.includes(permission);\n`,
    },
    { path: "src/runtime/api.mjs", content: runtime.apiModule },
    { path: "src/runtime/seed.mjs", content: runtime.seedModule },
    { path: "src/generated/customer-restaurant-ui.mjs", content: ui.code },
    { path: "src/generated/fine-dining.mjs", content: experience.code },
    {
      path: "src/customer/app.mjs",
      content: renderRestaurantCustomerAppModule(),
    },
    { path: "src/customer/styles.css", content: customerStyles },
    {
      path: "test/customer-journey.test.mjs",
      content: renderRestaurantCustomerJourneyTest(plan),
    },
  ];
  assertSafeGeneratedFileSet(files);
  return { rootDirectory, graphHash: plan.graphHash, files };
}

export function generateRestaurantCustomerApplicationBundle(
  input: PublishedApplicationGraphCompilationInput,
  _options: GenerateApplicationBundleOptions = {},
): GeneratedApplicationBundle {
  const first = renderFiles(input);
  const second = renderFiles(input);
  if (
    first.rootDirectory !== second.rootDirectory ||
    first.graphHash !== second.graphHash ||
    !sameGeneratedFileSet(first.files, second.files)
  ) {
    throw new Error(
      "Restaurant customer bundle rendering is nondeterministic.",
    );
  }
  return first;
}
