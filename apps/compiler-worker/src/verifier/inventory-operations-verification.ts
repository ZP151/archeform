import type { InventoryOperationsProfile } from "@factory/compiler";
import type { VerificationStepV1 } from "@factory/graph";
import type { VerificationProfile } from "./verification-profiles.js";
import type { ProbeContext } from "./probes.js";
import type { HttpMethod } from "./verification-environment.js";

// Private fixtures, used only after the compiler's exact immutable selector.
const sku = "VERIFIER-STOCK-01";
const initialName = "Verifier stock item";
const correctedName = "Verifier corrected item";
const reason = "Verifier stock movement";
const safeId = /^[a-zA-Z0-9._~-]{1,64}$/;
export type InventoryMovementExpectation = {
  readonly id?: string;
  readonly kind: "receive" | "issue" | "adjust";
  readonly delta: 1 | -1;
  readonly beforeQuantity: 0 | 1;
  readonly afterQuantity: 0 | 1;
  readonly itemVersion: 1 | 2 | 3;
  readonly correctionOf: string | null;
};
export type InventoryReadExpectation = {
  readonly kind: "empty" | "list" | "item" | "command" | "history";
  readonly recordId?: string;
  readonly quantity: 0 | 1;
  readonly version: 0 | 1 | 2 | 3 | 4;
  readonly corrected: boolean;
  readonly actor: string;
  readonly movements: readonly InventoryMovementExpectation[];
};
export type InventoryObservation = {
  readonly entity: string;
  readonly actor: string;
  readonly movementIds: readonly string[];
};

export function inventoryVerificationProfile(
  profile: InventoryOperationsProfile,
): VerificationProfile {
  const stepId = "inventory-stock-lifecycle";
  return {
    profileKey: "inventory-" + profile.graphHash.slice(7, 39),
    stepPlan: Object.freeze([
      { stepId: "migration", kind: "migration" },
      { stepId: "health", kind: "health" },
      { stepId, kind: "role-journey" },
    ]),
    apiRegistry: Object.freeze([
      {
        action: "inventory.stock-lifecycle",
        method: "POST",
        route: `/api/${profile.itemEntity}`,
        expectedStatus: 201,
      },
    ]),
    journeys: Object.freeze({
      [stepId]: {
        journeyId: stepId,
        action: "inventory.stock-lifecycle",
        sessionId: `fixture-session-${profile.roles.stockkeeper}`,
        inventory: profile,
      },
    }),
  };
}

export function validInventoryExpectation(
  value: InventoryReadExpectation,
): boolean {
  return (
    !!value &&
    ["empty", "list", "item", "command", "history"].includes(value.kind) &&
    (value.recordId === undefined || safeId.test(value.recordId)) &&
    [0, 1].includes(value.quantity) &&
    [0, 1, 2, 3, 4].includes(value.version) &&
    typeof value.corrected === "boolean" &&
    typeof value.actor === "string" &&
    safeId.test(value.actor) &&
    Array.isArray(value.movements) &&
    value.movements.length <= 3 &&
    value.movements.every(
      (row) =>
        !!row &&
        ["receive", "issue", "adjust"].includes(row.kind) &&
        (row.id === undefined || safeId.test(row.id)) &&
        [1, -1].includes(row.delta) &&
        [0, 1].includes(row.beforeQuantity) &&
        [0, 1].includes(row.afterQuantity) &&
        [1, 2, 3].includes(row.itemVersion) &&
        (row.correctionOf === null ||
          (typeof row.correctionOf === "string" &&
            safeId.test(row.correctionOf))),
    )
  );
}

