import { isDeepStrictEqual } from "node:util";

import type { RestaurantProductPlanV1 } from "./plan.js";
import { renderRestaurantRuntimeStateModule } from "./runtime-state.js";

export type RestaurantRuntimeSourceV1 = {
  readonly stateModule: string;
  readonly apiModule: string;
  readonly seedModule: string;
  readonly serverModule: string;
};

type RestaurantRuntimeCatalogItemV1 = {
  readonly id: string;
  readonly version: 1;
  readonly categoryKey: string;
  readonly name: string;
  readonly description: string;
  readonly price: number;
  readonly available: boolean;
  readonly stock: number;
  readonly preparationMinutes: number;
  readonly imageUrl: string;
};

const invalidInputMessage = "Restaurant product compilation input is invalid.";

function failInvalid(): never {
  throw new Error(invalidInputMessage);
}

function assertGraphKey(value: unknown): asserts value is string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > 128 ||
    !/^[a-z][a-zA-Z0-9-]*$/.test(value)
  ) {
    failInvalid();
  }
}

function assertBoundedString(
  value: unknown,
  minimum: number,
  maximum: number,
): asserts value is string {
  if (
    typeof value !== "string" ||
    value.length < minimum ||
    value.length > maximum ||
    value.trim() !== value ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    failInvalid();
  }
}

function assertInteger(
  value: unknown,
  minimum: number,
  maximum: number,
): asserts value is number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    failInvalid();
  }
}

function restaurantPriceMinor(price: unknown): number {
  if (
    typeof price !== "number" ||
    !Number.isFinite(price) ||
    price < 0 ||
    price > 100_000 ||
    Number(price.toFixed(2)) !== price
  ) {
    failInvalid();
  }
  const minor = Math.round(price * 100);
  if (!Number.isInteger(minor) || minor < 0 || minor > 10_000_000) {
    failInvalid();
  }
  return minor;
}

function assertSafeImageUrl(value: unknown): asserts value is string {
  assertBoundedString(value, 1, 2048);
  const lower = value.toLowerCase();
  if (
    !value.startsWith("/") &&
    !value.startsWith("#") &&
    !value.startsWith("?") &&
    !lower.startsWith("http://") &&
    !lower.startsWith("https://")
  ) {
    failInvalid();
  }
}

function restaurantRuntimeCatalog(
  plan: RestaurantProductPlanV1,
): readonly RestaurantRuntimeCatalogItemV1[] {
  try {
    const seedData = plan.domain.seedData;
    const scenario = plan.seedScenarios[0];
    if (
      !Array.isArray(seedData) ||
      plan.seedScenarios.length !== 1 ||
      scenario?.key !== "fine-dining-service" ||
      scenario.records.length !== seedData.length
    ) {
      failInvalid();
    }

    const identities = new Set<string>();
    for (let index = 0; index < seedData.length; index += 1) {
      const seed = seedData[index]!;
      const mirror = scenario.records[index]!;
      assertGraphKey(seed.entity);
      assertGraphKey(seed.id);
      const identity = `${seed.entity}\u0000${seed.id}`;
      if (identities.has(identity)) failInvalid();
      identities.add(identity);
      if (
        mirror.entityKey !== seed.entity ||
        !isDeepStrictEqual(mirror.values, seed.values)
      ) {
        failInvalid();
      }
    }

    const categories = seedData.filter(
      ({ entity }) => entity === "menu-category",
    );
    const items = seedData.filter(({ entity }) => entity === "menu-item");
    if (
      categories.length !== 1 ||
      categories[0]!.id !== "mains" ||
      items.length !== 2 ||
      items[0]!.id !== "margherita-pizza" ||
      items[1]!.id !== "mushroom-risotto"
    ) {
      failInvalid();
    }

    const categoryKeys = new Set<string>();
    for (const category of categories) {
      assertGraphKey(category.id);
      if (
        !isDeepStrictEqual(Object.keys(category.values), [
          "name",
          "sortOrder",
          "active",
        ])
      ) {
        failInvalid();
      }
      assertBoundedString(category.values.name, 1, 120);
      assertInteger(category.values.sortOrder, 0, 10_000);
      if (typeof category.values.active !== "boolean") failInvalid();
      categoryKeys.add(category.id);
    }

    return Object.freeze(
      items.map(({ id, values }) => {
        assertGraphKey(id);
        if (
          !isDeepStrictEqual(Object.keys(values), [
            "categoryKey",
            "name",
            "description",
            "price",
            "available",
            "stock",
            "preparationMinutes",
            "imageUrl",
          ])
        ) {
          failInvalid();
        }
        assertGraphKey(values.categoryKey);
        if (!categoryKeys.has(values.categoryKey)) failInvalid();
        assertBoundedString(
          values.name,
          id === "margherita-pizza" ? 2 : 1,
          120,
        );
        assertBoundedString(values.description, 1, 1000);
        const price = restaurantPriceMinor(values.price);
        if (typeof values.available !== "boolean") failInvalid();
        assertInteger(values.stock, 0, 10_000);
        assertInteger(values.preparationMinutes, 1, 1440);
        assertSafeImageUrl(values.imageUrl);
        return Object.freeze({
          id,
          version: 1 as const,
          categoryKey: values.categoryKey,
          name: values.name,
          description: values.description,
          price,
          available: values.available,
          stock: values.stock,
          preparationMinutes: values.preparationMinutes,
          imageUrl: values.imageUrl,
        });
      }),
    );
  } catch {
    failInvalid();
  }
}

