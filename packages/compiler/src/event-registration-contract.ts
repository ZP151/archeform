import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { createVerifiedCapabilityCompositionLock } from "@factory/capabilities/node";
import type { CapabilityCompositionLockV1 } from "@factory/capabilities";
import {
  applicationGraphSchema,
  assertValidApplicationGraph,
  matchEventRegistrationGraphV1,
  hashApplicationGraph,
  type ApplicationGraphV1,
} from "@factory/graph";

/** Detached compiler coordinates; only exact Graph and verified physical locks can produce this value. */
export interface EventRegistrationProfile {
  readonly key: "event-registration";
  readonly version: "1.0.0";
  readonly graphHash: string;
  readonly eventEntity: string;
  readonly registrationEntity: string;
  readonly eventHistoryEntity: string;
  readonly registrationHistoryEntity: string;
  readonly principalEntity: string;
  readonly sessionEntity: string;
  readonly eventWorkflow: string;
  readonly registrationWorkflow: string;
  readonly roles: Readonly<{ organizer: string; attendee: string }>;
  readonly pages: Readonly<{
    list: string;
    form: string;
    detail: string;
    myPlaces: string;
    attendees: string;
  }>;
  readonly references: Readonly<{
    event: Readonly<{ blueprint: "event"; storage: "eventId"; api: "event" }>;
    registration: Readonly<{
      blueprint: "registration";
      storage: "registrationId";
      api: "registration";
    }>;
  }>;
  readonly versionMaximum: 2147483647;
  readonly capacityMaximum: 1000000;
  readonly titleMaximum: 160;
  readonly venueMaximum: 200;
  readonly attendeeNameMaximum: 120;
  readonly descriptionMaximum: 2000;
  readonly reasonMaximum: 500;
}
const locks = [
  [
    "core.crud",
    "1.0.1",
    "8dede9ba8d63bea9b09c7bf7ac6ce784c52595b644d03eca52ea6996a31882d1",
  ],
  [
    "core.workflow",
    "1.0.1",
    "16ebf7d8128f30e656d7c86e39ef36323991cf7af7ea18a5d81a3ac0e4c06884",
  ],
  [
    "core.identity-policy",
    "1.0.0",
    "a216444b219f00431820a0df8e2bc3b604296430beb8fa6549f1b40c92025d82",
  ],
  [
    "core.policy-declarations",
    "1.0.0",
    "56e6ead5aaa6e9f5fe9cf7c608b6b51b16064964cf95cd123bdc3e0725642c54",
  ],
  [
    "core.audit",
    "1.0.2",
    "fe6616252c7b44efe61d516d305e689f3f593d70d5287baac31b5f31013addc8",
  ],
  [
    "core.notification",
    "1.1.1",
    "207eaa0fd719013129ba84bd8f66f82219b619ee1f5c9e2d4e3d896c339e6132",
  ],
] as const;

function reject(): never {
  throw new Error("Unsupported Event Registration profile.");
}
function equal(actual: unknown, expected: unknown): void {
  if (!isDeepStrictEqual(actual, expected)) reject();
}

/** Reject accessors, inherited data and cycles before schema parsing can read them. */
function assertOwnJson(
  value: unknown,
  ancestors = new Set<object>(),
  budget = { nodes: 0 },
): void {
  if (++budget.nodes > 50000 || ancestors.size > 64) reject();
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return;
  if (typeof value === "number" && Number.isFinite(value)) return;
  if (typeof value !== "object" || ancestors.has(value)) reject();
  const array = Array.isArray(value);
  if (
    Object.getPrototypeOf(value) !==
      (array ? Array.prototype : Object.prototype) &&
    Object.getPrototypeOf(value) !== null
  )
    reject();
  ancestors.add(value);
  const keys = Reflect.ownKeys(value);
  if (array && keys.length !== (value as unknown[]).length + 1) reject();
  for (const key of keys) {
    if (array && key === "length") continue;
    if (
      typeof key !== "string" ||
      ["__proto__", "constructor", "prototype"].includes(key)
    )
      reject();
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
    if (!descriptor.enumerable || !("value" in descriptor)) reject();
    assertOwnJson(descriptor.value, ancestors, budget);
  }
  ancestors.delete(value);
}

function own(value: unknown, key: string): unknown {
  if (!value || typeof value !== "object") return undefined;
  // Read descriptors only, including inherited data solely to detect a candidate
  // that the subsequent own-JSON check must reject. Never execute an accessor.
  let current: object | null = value;
  for (let depth = 0; current !== null; depth++) {
    if (depth > 64) reject();
    const descriptor = Object.getOwnPropertyDescriptor(current, key);
    if (descriptor) {
      if (!("value" in descriptor)) reject();
      return descriptor.value;
    }
    current = Object.getPrototypeOf(current) as object | null;
  }
  return undefined;
}
function items(value: unknown): unknown[] {
  if (!Array.isArray(value)) return [];
  if (value.length > 10000) reject();
  return Array.from({ length: value.length }, (_, index) =>
    own(value, String(index)),
  );
}