/** Private comparison: bounded bytes, no bodies or business values escape. */
export async function compareInventoryResponse(
  response: Response,
  expected: InventoryReadExpectation,
  signal: AbortSignal,
): Promise<{ matches: boolean; recordId?: string; movementId?: string }> {
  if (!response.body || signal.aborted) return { matches: false };
  const reader = response.body.getReader(),
    chunks: Uint8Array[] = [];
  const abort = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener("abort", abort, { once: true });
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (signal.aborted) return { matches: false };
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 16 * 1024) return { matches: false };
      chunks.push(value);
    }
    const body: unknown = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)),
    );
    const own = (
      value: unknown,
      keys: readonly string[],
    ): value is Record<string, unknown> =>
      !!value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length === keys.length &&
      keys.every((key) => Object.hasOwn(value, key));
    const item = (value: unknown): value is Record<string, unknown> =>
      own(value, ["id", "sku", "name", "unit", "quantity", "version"]) &&
      typeof value.id === "string" &&
      safeId.test(value.id) &&
      (expected.recordId === undefined || value.id === expected.recordId) &&
      value.sku === sku &&
      value.name === (expected.corrected ? correctedName : initialName) &&
      value.unit === "each" &&
      value.quantity === expected.quantity &&
      !Object.is(value.quantity, -0) &&
      value.version === expected.version &&
      !Object.is(value.version, -0);
    const movement = (
      value: unknown,
      row: InventoryMovementExpectation,
    ): value is Record<string, unknown> =>
      own(value, [
        "id",
        "stockItem",
        "kind",
        "delta",
        "beforeQuantity",
        "afterQuantity",
        "itemVersion",
        "reason",
        "correctionOf",
        "actorRole",
        "recordedAt",
        "status",
      ]) &&
      typeof value.id === "string" &&
      safeId.test(value.id) &&
      (row.id === undefined || value.id === row.id) &&
      value.stockItem === expected.recordId &&
      value.kind === row.kind &&
      value.delta === row.delta &&
      value.beforeQuantity === row.beforeQuantity &&
      !Object.is(value.beforeQuantity, -0) &&
      value.afterQuantity === row.afterQuantity &&
      !Object.is(value.afterQuantity, -0) &&
      value.itemVersion === row.itemVersion &&
      value.reason === reason &&
      value.correctionOf === row.correctionOf &&
      value.actorRole === expected.actor &&
      value.status === "recorded" &&
      typeof value.recordedAt === "string" &&
      /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value.recordedAt) &&
      Number.isFinite(Date.parse(value.recordedAt));
    if (expected.kind === "item")
      return item(body)
        ? { matches: true, recordId: body.id as string }
        : { matches: false };
    if (expected.kind === "command") {
      if (
        !own(body, ["apiVersion", "item", "movement"]) ||
        body.apiVersion !== "factory.generated.inventory-command-result/v1" ||
        !item(body.item) ||
        expected.movements.length !== 1 ||
        !movement(body.movement, expected.movements[0]!)
      )
        return { matches: false };
      return { matches: true, movementId: body.movement.id as string };
    }
    if (
      !own(body, ["apiVersion", "records", "offset", "limit", "hasMore"]) ||
      body.apiVersion !==
        (expected.kind === "empty" || expected.kind === "list"
          ? "factory.generated.inventory-list/v1"
          : "factory.generated.inventory-history/v1") ||
      body.offset !== 0 ||
      body.limit !== 20 ||
      body.hasMore !== false ||
      !Array.isArray(body.records)
    )
      return { matches: false };
    if (expected.kind === "empty")
      return { matches: body.records.length === 0 };
    if (expected.kind === "list")
      return { matches: body.records.length === 1 && item(body.records[0]) };
    const records = body.records;
    return {
      matches:
        records.length === expected.movements.length &&
        expected.movements.every((row, index) =>
          movement(records[index], row),
        ) &&
        new Set(records.map((row) => row.id)).size === records.length,
    };
  } catch {
    return { matches: false };
  } finally {
    signal.removeEventListener("abort", abort);
    void reader.cancel().catch(() => undefined);
  }
}

export function validInventoryObservation(
  value: InventoryObservation,
): boolean {
  return (
    !!value &&
    Object.keys(value).length === 3 &&
    typeof value.entity === "string" &&
    safeId.test(value.entity) &&
    typeof value.actor === "string" &&
    safeId.test(value.actor) &&
    Array.isArray(value.movementIds) &&
    value.movementIds.length >= 1 &&
    value.movementIds.length <= 3 &&
    value.movementIds.every(
      (id) => typeof id === "string" && safeId.test(id),
    ) &&
    new Set(value.movementIds).size === value.movementIds.length
  );
}

/** Fixed read-only program; arguments carry identifiers, never executable text or queries.
 * Queries at most four rows per delegate and produces no stdout/stderr. The node
 * exit code alone crosses the existing owned-preview process boundary. */
