import { assertRestaurantOrderingProfile } from "@factory/capabilities";
import type { ApplicationGraphV1 } from "@factory/graph";

import { createGeneratedPageRuntimeProjection } from "./page-runtime-projection.js";

const merchantRoutes = [
  "/merchant/tables",
  "/merchant/menu",
  "/merchant/kitchen",
  "/merchant/cashier",
  "/merchant/analytics",
] as const;

export function renderRestaurantEventPublisher(): string {
  return String.raw`import type { PrismaClient } from "@prisma/client";

export type RestaurantEventV1 = {
  readonly type: "order.created" | "order.transitioned" | "inventory.changed";
  readonly orderId?: string;
  readonly locationId: string;
  readonly version: number;
  readonly occurredAt: string;
};

export interface RestaurantEventPublisher {
  publish(event: RestaurantEventV1): Promise<void>;
}

export class RecordingRestaurantEventPublisher implements RestaurantEventPublisher {
  readonly published: RestaurantEventV1[] = [];

  async publish(event: RestaurantEventV1): Promise<void> {
    this.published.push(event);
  }
}

const eventTypes = new Set<RestaurantEventV1["type"]>([
  "order.created",
  "order.transitioned",
  "inventory.changed",
]);

export class RestaurantOutboxProcessor {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly publisher: RestaurantEventPublisher,
  ) {}

  async publishCommitted(limit = 100): Promise<number> {
    const rows = await this.prisma.restaurantOutboxEvent.findMany({
      where: { publishedAt: null, type: { in: [...eventTypes] } },
      orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
      take: Math.max(1, Math.min(limit, 100)),
    });
    let published = 0;
    for (const row of rows) {
      if (!eventTypes.has(row.type as RestaurantEventV1["type"])) continue;
      const event: RestaurantEventV1 = {
        type: row.type as RestaurantEventV1["type"],
        ...(row.aggregateId ? { orderId: row.aggregateId } : {}),
        locationId: row.locationId,
        version: row.version,
        occurredAt: row.occurredAt.toISOString(),
      };
      await this.publisher.publish(event);
      const marked = await this.prisma.restaurantOutboxEvent.updateMany({
        where: { id: row.id, publishedAt: null },
        data: { publishedAt: new Date() },
      });
      if (marked.count === 1) published += 1;
    }
    return published;
  }
}
`;
}

