import {
  assertRestaurantOrderingProfile,
  capabilityAssets,
  type RestaurantProfileProjectionV1,
} from "@factory/capabilities";
import type { ApplicationGraphV1 } from "@factory/graph";

export const restaurantRuntimeApiVersion =
  "factory.restaurant-transaction-runtime/v1" as const;

export const restaurantRuntimeEndpoints = Object.freeze([
  ["POST", "/api/restaurant/table-sessions/resolve"],
  ["POST", "/api/restaurant/orders/:id/lines"],
  ["PATCH", "/api/restaurant/orders/:id/lines/:lineId"],
  ["POST", "/api/restaurant/orders/:id/submit"],
  ["POST", "/api/restaurant/orders/:id/payments"],
  ["POST", "/api/restaurant/orders/:id/cancel"],
  ["POST", "/api/restaurant/kitchen-tickets/:id/events/:event"],
  ["POST", "/api/restaurant/orders/:id/serve"],
  ["GET", "/api/restaurant/reports/summary"],
  ["GET", "/api/restaurant/reports/low-stock"],
] as const);

export interface RestaurantRuntimeArtifacts {
  readonly profile: RestaurantProfileProjectionV1;
  readonly applicationRuntimeContract: string;
  readonly commandService: string;
  readonly main: string;
  readonly prismaSchema: string;
  readonly initialMigration: string;
  readonly generatedTests: string;
  readonly apiReference: string;
  readonly transitionalWebShell: string;
}

function renderApplicationRuntimeContract(): string {
  return String.raw`export type StoredRecord = Record<string, unknown> & { id: string; status?: string };
export type AuditEvent = { actor: string; action: string; entity: string; recordId: string; at: string };
export type CapabilityEvent = { actor: string; capability: string; operation: string; entity: string; recordId: string; outcome: "succeeded"; at: string };
export type CommerceLineItem = { id: string; actor: string; orderEntity: string; orderRecordId: string; catalogEntity: string; catalogRecordId: string; quantity: number };

export interface RecordStore {
  list(entityKey: string): Promise<readonly StoredRecord[]>;
  find(entityKey: string, recordId: string): Promise<StoredRecord | undefined>;
  create(entityKey: string, input: Record<string, unknown>): Promise<StoredRecord>;
  update(entityKey: string, recordId: string, input: Record<string, unknown>): Promise<StoredRecord>;
  appendAudit(event: AuditEvent): Promise<void>;
  listAudit(): Promise<readonly AuditEvent[]>;
  appendCapabilityEvent(event: CapabilityEvent): Promise<void>;
  listCapabilityEvents(): Promise<readonly CapabilityEvent[]>;
  addCartItem(input: Omit<CommerceLineItem, "id">): Promise<CommerceLineItem>;
  listCartItems(orderEntity: string, orderRecordId: string): Promise<readonly CommerceLineItem[]>;
  decrementInventory(entityKey: string, recordId: string, quantity: number): Promise<StoredRecord>;
}
`;
}

type RestaurantOrderTransition = Readonly<{
  from: string;
  event: string;
  to: string;
  effects: readonly Readonly<{ capability: string; operation: string }>[];
}>;

type RestaurantCommandEffect = Readonly<{
  capability: string;
  operation: string;
}>;

type RestaurantCommandEffects = Readonly<{
  resolveTableSession: RestaurantCommandEffect;
  addLine: RestaurantCommandEffect;
  updateLine: RestaurantCommandEffect;
}>;

function acceptedAssetEffect(
  assetKey: "restaurant.ordering" | "restaurant.table-session",
  capability: string,
): RestaurantCommandEffect {
  const asset = capabilityAssets.find(
    (candidate) =>
      candidate.manifest.key === assetKey &&
      candidate.manifest.version === "1.0.0",
  );
  if (!asset) {
    throw new Error(
      `Accepted Restaurant Golden asset '${assetKey}@1.0.0' is not registered.`,
    );
  }
  if (!asset.manifest.effects.includes(capability)) {
    throw new Error(
      `Restaurant Golden asset '${asset.manifest.key}' does not declare operation '${capability}'.`,
    );
  }
  const operation = capability.slice(capability.lastIndexOf(".") + 1);
  if (!operation) {
    throw new Error(
      `Restaurant Golden asset operation '${capability}' has no operation segment.`,
    );
  }
  return { capability, operation };
}

function restaurantCommandEffects(): RestaurantCommandEffects {
  return {
    resolveTableSession: acceptedAssetEffect(
      "restaurant.table-session",
      "table-session.validate",
    ),
    addLine: acceptedAssetEffect("restaurant.ordering", "order.line.add"),
    updateLine: acceptedAssetEffect("restaurant.ordering", "order.line.update"),
  };
}

function restaurantOrderTransitions(
  graph: ApplicationGraphV1,
): readonly RestaurantOrderTransition[] {
  const flow = graph.flow.flows.find(
    (candidate) => candidate.entity === "order",
  );
  if (!flow) throw new Error("Validated Restaurant order flow is missing.");
  return flow.transitions.map((transition) => ({
    from: transition.from,
    event: transition.event,
    to: transition.to,
    effects: (transition.effects ?? []).map((effect) => ({
      capability: effect.capability,
      operation: effect.operation,
    })),
  }));
}

function renderTransitionEffects(
  transitions: readonly RestaurantOrderTransition[],
): string {
  return transitions
    .map(
      (transition) =>
        `  { from: ${JSON.stringify(transition.from)}, event: ${JSON.stringify(transition.event)}, to: ${JSON.stringify(transition.to)}, effects: [${transition.effects
          .map(
            (effect) =>
              `{ capability: ${JSON.stringify(effect.capability)}, operation: ${JSON.stringify(effect.operation)} }`,
          )
          .join(", ")}] },`,
    )
    .join("\n");
}

function renderCommandEffects(effects: RestaurantCommandEffects): string {
  return Object.entries(effects)
    .map(
      ([command, effect]) =>
        `  ${command}: { kind: "command", capability: ${JSON.stringify(effect.capability)}, operation: ${JSON.stringify(effect.operation)}, auditAction: ${JSON.stringify(effect.capability)} },`,
    )
    .join("\n");
}

