export type CommerceOrderCommandNameV1 =
  | "hold"
  | "release-hold"
  | "amend"
  | "cancel"
  | "record-partial-payment"
  | "capture-payment"
  | "refund";

export type CommerceOrderStatusV1 =
  | "cart"
  | "submitted"
  | "held"
  | "payment-pending"
  | "paid"
  | "fulfilled"
  | "cancelled";

export interface CommerceOrderPaymentStateV1 {
  readonly due: string;
  readonly captured: string;
  readonly refunded: string;
}

export interface CommerceOrderStateV1 {
  readonly orderId: string;
  readonly version: number;
  readonly status: CommerceOrderStatusV1;
  readonly payment: CommerceOrderPaymentStateV1;
  readonly processedIdempotencyKeys: readonly string[];
}

export interface CommerceOrderCommandV1 {
  readonly command: CommerceOrderCommandNameV1;
  readonly orderId: string;
  readonly expectedVersion: number;
  readonly idempotencyKey: string;
  readonly actorRole: string;
  readonly reason?: string;
  readonly amount?: string;
}

export interface CommerceOrderOperationPlanV1 {
  readonly nextState: CommerceOrderStatusV1;
  readonly incrementVersion: true;
  readonly paymentDelta:
    | "none"
    | "capture-partial"
    | "capture-final"
    | "refund-partial"
    | "refund-full";
  readonly inventoryEffect: "reserve" | "release" | "none";
  readonly auditAction: string;
}

const commands = new Set<CommerceOrderCommandNameV1>([
  "hold",
  "release-hold",
  "amend",
  "cancel",
  "record-partial-payment",
  "capture-payment",
  "refund",
]);

const statuses = new Set<CommerceOrderStatusV1>([
  "cart",
  "submitted",
  "held",
  "payment-pending",
  "paid",
  "fulfilled",
  "cancelled",
]);

const allowedCommandFields = new Set([
  "command",
  "orderId",
  "expectedVersion",
  "idempotencyKey",
  "actorRole",
  "reason",
  "amount",
]);

const requiredReasonCommands = new Set<CommerceOrderCommandNameV1>([
  "amend",
  "cancel",
  "refund",
]);

const amountCommands = new Set<CommerceOrderCommandNameV1>([
  "record-partial-payment",
  "capture-payment",
  "refund",
]);

const commandRoles: Readonly<
  Record<CommerceOrderCommandNameV1, readonly string[]>
> = {
  hold: ["merchant", "manager"],
  "release-hold": ["merchant", "manager"],
  amend: ["customer", "merchant", "manager"],
  cancel: ["merchant", "manager"],
  "record-partial-payment": ["merchant", "manager"],
  "capture-payment": ["merchant", "manager"],
  refund: ["merchant", "manager"],
};

const decimalPattern = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;

function invalidCommand(): never {
  throw new Error("Commerce order command is invalid.");
}

function invalidState(): never {
  throw new Error("Commerce order state is invalid.");
}

function decimalToMinorUnits(value: string): bigint {
  if (!decimalPattern.test(value)) invalidState();
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}

function commandAmount(command: CommerceOrderCommandV1): bigint {
  if (!command.amount || !decimalPattern.test(command.amount)) invalidCommand();
  const amount = decimalToMinorUnits(command.amount);
  if (amount <= 0n) invalidCommand();
  return amount;
}

function hasExactKeys(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
): boolean {
  return Object.keys(value).every((key) => allowed.has(key));
}

function stringValue(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Validates a bounded command payload. The command is deliberately detached
 * from Graph, Provider, network, and template concerns.
 */
export function parseCommerceOrderCommand(
  value: unknown,
): CommerceOrderCommandV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return invalidCommand();
  }
  const command = value as Record<string, unknown>;
  if (
    !hasExactKeys(command, allowedCommandFields) ||
    typeof command.command !== "string" ||
    !commands.has(command.command as CommerceOrderCommandNameV1) ||
    !stringValue(command.orderId) ||
    typeof command.expectedVersion !== "number" ||
    !Number.isSafeInteger(command.expectedVersion) ||
    command.expectedVersion < 0 ||
    !stringValue(command.idempotencyKey) ||
    !stringValue(command.actorRole) ||
    (command.reason !== undefined && !stringValue(command.reason)) ||
    ((command.amount !== undefined ||
      amountCommands.has(command.command as CommerceOrderCommandNameV1)) &&
      (typeof command.amount !== "string" ||
        !decimalPattern.test(command.amount)))
  ) {
    return invalidCommand();
  }
  const parsed: CommerceOrderCommandV1 = {
    command: command.command as CommerceOrderCommandNameV1,
    orderId: command.orderId,
    expectedVersion: command.expectedVersion,
    idempotencyKey: command.idempotencyKey,
    actorRole: command.actorRole,
    ...(command.reason ? { reason: command.reason } : {}),
    ...(command.amount ? { amount: command.amount } : {}),
  };
  if (
    (requiredReasonCommands.has(parsed.command) && !parsed.reason) ||
    (amountCommands.has(parsed.command) && !parsed.amount)
  ) {
    return invalidCommand();
  }
  return Object.freeze(parsed);
}

