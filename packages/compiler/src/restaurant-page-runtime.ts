import { assertRestaurantOrderingProfile } from "@factory/capabilities";
import type { ApplicationGraphV1 } from "@factory/graph";

import { createGeneratedPageRuntimeProjection } from "./page-runtime-projection.js";

export const restaurantCustomerPageRuntimeApiVersion =
  "factory.restaurant-customer-page-runtime/v1" as const;

const customerRoutes = [
  "/table/:token",
  "/menu",
  "/cart",
  "/orders/current",
  "/receipt/:id",
] as const;

export interface RestaurantReceiptModifierProjection {
  readonly key: string;
  readonly label: string;
  readonly value: string;
}

export function projectRestaurantReceiptModifiers(
  value: unknown,
): readonly RestaurantReceiptModifierProjection[] {
  if (!Array.isArray(value)) return [];
  const projected: RestaurantReceiptModifierProjection[] = [];
  for (const candidate of value.slice(0, 20)) {
    if (
      !candidate ||
      typeof candidate !== "object" ||
      Array.isArray(candidate)
    ) {
      continue;
    }
    const modifier = candidate as Record<string, unknown>;
    if (
      typeof modifier.key !== "string" ||
      typeof modifier.label !== "string" ||
      typeof modifier.value !== "string"
    ) {
      continue;
    }
    const key = modifier.key.trim();
    const label = modifier.label.trim();
    const modifierValue = modifier.value.trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,49}$/.test(key)) continue;
    if (!label || label.length > 100 || /[\u0000-\u001f\u007f]/.test(label)) {
      continue;
    }
    if (
      !modifierValue ||
      modifierValue.length > 100 ||
      /[\u0000-\u001f\u007f]/.test(modifierValue)
    ) {
      continue;
    }
    projected.push({ key, label, value: modifierValue });
  }
  return projected;
}

