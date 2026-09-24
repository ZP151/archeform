import { createHash } from "node:crypto";
import type { CustomerRequestsProfile } from "@factory/compiler";
import type { VerificationStepV1 } from "@factory/graph";
import type { VerificationProfile } from "./verification-profiles.js";
import type { ProbeContext } from "./probes.js";
import type { HttpMethod } from "./verification-environment.js";

type Owner = "customer-a" | "customer-b";
type Slot = Owner | "staff";
type Command = "create" | "update" | "reply" | "complete" | "reopen" | "cancel";
type Witness = { readonly id: string; readonly digest: string };
type Snapshot = {
  readonly owner: Owner;
  readonly id: string;
  readonly version: number;
  readonly events: readonly Witness[];
};
type Expected =
  | {
      readonly kind: "mutation";
      readonly owner: Owner;
      readonly version: number;
      readonly event?: Witness;
    }
  | { readonly kind: "detail" | "history"; readonly snapshot: Snapshot }
  | { readonly kind: "list"; readonly requests: readonly Snapshot[] }
  | { readonly kind: "error"; readonly status: number; readonly code: string };
export type CustomerRequestsDescriptor = {
  readonly profile: CustomerRequestsProfile;
  readonly kind: Command | "list" | "detail" | "history";
  readonly slot: Slot;
  readonly recordId?: string;
  readonly expected: Expected;
};
type RequestFixture = {
  readonly customerRequests?: unknown;
  readonly headers?: readonly {
    readonly name: string;
    readonly value: string;
  }[];
  readonly body?: string;
};
type Comparison = {
  matches: boolean;
  recordId?: string;
  eventId?: string;
  responseDigest?: string;
};
const profiles = new WeakSet<object>();
const readVersion = "factory.generated.customer-request-read/v1";
const historyVersion = "factory.generated.customer-request-history-entry/v1";
const actions = [
  "create",
  "update",
  "reply",
  "reply",
  "reply",
  "complete",
  "reopen",
  "complete",
  "reopen",
  "cancel",
] as const;
const staffVersions = new Set([2, 3, 5, 7]);
const subject = "Verifier request",
  description = "Verifier description";
const updatedSubject = "Verifier updated request",
  updatedDescription = "Verifier updated description";
const reason = "Verifier correction";
const messages: Readonly<Record<number, string>> = {
  2: "Verifier staff reply",
  3: "Verifier corrected reply",
  4: "Verifier customer reply",
  5: "Verifier resolution",
  7: "Verifier second resolution",
};
const session = (slot: Slot) =>
  "fixture-session-" + (slot === "staff" ? "support-staff" : slot);
const principal = (slot: Slot) =>
  "fixture-principal-" + (slot === "staff" ? "support-staff" : slot);
const safeId = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[a-zA-Z0-9._~-]{1,64}$/.test(value) &&
  value !== "." &&
  value !== "..";
const integer = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isSafeInteger(value) &&
  !Object.is(value, -0) &&
  value >= 0 &&
  value <= 2147483647;
const fixtureVersion = (value: unknown): value is number =>
  integer(value) && value <= 9;
const digest = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const iso = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString() === value;
const text = (
  value: unknown,
  maximum = 200,
  multiline = true,
): value is string =>
  typeof value === "string" &&
  value.length <= maximum &&
  value.trim() === value &&
  value.length > 0 &&
  !(
    multiline
      ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/
      : /[\u0000-\u001f\u007f-\u009f]/
  ).test(value);