function seedModule(plan: RestaurantProductPlanV1): string {
  const catalog = restaurantRuntimeCatalog(plan);
  return `export const restaurantSeed = Object.freeze({
  catalog: ${JSON.stringify(catalog)},
  cart: { id: "cart-customer-1", version: 1, items: [], total: 0 },
  orders: [],
  profile: { id: "customer-1", version: 1, subjectRef: "local-customer", displayName: "Guest", email: "guest@example.invalid", locale: "en", marketingOptIn: false, role: "customer" },
  tables: [
    { id: "table-1", version: 1, code: "T1", number: 1, capacity: 2, status: "open", active: true },
    { id: "table-2", version: 1, code: "T2", number: 2, capacity: 4, status: "open", active: true }
  ],
  principals: [
    { id: "manager-1", subjectRef: "local-manager", displayName: "Manager", role: "manager", active: true },
    { id: "kitchen-1", subjectRef: "local-kitchen", displayName: "Kitchen", role: "kitchen", active: true },
    { id: "cashier-1", subjectRef: "local-cashier", displayName: "Cashier", role: "cashier", active: true }
  ],
  settings: { version: 1, name: "Maison Aurelia", currency: "USD", taxRate: 0, serviceChargeRate: 0, timezone: "UTC", logoUrl: "", serviceOpen: true }
});
`;
}

