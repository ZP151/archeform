import { expect, it } from "vitest";
import { loadWorkOrdersRuntime } from "./fixtures/service-work-orders-runtime.js";
import { customerRequestsInput } from "./fixtures/customer-requests.js";
import { roleCustomerRequestsInput } from "./fixtures/customer-requests.js";

export const customerActor = (slot: string, role = "customer") => ({
  principalId: `fixture-principal-${slot}`,
  sessionId: `fixture-session-${slot}`,
  tenantId: "tenant-local",
  roles: [role],
  expiresAt: "2099-01-01T00:00:00.000Z",
});
export const a = customerActor("customer-a"),
  b = customerActor("customer-b"),
  staff = customerActor("support-staff", "staff");
export function setup() {
  const emitted = loadWorkOrdersRuntime(undefined, customerRequestsInput());
  const store = new emitted.InMemoryRecordStore();
  const runtime = new emitted.ApplicationRuntime(store);
  let sequence = 0;
  const command = (
    operation: string,
    id?: string,
    body: unknown = {
      values: { subject: " Broken item ", description: " Please help " },
    },
    actor = a,
    key = `key-${++sequence}`,
  ) =>
    runtime.customerRequestCommand(
      actor,
      "customer-request",
      id,
      operation,
      key,
      body,
    );
  return { emitted, store, runtime, command };
}

it("isolates same-role customers before reads, corrections, and receipt replay while persisting staff replies", async () => {
  const { runtime, command, store } = setup();
  const created = await command("create", undefined, undefined, a, "create-a");
  const id = created.body.request.id;
  expect(created).toMatchObject({
    status: 201,
    body: {
      request: {
        version: 0,
        subject: "Broken item",
        status: "open",
        customerPrincipalId: a.principalId,
      },
      event: {
        action: "create",
        requestVersion: 0,
        actorPrincipalId: a.principalId,
      },
    },
  });
  await command("create", undefined, undefined, b);
  expect(
    (await runtime.customerRequestList(b, "customer-request")).items,
  ).toHaveLength(1);
  for (const action of [
    () => runtime.customerRequestRead(b, "customer-request", id),
    () => runtime.customerRequestHistory(b, "customer-request", id),
    () =>
      command(
        "reply",
        id,
        { expectedVersion: 0, message: "Other", correctsVersion: null },
        b,
        "reply-a",
      ),
    () =>
      command(
        "update",
        id,
        {
          expectedVersion: 0,
          reason: "Other",
          values: { subject: "Other", description: "Other" },
        },
        b,
      ),
  ])
    await expect(action()).rejects.toMatchObject({
      status: 404,
      body: { code: "customer_request.not_found" },
    });
  await command(
    "reply",
    id,
    { expectedVersion: 0, message: "Saved answer", correctsVersion: null },
    staff,
    "reply-a",
  );
  const reloaded = new (setup().emitted.ApplicationRuntime)(store);
  expect(
    await reloaded.customerRequestRead(a, "customer-request", id),
  ).toMatchObject({
    request: { version: 1 },
    nextActor: "customer",
    latestReply: {
      message: "Saved answer",
      actorPrincipalId: staff.principalId,
      historical: false,
    },
  });
  expect(await command("create", undefined, undefined, a, "create-a")).toEqual(
    created,
  );
});

