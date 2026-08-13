import type { RestaurantProductPlanV1 } from "./plan.js";
import { renderRestaurantRuntimeStateModule } from "./runtime-state.js";

export type RestaurantRuntimeSourceV1 = {
  readonly stateModule: string;
  readonly apiModule: string;
  readonly seedModule: string;
  readonly serverModule: string;
};

function seedModule(): string {
  return `export const restaurantSeed = Object.freeze({
  catalog: [
    { id: "dish-truffle-risotto", name: "Truffle risotto", description: "Arborio rice and winter truffle", price: 3200, available: true },
    { id: "dish-seared-salmon", name: "Seared salmon", description: "Salmon, beurre blanc, herbs", price: 2800, available: true }
  ],
  cart: { id: "cart-customer-1", version: 1, items: [], total: 0 },
  orders: [],
  profile: { id: "customer-1", version: 1, subjectRef: "local-customer", displayName: "Guest", email: "guest@example.invalid", locale: "en", marketingOptIn: false, role: "customer" }
});
`;
}

function apiModule(plan: RestaurantProductPlanV1): string {
  const customerPermissions = new Set(
    plan.policy.permissions
      .filter(({ role }) => role === "customer")
      .flatMap(({ resource, actions }) =>
        actions.map((action) => `${resource}:${action}`),
      ),
  );
  const flowRequests = new Set(
    plan.bindingPolicies
      .filter(
        (policy) =>
          policy.kind === "flow-transition" && policy.access === "request",
      )
      .map((policy) =>
        policy.kind === "flow-transition"
          ? `${policy.flowKey}:${policy.from}:${policy.event}:${policy.to}`
          : "",
      ),
  );
  const clientFields = new Set(
    plan.fieldAuthorities
      .filter(({ authority }) => authority === "client")
      .map(({ entityKey, fieldKey }) => `${entityKey}.${fieldKey}`),
  );
  const runtimePolicy = {
    "cart.add": customerPermissions.has("order-line:create"),
    "cart.update": customerPermissions.has("order-line:update"),
    "cart.delete": customerPermissions.has("order-line:delete"),
    checkout:
      customerPermissions.has("order:submit") &&
      customerPermissions.has("order:pay") &&
      flowRequests.has("restaurant-order:cart:submit:submitted") &&
      flowRequests.has("restaurant-order:submitted:pay:paid"),
    "profile.update": [
      "restaurant-principal.displayName",
      "restaurant-principal.locale",
      "restaurant-principal.marketingOptIn",
    ].every((field) => clientFields.has(field)),
  };
  return `import { createHash } from "node:crypto";

const json = (response, status, body) => {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
};
const digest = (value) => createHash("sha256").update(value).digest("hex");
const runtimePolicy = Object.freeze(${JSON.stringify(runtimePolicy)});
const may = (operation) => runtimePolicy[operation] === true;
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
function audit(state, action, subjectId) {
  state.audit.push({ id: "audit-" + String(state.audit.length + 1).padStart(4, "0"), actorRole: "customer", action, subjectEntity: "restaurant-runtime", subjectId, occurredAt: "2026-08-14T00:00:00.000Z", revisionId: state.revisionId });
}
function total(state) { return state.cart.items.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0); }

export function createRestaurantApiHandler(store, principalRole = "customer") {
  return async function handle(request, response) {
    try {
      if ((request.url?.length ?? 0) > 2048) return json(response, 414, { error: "Invalid request." });
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      const path = url.pathname;
      if (request.method === "GET" && path === "/health") return json(response, 200, { status: "ready", schemaVersion: 1 });
      if (request.method === "GET" && path === "/api/catalog") return json(response, 200, { items: (await store.read()).catalog });
      if (request.method === "GET" && path.startsWith("/api/catalog/")) {
        const item = (await store.read()).catalog.find((candidate) => candidate.id === decodeURIComponent(path.slice(13)));
        return item ? json(response, 200, item) : json(response, 404, { error: "Not found." });
      }
      if (request.method === "GET" && path === "/api/cart") return json(response, 200, { cart: (await store.read()).cart });
      if (request.method === "POST" && path === "/api/cart/items") {
        if (principalRole !== "customer" || !may("cart.add")) return json(response, 403, { error: "Request denied." });
        const raw = await body(request); const payload = JSON.stringify(raw);
        return json(response, 200, await store.mutate((state) => {
          const replay = receipt(state, "cart.add", String(request.headers["idempotency-key"] ?? ""), payload);
          if (replay.previous) return replay.previous.response;
          if (raw.expectedVersion !== state.cart.version) { const error = new Error("version"); error.status = 409; throw error; }
          if (typeof raw.itemId !== "string" || !Number.isInteger(raw.quantity) || raw.quantity < 1 || raw.quantity > 20) { const error = new Error("invalid"); error.status = 400; throw error; }
          const item = state.catalog.find((candidate) => candidate.id === raw.itemId && candidate.available);
          if (!item) { const error = new Error("missing"); error.status = 404; throw error; }
          state.cart.items.push({ id: "cart-line-" + String(state.cart.items.length + 1).padStart(4, "0"), itemId: item.id, name: item.name, quantity: raw.quantity, unitPrice: item.price });
          state.cart.version += 1; state.cart.total = total(state); audit(state, "cart.item-added", state.cart.id);
          const response = { cart: structuredClone(state.cart) };
          state.receipts[replay.receiptKey] = { payloadDigest: replay.payloadDigest, response };
          return response;
        }));
      }
      const cartLine = path.match(/^\\/api\\/cart\\/items\\/([^/]+)$/);
      if (cartLine && request.method === "PATCH") {
        if (principalRole !== "customer" || !may("cart.update")) return json(response, 403, { error: "Request denied." });
        const raw = await body(request); const payload = JSON.stringify(raw);
        return json(response, 200, await store.mutate((state) => {
          const replay = receipt(state, "cart.update:" + cartLine[1], String(request.headers["idempotency-key"] ?? ""), payload); if (replay.previous) return replay.previous.response;
          if (raw.expectedVersion !== state.cart.version) { const error = new Error("version"); error.status = 409; throw error; }
          const line = state.cart.items.find((candidate) => candidate.id === cartLine[1]);
          if (!line || !Number.isInteger(raw.quantity) || raw.quantity < 1 || raw.quantity > 20) { const error = new Error("invalid"); error.status = 400; throw error; }
          line.quantity = raw.quantity; state.cart.version += 1; state.cart.total = total(state); audit(state, "cart.item-updated", line.id);
          const response = { cart: structuredClone(state.cart) }; state.receipts[replay.receiptKey] = { payloadDigest: replay.payloadDigest, response }; return response;
        }));
      }
      if (cartLine && request.method === "DELETE") {
        if (principalRole !== "customer" || !may("cart.delete")) return json(response, 403, { error: "Request denied." });
        const payload = "delete:" + cartLine[1];
        return json(response, 200, await store.mutate((state) => {
          const replay = receipt(state, "cart.delete:" + cartLine[1], String(request.headers["idempotency-key"] ?? ""), payload); if (replay.previous) return replay.previous.response;
          if (Number(request.headers["x-expected-version"]) !== state.cart.version) { const error = new Error("version"); error.status = 409; throw error; }
          const index = state.cart.items.findIndex((candidate) => candidate.id === cartLine[1]); if (index < 0) { const error = new Error("missing"); error.status = 404; throw error; }
          state.cart.items.splice(index, 1); state.cart.version += 1; state.cart.total = total(state); audit(state, "cart.item-deleted", cartLine[1]);
          const response = { cart: structuredClone(state.cart) }; state.receipts[replay.receiptKey] = { payloadDigest: replay.payloadDigest, response }; return response;
        }));
      }
      if (request.method === "POST" && path === "/api/checkout") {
        if (principalRole !== "customer" || !may("checkout")) return json(response, 403, { error: "Request denied." });
        const raw = await body(request); const payload = JSON.stringify(raw);
        return json(response, 200, await store.mutate((state) => {
          const replay = receipt(state, "checkout", String(request.headers["idempotency-key"] ?? ""), payload); if (replay.previous) return replay.previous.response;
          if (raw.expectedVersion !== state.cart.version || state.cart.items.length === 0 || raw.method !== "simulated-card") { const error = new Error("version"); error.status = 409; throw error; }
          const order = { id: "order-" + String(state.orders.length + 1).padStart(4, "0"), version: 1, items: structuredClone(state.cart.items), total: state.cart.total, status: "paid", paymentStatus: "simulated-paid", paymentMethod: "simulated-card", submittedAt: "2026-08-14T00:00:00.000Z", paidAt: "2026-08-14T00:00:00.000Z" };
          state.orders.push(order); state.cart = { id: state.cart.id, version: state.cart.version + 1, items: [], total: 0 }; audit(state, "order.checked-out", order.id);
          const response = { order: structuredClone(order) }; state.receipts[replay.receiptKey] = { payloadDigest: replay.payloadDigest, response }; return response;
        }));
      }
      if (request.method === "GET" && path === "/api/orders") return json(response, 200, { orders: (await store.read()).orders });
      if (request.method === "GET" && path.startsWith("/api/orders/")) { const order = (await store.read()).orders.find((candidate) => candidate.id === path.slice(12)); return order ? json(response, 200, { order }) : json(response, 404, { error: "Not found." }); }
      if (request.method === "GET" && path === "/api/profile") return json(response, 200, { profile: (await store.read()).profile });
      if (request.method === "PUT" && path === "/api/profile") {
        if (principalRole !== "customer" || !may("profile.update")) return json(response, 403, { error: "Request denied." });
        const raw = await body(request); const payload = JSON.stringify(raw);
        return json(response, 200, await store.mutate((state) => {
          const replay = receipt(state, "profile.update", String(request.headers["idempotency-key"] ?? ""), payload); if (replay.previous) return replay.previous.response;
          if (raw.expectedVersion !== state.profile.version || typeof raw.displayName !== "string" || raw.displayName.length > 120 || typeof raw.locale !== "string" || raw.locale.length > 16 || typeof raw.marketingOptIn !== "boolean") { const error = new Error("invalid"); error.status = 400; throw error; }
          state.profile.displayName = raw.displayName; state.profile.locale = raw.locale; state.profile.marketingOptIn = raw.marketingOptIn; state.profile.version += 1; audit(state, "profile.updated", state.profile.id);
          const response = { profile: structuredClone(state.profile) }; state.receipts[replay.receiptKey] = { payloadDigest: replay.payloadDigest, response }; return response;
        }));
      }
      return json(response, 404, { error: "Not found." });
    } catch (error) {
      const status = Number(error?.status) || 400;
      return json(response, status, { error: status === 413 ? "Request too large." : status === 409 ? "Request conflict." : status === 404 ? "Not found." : "Invalid request." });
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
    seedModule: seedModule(),
    serverModule: serverModule(plan.publishedRevisionId),
  });
}