function renderCommandService(
  profile: RestaurantProfileProjectionV1,
  transitions: readonly RestaurantOrderTransition[],
  commandEffects: RestaurantCommandEffects,
): string {
  return String.raw`import { createHash } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";

export type RestaurantCommandBody = Record<string, unknown> & {
  readonly expectedVersion: number;
};

export type RestaurantCommandOutcome = Record<string, unknown>;

export type RestaurantSafeOrderState = {
  readonly id: string;
  readonly status: string;
  readonly paymentStatus: string;
  readonly orderVersion: number;
  readonly total: number;
};

export type RestaurantVersionConflictPayload = {
  readonly code: "restaurant.order.version_conflict";
  readonly message: string;
  readonly currentOrder: RestaurantSafeOrderState;
};

export class RestaurantVersionConflict extends Error {
  readonly payload: RestaurantVersionConflictPayload;

  constructor(currentOrder: RestaurantSafeOrderState) {
    const message = "Stale order version. Current version is " + currentOrder.orderVersion + ".";
    super(message);
    this.name = "RestaurantVersionConflict";
    this.payload = { code: "restaurant.order.version_conflict", message, currentOrder };
  }
}

export type RestaurantOutboxEventV1 = {
  readonly type: "table-session.resolved" | "order.created" | "order.transitioned" | "inventory.changed";
  readonly orderId?: string;
  readonly locationId: string;
  readonly version: number;
  readonly occurredAt: string;
};

const profile = ${JSON.stringify(profile, null, 2)} as const;

export const restaurantTransitionEffects = [
${renderTransitionEffects(transitions)}
] as const;

export const restaurantCommandEffects = {
${renderCommandEffects(commandEffects)}
} as const;

type RestaurantEvidenceSource =
  | Readonly<{ kind: "transition"; from: string; event: string; to: string }>
  | (typeof restaurantCommandEffects)[keyof typeof restaurantCommandEffects];

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return "{" + Object.keys(record).sort().map((key) => JSON.stringify(key) + ":" + canonicalJson(record[key])).join(",") + "}";
  }
  return JSON.stringify(value) ?? "null";
}

export function hashCommandPayload(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function hashOpaqueToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function assertSessionOwnsOrder(sessionId: string, orderSessionId: string): void {
  if (sessionId !== orderSessionId) throw new Error("Table session does not own this order.");
}

export function assertSameCommandPayload(expectedHash: string, body: unknown): void {
  if (expectedHash !== hashCommandPayload(body)) {
    throw new Error("Idempotency key was already used with a different payload.");
  }
}

export function assertExpectedVersion(actual: number, expected: number): void {
  if (!Number.isInteger(expected) || expected < 0) {
    throw new Error("body.expectedVersion must be a non-negative integer.");
  }
  if (actual !== expected) {
    throw new Error("Stale order version. Current version is " + actual + ".");
  }
}

export function assertSufficientStock(stock: number, requested: number): void {
  if (!Number.isInteger(requested) || requested <= 0) {
    throw new Error("Quantity must be a positive integer.");
  }
  if (stock < requested) throw new Error("Insufficient stock.");
}

export function assertCancellationReason(reason: unknown): asserts reason is string {
  if (typeof reason !== "string" || !reason.trim()) {
    throw new Error("Cancellation reason is required.");
  }
}

export function assertRestaurantRole(role: string, allowed: readonly string[]): void {
  if (!allowed.includes(role)) throw new Error("Denied Restaurant command for role '" + role + "'.");
}

function requiredString(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  if (typeof value !== "string" || !value.trim()) throw new Error(key + " is required.");
  return value;
}

function requiredNumber(body: Record<string, unknown>, key: string): number {
  const value = body[key];
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(key + " must be a number.");
  return value;
}

function jsonOutcome(value: unknown): RestaurantCommandOutcome {
  return JSON.parse(JSON.stringify(value)) as RestaurantCommandOutcome;
}

function safeOrderState(order: {
  id: string;
  status: string;
  paymentStatus: string;
  orderVersion: number;
  total: unknown;
}): RestaurantSafeOrderState {
  return {
    id: order.id,
    status: order.status,
    paymentStatus: order.paymentStatus,
    orderVersion: order.orderVersion,
    total: Number(order.total),
  };
}

function tableSessionOutcome(session: {
  id: string;
  tableCode: string;
  status: string;
  openedAt: Date;
  expiresAt: Date;
  guestCount: number;
}): RestaurantCommandOutcome {
  return jsonOutcome({
    id: session.id,
    tableCode: session.tableCode,
    status: session.status,
    openedAt: session.openedAt,
    expiresAt: session.expiresAt,
    guestCount: session.guestCount,
  });
}

type RestaurantTransaction = Prisma.TransactionClient;

export class RestaurantCommandService {
  constructor(private readonly prisma: PrismaClient) {}

  private requireIdempotencyKey(key: string | undefined): string {
    if (!key?.trim()) throw new Error("x-factory-idempotency-key is required.");
    return key;
  }

  private requireSessionToken(token: string | undefined): string {
    if (!token?.trim()) throw new Error("x-factory-table-session-token is required for customer commands.");
    return token;
  }

  private isCommandUniquenessConflict(error: unknown): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") return false;
    const target = error.meta?.target;
    if (Array.isArray(target)) return target.includes("scope") && target.includes("idempotencyKey");
    return typeof target === "string" && target.includes("RestaurantCommand_scope_idempotencyKey_key");
  }

  private async replay(scope: string, idempotencyKey: string, payloadHash: string): Promise<RestaurantCommandOutcome> {
    const existing = await this.prisma.restaurantCommand.findUnique({
      where: { scope_idempotencyKey: { scope, idempotencyKey } },
    });
    if (!existing) throw new Error("Concurrent command could not be replayed.");
    if (existing.payloadHash !== payloadHash) {
      throw new Error("Idempotency key was already used with a different payload.");
    }
    if (existing.status !== "succeeded" || existing.outcome === null) {
      throw new Error("Command with this idempotency key is still in progress.");
    }
    return existing.outcome as RestaurantCommandOutcome;
  }

  private async executeCommand(
    scope: string,
    idempotencyKeyInput: string | undefined,
    body: RestaurantCommandBody,
    mutate: (tx: RestaurantTransaction) => Promise<RestaurantCommandOutcome>,
  ): Promise<RestaurantCommandOutcome> {
    const idempotencyKey = this.requireIdempotencyKey(idempotencyKeyInput);
    assertExpectedVersion(body.expectedVersion, body.expectedVersion);
    const payloadHash = hashCommandPayload(body);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const existing = await tx.restaurantCommand.findUnique({
          where: { scope_idempotencyKey: { scope, idempotencyKey } },
        });
        if (existing) {
          if (existing.payloadHash !== payloadHash) {
            throw new Error("Idempotency key was already used with a different payload.");
          }
          if (existing.status !== "succeeded" || existing.outcome === null) {
            throw new Error("Command with this idempotency key is still in progress.");
          }
          return existing.outcome as RestaurantCommandOutcome;
        }
        const command = await tx.restaurantCommand.create({
          data: { scope, idempotencyKey, payloadHash, status: "started" },
        });
        const outcome = await mutate(tx);
        await tx.restaurantCommand.update({
          where: { id: command.id },
          data: {
            status: "succeeded",
            outcome: outcome as Prisma.InputJsonValue,
            completedAt: new Date(),
          },
        });
        return outcome;
      });
    } catch (error) {
      if (this.isCommandUniquenessConflict(error)) {
        return this.replay(scope, idempotencyKey, payloadHash);
      }
      throw error;
    }
  }

  private async orderAtVersion(tx: RestaurantTransaction, orderId: string, expectedVersion: number) {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error("Order not found.");
    if (order.orderVersion !== expectedVersion) {
      throw new RestaurantVersionConflict(safeOrderState(order));
    }
    return order;
  }

  private async authoritativeOrderState(tx: RestaurantTransaction, orderId: string): Promise<RestaurantSafeOrderState> {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error("Order not found.");
    return safeOrderState(order);
  }

  private async throwVersionConflict(tx: RestaurantTransaction, orderId: string): Promise<never> {
    throw new RestaurantVersionConflict(await this.authoritativeOrderState(tx, orderId));
  }

  private assertActiveSession(session: { status: string; expiresAt: Date }): void {
    if (session.status !== "active" || session.expiresAt <= new Date()) {
      throw new Error("Table session is expired or closed.");
    }
  }

  private async commandScope(role: string, orderId: string, sessionToken: string | undefined): Promise<string> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error("Order not found.");
    const token = role === profile.roles.customer ? this.requireSessionToken(sessionToken) : undefined;
    const session = token
      ? await this.prisma.tableSession.findUnique({ where: { tokenDigest: hashOpaqueToken(token) } })
      : await this.prisma.tableSession.findUnique({ where: { id: order.tableSessionId } });
    if (!session) throw new Error(token ? "Table session token is invalid." : "Order table session was not found.");
    if (role === profile.roles.customer) {
      this.assertActiveSession(session);
      assertSessionOwnsOrder(session.id, order.tableSessionId);
    }
    const table = await this.prisma.restaurantTable.findUnique({ where: { code: session.tableCode } });
    if (!table?.active || table.status === "closed") throw new Error("Restaurant table is not active.");
    const locationId = table.restaurantLocationId ?? "main-location";
    return "location:" + locationId + ":table:" + table.id + ":session:" + session.id + ":order:" + orderId;
  }

  private async assertOrderSession(
    tx: RestaurantTransaction,
    role: string,
    order: { tableSessionId: string },
    sessionToken: string | undefined,
  ): Promise<string> {
    const token = role === profile.roles.customer ? this.requireSessionToken(sessionToken) : undefined;
    const session = token
      ? await tx.tableSession.findUnique({ where: { tokenDigest: hashOpaqueToken(token) } })
      : await tx.tableSession.findUnique({ where: { id: order.tableSessionId } });
    if (!session) throw new Error(token ? "Table session token is invalid." : "Order table session was not found.");
    if (role === profile.roles.customer) {
      this.assertActiveSession(session);
      assertSessionOwnsOrder(session.id, order.tableSessionId);
    }
    const table = await tx.restaurantTable.findUnique({ where: { code: session.tableCode } });
    if (!table?.active || table.status === "closed") throw new Error("Restaurant table is not active.");
    return table.restaurantLocationId ?? "main-location";
  }

  private async recordEvidence(
    tx: RestaurantTransaction,
    role: string,
    orderId: string,
    version: number,
    eventType: RestaurantOutboxEventV1["type"],
    locationId: string,
    payload: RestaurantCommandOutcome,
    source: RestaurantEvidenceSource,
  ): Promise<void> {
    const declaredTransition = source.kind === "transition"
      ? restaurantTransitionEffects.find(
          (candidate) =>
            candidate.from === source.from &&
            candidate.event === source.event &&
            candidate.to === source.to,
        )
      : null;
    if (source.kind === "transition" && !declaredTransition) {
      throw new Error(
        "Restaurant FlowModel does not declare transition '" +
          source.from +
          " --" +
          source.event +
          "--> " +
          source.to +
          "'.",
      );
    }
    const effects =
      source.kind === "command"
        ? [{ capability: source.capability, operation: source.operation }]
        : (declaredTransition?.effects ?? []);
    for (const effect of effects) {
      await tx.capabilityEvent.create({
        data: {
          actor: role,
          capability: effect.capability,
          operation: effect.operation,
          entity: profile.order.entity,
          recordId: orderId,
          outcome: "succeeded",
        },
      });
    }
    const auditAction =
      source.kind === "command"
        ? source.auditAction
        : effects.some(
              (effect) =>
                effect.capability === "audit.record" &&
                effect.operation === "record",
            )
          ? source.event
          : null;
    if (auditAction) {
      await tx.auditEvent.create({
        data: {
          actor: role,
          action: auditAction,
          entity: profile.order.entity,
          recordId: orderId,
        },
      });
    }
    await tx.restaurantOutboxEvent.create({
      data: { type: eventType, aggregateId: orderId, locationId, version, payload: payload as Prisma.InputJsonValue },
    });
  }

  async resolveTableSession(role: string, idempotencyKey: string | undefined, body: RestaurantCommandBody) {
    assertRestaurantRole(role, [profile.roles.customer]);
    assertExpectedVersion(0, body.expectedVersion);
    const token = requiredString(body, "token");
    const tokenDigest = hashOpaqueToken(token);
    const scopedSession = await this.prisma.tableSession.findUnique({ where: { tokenDigest } });
    if (!scopedSession) throw new Error("Table session token is invalid.");
    this.assertActiveSession(scopedSession);
    const scopedTable = await this.prisma.restaurantTable.findUnique({ where: { code: scopedSession.tableCode } });
    if (!scopedTable?.active || scopedTable.status === "closed") throw new Error("Restaurant table is not active.");
    const locationId = scopedTable.restaurantLocationId ?? "main-location";
    const scope = "location:" + locationId + ":table:" + scopedTable.id + ":session:" + scopedSession.id + ":resolve";
    return this.executeCommand(scope, idempotencyKey, body, async (tx) => {
      const session = await tx.tableSession.findUnique({ where: { tokenDigest } });
      if (!session) throw new Error("Table session token is invalid.");
      this.assertActiveSession(session);
      const table = await tx.restaurantTable.findUnique({ where: { code: session.tableCode } });
      if (!table?.active || table.status === "closed") throw new Error("Restaurant table is not active.");
      let order = await tx.order.findFirst({
        where: { tableSessionId: session.id, status: { in: ["cart", "submitted", "paid", "accepted", "preparing", "ready"] } },
        orderBy: { createdAt: "desc" },
      });
      const created = !order;
      if (!order) {
        order = await tx.order.create({
          data: { tableSessionId: session.id, status: "cart", paymentStatus: "unpaid", fulfilmentType: "dine-in", orderNote: "", priority: 0, total: 0, orderVersion: 0 },
        });
      }
      const outcome = jsonOutcome({ session: tableSessionOutcome(session), order });
      await this.recordEvidence(tx, role, order.id, order.orderVersion, created ? "order.created" : "table-session.resolved", locationId, outcome, restaurantCommandEffects.resolveTableSession);
      return outcome;
    });
  }

  async addLine(role: string, sessionToken: string | undefined, orderId: string, idempotencyKey: string | undefined, body: RestaurantCommandBody) {
    assertRestaurantRole(role, [profile.roles.customer]);
    const scope = await this.commandScope(role, orderId, sessionToken);
    return this.executeCommand(scope + ":line:add", idempotencyKey, body, async (tx) => {
      const order = await this.orderAtVersion(tx, orderId, body.expectedVersion);
      const locationId = await this.assertOrderSession(tx, role, order, sessionToken);
      if (order.status !== "cart") throw new Error("Order lines can change only while the order is a cart.");
      const menuItemId = requiredString(body, "menuItemId");
      const quantity = requiredNumber(body, "quantity");
      const menuItem = await tx.menuItem.findUnique({ where: { id: menuItemId } });
      if (!menuItem?.available) throw new Error("Menu item is unavailable.");
      assertSufficientStock(menuItem.stock, quantity);
      const line = await tx.orderLine.create({
        data: { orderId, menuItemId, quantity, unitPrice: menuItem.price, lineNote: String(body.lineNote ?? ""), modifiers: (body.modifiers ?? []) as Prisma.InputJsonValue },
      });
      const nextVersion = order.orderVersion + 1;
      const nextTotal = Number(order.total) + Number(menuItem.price) * quantity;
      const updated = await tx.order.updateMany({ where: { id: orderId, orderVersion: order.orderVersion }, data: { orderVersion: nextVersion, total: nextTotal } });
      if (updated.count !== 1) await this.throwVersionConflict(tx, orderId);
      const outcome = jsonOutcome({ line, orderVersion: nextVersion, total: nextTotal });
      await this.recordEvidence(tx, role, orderId, nextVersion, "order.transitioned", locationId, outcome, restaurantCommandEffects.addLine);
      return outcome;
    });
  }

  async updateLine(role: string, sessionToken: string | undefined, orderId: string, lineId: string, idempotencyKey: string | undefined, body: RestaurantCommandBody) {
    assertRestaurantRole(role, [profile.roles.customer]);
    const scope = await this.commandScope(role, orderId, sessionToken);
    return this.executeCommand(scope + ":line:" + lineId + ":update", idempotencyKey, body, async (tx) => {
      const order = await this.orderAtVersion(tx, orderId, body.expectedVersion);
      const locationId = await this.assertOrderSession(tx, role, order, sessionToken);
      if (order.status !== "cart") throw new Error("Order lines can change only while the order is a cart.");
      const line = await tx.orderLine.findFirst({ where: { id: lineId, orderId } });
      if (!line) throw new Error("Order line not found.");
      const quantity = requiredNumber(body, "quantity");
      const menuItem = await tx.menuItem.findUnique({ where: { id: line.menuItemId } });
      if (!menuItem?.available) throw new Error("Menu item is unavailable.");
      assertSufficientStock(menuItem.stock, quantity);
      const updatedLine = await tx.orderLine.update({
        where: { id: lineId },
        data: { quantity, lineNote: String(body.lineNote ?? line.lineNote), modifiers: (body.modifiers ?? line.modifiers) as Prisma.InputJsonValue },
      });
      const nextVersion = order.orderVersion + 1;
      const nextTotal = Number(order.total) + Number(line.unitPrice) * (quantity - line.quantity);
      const updated = await tx.order.updateMany({ where: { id: orderId, orderVersion: order.orderVersion }, data: { orderVersion: nextVersion, total: nextTotal } });
      if (updated.count !== 1) await this.throwVersionConflict(tx, orderId);
      const outcome = jsonOutcome({ line: updatedLine, orderVersion: nextVersion, total: nextTotal });
      await this.recordEvidence(tx, role, orderId, nextVersion, "order.transitioned", locationId, outcome, restaurantCommandEffects.updateLine);
      return outcome;
    });
  }

  async submitOrder(role: string, sessionToken: string | undefined, orderId: string, idempotencyKey: string | undefined, body: RestaurantCommandBody) {
    assertRestaurantRole(role, [profile.roles.customer]);
    const scope = await this.commandScope(role, orderId, sessionToken);
    return this.executeCommand(scope + ":submit", idempotencyKey, body, async (tx) => {
      const order = await this.orderAtVersion(tx, orderId, body.expectedVersion);
      const locationId = await this.assertOrderSession(tx, role, order, sessionToken);
      if (order.status !== "cart") throw new Error("Only a cart order can be submitted.");
      const lines = await tx.orderLine.findMany({ where: { orderId } });
      if (!lines.length) throw new Error("Order must contain at least one line.");
      for (const line of lines) {
        const item = await tx.menuItem.findUnique({ where: { id: line.menuItemId } });
        if (!item?.available) throw new Error("Menu item is unavailable.");
        assertSufficientStock(item.stock, line.quantity);
      }
      for (const line of lines) {
        const reserved = await tx.menuItem.updateMany({ where: { id: line.menuItemId, available: true, stock: { gte: line.quantity } }, data: { stock: { decrement: line.quantity } } });
        if (reserved.count !== 1) throw new Error("Insufficient stock.");
        await tx.inventoryLedger.create({ data: { menuItemId: line.menuItemId, orderId, delta: -line.quantity, reason: "reserve", recordedAt: new Date() } });
      }
      const nextVersion = order.orderVersion + 1;
      const updated = await tx.order.updateMany({ where: { id: orderId, orderVersion: order.orderVersion }, data: { status: "submitted", submittedAt: new Date(), orderVersion: nextVersion } });
      if (updated.count !== 1) await this.throwVersionConflict(tx, orderId);
      const outcome = jsonOutcome({ orderId, status: "submitted", orderVersion: nextVersion });
      await this.recordEvidence(tx, role, orderId, nextVersion, "inventory.changed", locationId, outcome, {
        kind: "transition",
        from: order.status,
        event: "submit",
        to: "submitted",
      });
      return outcome;
    });
  }

  async recordPayment(role: string, sessionToken: string | undefined, orderId: string, idempotencyKey: string | undefined, body: RestaurantCommandBody) {
    assertRestaurantRole(role, [profile.roles.customer, profile.roles.cashier]);
    const scope = await this.commandScope(role, orderId, sessionToken);
    return this.executeCommand(scope + ":payment", idempotencyKey, body, async (tx) => {
      const order = await this.orderAtVersion(tx, orderId, body.expectedVersion);
      const locationId = await this.assertOrderSession(tx, role, order, sessionToken);
      if (order.status !== "submitted" || order.paymentStatus !== "unpaid") throw new Error("Order is not payable.");
      const amount = requiredNumber(body, "amount");
      if (amount !== Number(order.total)) throw new Error("Simulated payment must cover the full order total.");
      const payment = await tx.paymentAttempt.create({
        data: { orderId, method: requiredString(body, "method"), amount, status: "succeeded", idempotencyKey: this.requireIdempotencyKey(idempotencyKey), paidAt: new Date() },
      });
      const session = await tx.tableSession.findUnique({ where: { id: order.tableSessionId } });
      if (!session) throw new Error("Order table session was not found.");
      const table = await tx.restaurantTable.findUnique({ where: { code: session.tableCode } });
      if (!table) throw new Error("Restaurant table was not found.");
      const nextVersion = order.orderVersion + 1;
      await tx.kitchenTicket.create({ data: { orderId, tableNumber: table.number, priority: order.priority, status: "paid" } });
      const lines = await tx.orderLine.findMany({ where: { orderId } });
      for (const line of lines) {
        await tx.inventoryLedger.create({ data: { menuItemId: line.menuItemId, orderId, delta: 0, reason: "decrement", recordedAt: new Date() } });
      }
      const updated = await tx.order.updateMany({ where: { id: orderId, orderVersion: order.orderVersion }, data: { status: "paid", paymentStatus: "paid", paidAt: new Date(), orderVersion: nextVersion } });
      if (updated.count !== 1) await this.throwVersionConflict(tx, orderId);
      const outcome = jsonOutcome({ orderId, paymentId: payment.id, status: "paid", orderVersion: nextVersion });
      await this.recordEvidence(tx, role, orderId, nextVersion, "order.transitioned", locationId, outcome, {
        kind: "transition",
        from: order.status,
        event: "pay",
        to: "paid",
      });
      return outcome;
    });
  }

  async cancelOrder(role: string, orderId: string, idempotencyKey: string | undefined, body: RestaurantCommandBody) {
    assertRestaurantRole(role, [profile.roles.manager]);
    assertCancellationReason(body.reason);
    const cancellationReason = body.reason;
    const scope = await this.commandScope(role, orderId, undefined);
    return this.executeCommand(scope + ":cancel", idempotencyKey, body, async (tx) => {
      const order = await this.orderAtVersion(tx, orderId, body.expectedVersion);
      const locationId = await this.assertOrderSession(tx, role, order, undefined);
      if (order.status !== "submitted" && order.status !== "paid") throw new Error("Order is not eligible for cancellation.");
      if (order.status === "submitted") {
        const lines = await tx.orderLine.findMany({ where: { orderId } });
        for (const line of lines) {
          await tx.menuItem.update({ where: { id: line.menuItemId }, data: { stock: { increment: line.quantity } } });
          await tx.inventoryLedger.create({ data: { menuItemId: line.menuItemId, orderId, delta: line.quantity, reason: "release", recordedAt: new Date() } });
        }
      } else {
        await tx.paymentAttempt.create({
          data: { orderId, method: "cash", amount: order.total, status: "reversed", idempotencyKey: this.requireIdempotencyKey(idempotencyKey) + ":reversal", paidAt: new Date() },
        });
      }
      const nextVersion = order.orderVersion + 1;
      const updated = await tx.order.updateMany({
        where: { id: orderId, orderVersion: order.orderVersion },
        data: { status: "cancelled", paymentStatus: order.status === "paid" ? "reversal-requested" : order.paymentStatus, orderNote: order.orderNote + "\nCancellation: " + cancellationReason.trim(), orderVersion: nextVersion },
      });
      if (updated.count !== 1) await this.throwVersionConflict(tx, orderId);
      const outcome = jsonOutcome({ orderId, status: "cancelled", reason: cancellationReason.trim(), orderVersion: nextVersion });
      await this.recordEvidence(tx, role, orderId, nextVersion, order.status === "submitted" ? "inventory.changed" : "order.transitioned", locationId, outcome, {
        kind: "transition",
        from: order.status,
        event: "cancel",
        to: "cancelled",
      });
      return outcome;
    });
  }

  async transitionKitchenTicket(role: string, ticketId: string, event: string, idempotencyKey: string | undefined, body: RestaurantCommandBody) {
    assertRestaurantRole(role, [profile.roles.kitchen]);
    const scopedTicket = await this.prisma.kitchenTicket.findUnique({ where: { id: ticketId } });
    if (!scopedTicket) throw new Error("Kitchen ticket not found.");
    const scope = await this.commandScope(role, scopedTicket.orderId, undefined);
    return this.executeCommand(scope + ":kitchen-ticket:" + ticketId + ":" + event, idempotencyKey, body, async (tx) => {
      const ticket = await tx.kitchenTicket.findUnique({ where: { id: ticketId } });
      if (!ticket) throw new Error("Kitchen ticket not found.");
      const order = await this.orderAtVersion(tx, ticket.orderId, body.expectedVersion);
      const locationId = await this.assertOrderSession(tx, role, order, undefined);
      const transition = ({ accept: ["paid", "accepted"], "start-preparing": ["accepted", "preparing"], "mark-ready": ["preparing", "ready"] } as const)[event as "accept" | "start-preparing" | "mark-ready"];
      if (!transition || ticket.status !== transition[0] || order.status !== transition[0]) throw new Error("Invalid kitchen transition.");
      const now = new Date();
      const timestamps = event === "accept" ? { acceptedAt: now } : event === "start-preparing" ? { startedAt: now } : { readyAt: now };
      await tx.kitchenTicket.update({ where: { id: ticketId }, data: { status: transition[1], ...timestamps } });
      const nextVersion = order.orderVersion + 1;
      const updated = await tx.order.updateMany({ where: { id: order.id, orderVersion: order.orderVersion }, data: { status: transition[1], orderVersion: nextVersion } });
      if (updated.count !== 1) await this.throwVersionConflict(tx, order.id);
      const outcome = jsonOutcome({ orderId: order.id, ticketId, status: transition[1], orderVersion: nextVersion });
      await this.recordEvidence(tx, role, order.id, nextVersion, "order.transitioned", locationId, outcome, {
        kind: "transition",
        from: transition[0],
        event,
        to: transition[1],
      });
      return outcome;
    });
  }

  async serveOrder(role: string, orderId: string, idempotencyKey: string | undefined, body: RestaurantCommandBody) {
    assertRestaurantRole(role, [profile.roles.cashier]);
    const scope = await this.commandScope(role, orderId, undefined);
    return this.executeCommand(scope + ":serve", idempotencyKey, body, async (tx) => {
      const order = await this.orderAtVersion(tx, orderId, body.expectedVersion);
      const locationId = await this.assertOrderSession(tx, role, order, undefined);
      if (order.status !== "ready") throw new Error("Only a ready order can be served.");
      const nextVersion = order.orderVersion + 1;
      const updated = await tx.order.updateMany({ where: { id: orderId, orderVersion: order.orderVersion }, data: { status: "served", orderVersion: nextVersion } });
      if (updated.count !== 1) await this.throwVersionConflict(tx, orderId);
      const outcome = jsonOutcome({ orderId, status: "served", orderVersion: nextVersion });
      await this.recordEvidence(tx, role, orderId, nextVersion, "order.transitioned", locationId, outcome, {
        kind: "transition",
        from: order.status,
        event: "serve",
        to: "served",
      });
      return outcome;
    });
  }

  async reportSummary(role: string) {
    assertRestaurantRole(role, [profile.roles.manager]);
    const [orders, cancellations, paid, tickets] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: "cancelled" } }),
      this.prisma.paymentAttempt.aggregate({ where: { status: "succeeded" }, _sum: { amount: true } }),
      this.prisma.kitchenTicket.findMany({ where: { startedAt: { not: null }, readyAt: { not: null } }, select: { startedAt: true, readyAt: true } }),
    ]);
    const preparationDurations = tickets.map((ticket) => ticket.readyAt!.getTime() - ticket.startedAt!.getTime());
    return { salesTotal: Number(paid._sum.amount ?? 0), orderCount: orders, averagePreparationMilliseconds: preparationDurations.length ? preparationDurations.reduce((sum, value) => sum + value, 0) / preparationDurations.length : 0, cancellationCount: cancellations };
  }

  async reportLowStock(role: string) {
    assertRestaurantRole(role, [profile.roles.manager]);
    return this.prisma.menuItem.findMany({ where: { available: true, stock: { lte: 5 } }, orderBy: [{ stock: "asc" }, { name: "asc" }] });
  }
}
`;
}