function apiModule(plan: RestaurantProductPlanV1): string {
  const permissions = plan.policy.permissions;
  const roles = plan.policy.roles;
  const flows = plan.flows;
  const fieldAuthorities = plan.fieldAuthorities;
  const bindingPolicies = plan.bindingPolicies;

  return `import { createHash } from "node:crypto";

const json = (response, status, body) => {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
};
const digest = (value) => createHash("sha256").update(value).digest("hex");
const permissions = Object.freeze(${JSON.stringify(permissions)});
const roles = Object.freeze(${JSON.stringify(roles)});
const flows = Object.freeze(${JSON.stringify(flows)});
const fieldAuthorities = Object.freeze(${JSON.stringify(fieldAuthorities)});
const bindingPolicies = Object.freeze(${JSON.stringify(bindingPolicies)});
const permission = (role, resource, action) => roles.includes(role) && permissions.some((entry) => entry.role === role && entry.resource === resource && entry.actions.includes(action));
const transition = (flowKey, from, event, to, role) => flows.some((flow) => flow.id === flowKey && flow.transitions.some((entry) => entry.from === from && entry.event === event && entry.to === to && entry.roles?.includes(role) === true));
const flowRequest = (flowKey, from, event, to) => bindingPolicies.some((entry) => entry.kind === "flow-transition" && entry.flowKey === flowKey && entry.from === from && entry.event === event && entry.to === to && entry.access === "request");
const clientField = (entityKey, fieldKey) => fieldAuthorities.some((entry) => entry.entityKey === entityKey && entry.fieldKey === fieldKey && entry.authority === "client");
const writableField = (pageId, entityKey, fieldKey) => clientField(entityKey, fieldKey) && bindingPolicies.some((entry) => entry.pageId === pageId && entry.kind === "domain-field" && entry.entityKey === entityKey && entry.fieldKey === fieldKey && entry.access === "write" && entry.authority === "client");
function assertBounded(value, depth = 0) {
  if (depth > 12) { const error = new Error("invalid"); error.status = 400; throw error; }
  if (typeof value === "string" && value.length > 4096) { const error = new Error("invalid"); error.status = 400; throw error; }
  if (Array.isArray(value)) { if (value.length > 100) { const error = new Error("invalid"); error.status = 400; throw error; } for (const child of value) assertBounded(child, depth + 1); }
  else if (value && typeof value === "object") { const entries = Object.entries(value); if (entries.length > 100) { const error = new Error("invalid"); error.status = 400; throw error; } for (const [key, child] of entries) { if (key.length > 128) { const error = new Error("invalid"); error.status = 400; throw error; } assertBounded(child, depth + 1); } }
  return value;
}
async function body(request) {
  let value = "";
  for await (const chunk of request) {
    value += chunk;
    if (Buffer.byteLength(value) > 65536) {
      const error = new Error("large"); error.status = 413; throw error;
    }
  }
  try { return assertBounded(value ? JSON.parse(value) : {}); } catch (error) { if (error?.status) throw error; const invalid = new Error("invalid"); invalid.status = 400; throw invalid; }
}
function receipt(state, operation, key, payload) {
  if (!key || key.length > 128) { const error = new Error("invalid"); error.status = 400; throw error; }
  const receiptKey = operation + ":" + key;
  const payloadDigest = digest(payload);
  const previous = state.receipts[receiptKey];
  if (previous && previous.payloadDigest !== payloadDigest) { const error = new Error("conflict"); error.status = 409; throw error; }
  return { previous, payloadDigest, receiptKey };
}
function audit(state, actorRole, action, subjectId) {
  state.audit.push({ id: "audit-" + String(state.audit.length + 1).padStart(4, "0"), actorRole, action, subjectEntity: "restaurant-runtime", subjectId, occurredAt: "2026-08-14T00:00:00.000Z", revisionId: state.revisionId });
}
function total(state) { return state.cart.items.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0); }
function fail(status) { const error = new Error("runtime"); error.status = status; throw error; }
function exactVersion(raw, record) { if (raw.expectedVersion !== record.version) fail(409); }

export function createRestaurantApiHandler(store, principalRole = "customer") {
  return async function handle(request, response) {
    try {
      if ((request.url?.length ?? 0) > 2048) return json(response, 414, { error: "Invalid request." });
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      const path = url.pathname;
      if (request.method === "GET" && path === "/health") return json(response, 200, { status: "ready", schemaVersion: 1 });
      if (!roles.includes(principalRole)) return json(response, 403, { error: "Request denied." });
      if (request.method === "GET" && path === "/api/catalog") return json(response, 200, { items: (await store.read()).catalog });
      if (request.method === "GET" && path.startsWith("/api/catalog/")) {
        const item = (await store.read()).catalog.find((candidate) => candidate.id === decodeURIComponent(path.slice(13)));
        return item ? json(response, 200, item) : json(response, 404, { error: "Not found." });
      }
      if (request.method === "GET" && path === "/api/cart") return json(response, 200, { cart: (await store.read()).cart });
      if (request.method === "POST" && path === "/api/cart/items") {
        if (!permission(principalRole, "order-line", "create")) return json(response, 403, { error: "Request denied." });
        const raw = await body(request); const payload = JSON.stringify(raw);
        return json(response, 200, await store.mutate((state) => {
          const replay = receipt(state, "cart.add", String(request.headers["idempotency-key"] ?? ""), payload);
          if (replay.previous) return replay.previous.response;
          if (raw.expectedVersion !== state.cart.version) { const error = new Error("version"); error.status = 409; throw error; }
          if (typeof raw.itemId !== "string" || !Number.isInteger(raw.quantity) || raw.quantity < 1 || raw.quantity > 20) { const error = new Error("invalid"); error.status = 400; throw error; }
          const item = state.catalog.find((candidate) => candidate.id === raw.itemId && candidate.available && candidate.stock >= raw.quantity);
          if (!item) { const error = new Error("missing"); error.status = 404; throw error; }
          state.cart.items.push({ id: "cart-line-" + String(state.cart.items.length + 1).padStart(4, "0"), itemId: item.id, name: item.name, quantity: raw.quantity, unitPrice: item.price });
          state.cart.version += 1; state.cart.total = total(state); audit(state, "customer", "cart.item-added", state.cart.id);
          const response = { cart: structuredClone(state.cart) };
          state.receipts[replay.receiptKey] = { payloadDigest: replay.payloadDigest, response };
          return response;
        }));
      }
      const cartLine = path.match(/^\\/api\\/cart\\/items\\/([^/]+)$/);
      if (cartLine && request.method === "PATCH") {
        if (!permission(principalRole, "order-line", "update")) return json(response, 403, { error: "Request denied." });
        const raw = await body(request); const payload = JSON.stringify(raw);
        return json(response, 200, await store.mutate((state) => {
          const replay = receipt(state, "cart.update:" + cartLine[1], String(request.headers["idempotency-key"] ?? ""), payload); if (replay.previous) return replay.previous.response;
          if (raw.expectedVersion !== state.cart.version) { const error = new Error("version"); error.status = 409; throw error; }
          const line = state.cart.items.find((candidate) => candidate.id === cartLine[1]);
          if (!line || !Number.isInteger(raw.quantity) || raw.quantity < 1 || raw.quantity > 20) { const error = new Error("invalid"); error.status = 400; throw error; }
          line.quantity = raw.quantity; state.cart.version += 1; state.cart.total = total(state); audit(state, "customer", "cart.item-updated", line.id);
          const response = { cart: structuredClone(state.cart) }; state.receipts[replay.receiptKey] = { payloadDigest: replay.payloadDigest, response }; return response;
        }));
      }
      if (cartLine && request.method === "DELETE") {
        if (!permission(principalRole, "order-line", "delete")) return json(response, 403, { error: "Request denied." });
        const payload = "delete:" + cartLine[1];
        return json(response, 200, await store.mutate((state) => {
          const replay = receipt(state, "cart.delete:" + cartLine[1], String(request.headers["idempotency-key"] ?? ""), payload); if (replay.previous) return replay.previous.response;
          if (Number(request.headers["x-expected-version"]) !== state.cart.version) { const error = new Error("version"); error.status = 409; throw error; }
          const index = state.cart.items.findIndex((candidate) => candidate.id === cartLine[1]); if (index < 0) { const error = new Error("missing"); error.status = 404; throw error; }
          state.cart.items.splice(index, 1); state.cart.version += 1; state.cart.total = total(state); audit(state, "customer", "cart.item-deleted", cartLine[1]);
          const response = { cart: structuredClone(state.cart) }; state.receipts[replay.receiptKey] = { payloadDigest: replay.payloadDigest, response }; return response;
        }));
      }
      if (request.method === "POST" && path === "/api/checkout") {
        if (!permission(principalRole, "order", "submit") || !permission(principalRole, "order", "pay") || !flowRequest("restaurant-order", "cart", "submit", "submitted") || !flowRequest("restaurant-order", "submitted", "pay", "paid")) return json(response, 403, { error: "Request denied." });
        const raw = await body(request); const payload = JSON.stringify(raw);
        return json(response, 200, await store.mutate((state) => {
          const replay = receipt(state, "checkout", String(request.headers["idempotency-key"] ?? ""), payload); if (replay.previous) return replay.previous.response;
          if (raw.expectedVersion !== state.cart.version || state.cart.items.length === 0 || raw.method !== "simulated-card") { const error = new Error("version"); error.status = 409; throw error; }
          for (const line of state.cart.items) { const item = state.catalog.find((candidate) => candidate.id === line.itemId); if (!item || !item.available || item.stock < line.quantity) fail(409); }
          for (const line of state.cart.items) { const item = state.catalog.find((candidate) => candidate.id === line.itemId); item.stock -= line.quantity; item.version += 1; }
          const order = { id: "order-" + String(state.orders.length + 1).padStart(4, "0"), version: 1, items: structuredClone(state.cart.items), total: state.cart.total, status: "paid", paymentStatus: "simulated-paid", paymentMethod: "simulated-card", priority: "normal", kitchenStatus: "queued", submittedAt: "2026-08-14T00:00:00.000Z", paidAt: "2026-08-14T00:00:00.000Z" };
          state.orders.push(order); state.cart = { id: state.cart.id, version: state.cart.version + 1, items: [], total: 0 }; audit(state, "customer", "order.checked-out", order.id);
          const response = { order: structuredClone(order) }; state.receipts[replay.receiptKey] = { payloadDigest: replay.payloadDigest, response }; return response;
        }));
      }
      if (request.method === "GET" && path === "/api/orders") return json(response, 200, { orders: (await store.read()).orders });
      if (request.method === "GET" && path.startsWith("/api/orders/")) { const order = (await store.read()).orders.find((candidate) => candidate.id === path.slice(12)); return order ? json(response, 200, { order }) : json(response, 404, { error: "Not found." }); }
      if (request.method === "GET" && path === "/api/profile") return json(response, 200, { profile: (await store.read()).profile });
      if (request.method === "PUT" && path === "/api/profile") {
        if (!clientField("restaurant-principal", "displayName") || !clientField("restaurant-principal", "locale") || !clientField("restaurant-principal", "marketingOptIn")) return json(response, 403, { error: "Request denied." });
        const raw = await body(request); const payload = JSON.stringify(raw);
        return json(response, 200, await store.mutate((state) => {
          const replay = receipt(state, "profile.update", String(request.headers["idempotency-key"] ?? ""), payload); if (replay.previous) return replay.previous.response;
          if (raw.expectedVersion !== state.profile.version || typeof raw.displayName !== "string" || raw.displayName.length > 120 || typeof raw.locale !== "string" || raw.locale.length > 16 || typeof raw.marketingOptIn !== "boolean") { const error = new Error("invalid"); error.status = 400; throw error; }
          state.profile.displayName = raw.displayName; state.profile.locale = raw.locale; state.profile.marketingOptIn = raw.marketingOptIn; state.profile.version += 1; audit(state, "customer", "profile.updated", state.profile.id);
          const response = { profile: structuredClone(state.profile) }; state.receipts[replay.receiptKey] = { payloadDigest: replay.payloadDigest, response }; return response;
        }));
      }
      const merchantRole = principalRole === "manager" || principalRole === "kitchen" || principalRole === "cashier";
      if (path.startsWith("/api/merchant/") && !merchantRole) return json(response, 403, { error: "Request denied." });
      if (request.method === "GET" && path === "/api/merchant/dashboard") { const state = await store.read(); return json(response, 200, { dashboard: { orderCount: state.orders.length, openOrderCount: state.orders.filter((order) => !["cancelled", "served"].includes(order.status)).length, availableItemCount: state.catalog.filter((item) => item.available && item.stock > 0).length, activeTableCount: state.tables.filter((table) => table.active).length } }); }
      if (request.method === "GET" && path === "/api/merchant/catalog") return json(response, 200, { items: (await store.read()).catalog });
      if (request.method === "GET" && path === "/api/merchant/orders") return json(response, 200, { orders: (await store.read()).orders });
      if (request.method === "GET" && path === "/api/merchant/kitchen") return json(response, 200, { orders: (await store.read()).orders.filter((order) => !["cancelled", "served"].includes(order.status)) });
      if (request.method === "GET" && path === "/api/merchant/tables") return json(response, 200, { tables: (await store.read()).tables });
      if (request.method === "GET" && path === "/api/merchant/principals") return json(response, 200, { principals: (await store.read()).principals });
      if (request.method === "GET" && path === "/api/merchant/settings") return json(response, 200, { settings: (await store.read()).settings });
      const catalogItem = path.match(/^\\/api\\/merchant\\/catalog\\/([^/]+)$/);
      if (catalogItem && request.method === "PATCH") {
        const raw = await body(request); const payload = JSON.stringify(raw); const itemId = decodeURIComponent(catalogItem[1]);
        const requestedFields = ["name", "description", "price", "available", "preparationMinutes"].filter((field) => Object.hasOwn(raw, field));
        if (!permission(principalRole, "menu-item", "update") || requestedFields.some((field) => !writableField("merchant-menu-management", "menu-item", field)) || (Object.hasOwn(raw, "stock") && !(permission(principalRole, "inventory-ledger", "record-manager-adjustment") && transition("restaurant-inventory-ledger", "recorded", "record-manager-adjustment", "recorded", principalRole) && flowRequest("restaurant-inventory-ledger", "recorded", "record-manager-adjustment", "recorded")))) return json(response, 403, { error: "Request denied." });
        return json(response, 200, await store.mutate((state) => {
          const replay = receipt(state, "merchant.catalog:" + itemId, String(request.headers["idempotency-key"] ?? ""), payload); if (replay.previous) return replay.previous.response;
          const item = state.catalog.find((candidate) => candidate.id === itemId); if (!item) fail(404); exactVersion(raw, item); const updates = {};
          if (Object.hasOwn(raw, "name")) { if (typeof raw.name !== "string" || !raw.name.trim() || raw.name.length > 120) fail(400); updates.name = raw.name; }
          if (Object.hasOwn(raw, "description")) { if (typeof raw.description !== "string" || raw.description.length > 1000) fail(400); updates.description = raw.description; }
          if (Object.hasOwn(raw, "price")) { if (!Number.isInteger(raw.price) || raw.price < 0 || raw.price > 10000000) fail(400); updates.price = raw.price; }
          if (Object.hasOwn(raw, "available")) { if (typeof raw.available !== "boolean") fail(400); updates.available = raw.available; }
          if (Object.hasOwn(raw, "stock")) { if (!Number.isInteger(raw.stock) || raw.stock < 0 || raw.stock > 10000) fail(400); updates.stock = raw.stock; }
          if (Object.hasOwn(raw, "preparationMinutes")) { if (!Number.isInteger(raw.preparationMinutes) || raw.preparationMinutes < 1 || raw.preparationMinutes > 1440) fail(400); updates.preparationMinutes = raw.preparationMinutes; }
          if (Object.keys(updates).length === 0) fail(400); Object.assign(item, updates); item.version += 1; audit(state, principalRole, "catalog.updated", item.id);
          const response = { item: structuredClone(item) }; state.receipts[replay.receiptKey] = { payloadDigest: replay.payloadDigest, response }; return response;
        }));
      }
      const orderAction = path.match(/^\\/api\\/merchant\\/orders\\/([^/]+)\\/actions$/);
      if (orderAction && request.method === "POST") {
        const raw = await body(request); const payload = JSON.stringify(raw); const orderId = decodeURIComponent(orderAction[1]);
        const allowed = (raw.action === "cancel" && permission(principalRole, "order", "cancel") && transition("restaurant-order", "paid", "cancel", "cancelled", principalRole)) || (raw.action === "set-priority" && writableField("merchant-orders", "order", "priority") && permission(principalRole, "order", "cancel")) || (raw.action === "pay" && permission(principalRole, "order", "pay") && transition("restaurant-order", "submitted", "pay", "paid", principalRole));
        if (!allowed) return json(response, 403, { error: "Request denied." });
        return json(response, 200, await store.mutate((state) => {
          const replay = receipt(state, "merchant.order:" + orderId + ":" + raw.action, String(request.headers["idempotency-key"] ?? ""), payload); if (replay.previous) return replay.previous.response;
          const order = state.orders.find((candidate) => candidate.id === orderId); if (!order) fail(404); exactVersion(raw, order);
          if (raw.action === "set-priority") { if (!["low", "normal", "high"].includes(raw.priority)) fail(400); order.priority = raw.priority; }
          else if (raw.action === "cancel") { if (order.status !== "submitted" && order.status !== "paid") fail(409); order.status = "cancelled"; order.kitchenStatus = "cancelled"; }
          else { if (order.status !== "submitted") fail(409); order.status = "paid"; order.paymentStatus = "simulated-paid"; order.paidAt = "2026-08-14T00:00:00.000Z"; }
          order.version += 1; audit(state, principalRole, "order." + raw.action, order.id); const response = { order: structuredClone(order) }; state.receipts[replay.receiptKey] = { payloadDigest: replay.payloadDigest, response }; return response;
        }));
      }
      const kitchenAction = path.match(/^\\/api\\/merchant\\/kitchen\\/([^/]+)\\/actions$/);
      if (kitchenAction && request.method === "POST") {
        const raw = await body(request); const payload = JSON.stringify(raw); const orderId = decodeURIComponent(kitchenAction[1]);
        const kitchenTransitions = { accept: ["paid", "accepted"], "start-preparing": ["accepted", "preparing"], "mark-ready": ["preparing", "ready"] }; const kitchenTransition = kitchenTransitions[raw.action];
        if (!kitchenTransition || !permission(principalRole, "order", raw.action) || !transition("restaurant-order", kitchenTransition[0], raw.action, kitchenTransition[1], principalRole)) return json(response, 403, { error: "Request denied." });
        return json(response, 200, await store.mutate((state) => {
          const replay = receipt(state, "merchant.kitchen:" + orderId + ":" + raw.action, String(request.headers["idempotency-key"] ?? ""), payload); if (replay.previous) return replay.previous.response;
          const order = state.orders.find((candidate) => candidate.id === orderId); if (!order) fail(404); exactVersion(raw, order); if (order.status !== kitchenTransition[0]) fail(409);
          order.status = kitchenTransition[1]; order.kitchenStatus = kitchenTransition[1]; order.version += 1; const timestamp = raw.action === "accept" ? "acceptedAt" : raw.action === "start-preparing" ? "startedAt" : "readyAt"; order[timestamp] = "2026-08-14T00:00:00.000Z";
          audit(state, principalRole, "kitchen." + raw.action, order.id); const response = { order: structuredClone(order) }; state.receipts[replay.receiptKey] = { payloadDigest: replay.payloadDigest, response }; return response;
        }));
      }
      const tableAction = path.match(/^\\/api\\/merchant\\/tables\\/([^/]+)\\/actions$/);
      if (tableAction && request.method === "POST") {
        const raw = await body(request); const payload = JSON.stringify(raw); const tableId = decodeURIComponent(tableAction[1]); const tableTransitions = { activate: ["open", "active"], close: ["active", "closed"], expire: [null, "closed"] }; const tableTransition = tableTransitions[raw.action]; if (!tableTransition) fail(400);
        if (!permission(principalRole, "table-session", raw.action)) return json(response, 403, { error: "Request denied." });
        return json(response, 200, await store.mutate((state) => {
          const replay = receipt(state, "merchant.table:" + tableId + ":" + raw.action, String(request.headers["idempotency-key"] ?? ""), payload); if (replay.previous) return replay.previous.response;
          const table = state.tables.find((candidate) => candidate.id === tableId); if (!table) fail(404); exactVersion(raw, table); if (tableTransition[0] && table.status !== tableTransition[0]) fail(409); if (raw.action === "expire" && table.status !== "open" && table.status !== "active") fail(409);
          table.status = tableTransition[1]; table.version += 1; audit(state, principalRole, "table." + raw.action, table.id); const response = { table: structuredClone(table) }; state.receipts[replay.receiptKey] = { payloadDigest: replay.payloadDigest, response }; return response;
        }));
      }
      if (request.method === "PUT" && path === "/api/merchant/settings") {
        const raw = await body(request); const payload = JSON.stringify(raw);
        const requestedFields = ["name", "currency", "taxRate", "serviceChargeRate", "timezone", "logoUrl", "serviceOpen"].filter((field) => Object.hasOwn(raw, field));
        if (!permission(principalRole, "restaurant-location", "update") || requestedFields.some((field) => !writableField("merchant-settings", "restaurant-location", field))) return json(response, 403, { error: "Request denied." });
        return json(response, 200, await store.mutate((state) => {
          const replay = receipt(state, "merchant.settings", String(request.headers["idempotency-key"] ?? ""), payload); if (replay.previous) return replay.previous.response; exactVersion(raw, state.settings);
          if (typeof raw.name !== "string" || !raw.name.trim() || raw.name.length > 120 || typeof raw.currency !== "string" || !/^[A-Z]{3}$/.test(raw.currency) || typeof raw.taxRate !== "number" || raw.taxRate < 0 || raw.taxRate > 100 || typeof raw.serviceChargeRate !== "number" || raw.serviceChargeRate < 0 || raw.serviceChargeRate > 100 || typeof raw.timezone !== "string" || !raw.timezone || raw.timezone.length > 100 || typeof raw.logoUrl !== "string" || raw.logoUrl.length > 2048 || (raw.logoUrl && !/^https?:\\/\\//.test(raw.logoUrl)) || typeof raw.serviceOpen !== "boolean") fail(400);
          Object.assign(state.settings, { name: raw.name, currency: raw.currency, taxRate: raw.taxRate, serviceChargeRate: raw.serviceChargeRate, timezone: raw.timezone, logoUrl: raw.logoUrl, serviceOpen: raw.serviceOpen }); state.settings.version += 1; audit(state, principalRole, "settings.updated", "restaurant-location"); const response = { settings: structuredClone(state.settings) }; state.receipts[replay.receiptKey] = { payloadDigest: replay.payloadDigest, response }; return response;
        }));
      }
      return json(response, 404, { error: "Not found." });
    } catch (error) {
      const status = Number(error?.status) || 400;
      return json(response, status, { error: status === 413 ? "Request too large." : status === 409 ? "Request conflict." : status === 404 ? "Not found." : status === 403 ? "Request denied." : "Invalid request." });
    }
  };
}
`;
}

