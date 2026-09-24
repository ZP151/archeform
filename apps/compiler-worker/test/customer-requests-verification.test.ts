import { describe, expect, it, vi } from "vitest";
import { selectCustomerRequestsProfile } from "@factory/compiler";
import {
  customerRequestsInput,
  roleCustomerRequestsInput,
} from "../../../packages/compiler/test/fixtures/customer-requests.js";
import { loadWorkOrdersRuntime } from "../../../packages/compiler/test/fixtures/service-work-orders-runtime.js";
import { VerificationEnvironment } from "../src/verifier/verification-environment.js";
import {
  customerRequestsVerificationProfile,
  compareCustomerRequestsResponse,
  validCustomerRequestsRequest,
  type CustomerRequestsDescriptor,
} from "../src/verifier/customer-requests-verification.js";
import { deriveVerificationProfile } from "../src/verifier/verification-graph-plan.js";
import { runRoleJourneyProbe } from "../src/verifier/probes.js";
import { validateRoleJourney } from "../src/verifier/role-journey.js";
import { createCapabilityCompositionLock } from "@factory/capabilities";
import { hashApplicationGraph } from "@factory/graph";
import { inventoryOperationsInput } from "../../../packages/compiler/test/fixtures/inventory-operations.js";

const input = customerRequestsInput();
const selected = selectCustomerRequestsProfile(
  input.graph,
  input.compositionLock,
)!;
customerRequestsVerificationProfile(selected);
const a = {
  principalId: "fixture-principal-customer-a",
  sessionId: "fixture-session-customer-a",
  tenantId: "tenant-local",
  roles: [selected.roles.customer],
  expiresAt: "2099-01-01T00:00:00.000Z",
};
const createBody = {
  values: { subject: "Verifier request", description: "Verifier description" },
};
const headers = [
  { name: "x-factory-fixture-session", value: a.sessionId },
  { name: "x-factory-idempotency-key", value: "customer-requests-create" },
];

function setup(fetch: typeof globalThis.fetch, timeout = 100) {
  const processRunner = vi.fn(async () => {
    throw Error("Unexpected process invocation.");
  });
  const startPreviewRun = vi.fn(async () => ({
    webPort: 3000,
    apiPort: 3001,
    previewUrl: "http://127.0.0.1:3000",
  }));
  const stopPreviewRun = vi.fn(async () => undefined);
  const environment = new VerificationEnvironment({
    artifactRoot: "generated",
    previewRunId: "preview-customer-requests",
    rootDirectory: "customer-requests",
    composeProjectName: "factory-preview-customer-requests",
    artifacts: [],
    operationTimeoutMs: timeout,
    startPreviewRun,
    stopPreviewRun,
    processRunner,
    fetch,
  });
  return { environment, processRunner, startPreviewRun, stopPreviewRun };
}

