import {
  assertSafeGeneratedFileSet,
  type GeneratedFile,
} from "../../core/generated-files.js";
import type { RestaurantProductPlanV1 } from "./plan.js";
import { selectRestaurantSurfaceSource } from "./source-registry.js";
import {
  projectRestaurantSurface,
  type RestaurantSurfacePlanV1,
} from "./surface-projection.js";

export type RestaurantSurfaceBundleContributionV1 = {
  readonly surface: RestaurantSurfacePlanV1;
  readonly files: readonly GeneratedFile[];
};

function merchantAppModule(): string {
  return `import { renderMerchantWorkspaceShell, renderMetricCard, renderActiveOrderList, renderTableMap, renderMenuManagementTable, renderAvailabilityToggle, renderOrderSummary, renderPaymentState, renderKitchenTicket, renderRoleMatrix, renderRestaurantSettingsForm } from "../generated/merchant-restaurant-ui.mjs";

export const merchantRoutes = Object.freeze(["/merchant", "/merchant/menu", "/merchant/orders", "/merchant/kitchen", "/merchant/tables", "/merchant/users", "/merchant/settings"]);
export const merchantSidebar = Object.freeze([
  { label: "Dashboard", route: "/merchant" }, { label: "Menu Management", route: "/merchant/menu" }, { label: "Orders", route: "/merchant/orders" }, { label: "Kitchen Queue", route: "/merchant/kitchen" }, { label: "Tables", route: "/merchant/tables" }, { label: "Users/Roles", route: "/merchant/users" }, { label: "Settings", route: "/merchant/settings" }
]);
export const declaredMerchantApis = Object.freeze(["/api/merchant/dashboard", "/api/merchant/catalog", "/api/merchant/orders", "/api/merchant/kitchen", "/api/merchant/tables", "/api/merchant/principals", "/api/merchant/settings"]);
export const declaredMerchantActionPorts = Object.freeze({
  "catalog.update": "restaurant-inventory-ledger:recorded:record-manager-adjustment:recorded",
  "order.cancel-submitted": "restaurant-order:submitted:cancel:cancelled",
  "order.cancel-paid": "restaurant-order:paid:cancel:cancelled",
  "order.set-priority": "order.priority",
  "order.pay": "restaurant-order:submitted:pay:paid",
  "kitchen.accept": "restaurant-order:paid:accept:accepted",
  "kitchen.start-preparing": "restaurant-order:accepted:start-preparing:preparing",
  "kitchen.mark-ready": "restaurant-order:preparing:mark-ready:ready",
  "table.activate": "restaurant-table-session:open:activate:active",
  "table.close": "restaurant-table-session:active:close:closed",
  "table.expire-open": "restaurant-table-session:open:expire:closed",
  "table.expire-active": "restaurant-table-session:active:expire:closed",
  "settings.update": "manager:restaurant-location:update"
});
export const matchMerchantRoute = (pathname) => merchantRoutes.includes(pathname) ? pathname : null;
export async function loadMerchantData(pathname) {
  const route = matchMerchantRoute(pathname); if (!route) throw new Error("Unknown merchant route.");
  const index = merchantRoutes.indexOf(route); return fetch(declaredMerchantApis[index]).then((value) => value.json());
}
const mutate = async (path, method, payload, idempotencyKey) => {
  const response = await fetch(path, { method, headers: { "content-type": "application/json", "idempotency-key": String(idempotencyKey ?? "") }, body: JSON.stringify(payload) });
  const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Merchant action failed."); return result;
};
export async function invokeMerchantAction(action, input) {
  if (!Object.hasOwn(declaredMerchantActionPorts, action)) throw new Error("Unknown merchant action.");
  const expectedVersion = Number(input.expectedVersion); const key = input.idempotencyKey;
  if (action === "catalog.update") {
    const allowed = ["name", "description", "price", "available", "stock", "preparationMinutes"];
    const numeric = new Set(["price", "stock", "preparationMinutes"]); const payload = { expectedVersion }; for (const field of allowed) if (Object.hasOwn(input, field)) payload[field] = numeric.has(field) ? Number(input[field]) : field === "available" ? input[field] === true || input[field] === "true" || input[field] === "on" : input[field];
    return mutate("/api/merchant/catalog/" + encodeURIComponent(input.itemId), "PATCH", payload, key);
  }
  if (action.startsWith("kitchen.")) return mutate("/api/merchant/kitchen/" + encodeURIComponent(input.orderId) + "/actions", "POST", { action: action.slice(8), expectedVersion }, key);
  if (action.startsWith("order.")) return mutate("/api/merchant/orders/" + encodeURIComponent(input.orderId) + "/actions", "POST", { action: action === "order.pay" ? "pay" : action === "order.set-priority" ? "set-priority" : "cancel", expectedVersion, ...(action === "order.set-priority" ? { priority: input.priority } : {}) }, key);
  if (action.startsWith("table.")) return mutate("/api/merchant/tables/" + encodeURIComponent(input.tableId) + "/actions", "POST", { action: action === "table.activate" ? "activate" : action === "table.close" ? "close" : "expire", expectedVersion }, key);
  const payload = { expectedVersion, name: input.name, currency: input.currency, taxRate: Number(input.taxRate), serviceChargeRate: Number(input.serviceChargeRate), timezone: input.timezone, logoUrl: input.logoUrl, serviceOpen: input.serviceOpen === true || input.serviceOpen === "true" || input.serviceOpen === "on" };
  return mutate("/api/merchant/settings", "PUT", payload, key);
}
const action = (html, name, record) => { const port = declaredMerchantActionPorts[name]; const marker = 'data-transition="' + port + '"'; return html.replace(marker, 'data-merchant-action="' + name + '" data-record-id="' + record.id + '" data-expected-version="' + record.version + '" ' + marker); };
const navigation = '<nav class="merchant-sidebar" aria-label="Merchant">' + merchantSidebar.map((item) => '<a href="' + item.route + '">' + item.label + '</a>').join("") + '</nav>';
export function renderMerchantPage(pathname, state, principalRole = "manager") {
  const route = matchMerchantRoute(pathname); if (!route) return null; const manager = principalRole === "manager"; const kitchen = principalRole === "kitchen"; const cashier = principalRole === "cashier";
  const catalog = state.catalog ?? state.items ?? []; const orders = state.orders ?? []; const tables = state.tables ?? []; const principals = state.principals ?? []; const settings = state.settings ?? state;
  let content = "";
  if (route === "/merchant") content = renderMetricCard({ orderTotal: state.dashboard?.orderCount ?? orders.length, orderStatus: state.dashboard?.openOrderCount ?? "", tableStatus: state.dashboard?.activeTableCount ?? "", menuAvailable: state.dashboard?.availableItemCount ?? "" }) + orders.map((order) => renderActiveOrderList(order)).join("") + tables.map((table) => renderTableMap({ ...table, canActivate: false, canClose: false, canExpire: false })).join("");
  else if (route === "/merchant/menu") content = catalog.map((item) => { const availability = renderAvailabilityToggle({ available: item.available, adjustInventory: declaredMerchantActionPorts["catalog.update"], canAdjustInventory: manager }).replace('<button type="button"', '<button type="submit"'); return '<form data-merchant-action="catalog.update" data-port="' + declaredMerchantActionPorts["catalog.update"] + '" data-record-id="' + item.id + '" data-expected-version="' + item.version + '"><input type="hidden" name="available" value="false">' + renderMenuManagementTable(item) + '<label>Stock<input name="stock" type="number" min="0" value="' + item.stock + '"></label>' + availability + '<button type="submit">Save menu item</button></form>'; }).join("");
  else if (route === "/merchant/orders") content = orders.map((order) => { let html = renderActiveOrderList(order) + (manager ? '<form data-merchant-action="order.set-priority" data-port="' + declaredMerchantActionPorts["order.set-priority"] + '" data-record-id="' + order.id + '" data-expected-version="' + order.version + '"><label>Priority<select name="priority"><option>low</option><option selected>' + order.priority + '</option><option>high</option></select></label><button type="submit">Set priority</button></form>' : "") + renderOrderSummary({ ...order, cancelSubmitted: declaredMerchantActionPorts["order.cancel-submitted"], cancelPaid: declaredMerchantActionPorts["order.cancel-paid"], canCancel: manager }) + renderPaymentState({ amount: order.total, paymentStatus: order.paymentStatus, pay: declaredMerchantActionPorts["order.pay"], canPay: cashier && order.status === "submitted" }); html = action(html, order.status === "submitted" ? "order.cancel-submitted" : "order.cancel-paid", order); return action(html, "order.pay", order); }).join("");
  else if (route === "/merchant/kitchen") content = orders.map((order) => { let html = renderKitchenTicket({ ticketStatus: order.kitchenStatus, priority: order.priority, acceptedAt: order.acceptedAt, startedAt: order.startedAt, readyAt: order.readyAt, accept: declaredMerchantActionPorts["kitchen.accept"], startPreparing: declaredMerchantActionPorts["kitchen.start-preparing"], markReady: declaredMerchantActionPorts["kitchen.mark-ready"], canAccept: kitchen && order.status === "paid", canStartPreparing: kitchen && order.status === "accepted", canMarkReady: kitchen && order.status === "preparing" }); for (const name of ["kitchen.accept", "kitchen.start-preparing", "kitchen.mark-ready"]) html = action(html, name, order); return html; }).join("");
  else if (route === "/merchant/tables") content = tables.map((table) => { let html = renderTableMap({ ...table, activate: declaredMerchantActionPorts["table.activate"], close: declaredMerchantActionPorts["table.close"], expireOpen: declaredMerchantActionPorts["table.expire-open"], expireActive: declaredMerchantActionPorts["table.expire-active"], canActivate: manager && table.status === "open", canClose: manager && table.status === "active", canExpire: manager && (table.status === "open" || table.status === "active") }); for (const name of ["table.activate", "table.close", "table.expire-open", "table.expire-active"]) html = action(html, name, table); return html; }).join("");
  else if (route === "/merchant/users") content = principals.map((principal) => renderRoleMatrix({ ...principal, canManage: false }).replace('<button type="button" data-policy="false" disabled>Manage role</button>', "Read only")).join("");
  else content = renderRestaurantSettingsForm({ ...settings, canConfigure: manager }).replace('<form class="factory-block"', '<form class="factory-block" data-merchant-action="settings.update" data-port="' + declaredMerchantActionPorts["settings.update"] + '" data-expected-version="' + settings.version + '"><input type="hidden" name="serviceOpen" value="false"><label>Service open<input name="serviceOpen" type="checkbox" ' + (settings.serviceOpen ? "checked" : "") + '></label>');
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/merchant/styles.css"><title>Restaurant merchant</title></head><body>' + renderMerchantWorkspaceShell({ content, navigation }) + '<script type="module">import { attachMerchantController } from "/merchant/app.mjs"; attachMerchantController();</script></body></html>';
}
export function attachMerchantController(root = document) {
  root.addEventListener("submit", async (event) => { const form = event.target; if (!(form instanceof HTMLFormElement) || !form.dataset.merchantAction) return; event.preventDefault(); const values = Object.fromEntries(new FormData(form)); await invokeMerchantAction(form.dataset.merchantAction, { ...values, itemId: form.dataset.recordId, orderId: form.dataset.recordId, tableId: form.dataset.recordId, expectedVersion: form.dataset.expectedVersion, idempotencyKey: crypto.randomUUID() }); location.reload(); });
  root.addEventListener("click", async (event) => { const button = event.target; if (!(button instanceof HTMLButtonElement) || !button.dataset.merchantAction || button.disabled) return; await invokeMerchantAction(button.dataset.merchantAction, { itemId: button.dataset.recordId, orderId: button.dataset.recordId, tableId: button.dataset.recordId, expectedVersion: button.dataset.expectedVersion, available: button.getAttribute("aria-checked") !== "true", idempotencyKey: crypto.randomUUID() }); location.reload(); });
}
`;
}