const denied = (status: number, code: string) => ({
  status,
  body: { code: `customer_request.${code}` },
});
it("retains metadata and message corrections, historical resolutions, reopen cycles and terminal cancellation", async () => {
  const { runtime, command, store } = setup();
  const created = await command("create"),
    id = created.body.request.id;
  await expect(
    command("update", id, {
      expectedVersion: 0,
      reason: "No change",
      values: { subject: "Broken item", description: "Please help" },
    }),
  ).rejects.toMatchObject(denied(400, "invalid_request"));
  await command("update", id, {
    expectedVersion: 0,
    reason: "Correct details",
    values: { subject: "Damaged package", description: "New details" },
  });
  await command(
    "reply",
    id,
    { expectedVersion: 1, message: "First answer", correctsVersion: null },
    staff,
  );
  await expect(
    command("reply", id, {
      expectedVersion: 2,
      message: "Other author",
      correctsVersion: 2,
    }),
  ).rejects.toMatchObject(denied(400, "invalid_request"));
  await command(
    "reply",
    id,
    { expectedVersion: 2, message: "Corrected answer", correctsVersion: 2 },
    staff,
  );
  await expect(
    command(
      "reply",
      id,
      {
        expectedVersion: 3,
        message: "Duplicate correction",
        correctsVersion: 2,
      },
      staff,
    ),
  ).rejects.toMatchObject(denied(400, "invalid_request"));
  await command(
    "reply",
    id,
    { expectedVersion: 3, message: "Final answer", correctsVersion: 3 },
    staff,
  );
  await command(
    "complete",
    id,
    { expectedVersion: 4, resolutionMessage: "First resolution" },
    staff,
  );
  await expect(
    command("reply", id, {
      expectedVersion: 5,
      message: "No automatic reopen",
      correctsVersion: null,
    }),
  ).rejects.toMatchObject(denied(409, "state_conflict"));
  await command("reopen", id, { expectedVersion: 5, reason: "Still broken" });
  expect(
    await runtime.customerRequestRead(a, "customer-request", id),
  ).toMatchObject({
    nextActor: "staff",
    latestReply: {
      action: "complete",
      message: "First resolution",
      historical: true,
    },
  });
  await command(
    "reply",
    id,
    { expectedVersion: 6, message: "Corrected resolution", correctsVersion: 5 },
    staff,
  );
  await command(
    "complete",
    id,
    { expectedVersion: 7, resolutionMessage: "Second resolution" },
    staff,
  );
  await command("reopen", id, {
    expectedVersion: 8,
    reason: "Mistaken request",
  });
  await command("cancel", id, {
    expectedVersion: 9,
    reason: "Submitted by mistake",
  });
  for (const op of ["reply", "update", "reopen", "cancel"])
    await expect(
      command(
        op,
        id,
        op === "reply"
          ? { expectedVersion: 10, message: "More", correctsVersion: null }
          : op === "update"
            ? {
                expectedVersion: 10,
                reason: "Change",
                values: { subject: "Other", description: "Other" },
              }
            : { expectedVersion: 10, reason: "Change" },
      ),
    ).rejects.toMatchObject(denied(409, "state_conflict"));
  const history = await runtime.customerRequestHistory(
    a,
    "customer-request",
    id,
  );
  expect(history.items.map((e: any) => e.requestVersion)).toEqual([
    10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0,
  ]);
  expect(history.items.at(-2)).toMatchObject({
    action: "update",
    beforeSubject: "Broken item",
    afterSubject: "Damaged package",
    beforeDescription: "Please help",
    afterDescription: "New details",
    reason: "Correct details",
    message: null,
  });
  expect(
    history.items
      .filter((e: any) => e.action === "complete")
      .map((e: any) => e.message),
  ).toEqual(["Second resolution", "First resolution"]);
  expect(
    (await store.listAudit()).every(
      (e: any) =>
        Object.keys(e).sort().join(",") === "action,actor,at,entity,recordId",
    ),
  ).toBe(true);
});

it("scopes hashed receipts, replays after terminal changes and rejects changed normalized bodies", async () => {
  const { runtime, store, command } = setup();
  const created = await command("create", undefined, undefined, a, "same"),
    id = created.body.request.id;
  const body = {
    expectedVersion: 0,
    message: " Saved ",
    correctsVersion: null,
  };
  const reply = await command("reply", id, body, staff, "reply-key");
  await command("cancel", id, { expectedVersion: 1, reason: "Mistake" });
  expect(
    await command(
      "reply",
      id,
      { ...body, message: "Saved" },
      staff,
      "reply-key",
    ),
  ).toEqual(reply);
  await expect(
    command("reply", id, { ...body, message: "Changed" }, staff, "reply-key"),
  ).rejects.toMatchObject(denied(409, "idempotency_conflict"));
  await expect(
    command("reply", id, body, b, "reply-key"),
  ).rejects.toMatchObject(denied(404, "not_found"));
  const receipts = [...store.customerRequestReceipts.values()] as any[];
  expect(receipts).toHaveLength(3);
  expect(
    receipts.every(
      (r) =>
        /^sha256:[a-f0-9]{64}$/.test(r.keyDigest) &&
        /^[a-f0-9]{64}$/.test(r.scope),
    ),
  ).toBe(true);
  await store.update("customer-request", id, {
    customerPrincipalId: b.principalId,
  });
  await expect(
    command("create", undefined, undefined, a, "same"),
  ).rejects.toMatchObject(denied(404, "not_found"));
  expect(
    (await runtime.customerRequestList(a, "customer-request")).items,
  ).toEqual([]);
});

