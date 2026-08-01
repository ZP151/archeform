import type {
  CapabilityRuntimeModule,
  CommerceOrderOperationCommand,
  CommerceOrderOperationCommandName,
  CommerceOrderOperationPlan,
  CommerceOrderOperationState,
  CommerceOrderOperationStatus,
} from "./contract.js";

const commands = new Set<CommerceOrderOperationCommandName>([
  "hold",
  "release-hold",
  "amend",
  "cancel",
  "record-partial-payment",
  "capture-payment",
  "refund",
]);

const statuses = new Set<CommerceOrderOperationStatus>([
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

const requiredReasonCommands = new Set<CommerceOrderOperationCommandName>([
  "amend",
  "cancel",
  "refund",
]);

const amountCommands = new Set<CommerceOrderOperationCommandName>([
  "record-partial-payment",
  "capture-payment",
  "refund",
]);

const commandRoles: Readonly<
  Record<CommerceOrderOperationCommandName, readonly string[]>
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

function commandAmount(command: CommerceOrderOperationCommand): bigint {
  if (!command.amount || !decimalPattern.test(command.amount)) invalidCommand();
  const amount = decimalToMinorUnits(command.amount);
  if (amount <= 0n) invalidCommand();
  return amount;
}

function hasExactKeys(value: Record<string, unknown>, allowed: ReadonlySet<string>): boolean {
  return Object.keys(value).every((key) => allowed.has(key));
}

function stringValue(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseCommerceOrderOperationCommand(
  value: unknown,
): CommerceOrderOperationCommand {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return invalidCommand();
  }
  const command = value as Record<string, unknown>;
  if (
    !hasExactKeys(command, allowedCommandFields) ||
    typeof command.command !== "string" ||
    !commands.has(command.command as CommerceOrderOperationCommandName) ||
    !stringValue(command.orderId) ||
    typeof command.expectedVersion !== "number" ||
    !Number.isSafeInteger(command.expectedVersion) ||
    command.expectedVersion < 0 ||
    !stringValue(command.idempotencyKey) ||
    !stringValue(command.actorRole) ||
    (command.reason !== undefined && !stringValue(command.reason)) ||
    ((command.amount !== undefined ||
      amountCommands.has(command.command as CommerceOrderOperationCommandName)) &&
      (typeof command.amount !== "string" || !decimalPattern.test(command.amount)))
  ) {
    return invalidCommand();
  }
  const parsed: CommerceOrderOperationCommand = {
    command: command.command as CommerceOrderOperationCommandName,
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

function parseCommerceOrderOperationState(
  value: CommerceOrderOperationState,
): CommerceOrderOperationState {
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
    !statuses.has(state.status as CommerceOrderOperationStatus) ||
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
  if (new Set(processedIdempotencyKeys).size !== processedIdempotencyKeys.length) {
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
    status: state.status as CommerceOrderOperationStatus,
    payment: Object.freeze({ due: payment.due, captured: payment.captured, refunded: payment.refunded }),
    processedIdempotencyKeys: Object.freeze(processedIdempotencyKeys),
  });
}

function createPlan(
  nextState: CommerceOrderOperationStatus,
  paymentDelta: CommerceOrderOperationPlan["paymentDelta"],
  inventoryEffect: CommerceOrderOperationPlan["inventoryEffect"],
  auditAction: string,
): CommerceOrderOperationPlan {
  return Object.freeze({ nextState, incrementVersion: true as const, paymentDelta, inventoryEffect, auditAction });
}

function requireState(
  current: CommerceOrderOperationState,
  allowed: readonly CommerceOrderOperationStatus[],
  description: string,
): void {
  if (!allowed.includes(current.status)) {
    throw new Error(`Commerce order cannot ${description} from '${current.status}'.`);
  }
}

export function planCommerceOrderOperation(
  inputState: CommerceOrderOperationState,
  inputCommand: CommerceOrderOperationCommand,
): CommerceOrderOperationPlan {
  const state = parseCommerceOrderOperationState(inputState);
  const command = parseCommerceOrderOperationCommand(inputCommand);
  if (command.orderId !== state.orderId) throw new Error("Commerce order command targets a different order.");
  if (command.expectedVersion !== state.version) throw new Error("Commerce order command has a stale version.");
  if (state.processedIdempotencyKeys.includes(command.idempotencyKey)) throw new Error("Commerce order command was already processed.");
  if (!commandRoles[command.command].includes(command.actorRole)) throw new Error("Commerce order command is not authorised for this role.");

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
      requireState(state, ["cart", "submitted", "held", "payment-pending"], "amend");
      return createPlan(state.status, "none", "none", "order.amended");
    case "cancel":
      requireState(state, ["submitted", "held", "payment-pending", "paid"], "cancel");
      return createPlan("cancelled", refundable > 0n ? "refund-full" : "none", state.status === "paid" ? "none" : "release", "order.cancelled");
    case "record-partial-payment": {
      requireState(state, ["submitted", "payment-pending"], "record payment");
      const amount = commandAmount(command);
      if (amount >= outstanding) throw new Error("Commerce order partial payment must be below the outstanding amount.");
      return createPlan("payment-pending", "capture-partial", "none", "order.payment.partially-recorded");
    }
    case "capture-payment": {
      requireState(state, ["submitted", "payment-pending"], "capture payment");
      const amount = commandAmount(command);
      if (amount > outstanding) throw new Error("Commerce order payment exceeds the outstanding amount.");
      if (amount !== outstanding) throw new Error("Commerce order final payment must match the outstanding amount.");
      return createPlan("paid", "capture-final", "none", "order.payment.captured");
    }
    case "refund": {
      requireState(state, ["paid", "fulfilled", "cancelled"], "refund");
      const amount = commandAmount(command);
      if (amount > refundable) throw new Error("Commerce order refund exceeds the captured amount.");
      return createPlan(state.status, amount === refundable ? "refund-full" : "refund-partial", "none", "order.refunded");
    }
  }
}

export const capabilityModule: CapabilityRuntimeModule = {
  key: "{{asset.key}}",
  version: "{{asset.version}}",
  applicationId: "{{graph.metadata.id}}",
  effects: {{asset.effectsJson}},
  orderOperationsHandler: { plan: planCommerceOrderOperation },
};