describe("Customer Requests private verifier seam", () => {
  it("captures a fully validated emitted nested create response without a top-level ID", async () => {
    const emitted = loadWorkOrdersRuntime(undefined, input);
    const runtime = new emitted.ApplicationRuntime(
      new emitted.InMemoryRecordStore(),
    );
    const fetch = vi.fn(async (_url: unknown, init?: RequestInit) => {
      const result = await runtime.customerRequestCommand(
        a,
        selected.requestEntity,
        undefined,
        "create",
        "customer-requests-create",
        JSON.parse(String(init?.body)),
      );
      expect(Object.keys(result.body)).toEqual(["request", "event"]);
      return new Response(JSON.stringify(result.body), {
        status: result.status,
        headers: { "cache-control": "no-store" },
      });
    });
    const { environment, processRunner, startPreviewRun, stopPreviewRun } =
      setup(fetch);
    await environment.boot();
    const result = await environment.request(
      "POST",
      `/api/${selected.requestEntity}`,
      "api",
      {
        headers,
        body: JSON.stringify(createBody),
        customerRequests: {
          profile: selected,
          kind: "create",
          slot: "customer-a",
          expected: { kind: "mutation", owner: "customer-a", version: 0 },
        },
      } as any,
    );
    expect(result).toMatchObject({
      status: 201,
      customerRequestsMatches: true,
      recordId: expect.any(String),
      customerRequestsEventId: expect.any(String),
      customerRequestsResponseDigest: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(fetch).toHaveBeenCalledOnce();
    expect(startPreviewRun).toHaveBeenCalledOnce();
    expect(processRunner).not.toHaveBeenCalled();
    expect(stopPreviewRun).not.toHaveBeenCalled();
  });
  it.each([
    [
      "update",
      {
        expectedVersion: 0,
        reason: "Verifier correction",
        values: {
          subject: "Verifier updated request",
          description: "Verifier updated description",
        },
      },
    ],
    [
      "reply",
      {
        expectedVersion: 1,
        message: "Verifier staff reply",
        correctsVersion: null,
      },
    ],
  ])(
    "accepts only the private %s body at the real environment seam",
    async (kind, body) => {
      const { environment } = setup(
        async () =>
          new Response('{"code":"customer_request.not_found"}', {
            status: 404,
            headers: { "cache-control": "no-store" },
          }),
      );
      await environment.boot();
      const result = await environment.request(
        "POST",
        `/api/${selected.requestEntity}/missing/events/${kind}`,
        "api",
        {
          headers,
          body: JSON.stringify(body),
          customerRequests: {
            profile: selected,
            kind,
            slot: "customer-a",
            recordId: "missing",
            expected: {
              kind: "error",
              status: 404,
              code: "customer_request.not_found",
            },
          },
        } as any,
      );
      expect(result).toMatchObject({
        status: 404,
        customerRequestsMatches: true,
      });
    },
  );
});

type Observation = {
  kind: string;
  slot: string;
  body: any;
  result: any;
  status: number;
  replay: boolean;
};
async function exercise(
  options: {
    input?: typeof input;
    corrupt?: (observation: Observation) => void;
    response?: (observation: Observation) => Response;
    signal?: AbortSignal;
  } = {},
) {
  const source = options.input ?? input;
  const plan = deriveVerificationProfile(source.graph, source.compositionLock);
  const exact = plan.journeys["customer-requests-lifecycle"]!.customerRequests!;
  const emitted = loadWorkOrdersRuntime(undefined, source);
  const store = new emitted.InMemoryRecordStore();
  const runtime = new emitted.ApplicationRuntime(store);
  const observed: Observation[] = [];
  const keys = new Set<string>();
  const fetch = vi.fn(async (url: unknown, init?: RequestInit) => {
    const parts = new URL(String(url)).pathname.split("/").filter(Boolean);
    const headers = new Headers(init?.headers);
    const sessionId = headers.get("x-factory-fixture-session")!;
    const slot = sessionId.replace("fixture-session-", "");
    const actor = {
      principalId: sessionId.replace("session", "principal"),
      sessionId,
      tenantId: "tenant-local",
      roles: [
        slot === "support-staff" ? exact.roles.staff : exact.roles.customer,
      ],
      expiresAt: "2099-01-01T00:00:00.000Z",
    };
    const body =
      init?.body === undefined ? undefined : JSON.parse(String(init.body));
    const kind =
      init?.method === "GET"
        ? parts[3] === "history"
          ? "history"
          : parts[2]
            ? "detail"
            : "list"
        : (parts[4] ?? "create");
    const key = headers.get("x-factory-idempotency-key")!;
    const identity = slot + "|" + key;
    let status = 200,
      result: any;
    try {
      if (kind === "list")
        result = await runtime.customerRequestList(actor, parts[1]);
      else if (kind === "detail")
        result = await runtime.customerRequestRead(actor, parts[1], parts[2]);
      else if (kind === "history")
        result = await runtime.customerRequestHistory(
          actor,
          parts[1],
          parts[2],
        );
      else {
        const mutation = await runtime.customerRequestCommand(
          actor,
          parts[1],
          parts[2],
          kind,
          key,
          body,
        );
        status = mutation.status;
        result = mutation.body;
      }
    } catch (error: any) {
      status = error.status;
      result = error.body;
    }
    const observation = {
      kind,
      slot,
      body,
      result,
      status,
      replay: kind !== "list" && init?.method !== "GET" && keys.has(identity),
    };
    if (status < 300 && init?.method !== "GET") keys.add(identity);
    options.corrupt?.(observation);
    observed.push(observation);
    return (
      options.response?.(observation) ??
      new Response(JSON.stringify(observation.result), {
        status: observation.status,
        headers: { "cache-control": "no-store" },
      })
    );
  });
  const harness = setup(fetch, 1000);
  await harness.environment.boot();
  const entry = plan.stepPlan.find(
    (entry) => entry.stepId === "customer-requests-lifecycle",
  )!;
  const result = await runRoleJourneyProbe(
    {
      entry,
      environment: harness.environment,
      signal: options.signal ?? new AbortController().signal,
    },
    plan.journeys[entry.stepId]!,
    plan.apiRegistry,
  );
  expect(harness.processRunner).not.toHaveBeenCalled();
  expect(harness.stopPreviewRun).not.toHaveBeenCalled();
  expect(harness.startPreviewRun).toHaveBeenCalledOnce();
  return { result, observed, fetch, store, runtime };
}

describe("Customer Requests exact emitted lifecycle", () => {
  it.each([
    ["canonical", "staff", "customer"],
    ["renamed", "coordinator", "requester"],
    ["swapped", "customer", "staff"],
    ["maximum", "s".repeat(128), "c".repeat(128)],
  ])(
    "verifies all commands, owned reads, history and complete replay identity with %s roles",
    async (_name, staff, customer) => {
      const result = await exercise({
        input: roleCustomerRequestsInput(staff, customer),
      });
      expect(result.result.status).toBe("passed");
      expect(result.observed.length).toBeLessThanOrEqual(64);
      expect(
        result.observed.filter(
          (row) => row.kind === "create" && row.status === 201 && !row.replay,
        ),
      ).toHaveLength(2);
      expect(new Set(result.observed.map((row) => row.slot))).toEqual(
        new Set(["customer-a", "customer-b", "support-staff"]),
      );
      const final = result.observed
        .filter((row) => row.kind === "history" && row.status === 200)
        .at(-1)!;
      expect(final.result.items.map((row: any) => row.requestVersion)).toEqual([
        9, 8, 7, 6, 5, 4, 3, 2, 1, 0,
      ]);
      expect(
        result.observed.filter((row) => row.replay && row.status < 300),
      ).toHaveLength(3);
      expect(JSON.stringify(result.result)).not.toMatch(
        /fixture-|Verifier|requestVersion|recordedAt|digest|principalId/,
      );
    },
  );
  it("derives identically after JSON persistence", () => {
    const copy = JSON.parse(JSON.stringify(input));
    expect(deriveVerificationProfile(copy.graph, copy.compositionLock)).toEqual(
      deriveVerificationProfile(input.graph, input.compositionLock),
    );
  });
  it.each(["hash", "lock", "grants", "seeds", "fields", "reply-near-match"])(
    "rejects changed %s without falling through to generic derivation",
    (change) => {
      const candidate: any = structuredClone(
        change === "reply-near-match" ? inventoryOperationsInput() : input,
      );
      if (change === "hash") candidate.graph.metadata.name = "Changed hash";
      if (change === "lock")
        candidate.compositionLock.lockDigest = "sha256:" + "0".repeat(64);
      if (change === "grants")
        candidate.graph.policy.permissions[0].actions.push("delete");
      if (change === "seeds")
        candidate.graph.domain.seedData = [
          {
            entity: selected.requestEntity,
            id: "foreign",
            values: { subject: "Other" },
          },
        ];
      if (change === "fields")
        candidate.graph.domain.entities[0].fields.push({
          key: "extra",
          type: "string",
          required: false,
        });
      if (change === "reply-near-match")
        candidate.graph.policy.permissions[0].actions.push("reply");
      if (["grants", "seeds", "fields", "reply-near-match"].includes(change)) {
        try {
          candidate.compositionLock = createCapabilityCompositionLock({
            graphChecksum: hashApplicationGraph(candidate.graph),
            selections: candidate.compositionLock.packages,
          });
        } catch {
          // Some mutations already violate Graph semantics. Keep them raw so
          // the real worker selector must still reject, never fall through.
        }
      }
      expect(() =>
        deriveVerificationProfile(candidate.graph, candidate.compositionLock),
      ).toThrow(/Customer Requests/);
    },
  );
  it.each([
    "cloned profile",
    "body",
    "headers",
    "chain",
    "principal",
    "directoryRead",
    "inventory",
    "wrong action",
    "wrong session",
    "wrong registry",
  ])("rejects a forged journey with %s before fetch", async (change) => {
    const plan = deriveVerificationProfile(input.graph, input.compositionLock),
      original = plan.journeys["customer-requests-lifecycle"]!;
    const journey: any = { ...original };
    let registry = plan.apiRegistry;
    if (change === "cloned profile")
      journey.customerRequests = structuredClone(journey.customerRequests);
    else if (change === "wrong action") journey.action = "other.lifecycle";
    else if (change === "wrong session")
      journey.sessionId = "fixture-session-customer-b";
    else if (change === "wrong registry")
      registry = registry.map((row) => ({ ...row, route: "/api/other" }));
    else journey[change] = change === "body" ? "{}" : [];
    const fetch = vi.fn(async () => new Response("{}")),
      { environment } = setup(fetch);
    await environment.boot();
    await expect(
      runRoleJourneyProbe(
        {
          entry: plan.stepPlan[2]!,
          environment,
          signal: new AbortController().signal,
        },
        journey,
        registry,
      ),
    ).rejects.toBeDefined();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("does no fetch after the journey is aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const result = await exercise({ signal: controller.signal });
    expect(result.result.status).toBe("failed");
    expect(result.fetch).not.toHaveBeenCalled();
  });
  it.each([
    [
      "wrong owner",
      (o: Observation) => {
        if (o.result.request)
          o.result.request.customerPrincipalId = "fixture-principal-customer-b";
      },
    ],
    [
      "wrong version",
      (o: Observation) => {
        if (o.result.request) o.result.request.version++;
      },
    ],
    [
      "wrong status",
      (o: Observation) => {
        if (o.result.request) o.result.request.status = "resolved";
      },
    ],
    [
      "top-level-only ID",
      (o: Observation) => {
        if (o.result.event) o.result = { id: o.result.request.id };
      },
    ],
    [
      "wrong event parent",
      (o: Observation) => {
        if (o.result.event) o.result.event.request = "other";
      },
    ],
    [
      "wrong actor",
      (o: Observation) => {
        if (o.result.event)
          o.result.event.actorPrincipalId = "fixture-principal-customer-b";
      },
    ],
    [
      "wrong actor role",
      (o: Observation) => {
        if (o.result.event) o.result.event.actorRole = "other";
      },
    ],
    [
      "unsafe ID",
      (o: Observation) => {
        if (o.result.request) o.result.request.id = "..";
      },
    ],
    [
      "oversized ID",
      (o: Observation) => {
        if (o.result.request) o.result.request.id = "a".repeat(65);
      },
    ],
    [
      "noncanonical timestamp",
      (o: Observation) => {
        if (o.result.event) o.result.event.recordedAt = "2026-01-01";
      },
    ],
    [
      "impossible timestamp",
      (o: Observation) => {
        if (o.result.event)
          o.result.event.recordedAt = "2026-02-30T00:00:00.000Z";
      },
    ],
    [
      "missing nullable field",
      (o: Observation) => {
        if (o.result.event) delete o.result.event.reason;
      },
    ],
    [
      "extra field",
      (o: Observation) => {
        if (o.result.event) o.result.extra = "private-response-sentinel";
      },
    ],
    [
      "prototype field",
      (o: Observation) => {
        if (o.result.event)
          Object.defineProperty(o.result.event, "__proto__", {
            value: "private-response-sentinel",
            enumerable: true,
          });
      },
    ],
    [
      "wrong correction",
      (o: Observation) => {
        if (o.result.event?.requestVersion === 3)
          o.result.event.correctsVersion = 1;
      },
    ],
    [
      "wrong metadata snapshot",
      (o: Observation) => {
        if (o.result.event?.requestVersion === 1)
          o.result.event.beforeSubject = "private-response-sentinel";
      },
    ],
    [
      "changed replay timestamp",
      (o: Observation) => {
        if (o.replay && o.status < 300)
          o.result.event.recordedAt = "2001-01-01T00:00:00.000Z";
      },
    ],
    [
      "changed replay event",
      (o: Observation) => {
        if (o.replay && o.status < 300) o.result.event.id = "other-event";
      },
    ],
    [
      "changed replay body",
      (o: Observation) => {
        if (o.replay && o.status < 300)
          o.result.request.subject = "private-response-sentinel";
      },
    ],
    [
      "duplicate history",
      (o: Observation) => {
        if (o.kind === "history" && o.result.items?.length > 1)
          o.result.items[1] = o.result.items[0];
      },
    ],
    [
      "missing history",
      (o: Observation) => {
        if (o.kind === "history" && o.result.items?.length)
          o.result.items.pop();
      },
    ],
    [
      "swapped event IDs",
      (o: Observation) => {
        if (o.kind === "history" && o.result.items?.length > 1)
          [o.result.items[0].id, o.result.items[1].id] = [
            o.result.items[1].id,
            o.result.items[0].id,
          ];
      },
    ],
    [
      "foreign list row",
      (o: Observation) => {
        if (
          o.kind === "list" &&
          o.slot === "customer-a" &&
          o.result.items?.length
        )
          o.result.items[0].customerPrincipalId =
            "fixture-principal-customer-b";
      },
    ],
    [
      "wrong next actor",
      (o: Observation) => {
        if (o.kind === "detail") o.result.nextActor = null;
      },
    ],
    [
      "wrong activity",
      (o: Observation) => {
        if (o.kind === "detail")
          o.result.lastActivity.recordedAt = "2001-01-01T00:00:00.000Z";
      },
    ],
    [
      "wrong latest reply",
      (o: Observation) => {
        if (o.kind === "detail" && o.result.latestReply)
          o.result.latestReply = null;
      },
    ],
    [
      "wrong historical resolution",
      (o: Observation) => {
        if (o.kind === "detail" && o.result.latestReply?.historical)
          o.result.latestReply.historical = false;
      },
    ],
    [
      "truncated list cursor",
      (o: Observation) => {
        if (o.kind === "list") o.result.nextAfterId = "next";
      },
    ],
    [
      "truncated history cursor",
      (o: Observation) => {
        if (o.kind === "history") o.result.nextBeforeVersion = 0;
      },
    ],
    [
      "leaking expected error",
      (o: Observation) => {
        if (o.status >= 400) o.result.foreign = "private-response-sentinel";
      },
    ],
  ] as const)("rejects %s with bounded evidence", async (_name, corrupt) => {
    const { result } = await exercise({ corrupt });
    expect(result.status).toBe("failed");
    expect(result.failureCode).toBe("role-journey.customer_requests_failed");
    expect(JSON.stringify(result)).not.toMatch(
      /private-response-sentinel|fixture-|Verifier|requestVersion|recordedAt|digest|principalId/,
    );
  });
});

function createOptions(): {
  headers: { name: string; value: string }[];
  body: string;
  customerRequests: CustomerRequestsDescriptor;
} {
  return {
    headers: structuredClone(headers),
    body: JSON.stringify(createBody),
    customerRequests: {
      profile: selected,
      kind: "create",
      slot: "customer-a",
      expected: { kind: "mutation", owner: "customer-a", version: 0 },
    },
  };
}
const collection = `/api/${selected.requestEntity}`;
describe("Customer Requests descriptor authority and bounded input", () => {
  it.each([
    [
      "foreign profile",
      (o: any) => {
        o.customerRequests.profile = structuredClone(selected);
      },
    ],
    [
      "foreign slot",
      (o: any) => {
        o.customerRequests.slot = "customer-c";
      },
    ],
    [
      "mixed directory",
      (o: any) => {
        o.directoryRead = {};
      },
    ],
    [
      "mixed inventory",
      (o: any) => {
        o.inventoryRead = {};
      },
    ],
    [
      "unknown options",
      (o: any) => {
        o.extra = true;
      },
    ],
    [
      "unknown descriptor",
      (o: any) => {
        o.customerRequests.extra = true;
      },
    ],
    [
      "unknown expectation",
      (o: any) => {
        o.customerRequests.expected.extra = true;
      },
    ],
    [
      "wrong command",
      (o: any) => {
        o.customerRequests.kind = "update";
      },
    ],
    [
      "wrong owner",
      (o: any) => {
        o.customerRequests.expected.owner = "customer-b";
      },
    ],
    [
      "wrong fixture state",
      (o: any) => {
        o.customerRequests.expected.version = 1;
      },
    ],
    [
      "body disagreement",
      (o: any) => {
        o.body = JSON.stringify({
          values: { subject: "Different", description: "Different" },
        });
      },
    ],
    [
      "unknown input key",
      (o: any) => {
        o.body = JSON.stringify({ ...createBody, extra: true });
      },
    ],
    [
      "prototype input key",
      (o: any) => {
        o.body =
          '{"values":{"subject":"Verifier request","description":"Verifier description","__proto__":{}}}';
      },
    ],
    [
      "wrong session",
      (o: any) => {
        o.headers[0].value = "fixture-session-customer-b";
      },
    ],
    [
      "role override",
      (o: any) => {
        o.headers[0].name = "x-factory-role";
      },
    ],
    [
      "extra header",
      (o: any) => {
        o.headers.push({ name: "x-extra", value: "extra" });
      },
    ],
    [
      "inherited options",
      (o: any) => {
        Object.setPrototypeOf(o, { inherited: true });
      },
    ],
    [
      "inherited descriptor",
      (o: any) => {
        Object.setPrototypeOf(o.customerRequests, { inherited: true });
      },
    ],
    [
      "inherited header",
      (o: any) => {
        Object.setPrototypeOf(o.headers[0], { inherited: true });
      },
    ],
    [
      "array payload",
      (o: any) => {
        o.body = "[]";
      },
    ],
    [
      "deep payload",
      (o: any) => {
        o.body = JSON.stringify({
          values: { subject: { text: "Nested" }, description: "Description" },
        });
      },
    ],
    [
      "UTF-8 byte overflow",
      (o: any) => {
        o.body = JSON.stringify({
          values: { subject: "界".repeat(150), description: "界".repeat(150) },
        });
      },
    ],
    [
      "subject overflow",
      (o: any) => {
        o.body = JSON.stringify({
          values: { subject: "x".repeat(161), description: "Description" },
        });
      },
    ],
    [
      "text overflow",
      (o: any) => {
        o.body = JSON.stringify({
          values: { subject: "Subject", description: "x".repeat(201) },
        });
      },
    ],
    [
      "untrimmed text",
      (o: any) => {
        o.body = JSON.stringify({
          values: { subject: " Subject", description: "Description" },
        });
      },
    ],
    [
      "control character",
      (o: any) => {
        o.body = JSON.stringify({
          values: { subject: "Sub\nject", description: "Description" },
        });
      },
    ],
    [
      "invalid error pair",
      (o: any) => {
        o.customerRequests.expected = {
          kind: "error",
          status: 404,
          code: "customer_request.forbidden",
        };
      },
    ],
    [
      "arbitrary predicate",
      (o: any) => {
        o.customerRequests.expected = { kind: "predicate", expression: "true" };
      },
    ],
  ] as const)("rejects %s before fetch", async (_name, mutate) => {
    const fetch = vi.fn(async () => new Response("{}"));
    const { environment } = setup(fetch);
    await environment.boot();
    const options = createOptions();
    mutate(options);
    await expect(
      environment.request("POST", collection, "api", options),
    ).rejects.toMatchObject({ code: "invalid_customer_requests_request" });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(["customerRequests", "headers", "body"])(
    "never executes an options %s accessor",
    async (field) => {
      const options = createOptions(),
        getter = vi.fn(() => {
          throw Error("Accessor executed");
        });
      Object.defineProperty(options, field, { get: getter, enumerable: true });
      const fetch = vi.fn(async () => new Response("{}")),
        { environment } = setup(fetch);
      await environment.boot();
      await expect(
        environment.request("POST", collection, "api", options),
      ).rejects.toMatchObject({ code: "invalid_customer_requests_request" });
      expect(getter).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it.each(["profile", "kind", "slot", "expected"])(
    "never executes a descriptor %s accessor",
    async (field) => {
      const options = createOptions(),
        getter = vi.fn(() => {
          throw Error("Accessor executed");
        });
      Object.defineProperty(options.customerRequests, field, {
        get: getter,
        enumerable: true,
      });
      const fetch = vi.fn(async () => new Response("{}")),
        { environment } = setup(fetch);
      await environment.boot();
      await expect(
        environment.request("POST", collection, "api", options),
      ).rejects.toMatchObject({ code: "invalid_customer_requests_request" });
      expect(getter).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it.each([
    ["web port", "POST", collection, "web", false],
    ["generic capture", "POST", collection, "api", true],
    ["method mismatch", "PATCH", collection, "api", false],
    ["route mismatch", "POST", collection + "/other", "api", false],
    ["query", "POST", collection + "?limit=1", "api", false],
  ] as const)(
    "rejects %s before fetch",
    async (_name, method, path, port, capture) => {
      const fetch = vi.fn(async () => new Response("{}")),
        { environment } = setup(fetch);
      await environment.boot();
      await expect(
        environment.request(method, path, port, createOptions(), capture),
      ).rejects.toBeDefined();
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it.each([-1, -0, 2147483648, 1.1])(
    "rejects unsafe fixture version %s",
    async (version) => {
      const options = createOptions();
      options.customerRequests = {
        profile: selected,
        slot: "customer-a",
        recordId: "fixture",
        kind: "reply",
        expected: {
          kind: "error",
          status: 404,
          code: "customer_request.not_found",
        },
      };
      // JSON's -0 normalization must not hide the source token in this parser test.
      options.body = `{"expectedVersion":${Object.is(version, -0) ? "-0" : version},"message":"Message","correctsVersion":null}`;
      expect(
        validCustomerRequestsRequest(
          options.customerRequests,
          "POST",
          collection + "/fixture/events/reply",
          options,
        ),
      ).toBe(false);
    },
  );
  it.each([".", "..", "x/y", "x%2fy", "x".repeat(65)])(
    "rejects unsafe route ID %s",
    (id) => {
      const options = createOptions();
      delete (options as any).body;
      options.headers = [options.headers[0]!];
      options.customerRequests = {
        profile: selected,
        slot: "customer-a",
        recordId: id,
        kind: "detail",
        expected: {
          kind: "error",
          status: 404,
          code: "customer_request.not_found",
        },
      };
      expect(
        validCustomerRequestsRequest(
          options.customerRequests,
          "GET",
          collection + "/" + id,
          options,
        ),
      ).toBe(false);
    },
  );
  it("preserves generic update/null rejection and top-level-only capture", async () => {
    const fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ request: { id: "nested-only" }, event: {} }),
          { status: 201 },
        ),
    );
    const { environment } = setup(fetch);
    await environment.boot();
    for (const body of [
      { expectedVersion: 0, reason: "Correction", values: createBody.values },
      { expectedVersion: 0, message: "Message", correctsVersion: null },
    ]) {
      await expect(
        environment.request("POST", collection, "api", {
          headers,
          body: JSON.stringify(body),
        }),
      ).rejects.toMatchObject({ code: "invalid_request_body" });
    }
    expect(fetch).not.toHaveBeenCalled();
    const result = await environment.request(
      "POST",
      collection,
      "api",
      { headers, body: JSON.stringify(createBody) },
      true,
    );
    expect(result.recordId).toBeUndefined();
    expect(result.customerRequestsMatches).toBeUndefined();
  });
});

describe("Customer Requests bounded response transport", () => {
  it.each([
    [
      "malformed JSON",
      () =>
        new Response("{", {
          status: 201,
          headers: { "cache-control": "no-store" },
        }),
    ],
    [
      "invalid UTF-8",
      () =>
        new Response(new Uint8Array([0xc3, 0x28]), {
          status: 201,
          headers: { "cache-control": "no-store" },
        }),
    ],
    [
      "missing body",
      () =>
        new Response(null, {
          status: 201,
          headers: { "cache-control": "no-store" },
        }),
    ],
    [
      "oversized body",
      () =>
        new Response("x".repeat(16385), {
          status: 201,
          headers: { "cache-control": "no-store" },
        }),
    ],
    ["missing no-store", () => new Response("{}", { status: 201 })],
    [
      "wrong status",
      () =>
        new Response("{}", {
          status: 200,
          headers: { "cache-control": "no-store" },
        }),
    ],
  ] as const)("fails closed on %s", async (_name, response) => {
    const { environment } = setup(async () => response());
    await environment.boot();
    const result = await environment.request(
      "POST",
      collection,
      "api",
      createOptions(),
    );
    expect(result.customerRequestsMatches).toBe(false);
    expect(result.recordId).toBeUndefined();
    expect(result.customerRequestsEventId).toBeUndefined();
    expect(result.customerRequestsResponseDigest).toBeUndefined();
  });
  it("cancels an overflowing stream", async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new Uint8Array(8193));
      },
      cancel,
    });
    const { environment } = setup(
      async () =>
        new Response(stream, {
          status: 201,
          headers: { "cache-control": "no-store" },
        }),
    );
    await environment.boot();
    expect(
      (await environment.request("POST", collection, "api", createOptions()))
        .customerRequestsMatches,
    ).toBe(false);
    expect(cancel).toHaveBeenCalledOnce();
  });
  it("cancels a never-ending response at the operation timeout without awaiting a stalled cancellation", async () => {
    const cancel = vi.fn(() => new Promise<void>(() => undefined));
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"request":'));
      },
      cancel,
    });
    const { environment } = setup(
      async () =>
        new Response(stream, {
          status: 201,
          headers: { "cache-control": "no-store" },
        }),
      10,
    );
    await environment.boot();
    const result = await environment.request(
      "POST",
      collection,
      "api",
      createOptions(),
    );
    expect(result.customerRequestsMatches).toBe(false);
    expect(result.recordId).toBeUndefined();
    expect(cancel).toHaveBeenCalledOnce();
  });
  it("covers abort before read and abort during response completion", async () => {
    for (const preAborted of [true, false]) {
      const controller = new AbortController(),
        cancel = vi.fn();
      if (preAborted) controller.abort();
      const stream = new ReadableStream<Uint8Array>({
        pull(source) {
          controller.abort();
          source.close();
        },
        cancel,
      });
      expect(
        await compareCustomerRequestsResponse(
          new Response(stream, {
            status: 201,
            headers: { "cache-control": "no-store" },
          }),
          createOptions().customerRequests,
          controller.signal,
        ),
      ).toEqual({ matches: false });
      expect(cancel).toHaveBeenCalledOnce();
    }
  });
  it("fails safely when fetch aborts without response data", async () => {
    const { environment } = setup(
      async (_url, init) =>
        new Promise<Response>((_resolve, reject) =>
          init?.signal?.addEventListener(
            "abort",
            () => reject(Error("private-fetch-sentinel")),
            { once: true },
          ),
        ),
      10,
    );
    await environment.boot();
    const result = await environment.request(
      "POST",
      collection,
      "api",
      createOptions(),
    );
    expect(result).toMatchObject({
      status: 0,
      ok: false,
      customerRequestsMatches: false,
    });
    expect(JSON.stringify(result)).not.toContain("private-fetch-sentinel");
  });
});