export const inventoryAuditObservationProgram = `(async()=>{
  let db; process.exitCode=1;
  process.stdout.write=()=>true; process.stderr.write=()=>true;
  try {
    const input=JSON.parse(process.argv[1]);
    db=new (require('@prisma/client').PrismaClient)({log:[]});
    const where={entity:input.entity}, take=input.movementIds.length+1;
    const audit=await db.factory_AuditEvent.findMany({where,take,select:{actor:true,action:true,entity:true,recordId:true,at:true}});
    const effects=await db.factory_CapabilityEvent.findMany({where,take,select:{actor:true,capability:true,operation:true,entity:true,recordId:true,outcome:true,at:true}});
    const common=row=>row.actor===input.actor&&row.entity===input.entity&&input.movementIds.includes(row.recordId)&&Number.isFinite(new Date(row.at).getTime());
    const exact=rows=>rows.length===input.movementIds.length&&new Set(rows.map(row=>row.recordId)).size===input.movementIds.length&&rows.every(common);
    if(exact(audit)&&exact(effects)&&audit.every(row=>row.action==='record')&&effects.every(row=>row.capability==='audit.record'&&row.operation==='record'&&row.outcome==='completed')&&audit.every(row=>effects.some(effect=>effect.recordId===row.recordId&&new Date(effect.at).getTime()===new Date(row.at).getTime())))process.exitCode=0;
  } catch { process.exitCode=1; }
  finally { try { if(db)await db.$disconnect(); } catch { process.exitCode=1; } }
})()`;

/** One sequential journey retains captured IDs in memory for fresh reads and exact
 * history/effect correspondence; only existing bounded step evidence is returned. */