function merchantJourneyTest(): string {
  return `import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { startRestaurantServer } from "../src/server.mjs";
const request = async (base, path, options = {}) => { const response = await fetch(base + path, options); return { response, body: await response.json() }; };
test("merchant sees and progresses shared customer state", async () => {
  const root = await mkdtemp(join(tmpdir(), "restaurant-merchant-generated-")); const statePath = join(root, "state.json");
  try {
    let server = await startRestaurantServer({ statePath, principalRole: "customer" }); let base = "http://127.0.0.1:" + server.port;
    const headers = { "content-type": "application/json", "idempotency-key": "generated" };
    await request(base, "/api/cart/items", { method: "POST", headers, body: JSON.stringify({ itemId: "dish-truffle-risotto", quantity: 1, expectedVersion: 1 }) });
    await request(base, "/api/checkout", { method: "POST", headers: { ...headers, "idempotency-key": "checkout" }, body: JSON.stringify({ expectedVersion: 2, method: "simulated-card" }) }); await server.close();
    server = await startRestaurantServer({ statePath, principalRole: "manager" }); base = "http://127.0.0.1:" + server.port; assert.equal((await request(base, "/api/merchant/orders")).body.orders.length, 1); await server.close();
    server = await startRestaurantServer({ statePath, principalRole: "kitchen" }); base = "http://127.0.0.1:" + server.port;
    const accepted = await request(base, "/api/merchant/kitchen/order-0001/actions", { method: "POST", headers: { ...headers, "idempotency-key": "accept" }, body: JSON.stringify({ action: "accept", expectedVersion: 1 }) }); assert.equal(accepted.body.order.status, "accepted"); await server.close();
  } finally { await rm(root, { recursive: true, force: true }); }
});
`;
}