describe("Customer Requests review repair", () => {
  const plan = deriveVerificationProfile(input.graph, input.compositionLock);
  const journey = plan.journeys["customer-requests-lifecycle"]!;
  it.each(["journeyId", "action", "sessionId", "customerRequests"])(
    "rejects the private own %s accessor without invoking it or fetch",
    async (field) => {
      const candidate = { ...journey },
        getter = vi.fn(() => (journey as any)[field]);
      Object.defineProperty(candidate, field, {
        enumerable: true,
        get: getter,
      });
      const fetch = vi.fn(async () => new Response("{}"));
      const { environment } = setup(fetch);
      expect(() => validateRoleJourney(candidate, plan.apiRegistry)).toThrow();
      await expect(
        runRoleJourneyProbe(
          {
            entry: plan.stepPlan[2]!,
            environment,
            signal: new AbortController().signal,
          },
          candidate,
          plan.apiRegistry,
        ),
      ).rejects.toBeDefined();
      expect(getter).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it.each([
    "body",
    "headers",
    "chain",
    "principal",
    "directoryRead",
    "inventory",
    "custom prototype",
  ])("rejects inherited %s before fetch", async (field) => {
    const prototype =
      field === "custom prototype"
        ? {}
        : { [field]: field === "body" ? "{}" : undefined };
    const candidate = Object.assign(Object.create(prototype), journey);
    const fetch = vi.fn(async () => new Response("{}")),
      { environment } = setup(fetch);
    expect(() => validateRoleJourney(candidate, plan.apiRegistry)).toThrow();
    await expect(
      runRoleJourneyProbe(
        {
          entry: plan.stepPlan[2]!,
          environment,
          signal: new AbortController().signal,
        },
        candidate,
        plan.apiRegistry,
      ),
    ).rejects.toBeDefined();
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    "body",
    "headers",
    "chain",
    "principal",
    "directoryRead",
    "inventory",
  ])(
    "rejects an inherited %s getter without invoking it or fetch",
    async (field) => {
      const getter = vi.fn(() => undefined),
        prototype = {};
      Object.defineProperty(prototype, field, { get: getter });
      const candidate = Object.assign(Object.create(prototype), journey);
      const fetch = vi.fn(async () => new Response("{}")),
        { environment } = setup(fetch);
      expect(() => validateRoleJourney(candidate, plan.apiRegistry)).toThrow();
      await expect(
        runRoleJourneyProbe(
          {
            entry: plan.stepPlan[2]!,
            environment,
            signal: new AbortController().signal,
          },
          candidate,
          plan.apiRegistry,
        ),
      ).rejects.toBeDefined();
      expect(getter).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it.each(["plain", "null prototype"])(
    "retains a valid own-data %s journey",
    (shape) => {
      const candidate = Object.assign(
        Object.create(shape === "plain" ? Object.prototype : null),
        journey,
      );
      expect(validateRoleJourney(candidate, plan.apiRegistry)).toEqual(
        plan.apiRegistry[0],
      );
    },
  );
  it.each([
    ["mutation request", "create", "version"],
    ["mutation event", "create", "requestVersion"],
    ["detail request", "detail", "version"],
    ["detail activity", "detail", "requestVersion"],
    ["list request", "list", "version"],
    ["list activity", "list", "requestVersion"],
    ["history event", "history", "requestVersion"],
  ] as const)(
    "rejects wire negative zero in %s without captured identities or digest",
    async (_name, kind, field) => {
      const emitted = loadWorkOrdersRuntime(undefined, input);
      const runtime = new emitted.ApplicationRuntime(
        new emitted.InMemoryRecordStore(),
      );
      const created = await runtime.customerRequestCommand(
        a,
        selected.requestEntity,
        undefined,
        "create",
        "repair-create",
        createBody,
      );
      const canonical = await compareCustomerRequestsResponse(
        new Response(JSON.stringify(created.body), {
          status: 201,
          headers: { "cache-control": "no-store" },
        }),
        createOptions().customerRequests,
        new AbortController().signal,
      );
      expect(canonical.matches).toBe(true);
      expect(canonical.responseDigest).toMatch(/^[a-f0-9]{64}$/);
      const id = canonical.recordId!;
      const snapshot = {
        owner: "customer-a" as const,
        id,
        version: 0,
        events: [{ id: canonical.eventId!, digest: canonical.responseDigest! }],
      };
      const options: any = createOptions();
      let path = collection,
        status = 201,
        responseBody = created.body;
      if (kind !== "create") {
        status = 200;
        delete options.body;
        options.headers = [options.headers[0]];
        options.customerRequests = {
          profile: selected,
          kind,
          slot: "customer-a",
          ...(kind === "list" ? {} : { recordId: id }),
          expected:
            kind === "list"
              ? { kind: "list", requests: [snapshot] }
              : { kind, snapshot },
        };
        path =
          collection +
          (kind === "list"
            ? ""
            : `/${id}${kind === "history" ? "/history" : ""}`);
        responseBody =
          kind === "list"
            ? await runtime.customerRequestList(a, selected.requestEntity)
            : kind === "detail"
              ? await runtime.customerRequestRead(a, selected.requestEntity, id)
              : await runtime.customerRequestHistory(
                  a,
                  selected.requestEntity,
                  id,
                );
      }
      const originalWire = JSON.stringify(responseBody);
      const token = `"${field}":0`;
      expect(originalWire).toContain(token);
      let wire = originalWire;
      const { environment } = setup(
        async () =>
          new Response(wire, {
            status,
            headers: { "cache-control": "no-store" },
          }),
      );
      await environment.boot();
      const method = kind === "create" ? "POST" : "GET";
      const valid = await environment.request(method, path, "api", options);
      expect(valid.customerRequestsMatches).toBe(true);
      if (kind === "create")
        expect(valid.customerRequestsResponseDigest).toBe(
          canonical.responseDigest,
        );
      // Text editing is essential: JSON.stringify(-0) would erase the defect.
      wire = originalWire.replace(token, `"${field}":-0`);
      const result = await environment.request(method, path, "api", options);
      expect(result.customerRequestsMatches).toBe(false);
      expect(result.recordId).toBeUndefined();
      expect(result.customerRequestsEventId).toBeUndefined();
      expect(result.customerRequestsResponseDigest).toBeUndefined();
      expect(JSON.stringify(result)).not.toContain(id);
    },
  );
});