export async function runInventoryJourney(
  context: ProbeContext,
  profile: InventoryOperationsProfile,
): Promise<VerificationStepV1> {
  let durationMs = 0;
  const evidence = (passed: boolean): VerificationStepV1 => ({
    stepId: context.entry.stepId,
    kind: "role-journey",
    status: passed ? "passed" : "failed",
    summary: passed
      ? "Inventory balance, recorded history, persisted audit effects, retry and denial verified."
      : "Inventory verification did not satisfy the bounded stock contract.",
    durationMs,
    action: "inventory.stock-lifecycle",
    ...(passed ? {} : { failureCode: "inventory.verification_failed" }),
  });
  const base = `/api/${profile.itemEntity}`;
  let id: string | undefined;
  const rows: InventoryMovementExpectation[] = [];
  const expected = (
    kind: InventoryReadExpectation["kind"],
    quantity: 0 | 1,
    version: 0 | 1 | 2 | 3 | 4,
    corrected = false,
    movements: readonly InventoryMovementExpectation[] = [],
  ): InventoryReadExpectation => ({
    kind,
    recordId: id,
    quantity,
    version,
    corrected,
    actor: profile.roles.stockkeeper,
    movements,
  });
  const request = async (
    method: HttpMethod,
    path: string,
    status: number,
    body?: unknown,
    key?: string,
    read?: InventoryReadExpectation,
    observer = false,
  ) => {
    if (context.signal.aborted) throw Error("aborted");
    const result = await context.environment.request(method, path, "api", {
      headers: [
        {
          name: "x-factory-fixture-session",
          value: `fixture-session-${observer ? profile.roles.observer : profile.roles.stockkeeper}`,
        },
        ...(key ? [{ name: "x-factory-idempotency-key", value: key }] : []),
      ],
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      ...(read ? { inventoryRead: read } : {}),
    });
    durationMs += result.durationMs;
    if (
      result.status !== status ||
      (read && result.inventoryReadMatches !== true)
    )
      throw Error("mismatch");
    return result;
  };
  const readBack = async (
    quantity: 0 | 1,
    version: 0 | 1 | 2 | 3 | 4,
    corrected = false,
  ) => {
    await request(
      "GET",
      `${base}/${id}`,
      200,
      undefined,
      undefined,
      expected("item", quantity, version, corrected),
    );
    await request(
      "GET",
      `${base}/${id}/movements`,
      200,
      undefined,
      undefined,
      expected("history", quantity, version, corrected, [...rows].reverse()),
    );
  };
  const audit = async () => {
    if (context.signal.aborted) throw Error("aborted");
    const result = await context.environment.observeInventoryAudit({
      entity: profile.movementEntity,
      actor: profile.roles.stockkeeper,
      movementIds: rows.map((row) => row.id!),
    });
    durationMs += result.durationMs;
    if (!result.succeeded) throw Error("audit");
  };
  try {
    await request(
      "GET",
      base,
      200,
      undefined,
      undefined,
      expected("empty", 0, 0),
    );
    const create = { values: { sku, name: initialName } };
    id = (
      await request(
        "POST",
        base,
        201,
        create,
        "inventory-probe-create",
        expected("item", 0, 0),
      )
    ).recordId;
    if (!id) return evidence(false);
    await readBack(0, 0);
    const receive = { expectedVersion: 0, quantity: 1, reason };
    const first: InventoryMovementExpectation = {
      kind: "receive",
      delta: 1,
      beforeQuantity: 0,
      afterQuantity: 1,
      itemVersion: 1,
      correctionOf: null,
    };
    const received = await request(
      "POST",
      `${base}/${id}/movements/receive`,
      201,
      receive,
      "inventory-probe-receive",
      expected("command", 1, 1, false, [first]),
    );
    if (!received.inventoryMovementId) return evidence(false);
    rows.push({ ...first, id: received.inventoryMovementId });
    await readBack(1, 1);
    await audit();
    const second: InventoryMovementExpectation = {
      kind: "issue",
      delta: -1,
      beforeQuantity: 1,
      afterQuantity: 0,
      itemVersion: 2,
      correctionOf: null,
    };
    const issued = await request(
      "POST",
      `${base}/${id}/movements/issue`,
      201,
      { expectedVersion: 1, quantity: 1, reason },
      "inventory-probe-issue",
      expected("command", 0, 2, false, [second]),
    );
    if (!issued.inventoryMovementId) return evidence(false);
    rows.push({ ...second, id: issued.inventoryMovementId });
    await readBack(0, 2);
    await request(
      "POST",
      `${base}/${id}/movements/issue`,
      409,
      { expectedVersion: 2, quantity: 1, reason },
      "inventory-probe-overissue",
    );
    const third: InventoryMovementExpectation = {
      kind: "adjust",
      delta: 1,
      beforeQuantity: 0,
      afterQuantity: 1,
      itemVersion: 3,
      correctionOf: rows[0]!.id!,
    };
    const corrected = await request(
      "POST",
      `${base}/${id}/movements/adjust`,
      201,
      {
        expectedVersion: 2,
        delta: 1,
        reason,
        correctionOf: third.correctionOf,
      },
      "inventory-probe-adjust",
      expected("command", 1, 3, false, [third]),
    );
    if (!corrected.inventoryMovementId) return evidence(false);
    rows.push({ ...third, id: corrected.inventoryMovementId });
    await readBack(1, 3);
    // Replay after later mutations must return the original item/movement outcome.
    await request(
      "POST",
      `${base}/${id}/movements/receive`,
      201,
      receive,
      "inventory-probe-receive",
      expected("command", 1, 1, false, [rows[0]!]),
    );
    await request(
      "POST",
      `${base}/${id}/movements/receive`,
      409,
      { ...receive, quantity: 2 },
      "inventory-probe-receive",
    );
    await request(
      "POST",
      `${base}/${id}/movements/issue`,
      409,
      { expectedVersion: 1, quantity: 1, reason },
      "inventory-probe-stale",
    );
    await request(
      "PATCH",
      `${base}/${id}`,
      200,
      { expectedVersion: 3, values: { name: correctedName } },
      "inventory-probe-rename",
      expected("item", 1, 4, true),
    );
    await request(
      "GET",
      `${base}/${id}`,
      200,
      undefined,
      undefined,
      expected("item", 1, 4, true),
      true,
    );
    for (const operation of ["receive", "issue", "adjust"])
      await request(
        "POST",
        `${base}/${id}/movements/${operation}`,
        403,
        { expectedVersion: 4, quantity: 1, reason },
        "inventory-probe-denied-" + operation,
        undefined,
        true,
      );
    await request(
      "POST",
      base,
      403,
      { values: { sku: "VERIFIER-DENIED", name: initialName } },
      "inventory-probe-denied-create",
      undefined,
      true,
    );
    await request(
      "PATCH",
      `${base}/${id}`,
      403,
      { expectedVersion: 4, values: { name: initialName } },
      "inventory-probe-denied-update",
      undefined,
      true,
    );
    await request(
      "GET",
      `${base}/${id}/movements`,
      403,
      undefined,
      undefined,
      undefined,
      true,
    );
    await request("GET", `/api/${profile.movementEntity}`, 403);
    await request(
      "POST",
      `/api/${profile.movementEntity}`,
      403,
      { values: { reason } },
      "inventory-probe-generic-create",
    );
    await request(
      "POST",
      `/api/${profile.movementEntity}/${rows[0]!.id}/events/submit`,
      403,
      { expectedVersion: 1 },
      "inventory-probe-generic-submit",
    );
    await readBack(1, 4, true);
    await request(
      "GET",
      base,
      200,
      undefined,
      undefined,
      expected("list", 1, 4, true),
    );
    await audit();
    return evidence(true);
  } catch {
    return evidence(false);
  }
}
