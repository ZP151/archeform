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
  ["GET", "/api/restaurant/menu/categories"],
  ["GET", "/api/restaurant/menu/items"],
  ["GET", "/api/restaurant/orders/history"],
  ["GET", "/api/restaurant/orders/:id/status"],
  ["GET", "/api/restaurant/orders/:id/receipt"],
  ["GET", "/api/restaurant/merchant/tables"],
  ["POST", "/api/restaurant/merchant/tables/:id/events/:event"],
  ["GET", "/api/restaurant/merchant/menu/categories"],
  ["GET", "/api/restaurant/merchant/menu/items"],
  ["PATCH", "/api/restaurant/merchant/menu/items/:id/availability"],
  ["POST", "/api/restaurant/merchant/menu/items/:id/stock-adjustments"],
  ["GET", "/api/restaurant/merchant/kitchen-tickets"],
  ["GET", "/api/restaurant/merchant/orders"],
  ["GET", "/api/restaurant/merchant/orders/:id/receipt"],
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
  return String.raw`import { createHash, randomBytes } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";

export type RestaurantCommandBody = Record<string, unknown> & {
  readonly expectedVersion: number;
};

export type RestaurantCommandOutcome = Record<string, unknown>;

export type RestaurantMenuQuery = {
  readonly category?: string;
  readonly query?: string;
};

export type RestaurantMenuCategoryView = {
  readonly id: string;
  readonly name: string;
  readonly sortOrder: number;
};

export type RestaurantMenuItemView = {
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

export type RestaurantCustomerOrderView = RestaurantSafeOrderState & {
  readonly fulfilmentType: string;
  readonly orderNote: string;
  readonly submittedAt: Date | null;
  readonly paidAt: Date | null;
  readonly createdAt: Date;
};

export type RestaurantReceiptModifierView = {
  readonly key: string;
  readonly label: string;
  readonly value: string;
};

export type RestaurantReceiptView = RestaurantCustomerOrderView & {
  readonly lines: readonly {
    readonly id: string;
    readonly menuItemId: string;
    readonly menuItemName: string;
    readonly quantity: number;
    readonly unitPrice: number;
    readonly lineNote: string;
    readonly modifiers: readonly RestaurantReceiptModifierView[];
  }[];
  readonly payments: readonly {
    readonly id: string;
    readonly method: string;
    readonly amount: number;
    readonly status: string;
    readonly paidAt: Date | null;
  }[];
};

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

export type RestaurantResourceState =
  | Readonly<{ resource: "restaurant-table"; id: string; resourceVersion: number; status: string; active: boolean }>
  | Readonly<{ resource: "menu-item"; id: string; resourceVersion: number; available: boolean; stock: number }>;

export type RestaurantResourceVersionConflictPayload = {
  readonly code: "restaurant.resource.version_conflict";
  readonly message: string;
  readonly currentResource: RestaurantResourceState;
};

export class RestaurantResourceVersionConflict extends Error {
  readonly payload: RestaurantResourceVersionConflictPayload;

  constructor(currentResource: RestaurantResourceState) {
    const message = "Stale " + currentResource.resource + " version. Current version is " + currentResource.resourceVersion + ".";
    super(message);
    this.name = "RestaurantResourceVersionConflict";
    this.payload = { code: "restaurant.resource.version_conflict", message, currentResource };
  }
}

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
  readonly type: "order.created" | "order.transitioned" | "inventory.changed";
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
  if (reason.trim().length > 500) throw new Error("Cancellation reason must contain at most 500 characters.");
  if (/[\u0000-\u001f\u007f]/.test(reason.trim())) throw new Error("Cancellation reason contains unsupported control characters.");
}

export function assertManagerAdjustmentReason(reason: unknown): asserts reason is "stock-count" | "restock" | "spoilage" | "damage" | "correction" {
  if (!profile.inventoryLedger.adjustmentReasons.includes(reason as never)) {
    throw new Error("Manager stock adjustment reason is invalid.");
  }
}

export function assertOrderNote(value: unknown): string {
  if (value === undefined) return "";
  if (typeof value !== "string") throw new Error("Order note must be a string.");
  const note = value.trim();
  if (note.length > 500) throw new Error("Order note must contain at most 500 characters.");
  if (/[\u0000-\u001f\u007f]/.test(note)) throw new Error("Order note contains unsupported control characters.");
  return note;
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

function optionalSafeQueryValue(value: unknown, key: string): string | undefined {
  if (value === undefined || value === "") return undefined;
  if (typeof value !== "string") throw new Error(key + " must be a string.");
  const normalized = value.trim();
  if (!normalized) return undefined;
  if (normalized.length > 100) throw new Error(key + " must contain at most 100 characters.");
  if (/[\u0000-\u001f\u007f]/.test(normalized)) throw new Error(key + " contains unsupported control characters.");
  return normalized;
}

export function sanitizeReceiptModifiers(value: Prisma.JsonValue): readonly RestaurantReceiptModifierView[] {
  if (!Array.isArray(value)) return [];
  const modifiers: RestaurantReceiptModifierView[] = [];
  for (const candidate of value.slice(0, 20)) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) continue;
    const modifier = candidate as Record<string, unknown>;
    if (typeof modifier.key !== "string" || typeof modifier.label !== "string" || typeof modifier.value !== "string") continue;
    const key = modifier.key.trim();
    const label = modifier.label.trim();
    const modifierValue = modifier.value.trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,49}$/.test(key)) continue;
    if (!label || label.length > 100 || /[\u0000-\u001f\u007f]/.test(label)) continue;
    if (!modifierValue || modifierValue.length > 100 || /[\u0000-\u001f\u007f]/.test(modifierValue)) continue;
    modifiers.push({ key, label, value: modifierValue });
  }
  return modifiers;
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

function customerOrderView(order: {
  id: string;
  status: string;
  paymentStatus: string;
  fulfilmentType: string;
  orderNote: string;
  orderVersion: number;
  total: unknown;
  submittedAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
}): RestaurantCustomerOrderView {
  return {
    ...safeOrderState(order),
    fulfilmentType: order.fulfilmentType,
    orderNote: order.orderNote,
    submittedAt: order.submittedAt,
    paidAt: order.paidAt,
    createdAt: order.createdAt,
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

  private async tableResourceState(tx: RestaurantTransaction, tableId: string): Promise<Extract<RestaurantResourceState, { resource: "restaurant-table" }>> {
    const table = await tx.restaurantTable.findUnique({ where: { id: tableId } });
    if (!table) throw new Error("Restaurant table was not found.");
    return { resource: "restaurant-table", id: table.id, resourceVersion: table.resourceVersion, status: table.status, active: table.active };
  }

  private async menuItemResourceState(tx: RestaurantTransaction, itemId: string): Promise<Extract<RestaurantResourceState, { resource: "menu-item" }>> {
    const item = await tx.menuItem.findUnique({ where: { id: itemId } });
    if (!item) throw new Error("Menu item was not found.");
    return { resource: "menu-item", id: item.id, resourceVersion: item.resourceVersion, available: item.available, stock: item.stock };
  }

  private async throwTableVersionConflict(tx: RestaurantTransaction, tableId: string): Promise<never> {
    throw new RestaurantResourceVersionConflict(await this.tableResourceState(tx, tableId));
  }

  private async throwMenuItemVersionConflict(tx: RestaurantTransaction, itemId: string): Promise<never> {
    throw new RestaurantResourceVersionConflict(await this.menuItemResourceState(tx, itemId));
  }

  private assertActiveSession(session: { status: string; expiresAt: Date }): void {
    if (session.status !== "active" || session.expiresAt <= new Date()) {
      throw new Error("Table session is expired or closed.");
    }
  }

  private async activeCustomerSession(role: string, sessionToken: string | undefined) {
    assertRestaurantRole(role, [profile.roles.customer]);
    const token = this.requireSessionToken(sessionToken);
    const session = await this.prisma.tableSession.findUnique({ where: { tokenDigest: hashOpaqueToken(token) } });
    if (!session) throw new Error("Table session token is invalid.");
    this.assertActiveSession(session);
    const table = await this.prisma.restaurantTable.findUnique({ where: { code: session.tableCode } });
    if (!table?.active || table.status === "closed") throw new Error("Restaurant table is not active.");
    if (!table.restaurantLocationId) throw new Error("Restaurant table is not associated with a location.");
    const location = await this.prisma.restaurantLocation.findUnique({ where: { id: table.restaurantLocationId } });
    if (!location?.active) throw new Error("Restaurant location is not active.");
    return { session, table, location };
  }

  private async customerOrder(role: string, sessionToken: string | undefined, orderId: string) {
    const { session, table, location } = await this.activeCustomerSession(role, sessionToken);
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        tableSessionId: session.id,
        tableSession: { id: session.id, tableCode: table.code, table: { restaurantLocationId: location.id } },
      },
    });
    if (!order) throw new Error("Order is not available for this table session.");
    return order;
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
    if (!table.restaurantLocationId) throw new Error("Restaurant table is not associated with a location.");
    const location = await this.prisma.restaurantLocation.findUnique({ where: { id: table.restaurantLocationId } });
    if (!location?.active) throw new Error("Restaurant location is not active.");
    return "location:" + location.id + ":table:" + table.id + ":session:" + session.id + ":order:" + orderId;
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
    if (!table.restaurantLocationId) throw new Error("Restaurant table is not associated with a location.");
    const location = await tx.restaurantLocation.findUnique({ where: { id: table.restaurantLocationId } });
    if (!location?.active) throw new Error("Restaurant location is not active.");
    return location.id;
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
    if (!scopedTable.restaurantLocationId) throw new Error("Restaurant table is not associated with a location.");
    const scopedLocation = await this.prisma.restaurantLocation.findUnique({ where: { id: scopedTable.restaurantLocationId } });
    if (!scopedLocation?.active) throw new Error("Restaurant location is not active.");
    const scope = "location:" + scopedLocation.id + ":table:" + scopedTable.id + ":session:" + scopedSession.id + ":resolve";
    return this.executeCommand(scope, idempotencyKey, body, async (tx) => {
      const session = await tx.tableSession.findUnique({ where: { tokenDigest } });
      if (!session) throw new Error("Table session token is invalid.");
      this.assertActiveSession(session);
      const table = await tx.restaurantTable.findUnique({ where: { code: session.tableCode } });
      if (!table?.active || table.status === "closed") throw new Error("Restaurant table is not active.");
      if (!table.restaurantLocationId) throw new Error("Restaurant table is not associated with a location.");
      const location = await tx.restaurantLocation.findUnique({ where: { id: table.restaurantLocationId } });
      if (!location?.active) throw new Error("Restaurant location is not active.");
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
      await this.recordEvidence(tx, role, order.id, order.orderVersion, created ? "order.created" : "order.transitioned", location.id, outcome, restaurantCommandEffects.resolveTableSession);
      return outcome;
    });
  }

  async listMenuCategories(role: string): Promise<readonly RestaurantMenuCategoryView[]> {
    assertRestaurantRole(role, [profile.roles.customer]);
    return this.prisma.menuCategory.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, sortOrder: true },
    });
  }

  async listMenuItems(role: string, input: RestaurantMenuQuery): Promise<readonly RestaurantMenuItemView[]> {
    assertRestaurantRole(role, [profile.roles.customer]);
    const category = optionalSafeQueryValue(input.category, "category");
    const query = optionalSafeQueryValue(input.query, "query");
    const where: Prisma.MenuItemWhereInput = {
      available: true,
      category: { active: true },
      ...(category ? { categoryKey: category } : {}),
      ...(query ? { name: { contains: query, mode: "insensitive" } } : {}),
    };
    const items = await this.prisma.menuItem.findMany({
      where,
      orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
      select: { id: true, categoryKey: true, name: true, description: true, price: true, available: true, stock: true, preparationMinutes: true, imageUrl: true },
    });
    return items.map((item) => ({ ...item, price: Number(item.price), available: true as const }));
  }

  async listSessionOrders(role: string, sessionToken: string | undefined): Promise<readonly RestaurantCustomerOrderView[]> {
    const { session, table, location } = await this.activeCustomerSession(role, sessionToken);
    const orders = await this.prisma.order.findMany({
      where: {
        tableSessionId: session.id,
        tableSession: { id: session.id, tableCode: table.code, table: { restaurantLocationId: location.id } },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, paymentStatus: true, fulfilmentType: true, orderNote: true, total: true, orderVersion: true, submittedAt: true, paidAt: true, createdAt: true },
    });
    return orders.map(customerOrderView);
  }

  async getOrderStatus(role: string, sessionToken: string | undefined, orderId: string): Promise<RestaurantCustomerOrderView> {
    return customerOrderView(await this.customerOrder(role, sessionToken, orderId));
  }

  async getReceipt(role: string, sessionToken: string | undefined, orderId: string): Promise<RestaurantReceiptView> {
    const order = await this.customerOrder(role, sessionToken, orderId);
    if (order.paymentStatus !== "paid" && order.paymentStatus !== "reversal-requested") {
      throw new Error("Receipt is not available until payment succeeds.");
    }
    const [lines, payments] = await Promise.all([
      this.prisma.orderLine.findMany({
        where: { orderId },
        orderBy: { createdAt: "asc" },
        include: { menuItem: { select: { name: true } } },
      }),
      this.prisma.paymentAttempt.findMany({
        where: { orderId, status: { in: ["succeeded", "reversed"] } },
        orderBy: { createdAt: "asc" },
        select: { id: true, method: true, amount: true, status: true, paidAt: true },
      }),
    ]);
    return {
      ...customerOrderView(order),
      lines: lines.map((line) => ({ id: line.id, menuItemId: line.menuItemId, menuItemName: line.menuItem.name, quantity: line.quantity, unitPrice: Number(line.unitPrice), lineNote: line.lineNote, modifiers: sanitizeReceiptModifiers(line.modifiers) })),
      payments: payments.map((payment) => ({ ...payment, amount: Number(payment.amount) })),
    };
  }

  async listMerchantTables(role: string) {
    assertRestaurantRole(role, [profile.roles.manager]);
    const tables = await this.prisma.restaurantTable.findMany({
      orderBy: [{ number: "asc" }, { id: "asc" }],
      include: { sessions: { where: { status: "active" }, orderBy: { openedAt: "desc" }, take: 1, select: { id: true } } },
    });
    return tables.map((table) => ({ id: table.id, code: table.code, number: table.number, status: table.status, active: table.active, resourceVersion: table.resourceVersion, activeSessionId: table.sessions[0]?.id ?? null }));
  }

  async transitionMerchantTable(role: string, tableId: string, event: string, idempotencyKey: string | undefined, body: RestaurantCommandBody) {
    assertRestaurantRole(role, [profile.roles.manager]);
    if (event !== "open" && event !== "seat" && event !== "close") throw new Error("Invalid table transition.");
    const scopedTable = await this.prisma.restaurantTable.findUnique({ where: { id: tableId } });
    if (!scopedTable?.restaurantLocationId) throw new Error("Restaurant table is not associated with a location.");
    return this.executeCommand("location:" + scopedTable.restaurantLocationId + ":table:" + tableId + ":" + event, idempotencyKey, body, async (tx) => {
      const table = await tx.restaurantTable.findUnique({ where: { id: tableId } });
      if (!table) throw new Error("Restaurant table was not found.");
      if (table.resourceVersion !== body.expectedVersion) await this.throwTableVersionConflict(tx, tableId);
      let sessionId: string | null = null;
      if (event === "open") {
        if (table.status !== "closed") throw new Error("Only a closed table can be opened.");
      } else if (event === "seat") {
        if (table.status !== "open") throw new Error("Only an open table can be seated.");
        const guestCount = requiredNumber(body, "guestCount");
        if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > 50) throw new Error("guestCount must be an integer from 1 to 50.");
        const tokenDigest = hashOpaqueToken(randomBytes(32).toString("hex"));
        const session = await tx.tableSession.create({ data: { tableCode: table.code, tokenDigest, status: "active", openedAt: new Date(), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), guestCount } });
        sessionId = session.id;
        await tx.capabilityEvent.create({ data: { actor: role, capability: "table-session.create", operation: "create", entity: profile.entities["table-session"], recordId: session.id, outcome: "succeeded" } });
      } else {
        await tx.tableSession.updateMany({ where: { tableCode: table.code, status: "active" }, data: { status: "closed" } });
        await tx.capabilityEvent.create({ data: { actor: role, capability: "table-session.close", operation: "close", entity: profile.entities["table-session"], recordId: tableId, outcome: "succeeded" } });
      }
      const status = event === "seat" ? "seated" : event === "open" ? "open" : "closed";
      const active = event !== "close";
      const nextVersion = table.resourceVersion + 1;
      const updated = await tx.restaurantTable.updateMany({ where: { id: tableId, resourceVersion: body.expectedVersion }, data: { status, active, resourceVersion: { increment: 1 } } });
      if (updated.count !== 1) await this.throwTableVersionConflict(tx, tableId);
      await tx.auditEvent.create({ data: { actor: role, action: "table." + event, entity: profile.entities["restaurant-table"], recordId: tableId } });
      const outcome = jsonOutcome({ id: tableId, status, active, resourceVersion: nextVersion, sessionId });
      return outcome;
    });
  }

  async listMerchantMenuCategories(role: string) {
    assertRestaurantRole(role, [profile.roles.manager]);
    return this.prisma.menuCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { id: "asc" }], select: { id: true, name: true, sortOrder: true, active: true } });
  }

  async listMerchantMenuItems(role: string) {
    assertRestaurantRole(role, [profile.roles.manager]);
    const items = await this.prisma.menuItem.findMany({ orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }, { id: "asc" }], select: { id: true, categoryKey: true, name: true, available: true, stock: true, price: true, resourceVersion: true } });
    return items.map((item) => ({ ...item, price: Number(item.price) }));
  }

  private async activeLocationId(tx: RestaurantTransaction): Promise<string> {
    const location = await tx.restaurantLocation.findFirst({ where: { active: true }, orderBy: { id: "asc" }, select: { id: true } });
    if (!location) throw new Error("Restaurant location is not active.");
    return location.id;
  }

  async setMenuItemAvailability(role: string, itemId: string, idempotencyKey: string | undefined, body: RestaurantCommandBody) {
    assertRestaurantRole(role, [profile.roles.manager]);
    if (typeof body.available !== "boolean") throw new Error("available must be a boolean.");
    return this.executeCommand("merchant:menu-item:" + itemId + ":availability", idempotencyKey, body, async (tx) => {
      const item = await tx.menuItem.findUnique({ where: { id: itemId } });
      if (!item) throw new Error("Menu item was not found.");
      if (item.resourceVersion !== body.expectedVersion) await this.throwMenuItemVersionConflict(tx, itemId);
      const locationId = await this.activeLocationId(tx);
      const nextVersion = item.resourceVersion + 1;
      const updated = await tx.menuItem.updateMany({ where: { id: itemId, resourceVersion: body.expectedVersion }, data: { available: body.available as boolean, resourceVersion: { increment: 1 } } });
      if (updated.count !== 1) await this.throwMenuItemVersionConflict(tx, itemId);
      await tx.inventoryLedger.create({ data: { menuItemId: itemId, orderId: null, delta: 0, provenance: "manager-adjustment", adjustmentReason: "correction", recordedAt: new Date() } });
      await tx.capabilityEvent.create({ data: { actor: role, capability: "inventory.adjust", operation: "adjust", entity: profile.inventoryLedger.entity, recordId: itemId, outcome: "succeeded" } });
      await tx.capabilityEvent.create({ data: { actor: role, capability: "audit.record", operation: "record", entity: profile.inventoryLedger.entity, recordId: itemId, outcome: "succeeded" } });
      await tx.auditEvent.create({ data: { actor: role, action: "inventory.adjust", entity: profile.inventoryLedger.entity, recordId: itemId } });
      const outcome = jsonOutcome({ id: item.id, available: body.available, stock: item.stock, resourceVersion: nextVersion });
      await tx.restaurantOutboxEvent.create({ data: { type: "inventory.changed", aggregateId: null, locationId, version: nextVersion, payload: outcome as Prisma.InputJsonValue } });
      return outcome;
    });
  }

  async adjustMenuItemStock(role: string, itemId: string, idempotencyKey: string | undefined, body: RestaurantCommandBody) {
    assertRestaurantRole(role, [profile.roles.manager]);
    const delta = requiredNumber(body, "delta");
    if (!Number.isInteger(delta) || delta === 0) throw new Error("delta must be a non-zero integer.");
    assertManagerAdjustmentReason(body.adjustmentReason);
    const adjustmentReason = body.adjustmentReason;
    return this.executeCommand("merchant:menu-item:" + itemId + ":stock", idempotencyKey, body, async (tx) => {
      const locationId = await this.activeLocationId(tx);
      const current = await tx.menuItem.findUnique({ where: { id: itemId } });
      if (!current) throw new Error("Menu item was not found.");
      if (current.resourceVersion !== body.expectedVersion) await this.throwMenuItemVersionConflict(tx, itemId);
      if (current.stock + delta < 0) throw new Error("Stock adjustment would make inventory negative.");
      const nextVersion = current.resourceVersion + 1;
      const updated = await tx.menuItem.updateMany({ where: { id: itemId, resourceVersion: body.expectedVersion, stock: { gte: Math.max(0, -delta) } }, data: { stock: { increment: delta }, resourceVersion: { increment: 1 } } });
      if (updated.count !== 1) await this.throwMenuItemVersionConflict(tx, itemId);
      const item = await tx.menuItem.findUnique({ where: { id: itemId } });
      if (!item) throw new Error("Menu item was not found.");
      await tx.inventoryLedger.create({ data: { menuItemId: itemId, orderId: null, delta, provenance: "manager-adjustment", adjustmentReason, recordedAt: new Date() } });
      await tx.capabilityEvent.create({ data: { actor: role, capability: "inventory.adjust", operation: "adjust", entity: profile.inventoryLedger.entity, recordId: itemId, outcome: "succeeded" } });
      await tx.capabilityEvent.create({ data: { actor: role, capability: "audit.record", operation: "record", entity: profile.inventoryLedger.entity, recordId: itemId, outcome: "succeeded" } });
      await tx.auditEvent.create({ data: { actor: role, action: "inventory.adjust", entity: profile.inventoryLedger.entity, recordId: itemId } });
      const outcome = jsonOutcome({ id: item.id, stock: item.stock, resourceVersion: nextVersion, delta, adjustmentReason, auditRecorded: true });
      await tx.restaurantOutboxEvent.create({ data: { type: "inventory.changed", aggregateId: null, locationId, version: nextVersion, payload: outcome as Prisma.InputJsonValue } });
      return outcome;
    });
  }

  async listKitchenTickets(role: string) {
    assertRestaurantRole(role, [profile.roles.kitchen, profile.roles.manager]);
    const tickets = await this.prisma.kitchenTicket.findMany({
      where: { status: { in: ["paid", "accepted", "preparing", "ready"] } },
      orderBy: [{ priority: "desc" }, { order: { paidAt: "asc" } }, { tableNumber: "asc" }, { id: "asc" }],
      include: { order: { select: { paidAt: true, orderVersion: true } } },
    });
    return tickets.map((ticket) => ({ id: ticket.id, orderId: ticket.orderId, tableNumber: ticket.tableNumber, priority: ticket.priority, status: ticket.status, paidAt: ticket.order.paidAt, orderVersion: ticket.order.orderVersion }));
  }

  async listMerchantOrders(role: string) {
    assertRestaurantRole(role, [profile.roles.cashier, profile.roles.manager]);
    const orders = await this.prisma.order.findMany({
      where: { status: { in: ["submitted", "paid", "accepted", "preparing", "ready"] } },
      orderBy: [{ paidAt: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      include: { tableSession: { include: { table: { select: { number: true } } } } },
    });
    return orders.map((order) => ({ ...customerOrderView(order), tableNumber: order.tableSession.table.number }));
  }

  async getMerchantReceipt(role: string, orderId: string): Promise<RestaurantReceiptView> {
    assertRestaurantRole(role, [profile.roles.cashier]);
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error("Order not found.");
    if (order.paymentStatus !== "paid" && order.paymentStatus !== "reversal-requested") throw new Error("Receipt is not available until payment succeeds.");
    const [lines, payments] = await Promise.all([
      this.prisma.orderLine.findMany({ where: { orderId }, orderBy: { createdAt: "asc" }, include: { menuItem: { select: { name: true } } } }),
      this.prisma.paymentAttempt.findMany({ where: { orderId, status: { in: ["succeeded", "reversed"] } }, orderBy: { createdAt: "asc" }, select: { id: true, method: true, amount: true, status: true, paidAt: true } }),
    ]);
    return { ...customerOrderView(order), lines: lines.map((line) => ({ id: line.id, menuItemId: line.menuItemId, menuItemName: line.menuItem.name, quantity: line.quantity, unitPrice: Number(line.unitPrice), lineNote: line.lineNote, modifiers: sanitizeReceiptModifiers(line.modifiers) })), payments: payments.map((payment) => ({ ...payment, amount: Number(payment.amount) })) };
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
    const orderNote = assertOrderNote(body.orderNote);
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
        await tx.inventoryLedger.create({ data: { menuItemId: line.menuItemId, orderId, delta: -line.quantity, provenance: "order-reservation", adjustmentReason: null, recordedAt: new Date() } });
      }
      const nextVersion = order.orderVersion + 1;
      const updated = await tx.order.updateMany({ where: { id: orderId, orderVersion: order.orderVersion }, data: { status: "submitted", submittedAt: new Date(), orderNote: orderNote, orderVersion: nextVersion } });
      if (updated.count !== 1) await this.throwVersionConflict(tx, orderId);
      const outcome = jsonOutcome({ orderId, status: "submitted", orderNote: orderNote, orderVersion: nextVersion });
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
      let inventoryReleased = false;
      if (order.status === "submitted") {
        const lines = await tx.orderLine.findMany({ where: { orderId } });
        for (const line of lines) {
          await tx.menuItem.update({ where: { id: line.menuItemId }, data: { stock: { increment: line.quantity } } });
          await tx.inventoryLedger.create({ data: { menuItemId: line.menuItemId, orderId, delta: line.quantity, provenance: "order-release", adjustmentReason: null, recordedAt: new Date() } });
        }
        inventoryReleased = lines.length > 0;
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
      const outcome = jsonOutcome({ orderId, status: "cancelled", reason: cancellationReason.trim(), orderVersion: nextVersion, inventoryReleased, auditRecorded: true });
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
  return String.raw`import { Body, Controller, Get, Headers, HttpException, HttpStatus, Module, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { PrismaClient } from "@prisma/client";
import { enforce } from "./policy.js";
import { PrismaRecordStore } from "./prisma-record-store.js";
import { RestaurantCommandService, RestaurantResourceVersionConflict, RestaurantVersionConflict, type RestaurantCommandBody, type RestaurantMenuQuery } from "./restaurant/restaurant-command.service.js";

const prisma = new PrismaClient();
const authoritativeStore = new PrismaRecordStore(prisma);
const restaurantCommands = new RestaurantCommandService(prisma);

type RequestHeaders = { headers: Record<string, string | string[] | undefined> };

function roleFrom(request: RequestHeaders): string {
  // Test-only role simulation. This header is not merchant authentication.
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
  if (error instanceof RestaurantVersionConflict || error instanceof RestaurantResourceVersionConflict) {
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

  @Get("restaurant/menu/categories")
  async menuCategories(@Req() request: RequestHeaders) {
    try { const role = roleFrom(request); await assertAllowed(role, "menu-category", "read"); return await restaurantCommands.listMenuCategories(role); } catch (error) { throw rejected(error); }
  }

  @Get("restaurant/menu/items")
  async menuItems(@Query() query: RestaurantMenuQuery, @Req() request: RequestHeaders) {
    try { const role = roleFrom(request); await assertAllowed(role, "menu-item", "read"); return await restaurantCommands.listMenuItems(role, query); } catch (error) { throw rejected(error); }
  }

  @Get("restaurant/orders/history")
  async orderHistory(@Req() request: RequestHeaders) {
    try { const role = roleFrom(request); await assertAllowed(role, "order", "read"); return await restaurantCommands.listSessionOrders(role, sessionTokenFrom(request)); } catch (error) { throw rejected(error); }
  }

  @Get("restaurant/orders/:id/status")
  async orderStatus(@Param("id") id: string, @Req() request: RequestHeaders) {
    try { const role = roleFrom(request); await assertAllowed(role, "order", "read"); return await restaurantCommands.getOrderStatus(role, sessionTokenFrom(request), id); } catch (error) { throw rejected(error); }
  }

  @Get("restaurant/orders/:id/receipt")
  async receipt(@Param("id") id: string, @Req() request: RequestHeaders) {
    try { const role = roleFrom(request); await assertAllowed(role, "order", "read"); return await restaurantCommands.getReceipt(role, sessionTokenFrom(request), id); } catch (error) { throw rejected(error); }
  }

  @Get("restaurant/merchant/tables")
  async merchantTables(@Req() request: RequestHeaders) {
    try { const role = roleFrom(request); await assertAllowed(role, "restaurant-table", "read"); return await restaurantCommands.listMerchantTables(role); } catch (error) { throw rejected(error); }
  }

  @Post("restaurant/merchant/tables/:id/events/:event")
  async merchantTableEvent(@Param("id") id: string, @Param("event") event: string, @Headers("x-factory-idempotency-key") key: string | undefined, @Body() body: RestaurantCommandBody, @Req() request: RequestHeaders) {
    try { const role = roleFrom(request); await assertAllowed(role, "restaurant-table", "update"); if (event === "seat") await assertAllowed(role, "table-session", "create"); if (event === "close") await assertAllowed(role, "table-session", "update"); return await restaurantCommands.transitionMerchantTable(role, id, event, key, body); } catch (error) { throw rejected(error); }
  }

  @Get("restaurant/merchant/menu/categories")
  async merchantMenuCategories(@Req() request: RequestHeaders) {
    try { const role = roleFrom(request); await assertAllowed(role, "menu-category", "read"); return await restaurantCommands.listMerchantMenuCategories(role); } catch (error) { throw rejected(error); }
  }

  @Get("restaurant/merchant/menu/items")
  async merchantMenuItems(@Req() request: RequestHeaders) {
    try { const role = roleFrom(request); await assertAllowed(role, "menu-item", "read"); return await restaurantCommands.listMerchantMenuItems(role); } catch (error) { throw rejected(error); }
  }

  @Patch("restaurant/merchant/menu/items/:id/availability")
  async merchantMenuAvailability(@Param("id") id: string, @Headers("x-factory-idempotency-key") key: string | undefined, @Body() body: RestaurantCommandBody, @Req() request: RequestHeaders) {
    try { const role = roleFrom(request); await assertAllowed(role, "menu-item", "update"); await assertAllowed(role, "inventory-ledger", "create"); return await restaurantCommands.setMenuItemAvailability(role, id, key, body); } catch (error) { throw rejected(error); }
  }

  @Post("restaurant/merchant/menu/items/:id/stock-adjustments")
  async merchantStockAdjustment(@Param("id") id: string, @Headers("x-factory-idempotency-key") key: string | undefined, @Body() body: RestaurantCommandBody, @Req() request: RequestHeaders) {
    try { const role = roleFrom(request); await assertAllowed(role, "menu-item", "update"); await assertAllowed(role, "inventory-ledger", "create"); return await restaurantCommands.adjustMenuItemStock(role, id, key, body); } catch (error) { throw rejected(error); }
  }

  @Get("restaurant/merchant/kitchen-tickets")
  async merchantKitchenTickets(@Req() request: RequestHeaders) {
    try { const role = roleFrom(request); await assertAllowed(role, "kitchen-ticket", "read"); return await restaurantCommands.listKitchenTickets(role); } catch (error) { throw rejected(error); }
  }

  @Get("restaurant/merchant/orders")
  async merchantOrders(@Req() request: RequestHeaders) {
    try { const role = roleFrom(request); await assertAllowed(role, "order", "read"); return await restaurantCommands.listMerchantOrders(role); } catch (error) { throw rejected(error); }
  }

  @Get("restaurant/merchant/orders/:id/receipt")
  async merchantReceipt(@Param("id") id: string, @Req() request: RequestHeaders) {
    try { const role = roleFrom(request); await assertAllowed(role, "order", "read"); await assertAllowed(role, "payment-attempt", "read"); return await restaurantCommands.getMerchantReceipt(role, id); } catch (error) { throw rejected(error); }
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
    try { const role = roleFrom(request); await assertAllowed(role, "order", "update"); if (role === "cashier") await assertAllowed(role, "payment-attempt", "create"); return await restaurantCommands.recordPayment(role, sessionTokenFrom(request), id, key, body); } catch (error) { throw rejected(error); }
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
  resourceVersion Int @default(0)
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
  resourceVersion Int @default(0)
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
  orderId String?
  delta Int
  provenance String
  adjustmentReason String?
  recordedAt DateTime
  menuItem MenuItem @relation(fields: [menuItemId], references: [id])
  order Order? @relation(fields: [orderId], references: [id])
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
    '"id" TEXT NOT NULL PRIMARY KEY, "code" TEXT NOT NULL UNIQUE, "number" INTEGER NOT NULL UNIQUE, "status" TEXT NOT NULL, "active" BOOLEAN NOT NULL, "resourceVersion" INTEGER NOT NULL DEFAULT 0, "restaurantLocationId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL',
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
    '"id" TEXT NOT NULL PRIMARY KEY, "categoryKey" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT NOT NULL, "price" DECIMAL NOT NULL, "available" BOOLEAN NOT NULL, "stock" INTEGER NOT NULL, "resourceVersion" INTEGER NOT NULL DEFAULT 0, "preparationMinutes" INTEGER NOT NULL, "imageUrl" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL',
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
    '"id" TEXT NOT NULL PRIMARY KEY, "menuItemId" TEXT NOT NULL, "orderId" TEXT, "delta" INTEGER NOT NULL, "provenance" TEXT NOT NULL, "adjustmentReason" TEXT, "recordedAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL',
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
  RestaurantResourceVersionConflict,
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
  createdAt: Date;
};

type TestState = {
  order: TestOrder | null;
  otherOrders: TestOrder[];
  session: Record<string, unknown>;
  table: Record<string, unknown>;
  location: Record<string, unknown>;
  categories: Array<Record<string, unknown>>;
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
  locationId?: string | null;
  locationActive?: boolean;
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
    resourceVersion: 0,
    restaurantLocationId: options.locationId === undefined ? "main-location" : options.locationId,
  };
  const location = {
    id: "main-location",
    name: "Main location",
    currency: "USD",
    active: options.locationActive ?? true,
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
    createdAt: new Date("2026-07-30T00:00:00.000Z"),
  };
  const state: TestState = {
    order: options.withoutOrder ? null : order,
    otherOrders: [],
    session,
    table,
    location,
    categories: [
      { id: "mains", name: "Mains", sortOrder: 1, active: true },
      { id: "hidden", name: "Hidden", sortOrder: 2, active: false },
    ],
    menuItems: [
      { id: "menu-1", categoryKey: "mains", name: "Meal", description: "", price: 5, available: true, stock: options.stock ?? 5, resourceVersion: 0, preparationMinutes: 5, imageUrl: "/meal.jpg" },
      { id: "menu-2", categoryKey: "mains", name: "Tomato Soup", description: "", price: 4, available: true, stock: 2, resourceVersion: 0, preparationMinutes: 4, imageUrl: "/soup.jpg" },
      { id: "menu-3", categoryKey: "hidden", name: "Secret", description: "", price: 9, available: true, stock: 1, resourceVersion: 0, preparationMinutes: 9, imageUrl: "/secret.jpg" },
      { id: "menu-4", categoryKey: "mains", name: "Unavailable", description: "", price: 3, available: false, stock: 0, resourceVersion: 0, preparationMinutes: 3, imageUrl: "/unavailable.jpg" },
    ],
    lines: options.withoutOrder ? [] : [{ id: "line-1", orderId: order.id, menuItemId: "menu-1", quantity: 2, unitPrice: 5, lineNote: "", modifiers: [] }],
    commands: [],
    payments: [],
    tickets: options.ticketStatus ? [{ id: "ticket-1", orderId: order.id, tableNumber: 12, priority: 0, status: options.ticketStatus, acceptedAt: null, startedAt: null, readyAt: null }] : [],
    inventory: [],
    audits: [],
    capabilities: [],
    outbox: [],
  };
  const controls = { forceStaleWrite: false, forceTableStaleWrite: false, forceMenuStaleWrite: false, failCapabilityAfter: null as number | null, failOutbox: false, orderLocationId: "main-location" };
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
      create: async ({ data }: Record<string, any>) => {
        Object.assign(state.session, { id: id("session"), ...data });
        return clone(state.session);
      },
      updateMany: async ({ where, data }: Record<string, any>) => {
        if (state.session.tableCode !== where.tableCode || state.session.status !== where.status) return { count: 0 };
        applyUpdate(state.session, data);
        return { count: 1 };
      },
    },
    restaurantTable: {
      findUnique: async ({ where }: Record<string, any>) => where.code === state.table.code || where.id === state.table.id ? clone(state.table) : null,
      findMany: async () => [{ ...clone(state.table), sessions: state.session.status === "active" ? [{ id: state.session.id }] : [] }],
      updateMany: async ({ where, data }: Record<string, any>) => {
        if (state.table.id !== where.id || state.table.resourceVersion !== where.resourceVersion) return { count: 0 };
        if (controls.forceTableStaleWrite) {
          controls.forceTableStaleWrite = false;
          state.table.resourceVersion = Number(state.table.resourceVersion) + 1;
          return { count: 0 };
        }
        applyUpdate(state.table, data);
        return { count: 1 };
      },
    },
    restaurantLocation: {
      findUnique: async ({ where }: Record<string, any>) => where.id === state.location.id ? clone(state.location) : null,
      findFirst: async () => state.location.active ? { id: state.location.id } : null,
    },
    menuCategory: {
      findMany: async () => clone(state.categories.filter((category) => category.active).sort((left, right) => Number(left.sortOrder) - Number(right.sortOrder) || String(left.name).localeCompare(String(right.name))).map((category) => ({ id: category.id, name: category.name, sortOrder: category.sortOrder }))),
    },
    order: {
      findUnique: async ({ where }: Record<string, any>) => clone([state.order, ...state.otherOrders].find((candidate) => candidate?.id === where.id) ?? null),
      findFirst: async ({ where }: Record<string, any>) => {
        if (!where.id) return state.order ? clone(state.order) : null;
        const order = [state.order, ...state.otherOrders].find((candidate) => candidate?.id === where.id);
        const locationId = where.tableSession?.table?.restaurantLocationId;
        return order?.tableSessionId === where.tableSessionId && controls.orderLocationId === locationId ? clone(order) : null;
      },
      findMany: async ({ where }: Record<string, any>) => {
        if (where.status?.in) {
          return clone([state.order, ...state.otherOrders].filter((candidate) => candidate && where.status.in.includes(candidate.status)).map((candidate) => ({ ...candidate, tableSession: { table: { number: state.table.number } } })));
        }
        const locationId = where.tableSession?.table?.restaurantLocationId;
        if (locationId && controls.orderLocationId !== locationId) return [];
        return clone([state.order, ...state.otherOrders].filter((candidate) => candidate?.tableSessionId === where.tableSessionId));
      },
      create: async ({ data }: Record<string, any>) => {
        state.order = { id: id("order"), submittedAt: null, paidAt: null, createdAt: new Date("2026-07-30T00:00:00.000Z"), ...data } as TestOrder;
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
      count: async ({ where }: Record<string, any> = {}) => [state.order, ...state.otherOrders].filter((candidate) => candidate && (!where?.status || candidate.status === where.status)).length,
    },
    orderLine: {
      findMany: async ({ where, include }: Record<string, any>) => clone(state.lines.filter((line) => line.orderId === where.orderId).map((line) => include?.menuItem ? { ...line, menuItem: { name: state.menuItems.find((item) => item.id === line.menuItemId)?.name } } : line)),
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
      findMany: async ({ where, select }: Record<string, any> = {}) => {
        const matched = !where ? state.menuItems : state.menuItems.filter((item) => {
        const category = state.categories.find((candidate) => candidate.id === item.categoryKey);
        const matchesQuery = !where.name?.contains || String(item.name).toLowerCase().includes(String(where.name.contains).toLowerCase());
        const matchesAvailable = where.available === undefined || item.available === where.available;
        const matchesCategory = where.category === undefined || category?.active === where.category.active;
        const matchesStock = where.stock?.lte === undefined || Number(item.stock) <= Number(where.stock.lte);
        return matchesAvailable && matchesCategory && matchesStock && (!where.categoryKey || item.categoryKey === where.categoryKey) && matchesQuery;
        });
        return clone(select ? matched.map((item) => Object.fromEntries(Object.keys(select).filter((key) => select[key]).map((key) => [key, item[key]]))) : matched);
      },
      updateMany: async ({ where, data }: Record<string, any>) => {
        const item = state.menuItems.find((candidate) => candidate.id === where.id);
        if (!item) return { count: 0 };
        if (where.resourceVersion !== undefined && item.resourceVersion !== where.resourceVersion) return { count: 0 };
        if (where.available !== undefined && item.available !== where.available) return { count: 0 };
        if (where.stock?.gte !== undefined && Number(item.stock) < Number(where.stock.gte)) return { count: 0 };
        if (controls.forceMenuStaleWrite) {
          controls.forceMenuStaleWrite = false;
          item.resourceVersion = Number(item.resourceVersion) + 1;
          return { count: 0 };
        }
        applyUpdate(item, data);
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
      findMany: async ({ where }: Record<string, any>) => clone(state.payments.filter((payment) => payment.orderId === where.orderId && where.status.in.includes(payment.status))),
      create: async ({ data }: Record<string, any>) => {
        const payment = { id: id("payment"), ...data };
        state.payments.push(payment);
        return payment;
      },
      aggregate: async () => ({ _sum: { amount: state.payments.filter((payment) => payment.status === "succeeded").reduce((sum, payment) => sum + Number(payment.amount), 0) } }),
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
      findMany: async ({ where }: Record<string, any>) => {
        if (where.startedAt) return clone(state.tickets.filter((ticket) => ticket.startedAt && ticket.readyAt));
        const permitted = state.tickets.filter((ticket) => where.status.in.includes(ticket.status)).map((ticket) => {
          const order = [state.order, ...state.otherOrders].find((candidate) => candidate?.id === ticket.orderId)!;
          return { ...ticket, order: { paidAt: order.paidAt, orderVersion: order.orderVersion } };
        });
        return clone(permitted.sort((left, right) => Number(right.priority) - Number(left.priority) || left.order.paidAt!.getTime() - right.order.paidAt!.getTime() || Number(left.tableNumber) - Number(right.tableNumber) || String(left.id).localeCompare(String(right.id))));
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
    expect(harness.state.inventory[0]).toMatchObject({ delta: 2, provenance: "order-release", orderId: "order-1" });
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
    await expect(enforce("customer", "menu-category", "read")).resolves.toBe(true);
    await expect(enforce("customer", "menu-item", "read")).resolves.toBe(true);
    await expect(enforce("customer", "order", "read")).resolves.toBe(true);
    await expect(enforce("customer", "order", "cancel")).resolves.toBe(false);
    await expect(enforce("anonymous", "order", "read")).resolves.toBe(false);
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

  it("lists active categories and filters available menu items", async () => {
    const harness = createHarness();

    await expect(harness.service.listMenuCategories("customer")).resolves.toEqual([
      { id: "mains", name: "Mains", sortOrder: 1 },
    ]);
    await expect(harness.service.listMenuItems("customer", { category: "mains", query: "soup" })).resolves.toEqual([
      { id: "menu-2", categoryKey: "mains", name: "Tomato Soup", description: "", price: 4, available: true, stock: 2, preparationMinutes: 4, imageUrl: "/soup.jpg" },
    ]);
    await expect(harness.service.listMenuItems("customer", { query: "unsafe\u0000query" })).rejects.toThrow("unsupported control characters");
  });

  it("rejects invalid and expired tokens for customer reads", async () => {
    const invalid = createHarness();
    await expect(invalid.service.listSessionOrders("customer", "not-the-token")).rejects.toThrow("token is invalid");

    const expired = createHarness();
    expired.state.session.expiresAt = new Date("2000-01-01T00:00:00.000Z");
    await expect(expired.service.listSessionOrders("customer", expired.token)).rejects.toThrow("expired or closed");
  });

  it("rejects a table without a Restaurant location", async () => {
    const harness = createHarness({ locationId: null });

    await expect(harness.service.listSessionOrders("customer", harness.token)).rejects.toThrow("not associated with a location");
  });

  it("rejects an inactive Restaurant location", async () => {
    const harness = createHarness({ locationActive: false });

    await expect(harness.service.listSessionOrders("customer", harness.token)).rejects.toThrow("location is not active");
  });

  it("rejects wrong-location order and session linkage", async () => {
    const harness = createHarness({ status: "paid", paymentStatus: "paid" });
    harness.controls.orderLocationId = "other-location";

    await expect(harness.service.listSessionOrders("customer", harness.token)).resolves.toEqual([]);
    await expect(harness.service.getOrderStatus("customer", harness.token, "order-1")).rejects.toThrow("not available for this table session");
    await expect(harness.service.getReceipt("customer", harness.token, "order-1")).rejects.toThrow("not available for this table session");
  });

  it("returns only the token-bound session order history", async () => {
    const harness = createHarness({ status: "paid", paymentStatus: "paid" });
    harness.state.otherOrders.push({
      ...structuredClone(harness.state.order!),
      id: "other-order",
      tableSessionId: "session-2",
      createdAt: new Date("2026-07-30T01:00:00.000Z"),
    });

    const history = await harness.service.listSessionOrders("customer", harness.token);

    expect(history.map((order) => order.id)).toEqual(["order-1"]);
    expect(history[0]).not.toHaveProperty("tableSessionId");
  });

  it("denies cross-session order status and receipt reads", async () => {
    const harness = createHarness({ status: "paid", paymentStatus: "paid" });
    harness.state.payments.push({ id: "payment-1", orderId: "order-1", method: "cash", amount: 10, status: "succeeded", paidAt: new Date("2026-07-30T00:05:00.000Z") });
    harness.state.otherOrders.push({
      ...structuredClone(harness.state.order!),
      id: "other-order",
      tableSessionId: "session-2",
    });

    await expect(harness.service.getOrderStatus("customer", harness.token, "order-1")).resolves.toMatchObject({ id: "order-1", status: "paid", paymentStatus: "paid", total: 10 });
    await expect(harness.service.getReceipt("customer", harness.token, "order-1")).resolves.toMatchObject({
      id: "order-1",
      lines: [{ menuItemId: "menu-1", menuItemName: "Meal", quantity: 2 }],
      payments: [{ id: "payment-1", method: "cash", amount: 10, status: "succeeded" }],
    });
    await expect(harness.service.getOrderStatus("customer", harness.token, "other-order")).rejects.toThrow("not available for this table session");
    await expect(harness.service.getReceipt("customer", harness.token, "other-order")).rejects.toThrow("not available for this table session");
  });

  it("strips malformed and undeclared receipt modifier data", async () => {
    const harness = createHarness({ status: "paid", paymentStatus: "paid" });
    harness.state.lines[0]!.modifiers = [
      { key: "size", label: "Size", value: "Large", executable: "alert(1)" },
      { key: "", label: "Missing key", value: "bad" },
      { key: "heat", label: "Heat", value: { arbitrary: true } },
      "raw-json",
    ];
    harness.state.payments.push({ id: "payment-1", orderId: "order-1", method: "cash", amount: 10, status: "succeeded", paidAt: new Date("2026-07-30T00:05:00.000Z") });

    const receipt = await harness.service.getReceipt("customer", harness.token, "order-1");

    expect(receipt.lines[0]!.modifiers).toEqual([{ key: "size", label: "Size", value: "Large" }]);
    expect(JSON.stringify(receipt)).not.toContain("executable");
    expect(JSON.stringify(receipt)).not.toContain("arbitrary");
    expect(JSON.stringify(receipt)).not.toContain("raw-json");
  });

  it("persists a validated whole-order note on submit", async () => {
    const harness = createHarness();
    const outcome = await harness.service.submitOrder("customer", harness.token, "order-1", "submit-with-note", {
      expectedVersion: 0,
      orderNote: "  Please serve together  ",
    });

    expect(harness.state.order).toMatchObject({ orderNote: "Please serve together", status: "submitted", orderVersion: 1 });
    expect(outcome).toMatchObject({ orderNote: "Please serve together", status: "submitted", orderVersion: 1 });

    const invalid = createHarness();
    await expect(invalid.service.submitOrder("customer", invalid.token, "order-1", "invalid-note", { expectedVersion: 0, orderNote: "x".repeat(501) })).rejects.toThrow("at most 500 characters");
    expect(invalid.state.order).toMatchObject({ orderNote: "", status: "cart", orderVersion: 0 });
    expect(invalid.state.menuItems[0]!.stock).toBe(5);
  });

  it("rejects denied Merchant roles before mutation", async () => {
    const harness = createHarness();

    await expect(enforce("cashier", "inventory-ledger", "create")).resolves.toBe(false);
    await expect(harness.service.adjustMenuItemStock("cashier", "menu-1", "denied-adjustment", { expectedVersion: 0, delta: 1, adjustmentReason: "restock" })).rejects.toThrow("Denied Restaurant command");
    expect(harness.state.menuItems[0]).toMatchObject({ stock: 5, resourceVersion: 0 });
    expect(harness.state.commands).toHaveLength(0);
    expect(harness.state.inventory).toHaveLength(0);
    expect(harness.state.outbox).toHaveLength(0);
  });

  it("rejects stale and concurrent Merchant resource versions with safe state", async () => {
    const staleTable = createHarness();
    const tableError = await staleTable.service.transitionMerchantTable("manager", "table-12", "seat", "stale-table", { expectedVersion: 1, guestCount: 2 }).catch((caught: unknown) => caught);
    expect(tableError).toBeInstanceOf(RestaurantResourceVersionConflict);
    expect((tableError as RestaurantResourceVersionConflict).payload.currentResource).toEqual({ resource: "restaurant-table", id: "table-12", resourceVersion: 0, status: "open", active: true });
    expect(rejected(tableError).getStatus()).toBe(409);

    const concurrentMenu = createHarness();
    concurrentMenu.controls.forceMenuStaleWrite = true;
    const menuError = await concurrentMenu.service.adjustMenuItemStock("manager", "menu-1", "concurrent-stock", { expectedVersion: 0, delta: 1, adjustmentReason: "restock" }).catch((caught: unknown) => caught);
    expect(menuError).toBeInstanceOf(RestaurantResourceVersionConflict);
    expect((menuError as RestaurantResourceVersionConflict).payload.currentResource).toEqual({ resource: "menu-item", id: "menu-1", resourceVersion: 1, available: true, stock: 5 });
    expect(rejected(menuError).getResponse()).toEqual((menuError as RestaurantResourceVersionConflict).payload);
    expect(rejected(menuError).getResponse()).not.toHaveProperty("currentResource.categoryKey");
    expect(concurrentMenu.state.inventory).toHaveLength(0);
    expect(concurrentMenu.state.capabilities).toHaveLength(0);
    expect(concurrentMenu.state.outbox).toHaveLength(0);
  });

  it("keeps successful table transitions out of the publisher outbox", async () => {
    const harness = createHarness();

    const outcome = await harness.service.transitionMerchantTable("manager", "table-12", "seat", "seat-table", { expectedVersion: 0, guestCount: 2 });

    expect(outcome).toMatchObject({ id: "table-12", status: "seated", active: true, resourceVersion: 1 });
    expect(harness.state.table).toMatchObject({ status: "seated", active: true, resourceVersion: 1 });
    expect(effectPairs(harness.state)).toEqual(["table-session.create/create"]);
    expect(harness.state.audits).toEqual([expect.objectContaining({ action: "table.seat", recordId: "table-12" })]);
    expect(harness.state.outbox).toHaveLength(0);
  });

  it("emits only publisher-contract outbox event types", async () => {
    const table = createHarness();
    await table.service.transitionMerchantTable("manager", "table-12", "seat", "publisher-table", { expectedVersion: 0, guestCount: 2 });

    const created = createHarness({ withoutOrder: true });
    await created.service.resolveTableSession("customer", "publisher-created", { expectedVersion: 0, token: created.token });

    const inventory = createHarness();
    await inventory.service.submitOrder("customer", inventory.token, "order-1", "publisher-inventory", { expectedVersion: 0 });

    const transitioned = createHarness({ status: "submitted" });
    await transitioned.service.recordPayment("cashier", undefined, "order-1", "publisher-transitioned", { expectedVersion: 0, amount: 10, method: "cash" });

    const types = [table, created, inventory, transitioned].flatMap((harness) => harness.state.outbox.map((row) => String(row.type))).sort();
    expect(types).toEqual(["inventory.changed", "order.created", "order.transitioned"]);
  });

  it("replays Merchant mutations without duplicate evidence", async () => {
    const harness = createHarness();
    const body = { expectedVersion: 0, delta: 1, adjustmentReason: "restock" } as const;
    const first = await harness.service.adjustMenuItemStock("manager", "menu-1", "adjust-once", body);
    const replay = await harness.service.adjustMenuItemStock("manager", "menu-1", "adjust-once", body);

    expect(replay).toEqual(first);
    expect(first).toMatchObject({ stock: 6, resourceVersion: 1 });
    expect(harness.state.menuItems[0]).toMatchObject({ stock: 6, resourceVersion: 1 });
    expect(harness.state.commands).toHaveLength(1);
    expect(harness.state.inventory).toHaveLength(1);
    expect(effectPairs(harness.state)).toEqual(["inventory.adjust/adjust", "audit.record/record"]);
    expect(harness.state.audits).toHaveLength(1);
    expect(harness.state.outbox).toEqual([expect.objectContaining({ type: "inventory.changed", version: 1 })]);
  });

  it("sorts permitted kitchen tickets deterministically", async () => {
    const harness = createHarness({ status: "paid", paymentStatus: "paid" });
    harness.state.order!.paidAt = new Date("2026-07-30T00:02:00.000Z");
    harness.state.otherOrders.push(
      { ...structuredClone(harness.state.order!), id: "order-2", paidAt: new Date("2026-07-30T00:01:00.000Z") },
      { ...structuredClone(harness.state.order!), id: "order-3", paidAt: new Date("2026-07-30T00:03:00.000Z") },
      { ...structuredClone(harness.state.order!), id: "order-hidden", status: "served", paidAt: new Date("2026-07-30T00:00:00.000Z") },
    );
    harness.state.tickets.push(
      { id: "low", orderId: "order-1", tableNumber: 3, priority: 1, status: "paid", acceptedAt: null, startedAt: null, readyAt: null },
      { id: "high-early", orderId: "order-2", tableNumber: 9, priority: 5, status: "accepted", acceptedAt: null, startedAt: null, readyAt: null },
      { id: "high-late", orderId: "order-3", tableNumber: 1, priority: 5, status: "preparing", acceptedAt: null, startedAt: null, readyAt: null },
      { id: "served", orderId: "order-hidden", tableNumber: 1, priority: 9, status: "served", acceptedAt: null, startedAt: null, readyAt: null },
    );

    const tickets = await harness.service.listKitchenTickets("kitchen");
    expect(tickets.map((ticket) => ticket.id)).toEqual(["high-early", "high-late", "low"]);
  });

  it("validates cancellation reasons and rolls back cancellation evidence atomically", async () => {
    const invalid = createHarness({ status: "submitted", stock: 3 });
    await expect(invalid.service.cancelOrder("manager", "order-1", "invalid-cancel", { expectedVersion: 0, reason: " " })).rejects.toThrow("Cancellation reason is required");
    expect(invalid.state.order).toMatchObject({ status: "submitted", orderVersion: 0 });
    expect(invalid.state.inventory).toHaveLength(0);

    const rollback = createHarness({ status: "submitted", stock: 3 });
    rollback.controls.failOutbox = true;
    await expect(rollback.service.cancelOrder("manager", "order-1", "rollback-cancel", { expectedVersion: 0, reason: "Guest left" })).rejects.toThrow("Injected outbox persistence failure");
    expect(rollback.state.order).toMatchObject({ status: "submitted", orderVersion: 0 });
    expect(rollback.state.menuItems[0]!.stock).toBe(3);
    expect(rollback.state.commands).toHaveLength(0);
    expect(rollback.state.inventory).toHaveLength(0);
    expect(rollback.state.audits).toHaveLength(0);
    expect(rollback.state.capabilities).toHaveLength(0);
    expect(rollback.state.outbox).toHaveLength(0);

    const committed = createHarness({ status: "submitted", stock: 3 });
    const outcome = await committed.service.cancelOrder("manager", "order-1", "commit-cancel", { expectedVersion: 0, reason: "Guest left" });
    expect(outcome).toMatchObject({ inventoryReleased: true, auditRecorded: true, reason: "Guest left", orderVersion: 1 });
    expect(committed.state.inventory).toEqual([expect.objectContaining({ provenance: "order-release", delta: 2 })]);
    expect(effectPairs(committed.state)).toEqual(["inventory.release/release", "order.transition/transition", "audit.record/record"]);
    expect(committed.state.audits).toHaveLength(1);
    expect(committed.state.outbox).toHaveLength(1);
  });

  it("returns a bounded Merchant receipt", async () => {
    const harness = createHarness({ status: "paid", paymentStatus: "paid" });
    harness.state.lines[0]!.modifiers = [
      { key: "size", label: "Size", value: "Large", credential: "remove" },
      { key: "bad", label: "Bad\u0000label", value: "ignored" },
    ];
    harness.state.payments.push({ id: "payment-1", orderId: "order-1", method: "cash", amount: 10, status: "succeeded", paidAt: new Date("2026-07-30T00:05:00.000Z") });

    const receipt = await harness.service.getMerchantReceipt("cashier", "order-1");
    expect(receipt.lines[0]!.modifiers).toEqual([{ key: "size", label: "Size", value: "Large" }]);
    expect(receipt.payments).toEqual([expect.objectContaining({ id: "payment-1", amount: 10, status: "succeeded" })]);
    expect(JSON.stringify(receipt)).not.toContain("credential");
    await expect(harness.service.getMerchantReceipt("manager", "order-1")).rejects.toThrow("Denied Restaurant command");
  });

  it("computes persisted Restaurant reports", async () => {
    const harness = createHarness({ status: "served", paymentStatus: "paid" });
    harness.state.otherOrders.push({ ...structuredClone(harness.state.order!), id: "cancelled-order", status: "cancelled", paymentStatus: "unpaid" });
    harness.state.payments.push({ id: "payment-1", orderId: "order-1", method: "cash", amount: 10, status: "succeeded", paidAt: new Date("2026-07-30T00:05:00.000Z") });
    harness.state.tickets.push(
      { id: "ticket-a", orderId: "order-1", tableNumber: 12, priority: 0, status: "ready", acceptedAt: null, startedAt: new Date("2026-07-30T00:01:00.000Z"), readyAt: new Date("2026-07-30T00:03:00.000Z") },
      { id: "ticket-b", orderId: "cancelled-order", tableNumber: 13, priority: 0, status: "ready", acceptedAt: null, startedAt: new Date("2026-07-30T00:01:00.000Z"), readyAt: new Date("2026-07-30T00:05:00.000Z") },
    );

    await expect(harness.service.reportSummary("manager")).resolves.toEqual({ salesTotal: 10, orderCount: 2, averagePreparationMilliseconds: 180000, cancellationCount: 1 });
    await expect(harness.service.reportLowStock("manager")).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "menu-2", stock: 2 }),
      expect.objectContaining({ id: "menu-3", stock: 1 }),
    ]));
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
    .map(([method, path]) => {
      const contract =
        path === "/api/restaurant/menu/categories"
          ? "Returns active categories only."
          : path === "/api/restaurant/menu/items"
            ? "Returns available items in active categories; optional `category` and `query` values are trimmed, reject control characters, and are limited to 100 characters."
            : path === "/api/restaurant/orders/history"
              ? "Requires `x-factory-table-session-token`; returns orders for the validated active token session only."
              : path.endsWith("/status")
                ? "Requires `x-factory-table-session-token`; returns safe server state only when the order belongs to the validated active token session."
                : path.endsWith("/receipt")
                  ? "Requires `x-factory-table-session-token`; returns paid receipt data only when the order belongs to the validated active token session."
                  : method === "GET"
                    ? "Server-authoritative read model."
                    : path.endsWith("/submit")
                      ? "Requires `x-factory-idempotency-key`, `body.expectedVersion`, and an optional validated `body.orderNote` of at most 500 characters."
                      : "Requires `x-factory-idempotency-key` and `body.expectedVersion`.";
      return `| ${method} | \`${path}\` | ${contract} |`;
    })
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