it.each(["reply/complete", "update/cancel", "reply/correction"])(
  "serializes competing %s writes and leaves one event per committed version",
  async (pair) => {
    const { runtime, command } = setup();
    const id = (await command("create")).body.request.id;
    await command(
      "reply",
      id,
      { expectedVersion: 0, message: "Original", correctsVersion: null },
      staff,
    );
    const actions =
      pair === "reply/complete"
        ? [
            () =>
              command(
                "reply",
                id,
                { expectedVersion: 1, message: "More", correctsVersion: null },
                staff,
              ),
            () =>
              command(
                "complete",
                id,
                { expectedVersion: 1, resolutionMessage: "Done" },
                staff,
              ),
          ]
        : pair === "update/cancel"
          ? [
              () =>
                command("update", id, {
                  expectedVersion: 1,
                  reason: "Change",
                  values: { subject: "Other", description: "Other" },
                }),
              () =>
                command("cancel", id, {
                  expectedVersion: 1,
                  reason: "Mistake",
                }),
            ]
          : [
              () =>
                command(
                  "reply",
                  id,
                  {
                    expectedVersion: 1,
                    message: "More",
                    correctsVersion: null,
                  },
                  staff,
                ),
              () =>
                command(
                  "reply",
                  id,
                  {
                    expectedVersion: 1,
                    message: "Corrected",
                    correctsVersion: 1,
                  },
                  staff,
                ),
            ];
    const results = await Promise.allSettled(actions.map((fn) => fn()));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.find((r) => r.status === "rejected")).toMatchObject({
      reason: denied(409, "version_conflict"),
    });
    expect(
      (
        await runtime.customerRequestHistory(a, "customer-request", id)
      ).items.map((e: any) => e.requestVersion),
    ).toEqual([2, 1, 0]);
  },
);

it("walks more than 50 owned requests and events with owner predicates before limits and bounded reads", async () => {
  const { runtime, command, store } = setup();
  for (let i = 0; i < 61; i++) {
    await command("create", undefined, undefined, b);
    await command("create");
  }
  let cursor: string | null = null;
  const ids: string[] = [];
  do {
    const page = await runtime.customerRequestList(
      a,
      "customer-request",
      "limit=17" + (cursor ? "&afterId=" + cursor : ""),
    );
    expect(
      page.items.every((r: any) => r.customerPrincipalId === a.principalId),
    ).toBe(true);
    ids.push(...page.items.map((r: any) => r.id));
    cursor = page.nextAfterId;
  } while (cursor);
  expect(ids).toHaveLength(61);
  expect(new Set(ids).size).toBe(61);
  expect(ids).toEqual([...ids].sort());
  const id = ids[0]!;
  for (let i = 0; i < 61; i++)
    await command(
      "reply",
      id,
      { expectedVersion: i, message: "Message " + i, correctsVersion: null },
      i % 2 ? a : staff,
    );
  const versions: number[] = [];
  let before: number | null = null;
  do {
    const page = await runtime.customerRequestHistory(
      a,
      "customer-request",
      id,
      "limit=17" + (before === null ? "" : "&beforeVersion=" + before),
    );
    versions.push(...page.items.map((e: any) => e.requestVersion));
    before = page.nextBeforeVersion;
  } while (before !== null);
  expect(versions).toEqual(Array.from({ length: 62 }, (_, i) => 61 - i));
  const observed: { list: any[]; events: any[] } = { list: [], events: [] };
  const original = store.inTransaction.bind(store);
  store.inTransaction = (fn: any) =>
    original(async (tx: any) => {
      const list = tx.listCustomerRequests.bind(tx),
        events = tx.customerRequestEvents.bind(tx);
      tx.listCustomerRequests = (...args: any[]) => {
        observed.list.push(args);
        return list(...args);
      };
      tx.customerRequestEvents = (...args: any[]) => {
        observed.events.push(args);
        return events(...args);
      };
      return fn(tx);
    });
  const page = await runtime.customerRequestList(
    a,
    "customer-request",
    "limit=50",
  );
  expect(page.items).toHaveLength(50);
  expect(observed.list).toEqual([
    ["customer-request", { limit: 50 }, a.principalId],
  ]);
  expect(observed.events).toHaveLength(50);
  expect(observed.events.every((args) => args[2].take === 1)).toBe(true);
});