/** Inspect descriptors before reading properties: no inherited, accessor or hidden data. */
function own(
  value: unknown,
  keys: readonly string[],
  optional: readonly string[] = [],
): value is Record<string, any> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  )
    return false;
  const actual = Reflect.ownKeys(value);
  return (
    actual.length <= 32 &&
    keys.every((key) => Object.hasOwn(value, key)) &&
    actual.every((key) => {
      if (
        typeof key !== "string" ||
        (!keys.includes(key) && !optional.includes(key))
      )
        return false;
      const property = Object.getOwnPropertyDescriptor(value, key)!;
      return property.enumerable && "value" in property;
    })
  );
}
function array(value: unknown, maximum: number): value is unknown[] {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    value.length > maximum ||
    Reflect.ownKeys(value).length !== value.length + 1
  )
    return false;
  return Array.from({ length: value.length }, (_, index) =>
    Object.getOwnPropertyDescriptor(value, String(index)),
  ).every((property) => property && property.enumerable && "value" in property);
}
function witness(value: unknown): value is Witness {
  return (
    own(value, ["id", "digest"]) && safeId(value.id) && digest(value.digest)
  );
}
function snapshot(value: unknown): value is Snapshot {
  return (
    own(value, ["owner", "id", "version", "events"]) &&
    ["customer-a", "customer-b"].includes(value.owner) &&
    safeId(value.id) &&
    fixtureVersion(value.version) &&
    (value.owner !== "customer-b" || value.version === 0) &&
    array(value.events, 10) &&
    value.events.length === value.version + 1 &&
    value.events.every(witness) &&
    new Set(value.events.map((event) => event.id)).size === value.events.length
  );
}
const errors: Readonly<Record<number, readonly string[]>> = {
  400: ["invalid_request"],
  403: ["forbidden"],
  404: ["not_found"],
  409: [
    "idempotency_conflict",
    "version_conflict",
    "state_conflict",
    "version_exhausted",
    "retryable_conflict",
  ],
  500: ["internal_error"],
  503: ["unavailable"],
};
function expectation(value: unknown): value is Expected {
  if (
    !own(
      value,
      ["kind"],
      ["owner", "version", "event", "snapshot", "requests", "status", "code"],
    )
  )
    return false;
  if (value.kind === "mutation")
    return (
      own(value, ["kind", "owner", "version"], ["event"]) &&
      ["customer-a", "customer-b"].includes(value.owner) &&
      fixtureVersion(value.version) &&
      (value.owner !== "customer-b" || value.version === 0) &&
      (!Object.hasOwn(value, "event") || witness(value.event))
    );
  if (value.kind === "detail" || value.kind === "history")
    return own(value, ["kind", "snapshot"]) && snapshot(value.snapshot);
  if (value.kind === "list")
    return (
      own(value, ["kind", "requests"]) &&
      array(value.requests, 2) &&
      value.requests.every(snapshot) &&
      new Set(value.requests.map((row) => row.id)).size ===
        value.requests.length &&
      new Set(value.requests.map((row) => row.owner)).size ===
        value.requests.length
    );
  return (
    value.kind === "error" &&
    own(value, ["kind", "status", "code"]) &&
    typeof value.code === "string" &&
    integer(value.status) &&
    (errors[value.status] ?? []).some(
      (code) => value.code === "customer_request." + code,
    )
  );
}
function bodyFor(version: number): Record<string, unknown> {
  if (version === 0) return { values: { subject, description } };
  if (version === 1)
    return {
      expectedVersion: 0,
      reason,
      values: { subject: updatedSubject, description: updatedDescription },
    };
  if ([2, 3, 4].includes(version))
    return {
      expectedVersion: version - 1,
      message: messages[version],
      correctsVersion: version === 3 ? 2 : null,
    };
  if ([5, 7].includes(version))
    return {
      expectedVersion: version - 1,
      resolutionMessage: messages[version],
    };
  return { expectedVersion: version - 1, reason };
}
function validBody(kind: Command, body: unknown): boolean {
  const metadata = (value: unknown) =>
    own(value, ["subject", "description"]) &&
    text(value.subject, 160, false) &&
    text(value.description);
  if (kind === "create") return own(body, ["values"]) && metadata(body.values);
  const fields =
    kind === "update"
      ? ["expectedVersion", "reason", "values"]
      : kind === "reply"
        ? ["expectedVersion", "message", "correctsVersion"]
        : kind === "complete"
          ? ["expectedVersion", "resolutionMessage"]
          : ["expectedVersion", "reason"];
  if (!own(body, fields) || !integer(body.expectedVersion)) return false;
  if (kind === "update") return text(body.reason) && metadata(body.values);
  if (kind === "reply")
    return (
      text(body.message) &&
      (body.correctsVersion === null || integer(body.correctsVersion))
    );
  return kind === "complete" ? text(body.resolutionMessage) : text(body.reason);
}
function equal(actual: unknown, expected: unknown): boolean {
  // Preserve the contract's distinction between zero and forbidden wire -0.
  // JSON.stringify would normalize -0 before digest capture, so reject it here.
  if (Object.is(actual, expected)) return true;
  if (Array.isArray(expected))
    return (
      array(actual, 10) &&
      actual.length === expected.length &&
      actual.every((value, index) => equal(value, expected[index]))
    );
  if (
    !expected ||
    typeof expected !== "object" ||
    !own(actual, Object.keys(expected))
  )
    return false;
  return Object.entries(expected).every(([key, value]) =>
    equal(actual[key], value),
  );
}
function expectedRequest(owner: Owner, version: number, id: string) {
  return {
    id,
    version,
    subject: version > 0 ? updatedSubject : subject,
    description: version > 0 ? updatedDescription : description,
    status: [5, 7].includes(version)
      ? "resolved"
      : version === 9
        ? "cancelled"
        : "open",
    customerPrincipalId: principal(owner),
  };
}
function expectedEvent(
  profile: CustomerRequestsProfile,
  owner: Owner,
  version: number,
  requestId: string,
  id: string,
  recordedAt: string,
) {
  const action = actions[version]!,
    actor = staffVersions.has(version) ? "staff" : owner;
  return {
    apiVersion: historyVersion,
    id,
    request: requestId,
    action,
    requestVersion: version,
    toStatus: expectedRequest(owner, version, requestId).status,
    actorPrincipalId: principal(actor),
    actorRole: profile.roles[actor === "staff" ? "staff" : "customer"],
    recordedAt,
    fromStatus:
      version === 0 ? null : action === "reopen" ? "resolved" : "open",
    message: messages[version] ?? null,
    reason: ["update", "reopen", "cancel"].includes(action) ? reason : null,
    correctsVersion: version === 3 ? 2 : null,
    beforeSubject: version === 1 ? subject : null,
    afterSubject:
      version <= 1 ? (version === 0 ? subject : updatedSubject) : null,
    beforeDescription: version === 1 ? description : null,
    afterDescription:
      version <= 1 ? (version === 0 ? description : updatedDescription) : null,
  };
}
function mutationDigest(
  profile: CustomerRequestsProfile,
  owner: Owner,
  version: number,
  requestId: string,
  eventId: string,
  recordedAt: string,
): string {
  // Construct the complete accepted schema in a fixed order; no response key ordering dependence.
  return createHash("sha256")
    .update(
      JSON.stringify({
        request: expectedRequest(owner, version, requestId),
        event: expectedEvent(
          profile,
          owner,
          version,
          requestId,
          eventId,
          recordedAt,
        ),
      }),
    )
    .digest("hex");
}
export function isCustomerRequestsProfile(
  value: unknown,
): value is CustomerRequestsProfile {
  return !!value && typeof value === "object" && profiles.has(value);
}
export function customerRequestsVerificationProfile(
  profile: CustomerRequestsProfile,
): VerificationProfile {
  profiles.add(profile);
  const stepId = "customer-requests-lifecycle";
  return {
    profileKey: "customer-requests-" + profile.graphHash.slice(7, 39),
    stepPlan: [
      { stepId: "migration", kind: "migration" },
      { stepId: "health", kind: "health" },
      { stepId, kind: "role-journey" },
    ],
    apiRegistry: [
      {
        action: "customer-requests.lifecycle",
        method: "POST",
        route: `/api/${profile.requestEntity}`,
        expectedStatus: 201,
      },
    ],
    journeys: {
      [stepId]: {
        journeyId: stepId,
        action: "customer-requests.lifecycle",
        sessionId: "fixture-session-customer-a",
        customerRequests: profile,
      },
    },
  };
}
export function validCustomerRequestsRequest(
  value: unknown,
  method: HttpMethod,
  path: string,
  options: RequestFixture,
): value is CustomerRequestsDescriptor {
  try {
    if (
      !own(options, ["customerRequests", "headers"], ["body"]) ||
      options.customerRequests !== value ||
      !own(value, ["profile", "kind", "slot", "expected"], ["recordId"]) ||
      !isCustomerRequestsProfile(value.profile) ||
      !["staff", "customer-a", "customer-b"].includes(value.slot) ||
      !expectation(value.expected)
    )
      return false;
    const kind = value.kind,
      read = ["list", "detail", "history"].includes(kind);
    if (
      !read &&
      !["create", "update", "reply", "complete", "reopen", "cancel"].includes(
        kind,
      )
    )
      return false;
    const collection = kind === "create" || kind === "list";
    if (collection ? Object.hasOwn(value, "recordId") : !safeId(value.recordId))
      return false;
    const route =
      `/api/${value.profile.requestEntity}` +
      (collection
        ? ""
        : `/${value.recordId}` +
          (kind === "detail"
            ? ""
            : kind === "history"
              ? "/history"
              : `/events/${kind}`));
    if (method !== (read ? "GET" : "POST") || path !== route) return false;
    if (
      !array(options.headers, 2) ||
      options.headers.length !== (read ? 1 : 2) ||
      !options.headers.every((header) => own(header, ["name", "value"]))
    )
      return false;
    const declared = options.headers as { name: string; value: string }[];
    if (
      declared.filter(
        (header) =>
          header.name === "x-factory-fixture-session" &&
          header.value === session(value.slot),
      ).length !== 1
    )
      return false;
    if (
      !read &&
      declared.filter(
        (header) =>
          header.name === "x-factory-idempotency-key" &&
          typeof header.value === "string" &&
          /^[a-zA-Z0-9._-]{1,64}$/.test(header.value),
      ).length !== 1
    )
      return false;
    let body: unknown;
    if (read) {
      if (Object.hasOwn(options, "body")) return false;
    } else {
      if (
        typeof options.body !== "string" ||
        Buffer.byteLength(options.body, "utf8") > 512
      )
        return false;
      body = JSON.parse(options.body);
      if (!validBody(kind, body)) return false;
    }
    const expected = value.expected;
    if (expected.kind === "error") return true;
    if (expected.kind === "mutation") {
      const actor = staffVersions.has(expected.version)
        ? "staff"
        : expected.owner;
      return (
        !read &&
        actions[expected.version] === kind &&
        value.slot === actor &&
        equal(body, bodyFor(expected.version))
      );
    }
    if (expected.kind !== kind) return false;
    if (expected.kind === "list")
      return expected.requests.every(
        (row) => value.slot === "staff" || row.owner === value.slot,
      );
    return (
      expected.snapshot.id === value.recordId &&
      (value.slot === "staff" || expected.snapshot.owner === value.slot)
    );
  } catch {
    return false;
  }
}
export async function compareCustomerRequestsResponse(
  response: Response,
  descriptor: CustomerRequestsDescriptor,
  signal: AbortSignal,
): Promise<Comparison> {
  const failed: Comparison = { matches: false };
  if (!response.body) return failed;
  const reader = response.body.getReader();
  const abort = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener("abort", abort, { once: true });
  try {
    if (
      signal.aborted ||
      response.headers.get("cache-control") !== "no-store" ||
      !isCustomerRequestsProfile(descriptor.profile) ||
      !expectation(descriptor.expected)
    )
      return failed;
    const expected = descriptor.expected;
    const status =
      expected.kind === "error"
        ? expected.status
        : descriptor.kind === "create"
          ? 201
          : 200;
    if (response.status !== status) return failed;
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (signal.aborted) return failed;
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 16 * 1024) return failed;
      chunks.push(value);
    }
    const body: unknown = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)),
    );
    if (signal.aborted) return failed;
    if (expected.kind === "error")
      return { matches: equal(body, { code: expected.code }) };
    const profile = descriptor.profile;
    if (expected.kind === "mutation") {
      if (
        !own(body, ["request", "event"]) ||
        !own(body.request, [
          "id",
          "version",
          "subject",
          "description",
          "status",
          "customerPrincipalId",
        ]) ||
        !safeId(body.request.id) ||
        (descriptor.recordId !== undefined &&
          body.request.id !== descriptor.recordId) ||
        !own(
          body.event,
          Object.keys(
            expectedEvent(
              profile,
              expected.owner,
              expected.version,
              "",
              "",
              "",
            ),
          ),
        ) ||
        !safeId(body.event.id) ||
        body.event.id === body.request.id ||
        !iso(body.event.recordedAt)
      )
        return failed;
      const id = body.request.id,
        eventId = body.event.id,
        at = body.event.recordedAt;
      if (
        !equal(
          body.request,
          expectedRequest(expected.owner, expected.version, id),
        ) ||
        !equal(
          body.event,
          expectedEvent(
            profile,
            expected.owner,
            expected.version,
            id,
            eventId,
            at,
          ),
        )
      )
        return failed;
      const responseDigest = mutationDigest(
        profile,
        expected.owner,
        expected.version,
        id,
        eventId,
        at,
      );
      if (
        expected.event &&
        (expected.event.id !== eventId ||
          expected.event.digest !== responseDigest)
      )
        return failed;
      return { matches: true, recordId: id, eventId, responseDigest };
    }
    function eventAt(row: Snapshot, version: number, at: unknown): boolean {
      const event = row.events[version];
      return (
        !!event &&
        iso(at) &&
        mutationDigest(profile, row.owner, version, row.id, event.id, at) ===
          event.digest
      );
    }
    function projection(value: unknown, row: Snapshot): boolean {
      if (!own(value, ["nextActor", "lastActivity"])) return false;
      const version = row.version;
      if (
        !own(value.lastActivity, [
          "requestVersion",
          "action",
          "actorRole",
          "recordedAt",
        ]) ||
        !eventAt(row, version, value.lastActivity.recordedAt)
      )
        return false;
      const event = expectedEvent(
        profile,
        row.owner,
        version,
        row.id,
        row.events[version]!.id,
        value.lastActivity.recordedAt,
      );
      return equal(value, {
        nextActor:
          event.toStatus !== "open"
            ? null
            : event.action === "reply" && staffVersions.has(version)
              ? "customer"
              : "staff",
        lastActivity: {
          requestVersion: version,
          action: event.action,
          actorRole: event.actorRole,
          recordedAt: event.recordedAt,
        },
      });
    }
    if (expected.kind === "history") {
      const row = expected.snapshot;
      if (
        !own(body, ["apiVersion", "items", "nextBeforeVersion"]) ||
        body.apiVersion !== readVersion ||
        body.nextBeforeVersion !== null ||
        !array(body.items, 10) ||
        body.items.length !== row.events.length
      )
        return failed;
      return {
        matches: body.items.every((item, index) => {
          const version = row.version - index;
          return (
            own(
              item,
              Object.keys(
                expectedEvent(profile, row.owner, version, "", "", ""),
              ),
            ) &&
            eventAt(row, version, item.recordedAt) &&
            equal(
              item,
              expectedEvent(
                profile,
                row.owner,
                version,
                row.id,
                row.events[version]!.id,
                item.recordedAt,
              ),
            )
          );
        }),
      };
    }
    if (expected.kind === "list") {
      if (
        !own(body, ["apiVersion", "items", "nextAfterId"]) ||
        body.apiVersion !== readVersion ||
        body.nextAfterId !== null ||
        !array(body.items, 2) ||
        body.items.length !== expected.requests.length
      )
        return failed;
      const rows = [...expected.requests].sort((a, b) =>
        a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
      );
      return {
        matches: body.items.every((item, index) => {
          const row = rows[index]!;
          if (
            !own(item, [
              "id",
              "version",
              "subject",
              "description",
              "status",
              "customerPrincipalId",
              "nextActor",
              "lastActivity",
            ])
          )
            return false;
          const { nextActor, lastActivity, ...request } = item;
          return (
            equal(request, expectedRequest(row.owner, row.version, row.id)) &&
            projection({ nextActor, lastActivity }, row)
          );
        }),
      };
    }
    const row = expected.snapshot;
    if (
      !own(body, [
        "apiVersion",
        "request",
        "nextActor",
        "lastActivity",
        "latestReply",
      ]) ||
      body.apiVersion !== readVersion ||
      !equal(body.request, expectedRequest(row.owner, row.version, row.id)) ||
      !projection(
        { nextActor: body.nextActor, lastActivity: body.lastActivity },
        row,
      )
    )
      return failed;
    const version = [7, 5, 4, 3, 2].find((version) => version <= row.version);
    if (version === undefined) return { matches: body.latestReply === null };
    if (
      !own(body.latestReply, [
        ...Object.keys(expectedEvent(profile, row.owner, version, "", "", "")),
        "historical",
      ]) ||
      !eventAt(row, version, body.latestReply.recordedAt)
    )
      return failed;
    return {
      matches: equal(body.latestReply, {
        ...expectedEvent(
          profile,
          row.owner,
          version,
          row.id,
          row.events[version]!.id,
          body.latestReply.recordedAt,
        ),
        historical:
          actions[version] === "complete" && ![5, 7].includes(row.version),
      }),
    };
  } catch {
    return failed;
  } finally {
    signal.removeEventListener("abort", abort);
    // Do not await an adversarial source's cancel promise after the operation deadline.
    void reader.cancel().catch(() => undefined);
  }
}
export async function runCustomerRequestsJourney(
  context: ProbeContext,
  profile: CustomerRequestsProfile,
): Promise<VerificationStepV1> {
  let durationMs = 0,
    count = 0;
  const evidence = (passed: boolean): VerificationStepV1 => ({
    stepId: context.entry.stepId,
    kind: "role-journey",
    status: passed ? "passed" : "failed",
    ...(passed ? {} : { failureCode: "role-journey.customer_requests_failed" }),
    summary: passed
      ? "Customer Requests lifecycle and ownership verified."
      : "Customer Requests lifecycle verification failed.",
    durationMs,
  });
  try {
    if (!isCustomerRequestsProfile(profile)) return evidence(false);
    const base = `/api/${profile.requestEntity}`;
    const request = async (
      kind: CustomerRequestsDescriptor["kind"],
      slot: Slot,
      expected: Expected,
      id?: string,
      body?: unknown,
      key?: string,
    ) => {
      if (context.signal.aborted || ++count > 64) throw Error();
      const collection = kind === "create" || kind === "list",
        read = ["list", "detail", "history"].includes(kind);
      if (!collection && !safeId(id)) throw Error();
      const descriptor: CustomerRequestsDescriptor = {
        profile,
        kind,
        slot,
        expected,
        ...(!collection ? { recordId: id! } : {}),
      };
      const path =
        base +
        (collection
          ? ""
          : `/${id}` +
            (kind === "detail"
              ? ""
              : kind === "history"
                ? "/history"
                : `/events/${kind}`));
      const result = await context.environment.request(
        read ? "GET" : "POST",
        path,
        "api",
        {
          customerRequests: descriptor,
          headers: [
            { name: "x-factory-fixture-session", value: session(slot) },
            ...(!read
              ? [{ name: "x-factory-idempotency-key", value: key! }]
              : []),
          ],
          ...(!read ? { body: JSON.stringify(body) } : {}),
        },
      );
      durationMs += result.durationMs;
      const status =
        expected.kind === "error"
          ? expected.status
          : kind === "create"
            ? 201
            : 200;
      if (
        context.signal.aborted ||
        result.status !== status ||
        result.customerRequestsMatches !== true
      )
        throw Error();
      return result;
    };
    const events: Witness[] = [];
    const receipts: {
      status: number;
      recordId: string;
      eventId: string;
      digest: string;
    }[] = [];
    let id = "";
    const key = (version: number) =>
      `customer-requests-${actions[version]}-${version}`;
    const mutate = async (version: number) => {
      const result = await request(
        actions[version]!,
        staffVersions.has(version) ? "staff" : "customer-a",
        { kind: "mutation", owner: "customer-a", version },
        version === 0 ? undefined : id,
        bodyFor(version),
        key(version),
      );
      if (
        !safeId(result.recordId) ||
        !safeId(result.customerRequestsEventId) ||
        !digest(result.customerRequestsResponseDigest) ||
        events.some((event) => event.id === result.customerRequestsEventId) ||
        (version > 0 && result.recordId !== id)
      )
        throw Error();
      id = result.recordId;
      receipts.push({
        status: result.status,
        recordId: result.recordId,
        eventId: result.customerRequestsEventId,
        digest: result.customerRequestsResponseDigest,
      });
      events.push({
        id: result.customerRequestsEventId,
        digest: result.customerRequestsResponseDigest,
      });
    };
    const current = (): Snapshot => ({
      owner: "customer-a",
      id,
      version: events.length - 1,
      events: [...events],
    });
    const readBack = async (slot: Slot = "customer-a") => {
      for (const kind of ["detail", "history"] as const)
        await request(kind, slot, { kind, snapshot: current() }, id);
    };
    const denied = (
      kind: Command | "detail" | "history",
      slot: Slot,
      status: number,
      code: string,
      body?: unknown,
      commandKey = `customer-requests-denied-${count}`,
    ) =>
      request(
        kind,
        slot,
        { kind: "error", status, code: "customer_request." + code },
        kind === "create" ? undefined : id,
        body,
        commandKey,
      );
    await request("list", "customer-a", { kind: "list", requests: [] });
    for (let version = 0; version <= 9; version++) {
      await mutate(version);
      await readBack();
      if (version === 2)
        await denied("reply", "staff", 400, "invalid_request", {
          expectedVersion: 2,
          message: "Verifier invalid correction",
          correctsVersion: 0,
        });
      if (version === 3)
        await denied("reply", "staff", 400, "invalid_request", {
          expectedVersion: 3,
          message: "Verifier duplicate correction",
          correctsVersion: 2,
        });
    }
    // A shared create key is scoped to B's own principal, never an A replay.
    const b = await request(
      "create",
      "customer-b",
      { kind: "mutation", owner: "customer-b", version: 0 },
      undefined,
      bodyFor(0),
      key(0),
    );
    if (
      !safeId(b.recordId) ||
      b.recordId === id ||
      !safeId(b.customerRequestsEventId) ||
      events.some((event) => event.id === b.customerRequestsEventId) ||
      !digest(b.customerRequestsResponseDigest)
    )
      throw Error();
    const other: Snapshot = {
      owner: "customer-b",
      id: b.recordId,
      version: 0,
      events: [
        {
          id: b.customerRequestsEventId,
          digest: b.customerRequestsResponseDigest,
        },
      ],
    };
    await request("list", "customer-a", {
      kind: "list",
      requests: [current()],
    });
    await request("list", "customer-b", { kind: "list", requests: [other] });
    await request("list", "staff", {
      kind: "list",
      requests: [current(), other],
    });
    for (const kind of ["detail", "history"] as const) {
      await request(kind, "staff", { kind, snapshot: other }, other.id);
      await denied(kind, "customer-b", 404, "not_found");
    }
    await readBack("staff");
    // Every customer-authorized record command is ownership checked, even stale replay.
    for (const kind of ["update", "reply", "reopen", "cancel"] as const) {
      const version =
        kind === "update"
          ? 1
          : kind === "reply"
            ? 4
            : kind === "reopen"
              ? 6
              : 9;
      await denied(
        kind,
        "customer-b",
        404,
        "not_found",
        bodyFor(version),
        key(version),
      );
    }
    for (const version of [0, 1, 5]) {
      const result = await request(
        actions[version]!,
        staffVersions.has(version) ? "staff" : "customer-a",
        {
          kind: "mutation",
          owner: "customer-a",
          version,
          event: events[version]!,
        },
        version === 0 ? undefined : id,
        bodyFor(version),
        key(version),
      );
      if (
        result.status !== receipts[version]!.status ||
        result.recordId !== receipts[version]!.recordId ||
        result.customerRequestsEventId !== receipts[version]!.eventId ||
        result.customerRequestsResponseDigest !== receipts[version]!.digest
      )
        throw Error();
    }
    await readBack();
    await denied(
      "update",
      "customer-a",
      409,
      "idempotency_conflict",
      { ...bodyFor(1), reason: "Verifier changed reason" },
      key(1),
    );
    await denied("reply", "customer-a", 409, "version_conflict", {
      expectedVersion: 0,
      message: "Verifier stale reply",
      correctsVersion: null,
    });
    await denied("reply", "customer-a", 409, "state_conflict", {
      expectedVersion: 9,
      message: "Verifier terminal reply",
      correctsVersion: null,
    });
    for (const [kind, version] of [
      ["create", 0],
      ["update", 1],
      ["reopen", 6],
      ["cancel", 9],
    ] as const)
      await denied(kind, "staff", 403, "forbidden", bodyFor(version));
    await denied("complete", "customer-a", 403, "forbidden", bodyFor(5));
    await readBack();
    return evidence(true);
  } catch {
    return evidence(false);
  }
}