export function renderRestaurantCustomerCommandRuntime(): string {
  return String.raw`export type RestaurantPaymentMethod = "cash" | "card";

export const restaurantPaymentMethods = ["cash", "card"] as const satisfies readonly RestaurantPaymentMethod[];

export type RestaurantSafeOrderState = {
  readonly id: string;
  readonly status: string;
  readonly paymentStatus: string;
  readonly orderVersion: number;
  readonly total: number;
  readonly orderNote: string;
};

export type LogicalCustomerCommand = {
  readonly slot: string;
  readonly key: string;
  readonly payloadHash: string;
};

export type CustomerCommandJournal = readonly LogicalCustomerCommand[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

const decimalWirePattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

export function restaurantDecimalNumber(value: unknown, fieldName: string): number {
  let decimalValue: number | string = value as number | string;
  if (isRecord(value)) {
    const keys = Object.keys(value);
    if (keys.length !== 2 || value.$type !== "Decimal" || typeof value.value !== "string") {
      throw new Error("The Restaurant API returned an invalid " + fieldName + ".");
    }
    decimalValue = value.value;
  }
  if (typeof decimalValue === "string") {
    const normalized = decimalValue.trim();
    if (!decimalWirePattern.test(normalized)) {
      throw new Error("The Restaurant API returned an invalid " + fieldName + ".");
    }
    decimalValue = normalized;
  } else if (typeof decimalValue !== "number") {
    throw new Error("The Restaurant API returned an invalid " + fieldName + ".");
  }
  const numericValue = Number(decimalValue);
  if (!Number.isFinite(numericValue)) {
    throw new Error("The Restaurant API returned an invalid " + fieldName + ".");
  }
  return numericValue;
}

export type RestaurantCustomerLineState = {
  readonly id: string;
  readonly menuItemId: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly lineNote: string;
};

export function projectRestaurantCustomerLine(value: unknown): RestaurantCustomerLineState {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.menuItemId !== "string" || !Number.isInteger(value.quantity)) {
    throw new Error("The Restaurant API returned an invalid order line.");
  }
  return {
    id: value.id,
    menuItemId: value.menuItemId,
    quantity: value.quantity as number,
    unitPrice: restaurantDecimalNumber(value.unitPrice, "order line unit price"),
    lineNote: typeof value.lineNote === "string" ? value.lineNote : "",
  };
}

export type RestaurantCustomerLineMutationProjection = {
  readonly line: RestaurantCustomerLineState;
  readonly orderVersion: number;
  readonly total: number;
  readonly modifiers: unknown;
};

export function commitRestaurantCustomerLineMutation(
  value: unknown,
  commit: (projection: RestaurantCustomerLineMutationProjection) => void,
): void {
  if (!isRecord(value) || !Number.isInteger(value.orderVersion)) {
    throw new Error("The Restaurant API returned an invalid line mutation outcome.");
  }
  const line = projectRestaurantCustomerLine(value.line);
  const total = restaurantDecimalNumber(value.total, "order total");
  commit({
    line,
    orderVersion: value.orderVersion as number,
    total,
    modifiers: isRecord(value.line) ? value.line.modifiers : null,
  });
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (isRecord(value)) return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key])).join(",") + "}";
  return JSON.stringify(value) ?? "null";
}

async function payloadHash(body: Readonly<Record<string, unknown>>): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalJson(body)));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function projectRestaurantCustomerOrderState(value: unknown): RestaurantSafeOrderState {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.status !== "string" || typeof value.paymentStatus !== "string" || !Number.isInteger(value.orderVersion)) {
    throw new Error("The Restaurant API returned an invalid safe order state.");
  }
  return {
    id: value.id,
    status: value.status,
    paymentStatus: value.paymentStatus,
    orderVersion: value.orderVersion as number,
    total: restaurantDecimalNumber(value.total, "order total"),
    orderNote: typeof value.orderNote === "string" ? value.orderNote : "",
  };
}

export type RestaurantCustomerOrderState = RestaurantSafeOrderState & {
  readonly fulfilmentType: string;
  readonly submittedAt: string | null;
  readonly paidAt: string | null;
  readonly createdAt: string;
};

export function projectRestaurantCustomerOrder(value: unknown): RestaurantCustomerOrderState {
  if (
    !isRecord(value) ||
    typeof value.fulfilmentType !== "string" ||
    (value.submittedAt !== null && typeof value.submittedAt !== "string") ||
    (value.paidAt !== null && typeof value.paidAt !== "string") ||
    typeof value.createdAt !== "string"
  ) {
    throw new Error("The Restaurant API returned an invalid customer order.");
  }
  return {
    ...projectRestaurantCustomerOrderState(value),
    fulfilmentType: value.fulfilmentType,
    submittedAt: value.submittedAt,
    paidAt: value.paidAt,
    createdAt: value.createdAt,
  };
}

export type RestaurantCustomerReceiptState = RestaurantCustomerOrderState & {
  readonly lines: readonly (RestaurantCustomerLineState & {
    readonly menuItemName: string;
    readonly modifiers: unknown;
  })[];
  readonly payments: readonly {
    readonly id: string;
    readonly method: string;
    readonly amount: number;
    readonly status: string;
    readonly paidAt: string | null;
  }[];
};

export function projectRestaurantCustomerReceipt(value: unknown): RestaurantCustomerReceiptState {
  if (!isRecord(value) || !Array.isArray(value.lines) || !Array.isArray(value.payments)) {
    throw new Error("The Restaurant API returned an invalid receipt.");
  }
  return {
    ...projectRestaurantCustomerOrder(value),
    lines: value.lines.map((candidate) => {
      if (!isRecord(candidate) || typeof candidate.menuItemName !== "string") {
        throw new Error("The Restaurant API returned an invalid receipt line.");
      }
      return {
        ...projectRestaurantCustomerLine(candidate),
        menuItemName: candidate.menuItemName,
        modifiers: candidate.modifiers,
      };
    }),
    payments: value.payments.map((candidate) => {
      if (
        !isRecord(candidate) ||
        typeof candidate.id !== "string" ||
        typeof candidate.method !== "string" ||
        typeof candidate.status !== "string" ||
        (candidate.paidAt !== null && typeof candidate.paidAt !== "string")
      ) {
        throw new Error("The Restaurant API returned an invalid receipt payment.");
      }
      return {
        id: candidate.id,
        method: candidate.method,
        amount: restaurantDecimalNumber(candidate.amount, "payment amount"),
        status: candidate.status,
        paidAt: candidate.paidAt,
      };
    }),
  };
}

export function projectCustomerCommandJournal(value: unknown): CustomerCommandJournal {
  if (!Array.isArray(value)) return [];
  const projected: LogicalCustomerCommand[] = [];
  const slots = new Set<string>();
  for (const candidate of value.slice(0, 20)) {
    if (!isRecord(candidate) || typeof candidate.slot !== "string" || typeof candidate.key !== "string" || typeof candidate.payloadHash !== "string") continue;
    if (!/^[A-Za-z0-9][A-Za-z0-9:._-]{0,199}$/.test(candidate.slot) || !candidate.key.trim() || !/^[a-f0-9]{64}$/.test(candidate.payloadHash) || slots.has(candidate.slot)) continue;
    slots.add(candidate.slot);
    projected.push({ slot: candidate.slot, key: candidate.key, payloadHash: candidate.payloadHash });
  }
  return projected;
}

export async function retainLogicalCommand(
  journal: readonly unknown[],
  slot: string,
  body: Readonly<Record<string, unknown>>,
  createKey: () => string = () => crypto.randomUUID(),
): Promise<{ readonly journal: CustomerCommandJournal; readonly command: LogicalCustomerCommand }> {
  if (!/^[A-Za-z0-9][A-Za-z0-9:._-]{0,199}$/.test(slot)) throw new Error("Logical command slot is invalid.");
  const safeJournal = projectCustomerCommandJournal(journal);
  const nextPayloadHash = await payloadHash(body);
  const pending = safeJournal.find((command) => command.slot === slot);
  if (pending) {
    if (pending.payloadHash !== nextPayloadHash) throw new Error("A pending logical command must be reconciled before its payload changes.");
    return { journal: safeJournal, command: pending };
  }
  const key = createKey();
  if (!key.trim()) throw new Error("Logical command key is required.");
  const command = { slot, key, payloadHash: nextPayloadHash };
  return { journal: [...safeJournal, command], command };
}

export function confirmLogicalCommand(
  journal: readonly unknown[],
  command: Pick<LogicalCustomerCommand, "slot" | "key">,
): CustomerCommandJournal {
  return projectCustomerCommandJournal(journal).filter((candidate) => candidate.slot !== command.slot || candidate.key !== command.key);
}

export function createCustomerCommandJournalCoordinator(
  read: () => readonly unknown[],
  write: (journal: CustomerCommandJournal) => void,
): {
  readonly confirm: (
    command: Pick<LogicalCustomerCommand, "slot" | "key">,
  ) => Promise<void>;
  readonly retain: (
    slot: string,
    body: Readonly<Record<string, unknown>>,
    createKey?: () => string,
  ) => Promise<{ readonly journal: CustomerCommandJournal; readonly command: LogicalCustomerCommand }>;
} {
  let tail: Promise<void> = Promise.resolve();
  function enqueue<T>(operation: () => T | Promise<T>): Promise<T> {
    const result = tail.then(operation);
    tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
  return {
    confirm(command) {
      return enqueue(() => {
        write(confirmLogicalCommand(read(), command));
      });
    },
    retain(slot, body, createKey) {
      return enqueue(async () => {
        const result = await retainLogicalCommand(read(), slot, body, createKey);
        write(result.journal);
        return result;
      });
    },
  };
}

function typedVersionConflict(status: number, payload: unknown): RestaurantSafeOrderState | null {
  if (status !== 409 || !isRecord(payload) || payload.code !== "restaurant.order.version_conflict") return null;
  try {
    return projectRestaurantCustomerOrderState(payload.currentOrder);
  } catch {
    return null;
  }
}

export async function reconcileLogicalCommandConflict(
  journal: readonly unknown[],
  command: Pick<LogicalCustomerCommand, "slot" | "key">,
  status: number,
  payload: unknown,
  readStatus: (orderId: string) => Promise<unknown>,
): Promise<{ readonly journal: CustomerCommandJournal; readonly order: RestaurantSafeOrderState } | null> {
  const conflict = typedVersionConflict(status, payload);
  if (!conflict) return null;
  const order = projectRestaurantCustomerOrderState(await readStatus(conflict.id));
  return { journal: confirmLogicalCommand(journal, command), order };
}

export function restaurantPaymentMethod(value: unknown): RestaurantPaymentMethod {
  if (value === "cash" || value === "card") return value;
  throw new Error("Simulated payment method must be cash or card.");
}
`;
}