function renderMain(applicationName: string): string {
  return String.raw`import { Body, Controller, Get, Headers, HttpException, HttpStatus, Module, Param, Patch, Post, Req } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { PrismaClient } from "@prisma/client";
import { enforce } from "./policy.js";
import { PrismaRecordStore } from "./prisma-record-store.js";
import { RestaurantCommandService, RestaurantVersionConflict, type RestaurantCommandBody } from "./restaurant/restaurant-command.service.js";

const prisma = new PrismaClient();
const authoritativeStore = new PrismaRecordStore(prisma);
const restaurantCommands = new RestaurantCommandService(prisma);

type RequestHeaders = { headers: Record<string, string | string[] | undefined> };

function roleFrom(request: RequestHeaders): string {
  // Test-only role simulation. Task 5 replaces merchant role headers with authenticated principals.
  const value = request.headers["x-factory-role"];
  return typeof value === "string" && value ? value : "anonymous";
}

function sessionTokenFrom(request: RequestHeaders): string | undefined {
  const value = request.headers["x-factory-table-session-token"];
  return typeof value === "string" && value ? value : undefined;
}

async function assertAllowed(role: string, resource: string, action: string): Promise<void> {
  if (!(await enforce(role, resource, action))) {
    throw new Error("Denied Restaurant command for role '" + role + "'.");
  }
}

export function rejected(error: unknown): HttpException {
  if (error instanceof RestaurantVersionConflict) {
    return new HttpException(error.payload, HttpStatus.CONFLICT);
  }
  const message = error instanceof Error ? error.message : "Request rejected.";
  const status = message.startsWith("Denied") ? HttpStatus.FORBIDDEN : HttpStatus.BAD_REQUEST;
  return new HttpException(message, status);
}

@Controller("api")
class GeneratedController {
  @Get("health") health() { return { application: ${JSON.stringify(applicationName)}, persistence: authoritativeStore.constructor.name, status: "ok" }; }

  @Post("restaurant/table-sessions/resolve")
  async resolveSession(@Headers("x-factory-idempotency-key") key: string | undefined, @Body() body: RestaurantCommandBody, @Req() request: RequestHeaders) {
    try { const role = roleFrom(request); await assertAllowed(role, "table-session", "read"); return await restaurantCommands.resolveTableSession(role, key, body); } catch (error) { throw rejected(error); }
  }

  @Post("restaurant/orders/:id/lines")
  async addLine(@Param("id") id: string, @Headers("x-factory-idempotency-key") key: string | undefined, @Body() body: RestaurantCommandBody, @Req() request: RequestHeaders) {
    try { const role = roleFrom(request); await assertAllowed(role, "order-line", "create"); return await restaurantCommands.addLine(role, sessionTokenFrom(request), id, key, body); } catch (error) { throw rejected(error); }
  }

  @Patch("restaurant/orders/:id/lines/:lineId")
  async updateLine(@Param("id") id: string, @Param("lineId") lineId: string, @Headers("x-factory-idempotency-key") key: string | undefined, @Body() body: RestaurantCommandBody, @Req() request: RequestHeaders) {
    try { const role = roleFrom(request); await assertAllowed(role, "order-line", "update"); return await restaurantCommands.updateLine(role, sessionTokenFrom(request), id, lineId, key, body); } catch (error) { throw rejected(error); }
  }

  @Post("restaurant/orders/:id/submit")
  async submit(@Param("id") id: string, @Headers("x-factory-idempotency-key") key: string | undefined, @Body() body: RestaurantCommandBody, @Req() request: RequestHeaders) {
    try { const role = roleFrom(request); await assertAllowed(role, "order", "update"); return await restaurantCommands.submitOrder(role, sessionTokenFrom(request), id, key, body); } catch (error) { throw rejected(error); }
  }

  @Post("restaurant/orders/:id/payments")
  async pay(@Param("id") id: string, @Headers("x-factory-idempotency-key") key: string | undefined, @Body() body: RestaurantCommandBody, @Req() request: RequestHeaders) {
    try { const role = roleFrom(request); await assertAllowed(role, "order", "update"); return await restaurantCommands.recordPayment(role, sessionTokenFrom(request), id, key, body); } catch (error) { throw rejected(error); }
  }

  @Post("restaurant/orders/:id/cancel")
  async cancel(@Param("id") id: string, @Headers("x-factory-idempotency-key") key: string | undefined, @Body() body: RestaurantCommandBody, @Req() request: RequestHeaders) {
    try { const role = roleFrom(request); await assertAllowed(role, "order", "cancel"); return await restaurantCommands.cancelOrder(role, id, key, body); } catch (error) { throw rejected(error); }
  }

  @Post("restaurant/kitchen-tickets/:id/events/:event")
  async kitchenEvent(@Param("id") id: string, @Param("event") event: string, @Headers("x-factory-idempotency-key") key: string | undefined, @Body() body: RestaurantCommandBody, @Req() request: RequestHeaders) {
    try { const role = roleFrom(request); await assertAllowed(role, "kitchen-ticket", "update"); return await restaurantCommands.transitionKitchenTicket(role, id, event, key, body); } catch (error) { throw rejected(error); }
  }

  @Post("restaurant/orders/:id/serve")
  async serve(@Param("id") id: string, @Headers("x-factory-idempotency-key") key: string | undefined, @Body() body: RestaurantCommandBody, @Req() request: RequestHeaders) {
    try { const role = roleFrom(request); await assertAllowed(role, "order", "update"); return await restaurantCommands.serveOrder(role, id, key, body); } catch (error) { throw rejected(error); }
  }

  @Get("restaurant/reports/summary")
  async summary(@Req() request: RequestHeaders) {
    try { const role = roleFrom(request); await assertAllowed(role, "order", "audit"); return await restaurantCommands.reportSummary(role); } catch (error) { throw rejected(error); }
  }

  @Get("restaurant/reports/low-stock")
  async lowStock(@Req() request: RequestHeaders) {
    try { const role = roleFrom(request); await assertAllowed(role, "inventory-ledger", "audit"); return await restaurantCommands.reportLowStock(role); } catch (error) { throw rejected(error); }
  }
}

@Module({ controllers: [GeneratedController] })
class GeneratedModule {}

async function bootstrap() {
  const app = await NestFactory.create(GeneratedModule);
  app.enableCors({ origin: process.env.WEB_ORIGIN?.split(",") ?? true });
  await app.listen(process.env.PORT ?? 3001);
}

if (process.env.NODE_ENV !== "test") void bootstrap();
`;
}