it.each([
  "limit=0",
  "limit=51",
  "limit=01",
  "limit=-1",
  "limit=1.0",
  "limit=1&limit=2",
  "owner=customer-a",
  "status=OPEN",
  "afterId=",
  "afterId=a%20b",
  "afterId=%ZZ",
  "afterId=%C0%AF",
])("rejects malformed list query %s", async (query) => {
  const { runtime } = setup();
  await expect(
    runtime.customerRequestList(a, "customer-request", query),
  ).rejects.toMatchObject(denied(400, "invalid_request"));
});
it.each([
  "beforeVersion=00",
  "beforeVersion=-0",
  "beforeVersion=2147483648",
  "status=open",
  "limit=20&unknown=true",
  "beforeVersion=1&beforeVersion=2",
])("rejects malformed history query %s", async (query) => {
  const { runtime, command } = setup();
  const id = (await command("create")).body.request.id;
  await expect(
    runtime.customerRequestHistory(a, "customer-request", id, query),
  ).rejects.toMatchObject(denied(400, "invalid_request"));
});

it.each(["event", "audit", "receipt"])(
  "rolls back record, event, audit and receipt on %s fault",
  async (point) => {
    const { store, command } = setup();
    const id = (await command("create")).body.request.id;
    const before = structuredClone({
      records: [...store.records],
      audit: store.auditEvents,
      receipts: [...store.customerRequestReceipts],
    });
    const original = store.inTransaction.bind(store);
    store.inTransaction = (fn: any) =>
      original(async (tx: any) => {
        const create = tx.create.bind(tx);
        if (point === "event")
          tx.create = (entity: string, input: any) => {
            if (entity === "request-history")
              throw Error("Injected event failure");
            return create(entity, input);
          };
        else
          tx[point === "audit" ? "appendAudit" : "saveCustomerRequestReceipt"] =
            () => {
              throw Error("Injected failure");
            };
        return fn(tx);
      });
    await expect(
      command(
        "reply",
        id,
        { expectedVersion: 0, message: "Must rollback", correctsVersion: null },
        staff,
      ),
    ).rejects.toMatchObject(denied(500, "internal_error"));
    expect({
      records: [...store.records],
      audit: store.auditEvents,
      receipts: [...store.customerRequestReceipts],
    }).toEqual(before);
  },
);

it.each(["P2002", "P2034"])(
  "retries %s at most four times with read/write error distinction",
  async (code) => {
    const { store, runtime, command } = setup();
    let attempts = 0;
    store.inTransaction = async () => {
      attempts++;
      throw { code };
    };
    await expect(command("create")).rejects.toMatchObject(
      denied(409, "retryable_conflict"),
    );
    expect(attempts).toBe(4);
    attempts = 0;
    await expect(
      runtime.customerRequestList(a, "customer-request"),
    ).rejects.toMatchObject(denied(503, "unavailable"));
    expect(attempts).toBe(4);
  },
);

it("rejects corrupt or missing event evidence without inventing triage", async () => {
  const { runtime, command, store } = setup();
  const id = (await command("create")).body.request.id;
  await store.update("customer-request", id, { version: 1 });
  await expect(
    runtime.customerRequestList(a, "customer-request"),
  ).rejects.toMatchObject(denied(500, "internal_error"));
  await expect(
    runtime.customerRequestRead(a, "customer-request", id),
  ).rejects.toMatchObject(denied(500, "internal_error"));
  await expect(
    runtime.customerRequestHistory(a, "customer-request", id),
  ).rejects.toMatchObject(denied(500, "internal_error"));
  await store.update("customer-request", id, { version: 0 });
  const event = (await store.list("request-history"))[0];
  await store.update("request-history", event.id, {
    actorPrincipalId: b.principalId,
  });
  await expect(
    runtime.customerRequestRead(a, "customer-request", id),
  ).rejects.toMatchObject(denied(500, "internal_error"));
});