function parseCommerceOrderState(
  value: CommerceOrderStateV1,
): CommerceOrderStateV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return invalidState();
  }
  const state = value as unknown as Record<string, unknown>;
  if (
    !hasExactKeys(
      state,
      new Set([
        "orderId",
        "version",
        "status",
        "payment",
        "processedIdempotencyKeys",
      ]),
    ) ||
    !stringValue(state.orderId) ||
    typeof state.version !== "number" ||
    !Number.isSafeInteger(state.version) ||
    state.version < 0 ||
    typeof state.status !== "string" ||
    !statuses.has(state.status as CommerceOrderStatusV1) ||
    !Array.isArray(state.processedIdempotencyKeys) ||
    !state.payment ||
    typeof state.payment !== "object" ||
    Array.isArray(state.payment)
  ) {
    return invalidState();
  }
  const processedIdempotencyKeys = state.processedIdempotencyKeys.map((key) => {
    if (!stringValue(key)) invalidState();
    return key;
  });
  if (
    new Set(processedIdempotencyKeys).size !== processedIdempotencyKeys.length
  ) {
    return invalidState();
  }
  const payment = state.payment as Record<string, unknown>;
  if (
    !hasExactKeys(payment, new Set(["due", "captured", "refunded"])) ||
    typeof payment.due !== "string" ||
    typeof payment.captured !== "string" ||
    typeof payment.refunded !== "string"
  ) {
    return invalidState();
  }
  const due = decimalToMinorUnits(payment.due);
  const captured = decimalToMinorUnits(payment.captured);
  const refunded = decimalToMinorUnits(payment.refunded);
  if (
    due <= 0n ||
    captured > due ||
    refunded > captured ||
    (state.status === "paid" && captured !== due) ||
    (state.status === "fulfilled" && captured !== due)
  ) {
    return invalidState();
  }
  return Object.freeze({
    orderId: state.orderId,
    version: state.version,
    status: state.status as CommerceOrderStatusV1,
    payment: Object.freeze({
      due: payment.due,
      captured: payment.captured,
      refunded: payment.refunded,
    }),
    processedIdempotencyKeys: Object.freeze(processedIdempotencyKeys),
  });
}

function createPlan(
  nextState: CommerceOrderStatusV1,
  paymentDelta: CommerceOrderOperationPlanV1["paymentDelta"],
  inventoryEffect: CommerceOrderOperationPlanV1["inventoryEffect"],
  auditAction: string,
): CommerceOrderOperationPlanV1 {
  return Object.freeze({
    nextState,
    incrementVersion: true as const,
    paymentDelta,
    inventoryEffect,
    auditAction,
  });
}

function requireState(
  current: CommerceOrderStateV1,
  allowed: readonly CommerceOrderStatusV1[],
  description: string,
): void {
  if (!allowed.includes(current.status)) {
    throw new Error(
      `Commerce order cannot ${description} from '${current.status}'.`,
    );
  }
}

/**
 * Plans one validated, idempotent order operation. Applying its declared
 * effects and persisting the idempotency receipt are runtime responsibilities.
 */
export function planCommerceOrderOperation(
  inputState: CommerceOrderStateV1,
  inputCommand: CommerceOrderCommandV1,
): CommerceOrderOperationPlanV1 {
  const state = parseCommerceOrderState(inputState);
  const command = parseCommerceOrderCommand(inputCommand);
  if (command.orderId !== state.orderId) {
    throw new Error("Commerce order command targets a different order.");
  }
  if (command.expectedVersion !== state.version) {
    throw new Error("Commerce order command has a stale version.");
  }
  if (state.processedIdempotencyKeys.includes(command.idempotencyKey)) {
    throw new Error("Commerce order command was already processed.");
  }
  if (!commandRoles[command.command].includes(command.actorRole)) {
    throw new Error("Commerce order command is not authorised for this role.");
  }

  const due = decimalToMinorUnits(state.payment.due);
  const captured = decimalToMinorUnits(state.payment.captured);
  const refunded = decimalToMinorUnits(state.payment.refunded);
  const outstanding = due - captured;
  const refundable = captured - refunded;

  switch (command.command) {
    case "hold":
      requireState(state, ["submitted"], "hold");
      return createPlan("held", "none", "reserve", "order.held");
    case "release-hold":
      requireState(state, ["held"], "release a hold");
      return createPlan("submitted", "none", "release", "order.hold-released");
    case "amend":
      requireState(
        state,
        ["cart", "submitted", "held", "payment-pending"],
        "amend",
      );
      return createPlan(state.status, "none", "none", "order.amended");
    case "cancel": {
      requireState(
        state,
        ["submitted", "held", "payment-pending", "paid"],
        "cancel",
      );
      return createPlan(
        "cancelled",
        refundable > 0n ? "refund-full" : "none",
        state.status === "paid" ? "none" : "release",
        "order.cancelled",
      );
    }
    case "record-partial-payment": {
      requireState(state, ["submitted", "payment-pending"], "record payment");
      const amount = commandAmount(command);
      if (amount >= outstanding) {
        throw new Error(
          "Commerce order partial payment must be below the outstanding amount.",
        );
      }
      return createPlan(
        "payment-pending",
        "capture-partial",
        "none",
        "order.payment.partially-recorded",
      );
    }
    case "capture-payment": {
      requireState(state, ["submitted", "payment-pending"], "capture payment");
      const amount = commandAmount(command);
      if (amount > outstanding) {
        throw new Error(
          "Commerce order payment exceeds the outstanding amount.",
        );
      }
      if (amount !== outstanding) {
        throw new Error(
          "Commerce order final payment must match the outstanding amount.",
        );
      }
      return createPlan(
        "paid",
        "capture-final",
        "none",
        "order.payment.captured",
      );
    }
    case "refund": {
      requireState(state, ["paid", "fulfilled", "cancelled"], "refund");
      const amount = commandAmount(command);
      if (amount > refundable) {
        throw new Error("Commerce order refund exceeds the captured amount.");
      }
      return createPlan(
        state.status,
        amount === refundable ? "refund-full" : "refund-partial",
        "none",
        "order.refunded",
      );
    }
  }
}