function renderPrismaSchema(): string {
  return String.raw`generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url = env("DATABASE_URL")
}

model RestaurantLocation {
  id String @id @default(cuid())
  name String
  currency String
  active Boolean
  tables RestaurantTable[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model RestaurantTable {
  id String @id @default(cuid())
  code String @unique
  number Int @unique
  status String
  active Boolean
  restaurantLocationId String?
  restaurantLocation RestaurantLocation? @relation(fields: [restaurantLocationId], references: [id])
  sessions TableSession[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([status])
}

model TableSession {
  id String @id @default(cuid())
  tableCode String
  tokenDigest String @unique
  status String
  openedAt DateTime
  expiresAt DateTime
  guestCount Int
  table RestaurantTable @relation(fields: [tableCode], references: [code])
  orders Order[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([tableCode, status])
  @@index([expiresAt])
}

model MenuCategory {
  id String @id @default(cuid())
  name String
  sortOrder Int
  active Boolean
  items MenuItem[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([active, sortOrder])
}

model MenuItem {
  id String @id @default(cuid())
  categoryKey String
  name String
  description String
  price Decimal
  available Boolean
  stock Int
  preparationMinutes Int
  imageUrl String
  category MenuCategory @relation(fields: [categoryKey], references: [id])
  lines OrderLine[]
  inventoryEntries InventoryLedger[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([categoryKey, available])
  @@index([stock])
}

model Order {
  id String @id @default(cuid())
  tableSessionId String
  status String
  paymentStatus String
  fulfilmentType String
  orderNote String
  priority Int
  total Decimal
  orderVersion Int
  submittedAt DateTime?
  paidAt DateTime?
  tableSession TableSession @relation(fields: [tableSessionId], references: [id])
  lines OrderLine[]
  payments PaymentAttempt[]
  kitchenTicket KitchenTicket?
  inventoryEntries InventoryLedger[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([tableSessionId, status])
  @@index([paymentStatus, paidAt])
}

model OrderLine {
  id String @id @default(cuid())
  orderId String
  menuItemId String
  quantity Int
  unitPrice Decimal
  lineNote String
  modifiers Json
  order Order @relation(fields: [orderId], references: [id])
  menuItem MenuItem @relation(fields: [menuItemId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([orderId])
}

model PaymentAttempt {
  id String @id @default(cuid())
  orderId String
  method String
  amount Decimal
  status String
  idempotencyKey String
  paidAt DateTime?
  order Order @relation(fields: [orderId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@unique([orderId, idempotencyKey])
  @@index([orderId, status])
}

model KitchenTicket {
  id String @id @default(cuid())
  orderId String @unique
  tableNumber Int
  priority Int
  status String
  acceptedAt DateTime?
  startedAt DateTime?
  readyAt DateTime?
  order Order @relation(fields: [orderId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([priority, status, tableNumber])
}

model InventoryLedger {
  id String @id @default(cuid())
  menuItemId String
  orderId String
  delta Int
  reason String
  recordedAt DateTime
  menuItem MenuItem @relation(fields: [menuItemId], references: [id])
  order Order @relation(fields: [orderId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([menuItemId, recordedAt])
  @@index([orderId])
}

model RestaurantCommand {
  id String @id @default(cuid())
  scope String
  idempotencyKey String
  payloadHash String
  status String
  outcome Json?
  createdAt DateTime @default(now())
  completedAt DateTime?
  @@unique([scope, idempotencyKey])
  @@index([status, createdAt])
}

model RestaurantOutboxEvent {
  id String @id @default(cuid())
  type String
  aggregateId String?
  locationId String
  version Int
  payload Json
  occurredAt DateTime @default(now())
  publishedAt DateTime?
  @@index([aggregateId, version])
  @@index([publishedAt, occurredAt])
}

model AuditEvent {
  id String @id @default(cuid())
  actor String
  action String
  entity String
  recordId String
  at DateTime @default(now())
  @@index([entity, recordId])
}

model CapabilityEvent {
  id String @id @default(cuid())
  actor String
  capability String
  operation String
  entity String
  recordId String
  outcome String
  at DateTime @default(now())
  @@index([entity, recordId])
  @@index([capability, operation])
}

model CommerceLineItem {
  id String @id @default(cuid())
  actor String
  orderEntity String
  orderRecordId String
  catalogEntity String
  catalogRecordId String
  quantity Int
  createdAt DateTime @default(now())
  @@index([orderEntity, orderRecordId])
  @@index([catalogEntity, catalogRecordId])
}
`;
}