function serverModule(revisionId: string): string {
  return `import { createServer } from "node:http";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createStateStore } from "./state.mjs";
import { createRestaurantApiHandler } from "./api.mjs";
import { restaurantSeed } from "./seed.mjs";

export async function startRestaurantServer(options = {}) {
  const host = options.host ?? "127.0.0.1";
  if (host !== "127.0.0.1" && host !== "::1" && host !== "localhost") throw new Error("Restaurant runtime only binds loopback by default.");
  const store = createStateStore(options.statePath, restaurantSeed, ${JSON.stringify(revisionId)});
  await store.read();
  const server = createServer(createRestaurantApiHandler(store, options.principalRole ?? "customer"));
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(options.port ?? 0, host, resolve); });
  const address = server.address();
  return { port: typeof address === "object" && address ? address.port : 0, close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())) };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const started = await startRestaurantServer({ statePath: resolve(".restaurant-state/state.json"), port: Number(process.env.PORT ?? 0), host: "127.0.0.1", principalRole: "customer" });
  console.log("Restaurant customer runtime listening on http://127.0.0.1:" + started.port);
}
`;
}

export function renderRestaurantCustomerRuntime(
  plan: RestaurantProductPlanV1,
): RestaurantRuntimeSourceV1 {
  return Object.freeze({
    stateModule: renderRestaurantRuntimeStateModule(),
    apiModule: apiModule(plan),
    seedModule: seedModule(plan),
    serverModule: serverModule(plan.publishedRevisionId),
  });
}
