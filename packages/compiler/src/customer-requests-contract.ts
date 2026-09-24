import { fileURLToPath } from "node:url";
import { createVerifiedCapabilityCompositionLock } from "@factory/capabilities/node";
import { isDeepStrictEqual } from "node:util";
import type { CapabilityCompositionLockV1 } from "@factory/capabilities";
import {
  applicationGraphSchema,
  assertValidApplicationGraph,
  matchCustomerRequestsGraphV1,
  hashApplicationGraph,
  type ApplicationGraphV1,
} from "@factory/graph";

/** Private, detached compilation contract. Computed only from complete Graph and physical locks. */
export interface CustomerRequestsProfile {
  readonly key: "customer-requests";
  readonly version: "1.0.0";
  readonly graphHash: string;
  readonly requestEntity: string;
  readonly historyEntity: string;
  readonly principalEntity: string;
  readonly sessionEntity: string;
  readonly workflow: string;
  readonly roles: Readonly<{ staff: string; customer: string }>;
  readonly pages: Readonly<{
    list: string;
    form: string;
    detail: string;
    queue: string;
  }>;
  readonly reference: Readonly<{
    blueprint: "request";
    storage: "requestId";
    api: "request";
  }>;
  readonly requestVersionMaximum: 2147483647;
  readonly subjectMaximum: 160;
  readonly descriptionMaximum: 2000;
  readonly messageMaximum: 2000;
  readonly reasonMaximum: 500;
  readonly resolutionMessageMaximum: 2000;
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
  throw new Error("Unsupported Customer Requests profile.");
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
/** Distinct owner/history coordinates or reply identify near-matches; labels never do. */
function candidate(graph: unknown): boolean {
  const entities = items(own(own(graph, "domain"), "entities"));
  if (
    entities.some((entity) => {
      const fields = new Set(
        items(own(entity, "fields")).map((field) => own(field, "key")),
      );
      return (
        fields.has("customerPrincipalId") ||
        fields.has("correctsVersion") ||
        ((fields.has("requestId") || fields.has("request")) &&
          (fields.has("requestVersion") || fields.has("actorPrincipalId"))) ||
        (fields.has("requestVersion") && fields.has("actorPrincipalId"))
      );
    })
  )
    return true;
  const verbs = ["reply"];
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
/** Structural selection over the actual Published Graph plus its separate verified lock. */
export function selectCustomerRequestsProfile(
  graph: ApplicationGraphV1,
  compositionLock?: CapabilityCompositionLockV1,
): CustomerRequestsProfile | undefined {
  try {
    if (!candidate(graph)) return undefined;
    assertOwnJson(graph);
    if (!compositionLock) reject();
    assertOwnJson(compositionLock);
    // The shared Graph schema strips unknown keys. Require lossless parsing here.
    equal(
      JSON.parse(JSON.stringify(applicationGraphSchema.parse(graph))),
      JSON.parse(JSON.stringify(graph)),
    );
    assertValidApplicationGraph(graph);
    const graphHash = hashApplicationGraph(graph);
    const witness = matchCustomerRequestsGraphV1(graph);
    if (!witness || Object.hasOwn(graph.integration, "compositionSelections"))
      reject();
    const {
      requestEntity,
      historyEntity,
      workflow,
      roles: { staff, customer },
      pages,
    } = witness;
    const principal = `${graph.metadata.id}-principal`;
    const session = `${graph.metadata.id}-session`;
    const symbol = (model: string, key: string) => ({
      graphSymbol: `graph.${model}.${key}`,
    });
    const bindings: Record<
      string,
      CapabilityCompositionLockV1["packages"][number]["bindings"]
    > = {
      "core.crud": {
        entityKey: symbol("domain", requestEntity),
        routeKey: symbol("page", pages.list),
      },
      "core.workflow": { flowKey: symbol("flow", workflow) },
      "core.identity-policy": {
        principalEntity: symbol("domain", principal),
        sessionEntity: symbol("domain", session),
        defaultRole: symbol("policy", staff),
        authenticatedRole: symbol("policy", customer),
      },
      // Existing owner-aware composer chooses the first actor when there is no approval decision.
      "core.audit": { actorRole: symbol("policy", staff) },
      "core.notification": { recipientRole: symbol("policy", staff) },
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
    // Re-resolution verifies packages, manifests, dependency closure, bindings and the complete lock digest.
    // Both plain and null-prototype own JSON objects are allowed above. A
    // persistence round trip removes the resolver's null prototypes, so compare
    // their JSON values only after the incoming lock passed assertOwnJson.
    equal(
      JSON.parse(JSON.stringify(compositionLock)),
      JSON.parse(JSON.stringify(expectedLock)),
    );
    return Object.freeze({
      key: "customer-requests",
      version: "1.0.0",
      graphHash,
      requestEntity: requestEntity,
      historyEntity: historyEntity,
      principalEntity: principal,
      sessionEntity: session,
      workflow: workflow,
      roles: Object.freeze({ staff, customer }),
      pages: Object.freeze(pages),
      reference: Object.freeze({
        blueprint: "request",
        storage: "requestId",
        api: "request",
      } as const),
      requestVersionMaximum: 2147483647,
      subjectMaximum: 160,
      descriptionMaximum: 2000,
      messageMaximum: 2000,
      reasonMaximum: 500,
      resolutionMessageMaximum: 2000,
    });
  } catch {
    return reject();
  }
}