const restaurantSqlModels = [
  [
    "RestaurantLocation",
    '"id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "currency" TEXT NOT NULL, "active" BOOLEAN NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL',
  ],
  [
    "RestaurantTable",
    '"id" TEXT NOT NULL PRIMARY KEY, "code" TEXT NOT NULL UNIQUE, "number" INTEGER NOT NULL UNIQUE, "status" TEXT NOT NULL, "active" BOOLEAN NOT NULL, "restaurantLocationId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL',
  ],
  [
    "TableSession",
    '"id" TEXT NOT NULL PRIMARY KEY, "tableCode" TEXT NOT NULL, "tokenDigest" TEXT NOT NULL UNIQUE, "status" TEXT NOT NULL, "openedAt" TIMESTAMP(3) NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "guestCount" INTEGER NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL',
  ],
  [
    "MenuCategory",
    '"id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "sortOrder" INTEGER NOT NULL, "active" BOOLEAN NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL',
  ],
  [
    "MenuItem",
    '"id" TEXT NOT NULL PRIMARY KEY, "categoryKey" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT NOT NULL, "price" DECIMAL NOT NULL, "available" BOOLEAN NOT NULL, "stock" INTEGER NOT NULL, "preparationMinutes" INTEGER NOT NULL, "imageUrl" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL',
  ],
  [
    "Order",
    '"id" TEXT NOT NULL PRIMARY KEY, "tableSessionId" TEXT NOT NULL, "status" TEXT NOT NULL, "paymentStatus" TEXT NOT NULL, "fulfilmentType" TEXT NOT NULL, "orderNote" TEXT NOT NULL, "priority" INTEGER NOT NULL, "total" DECIMAL NOT NULL, "orderVersion" INTEGER NOT NULL, "submittedAt" TIMESTAMP(3), "paidAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL',
  ],
  [
    "OrderLine",
    '"id" TEXT NOT NULL PRIMARY KEY, "orderId" TEXT NOT NULL, "menuItemId" TEXT NOT NULL, "quantity" INTEGER NOT NULL, "unitPrice" DECIMAL NOT NULL, "lineNote" TEXT NOT NULL, "modifiers" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL',
  ],
  [
    "PaymentAttempt",
    '"id" TEXT NOT NULL PRIMARY KEY, "orderId" TEXT NOT NULL, "method" TEXT NOT NULL, "amount" DECIMAL NOT NULL, "status" TEXT NOT NULL, "idempotencyKey" TEXT NOT NULL, "paidAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL',
  ],
  [
    "KitchenTicket",
    '"id" TEXT NOT NULL PRIMARY KEY, "orderId" TEXT NOT NULL UNIQUE, "tableNumber" INTEGER NOT NULL, "priority" INTEGER NOT NULL, "status" TEXT NOT NULL, "acceptedAt" TIMESTAMP(3), "startedAt" TIMESTAMP(3), "readyAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL',
  ],
  [
    "InventoryLedger",
    '"id" TEXT NOT NULL PRIMARY KEY, "menuItemId" TEXT NOT NULL, "orderId" TEXT NOT NULL, "delta" INTEGER NOT NULL, "reason" TEXT NOT NULL, "recordedAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL',
  ],
  [
    "RestaurantCommand",
    '"id" TEXT NOT NULL PRIMARY KEY, "scope" TEXT NOT NULL, "idempotencyKey" TEXT NOT NULL, "payloadHash" TEXT NOT NULL, "status" TEXT NOT NULL, "outcome" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completedAt" TIMESTAMP(3)',
  ],
  [
    "RestaurantOutboxEvent",
    '"id" TEXT NOT NULL PRIMARY KEY, "type" TEXT NOT NULL, "aggregateId" TEXT, "locationId" TEXT NOT NULL, "version" INTEGER NOT NULL, "payload" JSONB NOT NULL, "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "publishedAt" TIMESTAMP(3)',
  ],
  [
    "AuditEvent",
    '"id" TEXT NOT NULL PRIMARY KEY, "actor" TEXT NOT NULL, "action" TEXT NOT NULL, "entity" TEXT NOT NULL, "recordId" TEXT NOT NULL, "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP',
  ],
  [
    "CapabilityEvent",
    '"id" TEXT NOT NULL PRIMARY KEY, "actor" TEXT NOT NULL, "capability" TEXT NOT NULL, "operation" TEXT NOT NULL, "entity" TEXT NOT NULL, "recordId" TEXT NOT NULL, "outcome" TEXT NOT NULL, "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP',
  ],
  [
    "CommerceLineItem",
    '"id" TEXT NOT NULL PRIMARY KEY, "actor" TEXT NOT NULL, "orderEntity" TEXT NOT NULL, "orderRecordId" TEXT NOT NULL, "catalogEntity" TEXT NOT NULL, "catalogRecordId" TEXT NOT NULL, "quantity" INTEGER NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP',
  ],
] as const;