it("rejects forged contexts and all generic runtime aliases", async () => {
  const { runtime, command } = setup();
  const id = (await command("create")).body.request.id;
  for (const actor of [
    { ...a, principalId: b.principalId },
    { ...a, tenantId: "other" },
    { ...a, roles: ["staff"] },
    { ...a, expiresAt: "2020-01-01T00:00:00.000Z" },
    { ...a, sessionId: "unknown" },
  ])
    await expect(
      runtime.customerRequestRead(actor, "customer-request", id),
    ).rejects.toMatchObject(denied(403, "forbidden"));
  for (const entity of [
    "request-history",
    "principal",
    "session",
    "audit",
    "capabilities",
    "work-order-assignees",
    "receipt",
  ])
    await expect(runtime.customerRequestList(a, entity)).rejects.toMatchObject(
      denied(403, "forbidden"),
    );
  for (const method of [
    "list",
    "read",
    "create",
    "transition",
    "auditLog",
    "capabilityEvents",
  ])
    await expect(
      runtime[method]("customer", "customer-request", id, {}),
    ).rejects.toMatchObject(denied(403, "forbidden"));
  await expect(
    command("complete", id, {
      expectedVersion: 0,
      resolutionMessage: "Forbidden",
    }),
  ).rejects.toMatchObject(denied(403, "forbidden"));
  await expect(
    command("reopen", id, { expectedVersion: 0, reason: "Forbidden" }, staff),
  ).rejects.toMatchObject(denied(403, "forbidden"));
});

it.each([
  "unknown",
  "owner",
  "inherited",
  "accessor",
  "subject-control",
  "message-control",
  "subject-long",
  "description-long",
  "negative-zero",
  "missing-correction",
  "invalid-key",
])("rejects %s mutation without writes", async (change) => {
  const { store, command } = setup();
  const id = (await command("create")).body.request.id;
  let reads = 0;
  let body: any = {
      expectedVersion: 0,
      message: "Safe",
      correctsVersion: null,
    },
    key = "safe";
  if (change === "unknown") body.extra = true;
  if (change === "owner") body.customerPrincipalId = b.principalId;
  if (change === "inherited") body = Object.create(body);
  if (change === "accessor")
    Object.defineProperty(body, "message", {
      enumerable: true,
      get() {
        reads++;
        return "Unsafe";
      },
    });
  if (change === "message-control") body.message = "Bad\u0000";
  if (change === "negative-zero") body.expectedVersion = -0;
  if (change === "missing-correction") delete body.correctsVersion;
  if (change === "invalid-key") key = "invalid key";
  if (["subject-control", "subject-long", "description-long"].includes(change))
    body = {
      values: {
        subject:
          change === "subject-control"
            ? "Bad\n"
            : change === "subject-long"
              ? "s".repeat(161)
              : "Safe",
        description: change === "description-long" ? "d".repeat(2001) : "Safe",
      },
    };
  await expect(
    command(
      change.startsWith("subject") || change === "description-long"
        ? "create"
        : "reply",
      change.startsWith("subject") || change === "description-long"
        ? undefined
        : id,
      body,
      a,
      key,
    ),
  ).rejects.toMatchObject(denied(400, "invalid_request"));
  expect(reads).toBe(0);
  expect(await store.list("request-history")).toHaveLength(1);
});

it("fails version exhaustion and unauthorized correction targets without writes", async () => {
  const { command, store } = setup();
  const id = (await command("create")).body.request.id;
  for (const target of [0, 1, 2147483647])
    await expect(
      command("reply", id, {
        expectedVersion: 0,
        message: "Correction",
        correctsVersion: target,
      }),
    ).rejects.toMatchObject(denied(400, "invalid_request"));
  await store.update("customer-request", id, { version: 2147483647 });
  await expect(
    command("cancel", id, {
      expectedVersion: 2147483647,
      reason: "No capacity",
    }),
  ).rejects.toMatchObject(denied(409, "version_exhausted"));
  expect(await store.list("request-history")).toHaveLength(1);
});