export function renderRestaurantMerchantContribution(
  plan: RestaurantProductPlanV1,
): RestaurantSurfaceBundleContributionV1 {
  const surface = projectRestaurantSurface(plan, "merchant-desktop");
  const source = selectRestaurantSurfaceSource("merchant-desktop");
  const files: GeneratedFile[] = [
    { path: source.module, content: source.code },
    { path: "src/merchant/app.mjs", content: merchantAppModule() },
    {
      path: "src/merchant/styles.css",
      content:
        ":root{font-family:Inter,ui-sans-serif,sans-serif;background:#f5f3ee;color:#211f1a}.merchant-shell{display:grid;grid-template-columns:16rem minmax(0,1fr);min-height:100vh}.merchant-sidebar{display:flex;flex-direction:column;gap:.5rem;padding:1.5rem;background:#211f1a}.merchant-sidebar a{color:#fff;text-decoration:none;padding:.75rem}#content{padding:2rem;display:grid;gap:1rem}.factory-block{background:#fff;padding:1rem;border:1px solid #d8d3c8}@media(max-width:760px){.merchant-shell{grid-template-columns:1fr}.merchant-sidebar{position:static}}\n",
    },
    { path: "test/merchant-journey.test.mjs", content: merchantJourneyTest() },
  ];
  assertSafeGeneratedFileSet(files);
  return Object.freeze({ surface, files: Object.freeze(files) });
}