function renderInitialMigration(): string {
  const tables = restaurantSqlModels.map(
    ([name, columns]) =>
      `CREATE TABLE "${name}" (\n  ${columns.replaceAll(', "', ',\n  "')}\n);`,
  );
  const indexesAndConstraints = String.raw`
CREATE UNIQUE INDEX "RestaurantCommand_scope_idempotencyKey_key" ON "RestaurantCommand" ("scope", "idempotencyKey");
CREATE UNIQUE INDEX "PaymentAttempt_orderId_idempotencyKey_key" ON "PaymentAttempt" ("orderId", "idempotencyKey");
CREATE INDEX "RestaurantOutboxEvent_aggregateId_version_idx" ON "RestaurantOutboxEvent" ("aggregateId", "version");
CREATE INDEX "InventoryLedger_orderId_idx" ON "InventoryLedger" ("orderId");
ALTER TABLE "RestaurantTable" ADD CONSTRAINT "RestaurantTable_location_fkey" FOREIGN KEY ("restaurantLocationId") REFERENCES "RestaurantLocation" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TableSession" ADD CONSTRAINT "TableSession_tableCode_fkey" FOREIGN KEY ("tableCode") REFERENCES "RestaurantTable" ("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_categoryKey_fkey" FOREIGN KEY ("categoryKey") REFERENCES "MenuCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_tableSessionId_fkey" FOREIGN KEY ("tableSessionId") REFERENCES "TableSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KitchenTicket" ADD CONSTRAINT "KitchenTicket_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryLedger" ADD CONSTRAINT "InventoryLedger_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryLedger" ADD CONSTRAINT "InventoryLedger_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
`;
  return tables.join("\n\n") + "\n" + indexesAndConstraints;
}