export function renderRestaurantPageRuntime(graph: ApplicationGraphV1): string {
  assertRestaurantOrderingProfile(graph);
  const projection = createGeneratedPageRuntimeProjection(graph);
  const projectedRoutes = new Set(projection.pages.map((page) => page.route));
  for (const route of customerRoutes) {
    if (!projectedRoutes.has(route)) {
      throw new Error(
        `Validated Restaurant Customer route '${route}' is missing.`,
      );
    }
  }
  const applicationName = JSON.stringify(graph.metadata.name);

  return String.raw`"use client";

import { useEffect, useState } from "react";
import {
  commitRestaurantCustomerLineMutation,
  confirmLogicalCommand,
  createCustomerCommandJournalCoordinator,
  projectRestaurantCustomerLine,
  projectRestaurantCustomerOrder,
  projectRestaurantCustomerOrderState,
  projectRestaurantCustomerReceipt,
  projectCustomerCommandJournal,
  reconcileLogicalCommandConflict,
  restaurantPaymentMethod,
  restaurantPaymentMethods,
  retainLogicalCommand,
  type CustomerCommandJournal,
  type RestaurantCustomerOrderState,
  type RestaurantCustomerReceiptState,
  type RestaurantPaymentMethod,
  type RestaurantSafeOrderState,
} from "./restaurant-customer-command";

export const restaurantCustomerPageRuntime = "factory.restaurant-customer-page-runtime/v1" as const;
export const restaurantRuntimeShell = "factory.restaurant-runtime-shell/v1" as const;
export const customerRendererOwnership = "Customer and merchant page renderers are generated by Tasks 4 and 5." as const;

const applicationName = ${applicationName};
const storageKey = "factory.restaurant.active-session/v1";
const commandJournalStorageKey = "factory.restaurant.customer-command-journal/v1";

type CustomerApiPath =
  | "/api/restaurant/table-sessions/resolve"
  | "/api/restaurant/menu/categories"
  | "/api/restaurant/menu/items"
  | "/api/restaurant/orders/history"
  | "/api/restaurant/menu/items?" & string
  | ("/api/restaurant/orders/" & string);

type OrderState = RestaurantSafeOrderState;

type CartLine = {
  readonly id: string;
  readonly menuItemId: string;
  readonly menuItemName: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly lineNote: string;
  readonly modifiers: readonly ReceiptModifier[];
};

type SessionScope = {
  readonly token: string;
  readonly order: OrderState;
  readonly lines: readonly CartLine[];
};

type MenuCategory = { readonly id: string; readonly name: string; readonly sortOrder: number };
type MenuItem = {
  readonly id: string;
  readonly categoryKey: string;
  readonly name: string;
  readonly description: string;
  readonly price: number;
  readonly available: true;
  readonly stock: number;
  readonly preparationMinutes: number;
  readonly imageUrl: string;
};
type CustomerOrder = RestaurantCustomerOrderState;
type ReceiptModifier = { readonly key: string; readonly label: string; readonly value: string };
type Receipt = Omit<RestaurantCustomerReceiptState, "lines"> & { readonly lines: readonly CartLine[] };

const api = {
  resolve: "/api/restaurant/table-sessions/resolve" as const,
  categories: "/api/restaurant/menu/categories" as const,
  items: "/api/restaurant/menu/items" as const,
  history: "/api/restaurant/orders/history" as const,
  status: (orderId: string) => "/api/restaurant/orders/" + encodeURIComponent(orderId) + "/status" as CustomerApiPath,
  receipt: (orderId: string) => "/api/restaurant/orders/" + encodeURIComponent(orderId) + "/receipt" as CustomerApiPath,
  lines: (orderId: string) => "/api/restaurant/orders/" + encodeURIComponent(orderId) + "/lines" as CustomerApiPath,
  line: (orderId: string, lineId: string) => "/api/restaurant/orders/" + encodeURIComponent(orderId) + "/lines/" + encodeURIComponent(lineId) as CustomerApiPath,
  submit: (orderId: string) => "/api/restaurant/orders/" + encodeURIComponent(orderId) + "/submit" as CustomerApiPath,
  payments: (orderId: string) => "/api/restaurant/orders/" + encodeURIComponent(orderId) + "/payments" as CustomerApiPath,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : "The request could not be completed.";
}

function titleCase(value: string): string {
  return value ? value[0]!.toUpperCase() + value.slice(1).replaceAll("-", " ") : "Unknown";
}

function orderState(value: unknown): OrderState {
  return projectRestaurantCustomerOrderState(value);
}

function projectedReceiptModifiers(value: unknown): readonly ReceiptModifier[] {
  if (!Array.isArray(value)) return [];
  const projected: ReceiptModifier[] = [];
  for (const candidate of value.slice(0, 20)) {
    if (!isRecord(candidate) || typeof candidate.key !== "string" || typeof candidate.label !== "string" || typeof candidate.value !== "string") continue;
    const key = candidate.key.trim();
    const label = candidate.label.trim();
    const modifierValue = candidate.value.trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,49}$/.test(key)) continue;
    if (!label || label.length > 100 || /[\u0000-\u001f\u007f]/.test(label)) continue;
    if (!modifierValue || modifierValue.length > 100 || /[\u0000-\u001f\u007f]/.test(modifierValue)) continue;
    projected.push({ key, label, value: modifierValue });
  }
  return projected;
}

function cartLine(value: unknown, menuItemName: string): CartLine {
  const line = projectRestaurantCustomerLine(value);
  return {
    ...line,
    menuItemName,
    modifiers: projectedReceiptModifiers(isRecord(value) ? value.modifiers : null),
  };
}

class CustomerRequestError extends Error {
  constructor(readonly status: number, readonly payload: unknown, message: string) {
    super(message);
    this.name = "CustomerRequestError";
  }
}

function requestHeaders(token?: string, idempotencyKey?: string): HeadersInit {
  return {
    "content-type": "application/json",
    "x-factory-role": "customer",
    ...(token ? { "x-factory-table-session-token": token } : {}),
    ...(idempotencyKey ? { "x-factory-idempotency-key": idempotencyKey } : {}),
  };
}

async function customerRequest<T>(path: CustomerApiPath, options: { readonly method?: "GET" | "POST" | "PATCH"; readonly token?: string; readonly body?: Readonly<Record<string, unknown>>; readonly idempotencyKey?: string } = {}): Promise<T> {
  const response = await fetch(path, {
    method: options.method ?? "GET",
    headers: requestHeaders(options.token, options.idempotencyKey),
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!response.ok) {
    const responseText = await response.text();
    let payload: unknown = null;
    try { payload = responseText ? JSON.parse(responseText) as unknown : null; } catch { payload = null; }
    const message = isRecord(payload) && typeof payload.message === "string" ? payload.message : "The Restaurant API rejected the request.";
    throw new CustomerRequestError(response.status, payload, message);
  }
  return await response.json() as T;
}

function storedCommandJournal(): CustomerCommandJournal {
  const serialized = sessionStorage.getItem(commandJournalStorageKey);
  if (!serialized) return [];
  try { return projectCustomerCommandJournal(JSON.parse(serialized) as unknown); } catch { return []; }
}

function commitCommandJournal(journal: CustomerCommandJournal): void {
  sessionStorage.setItem(commandJournalStorageKey, JSON.stringify(journal));
}

const commandJournalCoordinator = createCustomerCommandJournalCoordinator(
  storedCommandJournal,
  commitCommandJournal,
);

async function logicalMutation<T>(input: {
  readonly slot: string;
  readonly path: CustomerApiPath;
  readonly method: "POST" | "PATCH";
  readonly body: Readonly<Record<string, unknown>>;
  readonly token?: string;
  readonly onConflict?: (order: OrderState) => void;
}): Promise<{ readonly outcome: T; readonly confirm: () => Promise<void> }> {
  const prepared = await commandJournalCoordinator.retain(input.slot, input.body);
  try {
    const outcome = await customerRequest<T>(input.path, {
      method: input.method,
      token: input.token,
      body: input.body,
      idempotencyKey: prepared.command.key,
    });
    return {
      outcome,
      confirm: () => commandJournalCoordinator.confirm(prepared.command),
    };
  } catch (reason) {
    if (reason instanceof CustomerRequestError && input.token && input.onConflict) {
      const reconciled = await reconcileLogicalCommandConflict(
        prepared.journal,
        prepared.command,
        reason.status,
        reason.payload,
        (orderId) => customerRequest<unknown>(api.status(orderId), { token: input.token }),
      );
      if (reconciled) {
        input.onConflict(reconciled.order);
        await commandJournalCoordinator.confirm(prepared.command);
        throw new Error("Order state changed on the server. Review the confirmed status before retrying.");
      }
    }
    throw reason;
  }
}

function storedScope(): SessionScope | null {
  const serialized = sessionStorage.getItem(storageKey);
  if (!serialized) return null;
  try {
    const value = JSON.parse(serialized) as unknown;
    if (!isRecord(value) || typeof value.token !== "string" || !Array.isArray(value.lines)) return null;
    return { token: value.token, order: orderState(value.order), lines: value.lines.map((line) => cartLine(line, isRecord(line) && typeof line.menuItemName === "string" ? line.menuItemName : "Menu item")) };
  } catch {
    return null;
  }
}

function routeToken(path: string): string | null {
  if (!path.startsWith("/table/")) return null;
  const segment = path.slice("/table/".length);
  if (!segment || segment.includes("/")) return null;
  try { return decodeURIComponent(segment); } catch { return null; }
}

function receiptOrderId(path: string): string | null {
  if (!path.startsWith("/receipt/")) return null;
  const segment = path.slice("/receipt/".length);
  if (!segment || segment.includes("/")) return null;
  try { return decodeURIComponent(segment); } catch { return null; }
}

function CustomerNavigation({ scope }: { readonly scope: SessionScope | null }) {
  return <nav aria-label="Customer routes"><a href="/menu">Menu</a><a href="/cart">Cart</a><a href="/orders/current">Current order</a>{scope?.order.paymentStatus === "paid" ? <a href={"/receipt/" + encodeURIComponent(scope.order.id)}>Receipt</a> : null}</nav>;
}

function EntryPage({ token, scope, commit, reportError }: { readonly token: string | null; readonly scope: SessionScope | null; readonly commit: (scope: SessionScope) => void; readonly reportError: (reason: unknown) => void }) {
  const [resolving, setResolving] = useState(false);
  const resolveSession = async () => {
    if (!token || scope?.token === token) return;
    setResolving(true);
    try {
      const command = await logicalMutation<{ readonly order: unknown }>({
        slot: "session:resolve",
        path: api.resolve,
        method: "POST",
        body: { expectedVersion: 0, token },
      });
      commit({ token, order: orderState(command.outcome.order), lines: [] });
      await command.confirm();
    } finally {
      setResolving(false);
    }
  };
  useEffect(() => {
    void resolveSession().catch(reportError);
  }, [token]);
  if (!token) return <section className="generated-card"><h2>Table session required</h2><p>Open the opaque table-session link supplied by the restaurant.</p></section>;
  if (scope?.token === token) return <section className="generated-card"><h2>Table session active</h2><p>Your order is bound to this browser session.</p><a className="generated-primary" href="/menu">Browse menu</a></section>;
  return <section className="generated-card"><h2>Resolving table session</h2><p>{resolving ? "Checking the opaque session token…" : "The Restaurant API did not confirm this session."}</p>{!resolving ? <button type="button" onClick={() => void resolveSession().catch(reportError)}>Retry table session</button> : null}</section>;
}

function MenuPage({ scope, commit, reportError }: { readonly scope: SessionScope; readonly commit: (scope: SessionScope) => void; readonly reportError: (reason: unknown) => void }) {
  const [categories, setCategories] = useState<readonly MenuCategory[]>([]);
  const [items, setItems] = useState<readonly MenuItem[]>([]);
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState<Record<string, { quantity: string; note: string }>>({});
  const loadMenu = async () => {
    const search = new URLSearchParams();
    if (category) search.set("category", category);
    if (query.trim()) search.set("query", query.trim());
    const path = (api.items + (search.size ? "?" + search.toString() : "")) as CustomerApiPath;
    const [nextCategories, nextItems] = await Promise.all([
      customerRequest<readonly MenuCategory[]>(api.categories),
      customerRequest<readonly MenuItem[]>(path),
    ]);
    setCategories(nextCategories);
    setItems(nextItems);
  };
  useEffect(() => { void loadMenu().catch(reportError); }, []);
  const add = async (item: MenuItem) => {
    const draft = drafts[item.id] ?? { quantity: "1", note: "" };
    const quantity = Number(draft.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) throw new Error("Quantity must be a positive integer.");
    const body = { expectedVersion: scope.order.orderVersion, menuItemId: item.id, quantity, lineNote: draft.note, modifiers: [] };
    const command = await logicalMutation<{ readonly line: unknown; readonly orderVersion: number; readonly total: unknown }>({
      slot: "order:" + scope.order.id + ":line:add:" + item.id,
      path: api.lines(scope.order.id),
      method: "POST",
      token: scope.token,
      body,
      onConflict: (order) => commit({ ...scope, order }),
    });
    commitRestaurantCustomerLineMutation(command.outcome, (projection) => {
      const line = { ...projection.line, menuItemName: item.name, modifiers: projectedReceiptModifiers(projection.modifiers) };
      commit({ ...scope, order: { ...scope.order, orderVersion: projection.orderVersion, total: projection.total }, lines: [...scope.lines, line] });
    });
    await command.confirm();
  };
  return <section className="generated-card"><div className="generated-section-heading"><div><p>Customer menu</p><h2>Menu</h2></div><button type="button" onClick={() => void loadMenu().catch(reportError)}>Refresh</button></div><form onSubmit={(event) => { event.preventDefault(); void loadMenu().catch(reportError); }}><label>Search menu<input value={query} onChange={(event) => setQuery(event.target.value)} /></label><label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{categories.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label><button type="submit">Search</button></form><ul className="generated-records">{items.map((item) => { const draft = drafts[item.id] ?? { quantity: "1", note: "" }; return <li key={item.id}><div><h3>{item.name}</h3><p>{item.description}</p><p>{item.price.toFixed(2)} · {item.stock} available</p></div><span><label>Quantity<input aria-label="Quantity" inputMode="numeric" value={draft.quantity} onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: { ...draft, quantity: event.target.value } }))} /></label><label>Item note<input aria-label="Item note" value={draft.note} onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: { ...draft, note: event.target.value } }))} /></label><button className="generated-primary" type="button" onClick={() => void add(item).catch(reportError)}>Add {item.name}</button></span></li>; })}</ul></section>;
}

function CartPage({ scope, commit, reportError }: { readonly scope: SessionScope; readonly commit: (scope: SessionScope) => void; readonly reportError: (reason: unknown) => void }) {
  const [note, setNote] = useState(scope.order.orderNote);
  const [paymentMethod, setPaymentMethod] = useState<RestaurantPaymentMethod>("cash");
  const [quantities, setQuantities] = useState<Record<string, string>>(Object.fromEntries(scope.lines.map((line) => [line.id, String(line.quantity)])));
  const updateLine = async (line: CartLine) => {
    const quantity = Number(quantities[line.id] ?? line.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) throw new Error("Quantity must be a positive integer.");
    const body = { expectedVersion: scope.order.orderVersion, quantity, lineNote: line.lineNote, modifiers: line.modifiers };
    const command = await logicalMutation<{ readonly line: unknown; readonly orderVersion: number; readonly total: unknown }>({
      slot: "order:" + scope.order.id + ":line:update:" + line.id,
      path: api.line(scope.order.id, line.id),
      method: "PATCH",
      token: scope.token,
      body,
      onConflict: (order) => commit({ ...scope, order }),
    });
    commitRestaurantCustomerLineMutation(command.outcome, (projection) => {
      const updatedLine = { ...projection.line, menuItemName: line.menuItemName, modifiers: projectedReceiptModifiers(projection.modifiers) };
      commit({ ...scope, order: { ...scope.order, orderVersion: projection.orderVersion, total: projection.total }, lines: scope.lines.map((candidate) => candidate.id === line.id ? updatedLine : candidate) });
    });
    await command.confirm();
  };
  const pay = async () => {
    let current = scope;
    if (current.order.status === "cart") {
      const submitBody = { expectedVersion: current.order.orderVersion, orderNote: note };
      const submitCommand = await logicalMutation<{ readonly status: string; readonly orderNote: string; readonly orderVersion: number }>({
        slot: "order:" + current.order.id + ":submit",
        path: api.submit(current.order.id),
        method: "POST",
        token: current.token,
        body: submitBody,
        onConflict: (order) => commit({ ...current, order }),
      });
      current = { ...current, order: { ...current.order, status: submitCommand.outcome.status, orderNote: submitCommand.outcome.orderNote, orderVersion: submitCommand.outcome.orderVersion } };
      commit(current);
      await submitCommand.confirm();
    }
    const paymentBody = { expectedVersion: current.order.orderVersion, amount: current.order.total, method: paymentMethod };
    const paymentCommand = await logicalMutation<unknown>({
      slot: "order:" + current.order.id + ":payment",
      path: api.payments(current.order.id),
      method: "POST",
      token: current.token,
      body: paymentBody,
      onConflict: (order) => commit({ ...current, order }),
    });
    const confirmed = orderState(await customerRequest<unknown>(api.status(current.order.id), { token: current.token }));
    commit({ ...current, order: confirmed });
    await paymentCommand.confirm();
  };
  return <section className="generated-card"><div><p>Server-confirmed cart</p><h2>Cart</h2></div><ul className="generated-records">{scope.lines.map((line) => <li key={line.id}><div><h3>{line.menuItemName}</h3><p>{line.lineNote || "No item note"}</p></div><span><label>Quantity<input aria-label={"Quantity for " + line.menuItemName} value={quantities[line.id] ?? String(line.quantity)} onChange={(event) => setQuantities((current) => ({ ...current, [line.id]: event.target.value }))} /></label><button type="button" onClick={() => void updateLine(line).catch(reportError)}>Update quantity</button></span></li>)}</ul><label>Order note<input value={note} onChange={(event) => setNote(event.target.value)} /></label><label>Payment method<select value={paymentMethod} onChange={(event) => setPaymentMethod(restaurantPaymentMethod(event.target.value))}>{restaurantPaymentMethods.map((method) => <option key={method} value={method}>{titleCase(method)}</option>)}</select></label><p>Total: {scope.order.total.toFixed(2)}</p><p>Status: <strong>{titleCase(scope.order.status)}</strong></p><button className="generated-primary" type="button" disabled={!scope.lines.length || !["cart", "submitted"].includes(scope.order.status)} onClick={() => void pay().catch(reportError)}>Pay simulated payment</button></section>;
}

function TrackerPage({ scope, commit, reportError }: { readonly scope: SessionScope; readonly commit: (scope: SessionScope) => void; readonly reportError: (reason: unknown) => void }) {
  const [history, setHistory] = useState<readonly CustomerOrder[]>([]);
  const refresh = async () => {
    const [confirmed, orders] = await Promise.all([
      customerRequest<unknown>(api.status(scope.order.id), { token: scope.token }),
      customerRequest<unknown>(api.history, { token: scope.token }),
    ]);
    commit({ ...scope, order: orderState(confirmed) });
    if (!Array.isArray(orders)) throw new Error("The Restaurant API returned invalid order history.");
    setHistory(orders.map(projectRestaurantCustomerOrder));
  };
  useEffect(() => { void refresh().catch(reportError); }, [scope.order.id]);
  return <section className="generated-card"><div className="generated-section-heading"><div><p>Server-confirmed status</p><h2>Current order</h2></div><button type="button" onClick={() => void refresh().catch(reportError)}>Refresh status</button></div><p>Status: <strong>{titleCase(scope.order.status)}</strong></p><h3>Session order history</h3><ul className="generated-records">{history.map((order) => <li key={order.id}><span>{titleCase(order.status)}</span><span>{order.total.toFixed(2)}</span>{order.paymentStatus === "paid" ? <a href={"/receipt/" + encodeURIComponent(order.id)}>Receipt</a> : null}</li>)}</ul></section>;
}

function ReceiptPage({ scope, orderId, reportError }: { readonly scope: SessionScope; readonly orderId: string; readonly reportError: (reason: unknown) => void }) {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  useEffect(() => {
    void customerRequest<unknown>(api.receipt(orderId), { token: scope.token }).then((value) => { const projected = projectRestaurantCustomerReceipt(value); setReceipt({ ...projected, lines: projected.lines.map((line) => ({ ...line, modifiers: projectedReceiptModifiers(line.modifiers) })) }); }).catch(reportError);
  }, [orderId]);
  if (!receipt) return <section className="generated-card"><h2>Receipt</h2><p>Loading server-confirmed receipt…</p></section>;
  return <section className="generated-card"><h2>Receipt</h2><p>{titleCase(receipt.paymentStatus)}</p><ul className="generated-records">{receipt.lines.map((line) => <li key={line.id}><div><h3>{line.menuItemName}</h3><p>{line.quantity} × {line.unitPrice.toFixed(2)}</p><p>{line.lineNote}</p>{line.modifiers.map((modifier) => <p key={modifier.key}>{modifier.label}: {modifier.value}</p>)}</div></li>)}</ul><p>{receipt.orderNote}</p><p>Total: {receipt.total.toFixed(2)}</p></section>;
}

export function GeneratedApplication({ requestedPath }: { readonly requestedPath: string }) {
  const [scope, setScope] = useState<SessionScope | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setScope(storedScope()); setStorageReady(true); }, []);
  const commit = (next: SessionScope) => { setScope(next); sessionStorage.setItem(storageKey, JSON.stringify(next)); };
  const reportError = (reason: unknown) => setError(errorMessage(reason));
  const token = routeToken(requestedPath);
  const receiptId = receiptOrderId(requestedPath);
  let content;
  if (!storageReady) content = <section className="generated-card"><p>Loading active session…</p></section>;
  else if (token !== null || requestedPath === "/" || requestedPath === "/table/:token") content = <EntryPage token={token} scope={scope} commit={commit} reportError={reportError} />;
  else if (!scope) content = <section className="generated-card"><h2>Table session required</h2><p>Open the opaque table-session link before using Customer pages.</p></section>;
  else if (requestedPath === "/menu") content = <MenuPage scope={scope} commit={commit} reportError={reportError} />;
  else if (requestedPath === "/cart") content = <CartPage scope={scope} commit={commit} reportError={reportError} />;
  else if (requestedPath === "/orders/current") content = <TrackerPage scope={scope} commit={commit} reportError={reportError} />;
  else if (receiptId) content = <ReceiptPage scope={scope} orderId={receiptId} reportError={reportError} />;
  else content = <section className="generated-card"><h2>Customer route unavailable</h2><p>This generated slice exposes only the validated Restaurant Customer routes.</p></section>;
  return <main className="generated-app" data-theme="light"><header className="generated-header"><div><p>Restaurant Customer</p><h1>{applicationName}</h1></div>{scope ? <p>Order {scope.order.id}</p> : null}</header><CustomerNavigation scope={scope} />{error ? <p className="generated-error" role="alert">{error}</p> : null}<section className="generated-page">{content}</section></main>;
}
`;
}