/** Read descriptors only; distinct owner/history/capacity coordinates and attendance verbs identify near-matches. */
function candidate(graph: unknown): boolean {
  if (
    items(own(own(graph, "domain"), "entities")).some((entity) => {
      const fields = new Set(
        items(own(entity, "fields")).map((field) => own(field, "key")),
      );
      return (
        [
          "startUtc",
          "endUtc",
          "capacity",
          "cancellationReason",
          "cancelledAt",
        ].every((key) => fields.has(key)) ||
        [
          "attendeePrincipalId",
          "reservedSeats",
          "eventVersion",
          "registrationVersion",
        ].some((key) => fields.has(key)) ||
        ((fields.has("event") ||
          fields.has("eventId") ||
          fields.has("registration") ||
          fields.has("registrationId")) &&
          fields.has("actorPrincipalId"))
      );
    })
  )
    return true;
  const verbs = ["check-in", "undo-check-in"];
  return (
    items(own(own(graph, "policy"), "permissions")).some((permission) =>
      items(own(permission, "actions")).some((action) =>
        verbs.includes(action as string),
      ),
    ) ||
    items(own(own(graph, "flow"), "flows")).some(
      (flow) =>
        items(own(flow, "events")).some((event) =>
          verbs.includes(event as string),
        ) ||
        items(own(flow, "transitions")).some((transition) =>
          verbs.includes(own(transition, "event") as string),
        ),
    )
  );
}
export function selectEventRegistrationProfile(
  graph: ApplicationGraphV1,
  compositionLock?: CapabilityCompositionLockV1,
): EventRegistrationProfile | undefined {
  try {
    if (!candidate(graph)) return undefined;
    assertOwnJson(graph);
    if (!compositionLock) reject();
    assertOwnJson(compositionLock);
    equal(
      JSON.parse(JSON.stringify(applicationGraphSchema.parse(graph))),
      JSON.parse(JSON.stringify(graph)),
    );
    assertValidApplicationGraph(graph);
    const witness = matchEventRegistrationGraphV1(graph);
    if (!witness || Object.hasOwn(graph.integration, "compositionSelections"))
      reject();
    const graphHash = hashApplicationGraph(graph);
    const {
      eventEntity,
      registrationEntity,
      eventHistoryEntity,
      registrationHistoryEntity,
      principalEntity,
      sessionEntity,
      eventWorkflow,
      registrationWorkflow,
      roles,
      pages,
    } = witness;
    const symbol = (model: string, key: string) => ({
      graphSymbol: `graph.${model}.${key}`,
    });
    const bindings: Record<
      string,
      CapabilityCompositionLockV1["packages"][number]["bindings"]
    > = {
      "core.crud": {
        entityKey: symbol("domain", eventEntity),
        routeKey: symbol("page", pages.list),
      },
      "core.workflow": { flowKey: symbol("flow", eventWorkflow) },
      "core.identity-policy": {
        principalEntity: symbol("domain", principalEntity),
        sessionEntity: symbol("domain", sessionEntity),
        defaultRole: symbol("policy", roles.organizer),
        authenticatedRole: symbol("policy", roles.attendee),
      },
      "core.audit": { actorRole: symbol("policy", roles.organizer) },
      "core.notification": { recipientRole: symbol("policy", roles.organizer) },
      "core.policy-declarations": {},
    };
    const expectedLock = createVerifiedCapabilityCompositionLock(
      {
        graphChecksum: graphHash,
        selections: locks.map(([key, version, digest]) => ({
          lock: {
            key,
            version,
            packageRoot: `packages/capabilities/assets/${key}/${version}`,
            manifestDigest: `sha256:${digest}`,
            lifecycle: "golden",
          },
          bindings: bindings[key]!,
        })),
      },
      fileURLToPath(new URL("../../../", import.meta.url)),
    );
    equal(
      JSON.parse(JSON.stringify(compositionLock)),
      JSON.parse(JSON.stringify(expectedLock)),
    );
    return Object.freeze({
      key: "event-registration",
      version: "1.0.0",
      graphHash,
      eventEntity,
      registrationEntity,
      eventHistoryEntity,
      registrationHistoryEntity,
      principalEntity,
      sessionEntity,
      eventWorkflow,
      registrationWorkflow,
      roles: Object.freeze({ ...roles }),
      pages: Object.freeze({ ...pages }),
      references: Object.freeze({
        event: Object.freeze({
          blueprint: "event",
          storage: "eventId",
          api: "event",
        } as const),
        registration: Object.freeze({
          blueprint: "registration",
          storage: "registrationId",
          api: "registration",
        } as const),
      }),
      versionMaximum: 2147483647,
      capacityMaximum: 1000000,
      titleMaximum: 160,
      venueMaximum: 200,
      attendeeNameMaximum: 120,
      descriptionMaximum: 2000,
      reasonMaximum: 500,
    });
  } catch {
    return reject();
  }
}