function renderGeneratedTests(): string {
  return String.raw`import { describe, expect, it } from "vitest";
import { enforce } from "../src/policy.js";
import { rejected } from "../src/main.js";
import {
  RestaurantCommandService,
  RestaurantVersionConflict,
  assertCancellationReason,
  assertSessionOwnsOrder,
  assertSufficientStock,
  hashOpaqueToken,
} from "../src/restaurant/restaurant-command.service.js";

type TestOrder = {
  id: string;
  tableSessionId: string;
  status: string;
  paymentStatus: string;
  fulfilmentType: string;
  orderNote: string;
  priority: number;
  total: number;
  orderVersion: number;
  submittedAt: Date | null;
  paidAt: Date | null;
};

type TestState = {
  order: TestOrder | null;
  session: Record<string, unknown>;
  table: Record<string, unknown>;
  menuItems: Array<Record<string, unknown>>;
  lines: Array<Record<string, unknown>>;
  commands: Array<Record<string, unknown>>;
  payments: Array<Record<string, unknown>>;
  tickets: Array<Record<string, unknown>>;
  inventory: Array<Record<string, unknown>>;
  audits: Array<Record<string, unknown>>;
  capabilities: Array<Record<string, unknown>>;
  outbox: Array<Record<string, unknown>>;
};

function applyUpdate(target: Record<string, unknown>, data: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === "object" && "increment" in value) {
      target[key] = Number(target[key]) + Number((value as { increment: number }).increment);
    } else if (value && typeof value === "object" && "decrement" in value) {
      target[key] = Number(target[key]) - Number((value as { decrement: number }).decrement);
    } else {
      target[key] = value;
    }
  }
}

function createHarness(options: {
  status?: string;
  paymentStatus?: string;
  orderVersion?: number;
  stock?: number;
  total?: number;
  ticketStatus?: string | null;
  withoutOrder?: boolean;
} = {}) {
  const token = "generated-service-test-token";
  const session = {
    id: "session-1",
    tableCode: "T12",
    tokenDigest: hashOpaqueToken(token),
    status: "active",
    openedAt: new Date("2026-07-30T00:00:00.000Z"),
    expiresAt: new Date("2099-01-01T00:00:00.000Z"),
    guestCount: 2,
  };
  const table = {
    id: "table-12",
    code: "T12",
    number: 12,
    status: "open",
    active: true,
    restaurantLocationId: "main-location",
  };
  const order: TestOrder = {
    id: "order-1",
    tableSessionId: session.id,
    status: options.status ?? "cart",
    paymentStatus: options.paymentStatus ?? "unpaid",
    fulfilmentType: "dine-in",
    orderNote: "",
    priority: 0,
    total: options.total ?? 10,
    orderVersion: options.orderVersion ?? 0,
    submittedAt: null,
    paidAt: null,
  };
  const state: TestState = {
    order: options.withoutOrder ? null : order,
    session,
    table,
    menuItems: [{ id: "menu-1", categoryKey: "mains", name: "Meal", description: "", price: 5, available: true, stock: options.stock ?? 5, preparationMinutes: 5, imageUrl: "/meal.jpg" }],
    lines: options.withoutOrder ? [] : [{ id: "line-1", orderId: order.id, menuItemId: "menu-1", quantity: 2, unitPrice: 5, lineNote: "", modifiers: [] }],
    commands: [],
    payments: [],
    tickets: options.ticketStatus ? [{ id: "ticket-1", orderId: order.id, tableNumber: 12, priority: 0, status: options.ticketStatus, acceptedAt: null, startedAt: null, readyAt: null }] : [],
    inventory: [],
    audits: [],
    capabilities: [],
    outbox: [],
  };
  const controls = { forceStaleWrite: false, failCapabilityAfter: null as number | null, failOutbox: false };
  let nextId = 1;
  const id = (prefix: string) => prefix + "-" + nextId++;
  const clone = <T>(value: T): T => structuredClone(value);
  const restore = (snapshot: TestState) => {
    for (const key of Object.keys(snapshot) as Array<keyof TestState>) {
      (state as Record<string, unknown>)[key] = clone(snapshot[key]);
    }
  };
  const findCommand = (input: Record<string, any>) => {
    const key = input.where?.scope_idempotencyKey;
    return state.commands.find((command) => command.scope === key?.scope && command.idempotencyKey === key?.idempotencyKey) ?? null;
  };
  const transaction = {
    restaurantCommand: {
      findUnique: async (input: Record<string, any>) => findCommand(input),
      create: async ({ data }: Record<string, any>) => {
        const command = { id: id("command"), outcome: null, completedAt: null, ...data };
        state.commands.push(command);
        return command;
      },
      update: async ({ where, data }: Record<string, any>) => {
        const command = state.commands.find((candidate) => candidate.id === where.id)!;
        Object.assign(command, data);
        return command;
      },
    },
    tableSession: {
      findUnique: async ({ where }: Record<string, any>) =>
        where.id === state.session.id || where.tokenDigest === state.session.tokenDigest ? clone(state.session) : null,
    },
    restaurantTable: {
      findUnique: async ({ where }: Record<string, any>) => where.code === state.table.code ? clone(state.table) : null,
    },
    order: {
      findUnique: async ({ where }: Record<string, any>) => state.order?.id === where.id ? clone(state.order) : null,
      findFirst: async () => state.order ? clone(state.order) : null,
      create: async ({ data }: Record<string, any>) => {
        state.order = { id: id("order"), submittedAt: null, paidAt: null, ...data } as TestOrder;
        return clone(state.order);
      },
      updateMany: async ({ where, data }: Record<string, any>) => {
        if (!state.order || state.order.id !== where.id || state.order.orderVersion !== where.orderVersion) return { count: 0 };
        if (controls.forceStaleWrite) {
          controls.forceStaleWrite = false;
          state.order.orderVersion += 1;
          return { count: 0 };
        }
        applyUpdate(state.order as unknown as Record<string, unknown>, data);
        return { count: 1 };
      },
    },
    orderLine: {
      findMany: async ({ where }: Record<string, any>) => clone(state.lines.filter((line) => line.orderId === where.orderId)),
      findFirst: async ({ where }: Record<string, any>) => clone(state.lines.find((line) => line.id === where.id && line.orderId === where.orderId) ?? null),
      create: async ({ data }: Record<string, any>) => {
        const line = { id: id("line"), ...data };
        state.lines.push(line);
        return clone(line);
      },
      update: async ({ where, data }: Record<string, any>) => {
        const line = state.lines.find((candidate) => candidate.id === where.id)!;
        Object.assign(line, data);
        return clone(line);
      },
    },
    menuItem: {
      findUnique: async ({ where }: Record<string, any>) => clone(state.menuItems.find((item) => item.id === where.id) ?? null),
      updateMany: async ({ where, data }: Record<string, any>) => {
        const item = state.menuItems.find((candidate) => candidate.id === where.id);
        if (!item || item.available !== where.available || Number(item.stock) < Number(where.stock?.gte)) return { count: 0 };
        applyUpdate(item, data.stock ? { stock: data.stock } : data);
        return { count: 1 };
      },
      update: async ({ where, data }: Record<string, any>) => {
        const item = state.menuItems.find((candidate) => candidate.id === where.id)!;
        applyUpdate(item, data);
        return clone(item);
      },
    },
    inventoryLedger: {
      create: async ({ data }: Record<string, any>) => {
        const entry = { id: id("inventory"), ...data };
        state.inventory.push(entry);
        return entry;
      },
    },
    paymentAttempt: {
      create: async ({ data }: Record<string, any>) => {
        const payment = { id: id("payment"), ...data };
        state.payments.push(payment);
        return payment;
      },
    },
    kitchenTicket: {
      findUnique: async ({ where }: Record<string, any>) => clone(state.tickets.find((ticket) => ticket.id === where.id) ?? null),
      create: async ({ data }: Record<string, any>) => {
        const ticket = { id: id("ticket"), acceptedAt: null, startedAt: null, readyAt: null, ...data };
        state.tickets.push(ticket);
        return ticket;
      },
      update: async ({ where, data }: Record<string, any>) => {
        const ticket = state.tickets.find((candidate) => candidate.id === where.id)!;
        Object.assign(ticket, data);
        return clone(ticket);
      },
    },
    auditEvent: { create: async ({ data }: Record<string, any>) => { const row = { id: id("audit"), ...data }; state.audits.push(row); return row; } },
    capabilityEvent: {
      create: async ({ data }: Record<string, any>) => {
        if (controls.failCapabilityAfter === 0) throw new Error("Injected capability persistence failure.");
        if (controls.failCapabilityAfter !== null) controls.failCapabilityAfter -= 1;
        const row = { id: id("capability"), ...data };
        state.capabilities.push(row);
        return row;
      },
    },
    restaurantOutboxEvent: {
      create: async ({ data }: Record<string, any>) => {
        if (controls.failOutbox) throw new Error("Injected outbox persistence failure.");
        const row = { id: id("outbox"), ...data };
        state.outbox.push(row);
        return row;
      },
    },
  };
  const prisma = {
    ...transaction,
    kitchenTicket: transaction.kitchenTicket,
    restaurantCommand: transaction.restaurantCommand,
    order: transaction.order,
    $transaction: async (mutate: (tx: typeof transaction) => Promise<unknown>) => {
      const snapshot = clone(state);
      try {
        return await mutate(transaction);
      } catch (error) {
        restore(snapshot);
        throw error;
      }
    },
  };
  return { controls, service: new RestaurantCommandService(prisma as never), state, token };
}

function effectPairs(state: TestState): string[] {
  return state.capabilities.map((event) => String(event.capability) + "/" + String(event.operation));
}

describe("generated Restaurant transaction service", () => {
  it("replays the original outcome without duplicate stock or evidence", async () => {
    const harness = createHarness();
    const body = { expectedVersion: 0 };
    const first = await harness.service.submitOrder("customer", harness.token, "order-1", "submit-once", body);
    const replay = await harness.service.submitOrder("customer", harness.token, "order-1", "submit-once", body);

    expect(replay).toEqual(first);
    expect(harness.state.menuItems[0]!.stock).toBe(3);
    expect(harness.state.commands).toHaveLength(1);
    expect(harness.state.inventory).toHaveLength(1);
    expect(harness.state.audits).toHaveLength(1);
    expect(harness.state.capabilities).toHaveLength(3);
    expect(harness.state.outbox).toHaveLength(1);
  });

  it("rejects a duplicate key with a different payload", async () => {
    const harness = createHarness();
    await harness.service.submitOrder("customer", harness.token, "order-1", "submit-key", { expectedVersion: 0 });

    await expect(harness.service.submitOrder("customer", harness.token, "order-1", "submit-key", { expectedVersion: 1 })).rejects.toThrow("different payload");
    expect(harness.state.menuItems[0]!.stock).toBe(3);
    expect(harness.state.outbox).toHaveLength(1);
  });

  it("returns HTTP 409 with authoritative state after a zero-row optimistic write", async () => {
    const harness = createHarness();
    harness.controls.forceStaleWrite = true;
    const error = await harness.service.addLine("customer", harness.token, "order-1", "stale-line", { expectedVersion: 0, menuItemId: "menu-1", quantity: 1 }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(RestaurantVersionConflict);
    expect((error as RestaurantVersionConflict).payload).toEqual({
      code: "restaurant.order.version_conflict",
      message: "Stale order version. Current version is 1.",
      currentOrder: { id: "order-1", status: "cart", paymentStatus: "unpaid", orderVersion: 1, total: 10 },
    });
    const response = rejected(error);
    expect(response.getStatus()).toBe(409);
    expect(response.getResponse()).toEqual((error as RestaurantVersionConflict).payload);
    expect(response.getResponse()).not.toHaveProperty("currentOrder.tableSessionId");
    expect(harness.state.lines).toHaveLength(1);
  });

  it("rolls back order, stock, command, and evidence on failure", async () => {
    const harness = createHarness();
    harness.controls.failCapabilityAfter = 1;

    await expect(harness.service.submitOrder("customer", harness.token, "order-1", "rollback-submit", { expectedVersion: 0 })).rejects.toThrow("Injected capability persistence failure");
    expect(harness.state.order).toMatchObject({ status: "cart", orderVersion: 0 });
    expect(harness.state.menuItems[0]!.stock).toBe(5);
    expect(harness.state.commands).toHaveLength(0);
    expect(harness.state.inventory).toHaveLength(0);
    expect(harness.state.audits).toHaveLength(0);
    expect(harness.state.capabilities).toHaveLength(0);
    expect(harness.state.outbox).toHaveLength(0);
  });

  it("compensates reserved stock when a submitted order is cancelled", async () => {
    const harness = createHarness({ status: "submitted", stock: 3 });
    await harness.service.cancelOrder("manager", "order-1", "cancel-submit", { expectedVersion: 0, reason: "Guest request" });

    expect(harness.state.order).toMatchObject({ status: "cancelled", orderVersion: 1 });
    expect(harness.state.menuItems[0]!.stock).toBe(5);
    expect(harness.state.inventory).toHaveLength(1);
    expect(harness.state.inventory[0]).toMatchObject({ delta: 2, reason: "release" });
    expect(effectPairs(harness.state)).toEqual(["inventory.release/release", "order.transition/transition", "audit.record/record"]);
    expect(harness.state.outbox).toHaveLength(1);
  });

  it("persists exactly the declared capability effects and one outbox event", async () => {
    const submitted = createHarness();
    await submitted.service.submitOrder("customer", submitted.token, "order-1", "submit", { expectedVersion: 0 });
    expect(effectPairs(submitted.state)).toEqual(["order.create/create", "inventory.reserve/reserve", "audit.record/record"]);
    expect(submitted.state.audits).toHaveLength(1);
    expect(submitted.state.outbox).toHaveLength(1);

    const payment = createHarness({ status: "submitted" });
    await payment.service.recordPayment("cashier", undefined, "order-1", "pay", { expectedVersion: 0, amount: 10, method: "cash" });
    expect(effectPairs(payment.state)).toEqual(["payment.simulate/simulate", "inventory.decrement/decrement", "order.transition/transition", "audit.record/record"]);
    expect(payment.state.audits).toHaveLength(1);
    expect(payment.state.outbox).toHaveLength(1);

    const kitchen = createHarness({ status: "paid", paymentStatus: "paid", ticketStatus: "paid" });
    await kitchen.service.transitionKitchenTicket("kitchen", "ticket-1", "accept", "accept", { expectedVersion: 0 });
    await kitchen.service.transitionKitchenTicket("kitchen", "ticket-1", "start-preparing", "start", { expectedVersion: 1 });
    await kitchen.service.transitionKitchenTicket("kitchen", "ticket-1", "mark-ready", "ready", { expectedVersion: 2 });
    expect(effectPairs(kitchen.state)).toEqual([
      "order.transition/transition", "audit.record/record",
      "order.transition/transition", "audit.record/record",
      "order.transition/transition", "notification.send/send", "audit.record/record",
    ]);
    expect(kitchen.state.audits).toHaveLength(3);
    expect(kitchen.state.outbox).toHaveLength(3);

    const served = createHarness({ status: "ready", paymentStatus: "paid" });
    await served.service.serveOrder("cashier", "order-1", "serve", { expectedVersion: 0 });
    expect(effectPairs(served.state)).toEqual(["order.transition/transition", "audit.record/record"]);
    expect(served.state.audits).toHaveLength(1);
    expect(served.state.outbox).toHaveLength(1);

    const paidCancellation = createHarness({ status: "paid", paymentStatus: "paid" });
    await paidCancellation.service.cancelOrder("manager", "order-1", "cancel-paid", { expectedVersion: 0, reason: "Manager reversal" });
    expect(effectPairs(paidCancellation.state)).toEqual(["order.transition/transition", "audit.record/record"]);
    expect(paidCancellation.state.audits).toHaveLength(1);
    expect(paidCancellation.state.outbox).toHaveLength(1);

    for (const state of [submitted.state, payment.state, kitchen.state, served.state, paidCancellation.state]) {
      expect(state.capabilities.every((event) => event.outcome === "succeeded")).toBe(true);
    }
  });

  it("enforces actual Casbin allow and deny decisions", async () => {
    await expect(enforce("manager", "order", "cancel")).resolves.toBe(true);
    await expect(enforce("kitchen", "kitchen-ticket", "update")).resolves.toBe(true);
    await expect(enforce("customer", "order", "cancel")).resolves.toBe(false);
  });

  it("persists and replays non-transition command evidence exactly once", async () => {
    const resolved = createHarness({ withoutOrder: true });
    const resolveBody = { expectedVersion: 0, token: resolved.token };
    const firstResolve = await resolved.service.resolveTableSession("customer", "resolve", resolveBody);
    const replayResolve = await resolved.service.resolveTableSession("customer", "resolve", resolveBody);
    expect(replayResolve).toEqual(firstResolve);
    expect(effectPairs(resolved.state)).toEqual(["table-session.validate/validate"]);
    expect(resolved.state.audits).toEqual([expect.objectContaining({ action: "table-session.validate" })]);
    expect(resolved.state.outbox).toEqual([expect.objectContaining({ type: "order.created" })]);
    expect(resolved.state.commands).toHaveLength(1);

    const added = createHarness();
    const addBody = { expectedVersion: 0, menuItemId: "menu-1", quantity: 1 };
    const firstAdd = await added.service.addLine("customer", added.token, "order-1", "add", addBody);
    const replayAdd = await added.service.addLine("customer", added.token, "order-1", "add", addBody);
    expect(replayAdd).toEqual(firstAdd);
    expect(added.state.lines).toHaveLength(2);
    expect(effectPairs(added.state)).toEqual(["order.line.add/add"]);
    expect(added.state.audits).toEqual([expect.objectContaining({ action: "order.line.add" })]);
    expect(added.state.outbox).toHaveLength(1);
    expect(added.state.commands).toHaveLength(1);

    const updated = createHarness();
    const updateBody = { expectedVersion: 0, quantity: 3 };
    const firstUpdate = await updated.service.updateLine("customer", updated.token, "order-1", "line-1", "update", updateBody);
    const replayUpdate = await updated.service.updateLine("customer", updated.token, "order-1", "line-1", "update", updateBody);
    expect(replayUpdate).toEqual(firstUpdate);
    expect(updated.state.lines[0]).toMatchObject({ quantity: 3 });
    expect(effectPairs(updated.state)).toEqual(["order.line.update/update"]);
    expect(updated.state.audits).toEqual([expect.objectContaining({ action: "order.line.update" })]);
    expect(updated.state.outbox).toHaveLength(1);
    expect(updated.state.commands).toHaveLength(1);
    for (const state of [resolved.state, added.state, updated.state]) {
      expect(state.capabilities.every((event) => event.outcome === "succeeded")).toBe(true);
    }
  });

  it("rolls back non-transition mutations and partial evidence on failure", async () => {
    const resolved = createHarness({ withoutOrder: true });
    resolved.controls.failOutbox = true;
    await expect(resolved.service.resolveTableSession("customer", "resolve-fail", { expectedVersion: 0, token: resolved.token })).rejects.toThrow("Injected outbox persistence failure");
    expect(resolved.state.order).toBeNull();
    expect(resolved.state.commands).toHaveLength(0);
    expect(resolved.state.capabilities).toHaveLength(0);
    expect(resolved.state.audits).toHaveLength(0);
    expect(resolved.state.outbox).toHaveLength(0);

    const added = createHarness();
    added.controls.failOutbox = true;
    await expect(added.service.addLine("customer", added.token, "order-1", "add-fail", { expectedVersion: 0, menuItemId: "menu-1", quantity: 1 })).rejects.toThrow("Injected outbox persistence failure");
    expect(added.state.order).toMatchObject({ orderVersion: 0, total: 10 });
    expect(added.state.lines).toHaveLength(1);
    expect(added.state.commands).toHaveLength(0);
    expect(added.state.capabilities).toHaveLength(0);
    expect(added.state.audits).toHaveLength(0);
    expect(added.state.outbox).toHaveLength(0);

    const updated = createHarness();
    updated.controls.failOutbox = true;
    await expect(updated.service.updateLine("customer", updated.token, "order-1", "line-1", "update-fail", { expectedVersion: 0, quantity: 3 })).rejects.toThrow("Injected outbox persistence failure");
    expect(updated.state.order).toMatchObject({ orderVersion: 0, total: 10 });
    expect(updated.state.lines[0]).toMatchObject({ quantity: 2 });
    expect(updated.state.commands).toHaveLength(0);
    expect(updated.state.capabilities).toHaveLength(0);
    expect(updated.state.audits).toHaveLength(0);
    expect(updated.state.outbox).toHaveLength(0);
  });

  it("resolves a provisioned seed session into an authoritative cart", async () => {
    const harness = createHarness({ withoutOrder: true });
    const outcome = await harness.service.resolveTableSession("customer", "resolve-seed-session", { expectedVersion: 0, token: harness.token });

    expect(outcome).toMatchObject({ session: { id: "session-1", tableCode: "T12", status: "active" }, order: { status: "cart", orderVersion: 0 } });
    expect(effectPairs(harness.state)).toEqual(["table-session.validate/validate"]);
    expect(harness.state.audits).toHaveLength(1);
    expect(harness.state.outbox).toHaveLength(1);
  });

  it("keeps pure input guards deterministic", () => {
    expect(() => assertSufficientStock(1, 2)).toThrow("Insufficient stock");
    expect(() => assertCancellationReason(" ")).toThrow("Cancellation reason");
    expect(() => assertSessionOwnsOrder("session-a", "session-b")).toThrow("does not own");
    expect(hashOpaqueToken("opaque-token")).toMatch(/^[a-f0-9]{64}$/);
  });
});
`;
}

