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
import { getCustomerIconAssets } from "./customer-icons.js";

export function renderRestaurantCustomerAppModule(): string {
  return `import { renderMobileProductShell, renderMenuHero, renderCategoryRail, renderMenuItemCard, renderDishConfigurator, renderCartLine, renderOrderSummary, renderPaymentState, renderActiveOrderList, renderOrderTimeline, renderCustomerProfileForm } from "../generated/customer-restaurant-ui.mjs";

const customerIcons = Object.freeze(${JSON.stringify(getCustomerIconAssets().icons)});
const navigationIcons = Object.freeze({ "/": "house", "/menu": "utensils-crossed", "/cart": "shopping-bag", "/orders": "receipt-text", "/profile": "user-round" });
const statusIcons = Object.freeze({ paid: "circle-check", accepted: "clock", preparing: "chef-hat", ready: "circle-check", served: "circle-check", cancelled: "circle-x" });

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
const renderNavigation = (pathname) => {
  const destination = pathname === "/checkout" ? "/cart" : pathname.startsWith("/menu/") ? "/menu" : pathname.startsWith("/orders/") ? "/orders" : pathname;
  return '<nav class="customer-tabs" aria-label="Customer">' + customerTabs.map(({ label, route }) => '<a href="' + route + '"' + (route === destination ? ' aria-current="page"' : '') + '>' + customerIcons[navigationIcons[route]] + '<span>' + label + '</span></a>').join('') + '</nav>';
};
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const statusLabels = Object.freeze({ paid: "Order confirmed", accepted: "Accepted", preparing: "Preparing", ready: "Ready", served: "Served", cancelled: "Cancelled" });
const formatStatus = (status) => typeof status === "string" && Object.hasOwn(statusLabels, status) ? statusLabels[status] : "Status unavailable";
const formatPaymentStatus = (status) => status === "simulated-paid" ? "Paid (simulated)" : "Payment unavailable";
const formatMoney = (amount, settings) => {
  if (typeof settings?.currency !== "string" || !/^[A-Z]{3}$/.test(settings.currency)) return "Currency unavailable";
  if (!Number.isSafeInteger(amount) || amount < 0) return "Amount unavailable";
  return settings.currency + " " + (amount / 100).toFixed(2);
};
const itemsSummary = (items) => {
  if (!Array.isArray(items) || items.length === 0) return '<p>No items</p>';
  return '<ul class="customer-order-items">' + items.map((line) =>
    '<li><span>' + escapeHtml(line?.name ?? "Item unavailable") + '</span><span class="customer-order-quantity">× ' + escapeHtml(Number.isInteger(line?.quantity) && line.quantity > 0 ? line.quantity : "Quantity unavailable") + '</span></li>'
  ).join("") + '</ul>';
};
const refreshLink = (route) => '<a class="customer-order-refresh" href="' + route + '" aria-label="Refresh status" title="Refresh status">' + customerIcons["refresh-cw"] + '</a>';
const renderOrderCard = (order, settings, showDetailLink = true) => {
  const href = "/orders/" + encodeURIComponent(String(order.id));
  const detailLink = showDetailLink ? '<a href="' + href + '"><span>Order detail</span>' + customerIcons["arrow-right"] + '</a>' : '<a href="/orders">' + customerIcons["arrow-left"] + '<span>All orders</span></a>';
  const statusIcon = typeof order.status === "string" && Object.hasOwn(statusIcons, order.status) ? statusIcons[order.status] : "circle-help";
  return '<section class="customer-order-card"><h2>Order ' + escapeHtml(order.id) + '</h2><dl class="customer-order-status"><dt>Fulfilment</dt><dd>' + customerIcons[statusIcon] + '<span>' + escapeHtml(formatStatus(order.status)) + '</span></dd></dl><div class="customer-order-receipt"><h3>Items</h3>' + itemsSummary(order.items) + '<dl class="customer-order-facts"><div><dt>Payment</dt><dd>' + escapeHtml(formatPaymentStatus(order.paymentStatus)) + '</dd></div><div><dt>Total</dt><dd>' + escapeHtml(formatMoney(order.total, settings)) + '</dd></div></dl><div class="customer-order-actions">' + detailLink + '</div></div></section>';
};
const orderHeader = (route) => '<header class="customer-orders-header"><div><h2>Your orders</h2><p>Refresh to see the latest progress from the kitchen.</p></div>' + refreshLink(route) + '</header>';
const renderOrderEmptyState = () => '<div class="customer-orders-empty">' + customerIcons["receipt-text"] + '<h2>No orders yet</h2><p>Your orders will appear here after checkout.</p><a href="/menu"><span>Browse menu</span>' + customerIcons["arrow-right"] + '</a></div>';
const renderCatalogCard = (value, settings) => {
  const display = { ...value, price: formatMoney(value.price, settings) };
  if (value.imageUrl === "#") {
    return '<article class="factory-block customer-provided-menu-card"><div class="customer-menu-placeholder" aria-hidden="true">' + customerIcons["utensils-crossed"] + '</div><div class="customer-provided-menu-copy"><h2>' + escapeHtml(value.name) + '</h2><p>' + escapeHtml(value.description) + '</p></div><div class="customer-provided-menu-purchase"><output aria-label="Price">' + escapeHtml(display.price) + '</output><a href="/menu/' + encodeURIComponent(value.id) + '">View dish</a></div></article>';
  }
  return renderMenuItemCard(display);
};
const renderCatalog = (state) => {
  const cards = state.catalog.map((value) => renderCatalogCard(value, state.settings)).join("");
  return state.catalog.length > 0 && state.catalog.every((value) => value.id.startsWith("menu-item-")) ? '<section class="customer-provided-menu" aria-label="Menu">' + cards + '</section>' : cards;
};
export function renderCustomerPage(pathname, state) {
  const route = matchCustomerRoute(pathname);
  if (!route) return null;
  const item = route === "/menu/:itemId" ? state.catalog.find((value) => value.id === pathname.slice(6)) : state.catalog[0];
  const requestedOrderId = pathname.slice(8);
  const safeRequestedOrderId = (() => {
    try {
      return decodeURIComponent(requestedOrderId);
    } catch {
      return requestedOrderId;
    }
  })();
  const restaurantName = typeof state.settings?.name === "string" && state.settings.name.trim() ? state.settings.name : "Restaurant";
  const order = route === "/orders/:orderId" ? (state.orders ?? []).find((value) => value.id === safeRequestedOrderId) : state.orders[0];
  let content = route === "/"
    ? renderMenuHero({ locationName: restaurantName, serviceOpen: true }) + renderCategoryRail({ categoryName: "Dinner", categoryActive: true }) + renderCatalog(state)
    : route === "/menu" ? renderCatalog(state)
    : route === "/menu/:itemId" ? renderDishConfigurator({ ...item, price: formatMoney(item?.price, state.settings), canAdd: Boolean(item) }).replace(item?.id?.startsWith("menu-item-") ? /<fieldset>[\\s\\S]*?<\\/fieldset>/ : /$^/, "")
    : route === "/cart" ? state.cart.items.map((value) => renderCartLine(value).replace('<form class="factory-block"', '<form class="factory-block" data-customer-action="cart.update" data-line-id="' + value.id + '" data-expected-version="' + state.cart.version + '"').replace('</form>', '<button type="button" data-customer-action="cart.delete" data-line-id="' + value.id + '" data-expected-version="' + state.cart.version + '">Remove</button></form>')).join("") + renderOrderSummary(state.cart)
    : route === "/checkout" ? renderOrderSummary(state.cart) + renderPaymentState({ amount: state.cart.total, method: "simulated-card", canPay: state.cart.items.length > 0 })
    : route === "/orders" ? orderHeader("/orders") + (Array.isArray(state.orders) && state.orders.length > 0 ? '<div class="customer-order-list">' + state.orders.map((value) => renderOrderCard(value, state.settings)).join("") + "</div>" : renderOrderEmptyState())
    : route === "/orders/:orderId" ? orderHeader("/orders/" + encodeURIComponent(safeRequestedOrderId)) + (order ? renderOrderCard(order, state.settings, false) : '<div class="customer-orders-empty"><h2>Order unavailable</h2><p>This order could not be found.</p><a href="/orders">All orders</a></div>')
    : renderCustomerProfileForm(state.profile);
  if (route === "/menu/:itemId") content = content.replace('<form class="factory-block"', '<form class="factory-block" data-customer-action="cart.add" data-item-id="' + (item?.id ?? "") + '" data-expected-version="' + state.cart.version + '"><input type="hidden" name="quantity" value="1" />');
  if (route === "/checkout") content = content.replace('<form class="factory-block"', '<form class="factory-block" data-customer-action="checkout.pay" data-expected-version="' + state.cart.version + '"');
  if (route === "/profile") content = content.replace('<form class="factory-block"', '<form class="factory-block" data-customer-action="profile.update" data-expected-version="' + state.profile.version + '"><input type="hidden" name="marketingOptIn" value="' + String(state.profile.marketingOptIn) + '" />');
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/customer/styles.css"><title>' + escapeHtml(restaurantName) + '</title></head><body>' + renderMobileProductShell({ title: restaurantName, content, navigation: renderNavigation(pathname) }) + '<script type="module">import { attachCustomerController } from "/customer/app.mjs"; attachCustomerController();</script></body></html>';
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

export function renderRestaurantCustomerStyles(): string {
  const { surface, text, accent, border } =
    selectRestaurantExperienceSource().tokens.light;
  return `:root{--surface:${surface};--text:${text};--accent:${accent};--border:${border};font-family:ui-sans-serif,system-ui,sans-serif;background:var(--surface);color:var(--text);line-height:1.5;color-scheme:light}
*,*::before,*::after{box-sizing:border-box}body{margin:0;min-height:100svh}button,input,select,textarea{font:inherit;color:inherit}button,a,input,select,textarea{-webkit-tap-highlight-color:transparent}img,video{max-width:100%;height:auto}a{color:inherit;text-underline-offset:4px}button{cursor:pointer}button:disabled{cursor:default;opacity:.6}::selection{background:var(--accent);color:var(--surface)}:focus-visible{outline:3px solid var(--accent);outline-offset:4px}
h1,h2,h3,p{overflow-wrap:anywhere}h1,h2{font-family:ui-serif,Georgia,serif;font-weight:400;text-wrap:balance}h1,h2,h3{line-height:1.15}input,textarea{caret-color:var(--accent)}
.mobile-shell{min-height:100svh;display:grid;grid-template-rows:auto 1fr;padding-bottom:calc(88px + env(safe-area-inset-bottom,0px))}
.mobile-shell>header{padding:24px max(24px,calc((100% - 1000px)/2));background:var(--text);color:var(--surface)}.mobile-shell>header h1{margin:0;font-size:1.75rem;letter-spacing:-.025em}
.mobile-shell>#content{width:100%;max-width:1048px;margin-inline:auto;padding:0 24px 40px;min-width:0}
.customer-tabs{position:fixed;z-index:2;bottom:0;left:0;right:0;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px;padding:12px 12px calc(12px + env(safe-area-inset-bottom,0px));background:var(--surface);border-top:1px solid var(--border)}
.customer-tabs a{display:flex;flex-direction:column;gap:4px;align-items:center;justify-content:center;min-width:44px;min-height:56px;padding:6px 4px;border-radius:8px;font-size:.8125rem;font-weight:600;text-decoration:none}.customer-tabs a[aria-current=page]{background:var(--text);color:var(--surface)}.customer-tabs a:hover:not([aria-current=page]){background:var(--border)}
.customer-orders-header{display:grid;grid-template-columns:minmax(0,1fr) 48px;align-items:start;gap:16px;padding:36px 0 28px}.customer-orders-header h2{margin:0;font-size:clamp(2.25rem,5vw,3.25rem);letter-spacing:-.03em}.customer-orders-header p{max-width:40ch;margin:12px 0 0;font-size:.875rem;line-height:1.6;color:var(--accent)}
.customer-order-list{display:grid;gap:24px}.customer-order-card{width:100%;border:1px solid var(--border);border-radius:16px;overflow-wrap:anywhere;overflow:hidden}
.customer-order-card>h2{margin:0;padding:24px 28px 0;font-family:inherit;font-size:.8125rem;font-weight:600;line-height:1.5;color:var(--accent)}
.customer-order-status{margin:0;padding:16px 28px 28px;border-bottom:1px solid var(--border)}.customer-order-status dt{font-size:.8125rem;margin-bottom:4px}.customer-order-status dd{display:flex;align-items:center;gap:12px;margin:0;font-family:ui-serif,Georgia,serif;font-size:clamp(2.25rem,5vw,3rem);line-height:1.15;letter-spacing:-.025em;color:var(--accent)}
.customer-order-receipt{padding:28px}.customer-order-receipt h3{margin:0 0 16px;font-size:.8125rem;font-weight:600;color:var(--accent)}
.customer-order-items{list-style:none;padding:0;margin:0 0 24px;display:grid;gap:16px}.customer-order-items li{display:flex;justify-content:space-between;gap:20px;line-height:1.5;font-weight:500}.customer-order-quantity{white-space:nowrap;font-variant-numeric:tabular-nums;font-weight:400;color:var(--accent)}
.customer-order-facts{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:20px;margin:0;padding:24px 0;border-top:1px solid var(--border)}.customer-order-facts dt{font-size:.75rem;color:var(--accent);margin-bottom:6px}.customer-order-facts dd{margin:0;font-size:.9375rem;font-weight:600;line-height:1.5;font-variant-numeric:tabular-nums}.customer-order-facts>div:last-child{text-align:right}
.customer-order-actions a,.customer-orders-empty a{display:flex;justify-content:center;align-items:center;gap:12px;min-height:48px;padding:12px 20px;background:var(--text);color:var(--surface);border-radius:8px;font-size:.875rem;font-weight:600;text-decoration:none}.customer-order-actions a:hover,.customer-orders-empty a:hover{background:var(--accent)}
.customer-order-refresh{display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;min-height:48px;padding:0;border:1px solid var(--border);border-radius:8px;font-size:.8125rem;font-weight:600;text-decoration:none}.customer-order-refresh:hover{border-color:var(--accent);background:var(--border)}
.customer-orders-empty{max-width:36rem;margin:24px auto;text-align:center;padding:48px 24px;border-block:1px solid var(--border)}.customer-orders-empty h2{font-size:2rem;margin:0 0 16px}.customer-orders-empty p{font-size:.9375rem;margin:0 0 28px}.customer-orders-empty a{max-width:16rem;margin-inline:auto}
.lucide{display:inline-block;flex-shrink:0;width:22px;height:22px;vertical-align:middle}.customer-order-status .lucide{width:36px;height:36px}.customer-orders-empty>.lucide{width:48px;height:48px;color:var(--accent);margin-bottom:24px}
.customer-provided-menu{display:grid;gap:12px;margin-block:24px}.customer-provided-menu-card{display:grid;grid-template-columns:48px minmax(0,1fr);gap:12px;padding:16px;border:1px solid var(--border);border-radius:12px}.customer-menu-placeholder{width:48px;height:48px;display:grid;place-items:center;background:var(--border);border-radius:10px}.customer-menu-placeholder .lucide{width:22px;height:22px}.customer-provided-menu-copy h2{margin:0;font-size:1.25rem}.customer-provided-menu-copy p{margin:6px 0 0;color:var(--accent);font-size:.875rem}.customer-provided-menu-purchase{grid-column:2;display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:4px;flex-wrap:wrap}.customer-provided-menu-purchase output{white-space:nowrap;font-variant-numeric:tabular-nums;font-weight:600}.customer-provided-menu-purchase a{display:inline-flex;align-items:center;justify-content:center;min-width:96px;min-height:44px;padding:8px 12px;border:1px solid var(--text);border-radius:8px;font-size:.875rem;font-weight:600;text-decoration:none}.customer-provided-menu-purchase a:hover{background:var(--text);color:var(--surface)}
@media(min-width:1024px){.customer-provided-menu{grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.customer-provided-menu-card{padding:20px}.customer-provided-menu-purchase{grid-column:1/-1;border-top:1px solid var(--border);padding-top:12px}}
@media(max-width:767px){.customer-orders-header{gap:16px}.customer-order-refresh{align-self:flex-start}.customer-order-card>h2{padding:20px 20px 0}.customer-order-status{padding:12px 20px 24px}.customer-order-receipt{padding:24px 20px}}
@media(max-width:359px){.mobile-shell>#content{padding-inline:16px}.mobile-shell>header{padding-inline:16px}.customer-order-facts{grid-template-columns:minmax(0,1fr);gap:16px}.customer-order-facts>div:last-child{text-align:left}}
@media(min-width:768px){.mobile-shell{padding-bottom:0;grid-template-rows:auto auto 1fr}.customer-tabs{position:static;grid-row:2;padding:12px max(24px,calc((100% - 1000px)/2));border-top:0;border-bottom:1px solid var(--border)}.customer-tabs a{flex-direction:row;gap:10px;font-size:.875rem}.mobile-shell>#content{grid-row:3}.customer-order-list{max-width:760px;margin-inline:auto}.customer-order-card{max-width:760px;margin-inline:auto}.customer-order-actions a{max-width:240px;margin-left:auto}}
`;
}

export function renderRestaurantCustomerJourneyTest(
  plan: RestaurantProductPlanV1,
): string {
  const menuItems = plan.domain.seedData!.filter(
    ({ entity }) => entity === "menu-item",
  );
  const primary = menuItems[0]!;
  const secondary = menuItems[1] ?? primary;
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
  const customerStyles = renderRestaurantCustomerStyles();
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
    { path: "THIRD_PARTY_NOTICES.md", content: getCustomerIconAssets().notice },
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