it.each([
  ["customer", "staff"],
  ["s".repeat(128), "c".repeat(128)],
])(
  "binds fixed short roster IDs to renamed or swapped roles",
  async (staffRole, customerRole) => {
    const emitted = loadWorkOrdersRuntime(
      undefined,
      roleCustomerRequestsInput(staffRole, customerRole),
    );
    const runtime = new emitted.ApplicationRuntime();
    const actor = { ...a, roles: [customerRole] },
      staffActor = { ...staff, roles: [staffRole] };
    const created = await runtime.customerRequestCommand(
      actor,
      "customer-request",
      undefined,
      "create",
      "create",
      { values: { subject: "Renamed roles", description: "Fixed roster" } },
    );
    await runtime.customerRequestCommand(
      staffActor,
      "customer-request",
      created.body.request.id,
      "reply",
      "reply",
      { expectedVersion: 0, message: "Staff answer", correctsVersion: null },
    );
    expect(
      await runtime.customerRequestRead(
        actor,
        "customer-request",
        created.body.request.id,
      ),
    ).toMatchObject({
      nextActor: "customer",
      latestReply: {
        actorRole: staffRole,
        actorPrincipalId: "fixture-principal-support-staff",
      },
    });
  },
);

it("rejects a caller context changed before the transaction instead of committing under a different receipt scope", async () => {
  const { emitted, store } = setup(),
    runtime = new emitted.ApplicationRuntime(store),
    mutable = { ...a, roles: [...a.roles] };
  const original = store.inTransaction.bind(store);
  store.inTransaction = (fn: any) => {
    Object.assign(mutable, b);
    return original(fn);
  };
  await expect(
    runtime.customerRequestCommand(
      mutable,
      "customer-request",
      undefined,
      "create",
      "context-race",
      { values: { subject: "Race", description: "Race" } },
    ),
  ).rejects.toMatchObject(denied(403, "forbidden"));
  expect(await store.list("customer-request")).toEqual([]);
});
it("rejects missing history lookahead and current metadata snapshot corruption", async () => {
  const { store, runtime, command } = setup(),
    id = (await command("create")).body.request.id;
  await command(
    "reply",
    id,
    { expectedVersion: 0, message: "Answer", correctsVersion: null },
    staff,
  );
  const events = store.records.get("request-history");
  const first = [...events.values()].find(
    (e: any) => e.requestVersion === 0,
  ) as any;
  events.delete(first.id);
  await expect(
    runtime.customerRequestHistory(a, "customer-request", id, "limit=1"),
  ).rejects.toMatchObject(denied(500, "internal_error"));
  events.set(first.id, first);
  await store.update("customer-request", id, { version: 0 });
  await store.update("request-history", first.id, {
    afterSubject: "Corrupt snapshot",
  });
  events.delete(
    [...events.values()].find((e: any) => e.requestVersion === 1).id,
  );
  await expect(
    runtime.customerRequestRead(a, "customer-request", id),
  ).rejects.toMatchObject(denied(500, "internal_error"));
});

it.each([
  "scope",
  "keyDigest",
  "command",
  "status",
  "owner",
  "event-actor",
  "extra-response-field",
  "event-version",
])(
  "rejects a corrupt %s receipt instead of returning its body",
  async (field) => {
    const { store, command } = setup();
    await command("create", undefined, undefined, a, "corrupt");
    const receipt = [...store.customerRequestReceipts.values()][0] as any;
    if (field === "scope") receipt.scope = "other";
    if (field === "keyDigest") receipt.keyDigest = "other";
    if (field === "command") receipt.command = "reply";
    if (field === "status") receipt.responseStatus = 200;
    if (field === "owner")
      receipt.responseBody.request.customerPrincipalId = b.principalId;
    if (field === "event-actor")
      receipt.responseBody.event.actorPrincipalId = b.principalId;
    if (field === "extra-response-field") receipt.responseBody.extra = true;
    if (field === "event-version")
      receipt.responseBody.event.requestVersion = 1;
    await expect(
      command("create", undefined, undefined, a, "corrupt"),
    ).rejects.toMatchObject(denied(500, "internal_error"));
    expect(await store.list("customer-request")).toHaveLength(1);
  },
);