function renderApiReference(applicationName: string): string {
  const rows = restaurantRuntimeEndpoints
    .map(
      ([method, path]) =>
        `| ${method} | \`${path}\` | ${method === "GET" ? "Server-authoritative read model." : "Requires \`x-factory-idempotency-key\` and \`body.expectedVersion\`."} |`,
    )
    .join("\n");
  return `# API reference\n\nThis Restaurant API is compiled from the immutable Published Graph for **${applicationName}**. Mutations execute through one Prisma transaction and emit audit, capability, and outbox evidence.\n\n## Local demo bootstrap\n\nThe database seed requires a local \`RESTAURANT_DEMO_TABLE_TOKEN\` input of at least 16 characters. The input is never logged or persisted; only its SHA-256 digest is stored in a 24-hour active session for the seeded table. There is no predictable default.\n\n| Method | Path | Contract |\n| --- | --- | --- |\n${rows}\n`;
}

function renderTransitionalWebShell(applicationName: string): string {
  return String.raw`const applicationName = ${JSON.stringify(applicationName)};

export const restaurantRuntimeShell = "factory.restaurant-runtime-shell/v1" as const;

export function GeneratedApplication({ requestedPath }: { requestedPath: string }) {
  return (
    <main data-factory-runtime-shell={restaurantRuntimeShell}>
      <h1>{applicationName}</h1>
      <p>Customer and merchant page renderers are generated by Tasks 4 and 5.</p>
      <p>Requested path: {requestedPath}</p>
    </main>
  );
}
`;
}

export function renderRestaurantRuntime(
  graph: ApplicationGraphV1,
): RestaurantRuntimeArtifacts {
  const profile = assertRestaurantOrderingProfile(graph);
  const transitions = restaurantOrderTransitions(graph);
  const commandEffects = restaurantCommandEffects();
  return {
    profile,
    applicationRuntimeContract: renderApplicationRuntimeContract(),
    commandService: renderCommandService(profile, transitions, commandEffects),
    main: renderMain(graph.metadata.name),
    prismaSchema: renderPrismaSchema(),
    initialMigration: renderInitialMigration(),
    generatedTests: renderGeneratedTests(),
    apiReference: renderApiReference(graph.metadata.name),
    transitionalWebShell: renderTransitionalWebShell(graph.metadata.name),
  };
}