export function renderRestaurantMerchantPageRuntime(
  graph: ApplicationGraphV1,
): string {
  assertRestaurantOrderingProfile(graph);
  const projection = createGeneratedPageRuntimeProjection(graph);
  const routes = new Set(projection.pages.map((page) => page.route));
  for (const route of merchantRoutes) {
    if (!routes.has(route)) {
      throw new Error(
        `Validated Restaurant Merchant route '${route}' is missing.`,
      );
    }
  }

  return String.raw`"use client";

import { useEffect, useState } from "react";

type MerchantRole = "manager" | "kitchen" | "cashier";
type MerchantApiPath =
  | "/api/restaurant/merchant/tables"
  | "/api/restaurant/merchant/menu/categories"
  | "/api/restaurant/merchant/menu/items"
  | "/api/restaurant/merchant/kitchen-tickets"
  | "/api/restaurant/merchant/orders"
  | "/api/restaurant/reports/summary"
  | "/api/restaurant/reports/low-stock"
  | ("/api/restaurant/merchant/tables/" & string)
  | ("/api/restaurant/merchant/menu/items/" & string)
  | ("/api/restaurant/merchant/orders/" & string)
  | ("/api/restaurant/orders/" & string)
  | ("/api/restaurant/kitchen-tickets/" & string);

type RestaurantTableView = { readonly id: string; readonly code: string; readonly number: number; readonly status: string; readonly active: boolean; readonly resourceVersion: number; readonly activeSessionId: string | null };
type MenuCategoryView = { readonly id: string; readonly name: string; readonly sortOrder: number; readonly active: boolean };
type MenuItemView = { readonly id: string; readonly categoryKey: string; readonly name: string; readonly available: boolean; readonly stock: number; readonly price: number; readonly resourceVersion: number };
type MerchantOrderView = { readonly id: string; readonly status: string; readonly paymentStatus: string; readonly orderVersion: number; readonly total: number; readonly tableNumber: number; readonly paidAt: string | null };
type KitchenTicketView = { readonly id: string; readonly orderId: string; readonly tableNumber: number; readonly priority: number; readonly status: string; readonly paidAt: string; readonly orderVersion: number };
type DashboardView = { readonly salesTotal: number; readonly orderCount: number; readonly averagePreparationMilliseconds: number; readonly cancellationCount: number };
type LowStockView = { readonly id: string; readonly name: string; readonly stock: number };
type ReceiptLine = { readonly id: string; readonly menuItemName: string; readonly quantity: number; readonly unitPrice: number; readonly lineNote: string; readonly modifiers: readonly { readonly key: string; readonly label: string; readonly value: string }[] };
type ReceiptView = MerchantOrderView & { readonly orderNote: string; readonly lines: readonly ReceiptLine[]; readonly payments: readonly { readonly id: string; readonly method: string; readonly amount: number; readonly status: string }[] };

const api = {
  tables: "/api/restaurant/merchant/tables" as const,
  tableEvent: (id: string, event: string) => "/api/restaurant/merchant/tables/" + encodeURIComponent(id) + "/events/" + encodeURIComponent(event) as MerchantApiPath,
  categories: "/api/restaurant/merchant/menu/categories" as const,
  items: "/api/restaurant/merchant/menu/items" as const,
  availability: (id: string) => "/api/restaurant/merchant/menu/items/" + encodeURIComponent(id) + "/availability" as MerchantApiPath,
  stock: (id: string) => "/api/restaurant/merchant/menu/items/" + encodeURIComponent(id) + "/stock-adjustments" as MerchantApiPath,
  kitchen: "/api/restaurant/merchant/kitchen-tickets" as const,
  kitchenEvent: (id: string, event: string) => "/api/restaurant/kitchen-tickets/" + encodeURIComponent(id) + "/events/" + encodeURIComponent(event) as MerchantApiPath,
  orders: "/api/restaurant/merchant/orders" as const,
  receipt: (id: string) => "/api/restaurant/merchant/orders/" + encodeURIComponent(id) + "/receipt" as MerchantApiPath,
  pay: (id: string) => "/api/restaurant/orders/" + encodeURIComponent(id) + "/payments" as MerchantApiPath,
  serve: (id: string) => "/api/restaurant/orders/" + encodeURIComponent(id) + "/serve" as MerchantApiPath,
  cancel: (id: string) => "/api/restaurant/orders/" + encodeURIComponent(id) + "/cancel" as MerchantApiPath,
  reportSummary: "/api/restaurant/reports/summary" as const,
  lowStock: "/api/restaurant/reports/low-stock" as const,
};

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : "The Merchant request could not be completed.";
}

async function merchantRequest<T>(role: MerchantRole, path: MerchantApiPath, options: { readonly method?: "GET" | "POST" | "PATCH"; readonly body?: Readonly<Record<string, unknown>> } = {}): Promise<T> {
  const response = await fetch(path, {
    method: options.method ?? "GET",
    headers: {
      "content-type": "application/json",
      "x-factory-role": role,
      ...(options.method && options.method !== "GET" ? { "x-factory-idempotency-key": crypto.randomUUID() } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!response.ok) {
    const payload = await response.text();
    throw new Error(payload || "The Restaurant API rejected the Merchant request.");
  }
  return await response.json() as T;
}

function MerchantNavigation() {
  return <nav aria-label="Merchant routes"><a href="/merchant/tables">Tables</a><a href="/merchant/menu">Menu</a><a href="/merchant/kitchen">Kitchen</a><a href="/merchant/cashier">Cashier</a><a href="/merchant/analytics">Analytics</a></nav>;
}

function TableBoard({ reportError }: { readonly reportError: (reason: unknown) => void }) {
  const [tables, setTables] = useState<readonly RestaurantTableView[]>([]);
  const load = () => merchantRequest<readonly RestaurantTableView[]>("manager", api.tables).then(setTables);
  useEffect(() => { void load().catch(reportError); }, []);
  const transition = async (table: RestaurantTableView, event: "open" | "seat" | "close") => {
    await merchantRequest("manager", api.tableEvent(table.id, event), { method: "POST", body: { expectedVersion: table.resourceVersion, guestCount: 2 } });
    await load();
  };
  return <section className="generated-card"><h2>Table board</h2><ul className="generated-records">{tables.map((table) => <li key={table.id}><span>Table {table.number} · {table.status}</span><span><button type="button" onClick={() => void transition(table, "open").catch(reportError)}>Open table</button><button type="button" onClick={() => void transition(table, "seat").catch(reportError)}>Seat table</button><button type="button" onClick={() => void transition(table, "close").catch(reportError)}>Close table</button></span></li>)}</ul></section>;
}

function MenuManager({ reportError }: { readonly reportError: (reason: unknown) => void }) {
  const [categories, setCategories] = useState<readonly MenuCategoryView[]>([]);
  const [items, setItems] = useState<readonly MenuItemView[]>([]);
  const [adjustments, setAdjustments] = useState<Record<string, string>>({});
  const load = async () => {
    const [nextCategories, nextItems] = await Promise.all([merchantRequest<readonly MenuCategoryView[]>("manager", api.categories), merchantRequest<readonly MenuItemView[]>("manager", api.items)]);
    setCategories(nextCategories);
    setItems(nextItems);
  };
  useEffect(() => { void load().catch(reportError); }, []);
  const availability = async (item: MenuItemView) => {
    await merchantRequest("manager", api.availability(item.id), { method: "PATCH", body: { expectedVersion: item.resourceVersion, available: !item.available } });
    await load();
  };
  const adjust = async (item: MenuItemView) => {
    const delta = Number(adjustments[item.id] ?? "0");
    if (!Number.isInteger(delta) || delta === 0) throw new Error("Stock adjustment must be a non-zero integer.");
    await merchantRequest("manager", api.stock(item.id), { method: "POST", body: { expectedVersion: item.resourceVersion, delta, adjustmentReason: delta > 0 ? "restock" : "correction" } });
    await load();
  };
  return <section className="generated-card"><h2>Menu manager</h2><p>{categories.length} server categories</p><ul className="generated-records">{items.map((item) => <li key={item.id}><span>{item.name} · stock {item.stock} · {item.available ? "Available" : "Disabled"}</span><span><button type="button" onClick={() => void availability(item).catch(reportError)}>{item.available ? "Disable" : "Enable"}</button><label>Stock adjustment<input value={adjustments[item.id] ?? ""} onChange={(event) => setAdjustments((current) => ({ ...current, [item.id]: event.target.value }))} /></label><button type="button" onClick={() => void adjust(item).catch(reportError)}>Adjust stock</button></span></li>)}</ul></section>;
}

function KitchenBoard({ reportError }: { readonly reportError: (reason: unknown) => void }) {
  const [tickets, setTickets] = useState<readonly KitchenTicketView[]>([]);
  const load = () => merchantRequest<readonly KitchenTicketView[]>("kitchen", api.kitchen).then(setTickets);
  useEffect(() => { void load().catch(reportError); }, []);
  const transition = async (ticket: KitchenTicketView, event: "accept" | "start-preparing" | "mark-ready") => {
    await merchantRequest("kitchen", api.kitchenEvent(ticket.id, event), { method: "POST", body: { expectedVersion: ticket.orderVersion } });
    await load();
  };
  return <section className="generated-card"><h2>Kitchen board</h2><ul className="generated-records">{tickets.map((ticket) => <li key={ticket.id}><span>Table {ticket.tableNumber} · priority {ticket.priority} · {ticket.status}</span><span>{ticket.status === "paid" ? <button type="button" onClick={() => void transition(ticket, "accept").catch(reportError)}>Accept order</button> : null}{ticket.status === "accepted" ? <button type="button" onClick={() => void transition(ticket, "start-preparing").catch(reportError)}>Start preparing</button> : null}{ticket.status === "preparing" ? <button type="button" onClick={() => void transition(ticket, "mark-ready").catch(reportError)}>Mark ready</button> : null}</span></li>)}</ul></section>;
}

function CashierConsole({ reportError }: { readonly reportError: (reason: unknown) => void }) {
  const [orders, setOrders] = useState<readonly MerchantOrderView[]>([]);
  const [receipt, setReceipt] = useState<ReceiptView | null>(null);
  const load = () => merchantRequest<readonly MerchantOrderView[]>("cashier", api.orders).then(setOrders);
  useEffect(() => { void load().catch(reportError); }, []);
  const pay = async (order: MerchantOrderView) => { await merchantRequest("cashier", api.pay(order.id), { method: "POST", body: { expectedVersion: order.orderVersion, amount: order.total, method: "cash" } }); await load(); };
  const serve = async (order: MerchantOrderView) => { await merchantRequest("cashier", api.serve(order.id), { method: "POST", body: { expectedVersion: order.orderVersion } }); await load(); };
  const showReceipt = async (order: MerchantOrderView) => setReceipt(await merchantRequest<ReceiptView>("cashier", api.receipt(order.id)));
  return <section className="generated-card"><h2>Cashier console</h2><ul className="generated-records">{orders.map((order) => <li key={order.id}><span>Table {order.tableNumber} · {order.status} · {order.total.toFixed(2)}</span><span>{order.status === "submitted" ? <button type="button" onClick={() => void pay(order).catch(reportError)}>Capture simulated payment</button> : null}{order.status === "ready" ? <button type="button" onClick={() => void serve(order).catch(reportError)}>Mark served</button> : null}{order.paymentStatus !== "unpaid" ? <button type="button" onClick={() => void showReceipt(order).catch(reportError)}>View receipt</button> : null}</span></li>)}</ul>{receipt ? <article aria-label="Browser receipt"><h3>Receipt</h3>{receipt.lines.map((line) => <p key={line.id}>{line.quantity} × {line.menuItemName} · {(line.quantity * line.unitPrice).toFixed(2)}</p>)}<p>Total: {receipt.total.toFixed(2)}</p><button type="button" onClick={() => window.print()}>Print receipt</button></article> : null}</section>;
}

function RestaurantDashboard({ reportError }: { readonly reportError: (reason: unknown) => void }) {
  const [summary, setSummary] = useState<DashboardView | null>(null);
  const [lowStock, setLowStock] = useState<readonly LowStockView[]>([]);
  const [orders, setOrders] = useState<readonly MerchantOrderView[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const load = async () => {
    const [nextSummary, nextLowStock, nextOrders] = await Promise.all([merchantRequest<DashboardView>("manager", api.reportSummary), merchantRequest<readonly LowStockView[]>("manager", api.lowStock), merchantRequest<readonly MerchantOrderView[]>("manager", api.orders)]);
    setSummary(nextSummary); setLowStock(nextLowStock); setOrders(nextOrders);
  };
  useEffect(() => { void load().catch(reportError); }, []);
  const cancel = async (order: MerchantOrderView) => {
    const reason = (reasons[order.id] ?? "").trim();
    if (!reason) throw new Error("Cancellation reason is required.");
    const outcome = await merchantRequest<{ readonly inventoryReleased: boolean; readonly auditRecorded: true; readonly reason: string }>("manager", api.cancel(order.id), { method: "POST", body: { expectedVersion: order.orderVersion, reason } });
    setConfirmation((outcome.inventoryReleased ? "Inventory released" : "No inventory release required") + " · " + outcome.reason + (outcome.auditRecorded ? " · Audit recorded" : ""));
    await load();
  };
  return <section className="generated-card"><h2>Restaurant dashboard</h2>{summary ? <dl><dt>Sales total</dt><dd>{summary.salesTotal.toFixed(2)}</dd><dt>Order count</dt><dd>{summary.orderCount}</dd><dt>Average preparation</dt><dd>{Math.round(summary.averagePreparationMilliseconds / 1000)} seconds</dd><dt>Cancellations</dt><dd>{summary.cancellationCount}</dd></dl> : <p>Loading server metrics…</p>}<h3>Low stock</h3><ul>{lowStock.map((item) => <li key={item.id}>{item.name}: {item.stock}</li>)}</ul><h3>Eligible cancellations</h3><ul className="generated-records">{orders.filter((order) => order.status === "submitted" || order.status === "paid").map((order) => <li key={order.id}><span>Table {order.tableNumber} · {order.status}</span><span><label>Cancellation reason<input value={reasons[order.id] ?? ""} onChange={(event) => setReasons((current) => ({ ...current, [order.id]: event.target.value }))} /></label><button type="button" onClick={() => void cancel(order).catch(reportError)}>Cancel order</button></span></li>)}</ul>{confirmation ? <p>{confirmation}</p> : null}</section>;
}

export function RestaurantMerchantApplication({ requestedPath }: { readonly requestedPath: string }) {
  const [error, setError] = useState<string | null>(null);
  const reportError = (reason: unknown) => setError(errorMessage(reason));
  let content;
  if (requestedPath === "/merchant/tables") content = <TableBoard reportError={reportError} />;
  else if (requestedPath === "/merchant/menu") content = <MenuManager reportError={reportError} />;
  else if (requestedPath === "/merchant/kitchen") content = <KitchenBoard reportError={reportError} />;
  else if (requestedPath === "/merchant/cashier") content = <CashierConsole reportError={reportError} />;
  else if (requestedPath === "/merchant/analytics") content = <RestaurantDashboard reportError={reportError} />;
  else content = <section className="generated-card"><h2>Merchant route unavailable</h2></section>;
  return <main className="generated-app" data-theme="light"><header className="generated-header"><div><p>Restaurant Merchant</p><h1>Merchant operations</h1></div></header><MerchantNavigation />{error ? <p className="generated-error" role="alert">{error}</p> : null}<section className="generated-page">{content}</section></main>;
}
`;
}
