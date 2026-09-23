import { isDeepStrictEqual } from "node:util";
import {
  createCapabilityCompositionLock,
  type CapabilityCompositionLockV1,
} from "@factory/capabilities";
import {
  applicationGraphSchema,
  hashApplicationGraph,
  type ApplicationGraphV1,
} from "@factory/graph";

/** Compiler-private, detached witness shared by directory emitters. Never a public admission bypass. */
export interface ContentDirectoryProfile {
  readonly key: "content-directory";
  readonly version: "1.0.0";
  readonly graphHash: string;
  readonly entity: string;
  readonly workflow: string;
  readonly fields: Readonly<{
    title: "title";
    summary: "summary";
    body: "body";
    category: "category";
    status: "status";
  }>;
  readonly roles: Readonly<{ reader: string; curator: string }>;
  readonly pages: Readonly<{ list: string; form: string; detail: string }>;
  readonly categories: readonly string[];
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
  throw new Error("Unsupported Content/Directory profile.");
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
function visibilityStates(value: unknown): boolean {
  const states = items(value);
  return states.includes("hidden") && states.includes("listed");
}
/** Either reserved business slots or the two-state visibility vocabulary marks a candidate.
 * Single generic fields/states, titles and package presence never do. Inspect only own
 * data descriptors so unrelated Graphs keep their existing optional-undefined semantics.
 */
function candidate(graph: unknown): boolean {
  return (
    items(own(own(graph, "domain"), "entities")).some((entity) => {
      const fields = items(own(entity, "fields"));
      const keys = new Set(fields.map((field) => own(field, "key")));
      return (
        ["title", "summary", "body", "category"].every((key) =>
          keys.has(key),
        ) ||
        fields.some(
          (field) =>
            own(field, "key") === "status" &&
            visibilityStates(own(field, "values")),
        )
      );
    }) ||
    items(own(own(graph, "flow"), "flows")).some((flow) =>
      visibilityStates(own(flow, "states")),
    )
  );
}

function validText(
  value: unknown,
  maximum: number,
  multiline = false,
): value is string {
  return (
    typeof value === "string" &&
    value === value.trim() &&
    value.length >= 1 &&
    value.length <= maximum &&
    !(
      multiline
        ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/
        : /[\u0000-\u001f\u007f]/
    ).test(value)
  );
}

/** ADR-0074 FAM-004: literal ECMAScript Unicode simple folding after trim/NFC. */
function hasDuplicateCategories(categories: readonly string[]): boolean {
  const normalized = categories.map((value) => value.trim().normalize("NFC"));
  return normalized.some((value, index) => {
    const literal = value.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
    const pattern = new RegExp(`^(?:${literal})$`, "iu");
    return normalized.slice(index + 1).some((other) => pattern.test(other));
  });
}

/** Structural selection over the actual Published Graph plus its separate verified lock. */
export function selectContentDirectoryProfile(
  graph: ApplicationGraphV1,
  compositionLock?: CapabilityCompositionLockV1,
): ContentDirectoryProfile | undefined {
  try {
    if (!candidate(graph)) return undefined;
    assertOwnJson(graph);
    if (!compositionLock) reject();
    assertOwnJson(compositionLock);
    // The shared Graph schema strips unknown keys. Require lossless parsing here.
    equal(applicationGraphSchema.parse(graph), graph);
    const graphHash = hashApplicationGraph(graph);
    equal(graph.integration, {
      providers: [],
      capabilities: [
        {
          key: "identity.context.resolve",
          providerId: "factory",
          operation: "resolve",
        },
        {
          key: "authorization.decision",
          providerId: "factory",
          operation: "decision",
        },
      ],
    });
    if (
      graph.policy.roles.length !== 2 ||
      new Set(graph.policy.roles).size !== 2
    )
      reject();
    const [reader, curator] = graph.policy.roles as [string, string];
    const principal = `${graph.metadata.id}-principal`;
    const session = `${graph.metadata.id}-session`;
    const business = graph.domain.entities.filter(
      (entity) => entity.key !== principal && entity.key !== session,
    );
    if (graph.domain.entities.length !== 3 || business.length !== 1) reject();
    const entity = business[0]!;
    const categories = entity.fields.find(
      (field) => field.key === "category",
    )?.values;
    if (
      !categories ||
      categories.length < 2 ||
      categories.length > 12 ||
      categories.some((value) => !validText(value, 40)) ||
      hasDuplicateCategories(categories)
    )
      reject();
    equal(entity.fields, [
      { key: "title", type: "string", required: true },
      { key: "summary", type: "string", required: true },
      { key: "body", type: "text", required: true },
      { key: "category", type: "enum", required: true, values: categories },
      {
        key: "status",
        type: "enum",
        required: true,
        values: ["hidden", "listed"],
      },
    ]);
    equal(entity.indexes, [{ fields: ["status"] }]);
    const identity = graph.domain.entities.find(
      (item) => item.key === principal,
    );
    const sessions = graph.domain.entities.find((item) => item.key === session);
    if (!identity || !sessions) reject();
    equal(identity.fields, [
      { key: "subjectRef", type: "string", required: true, unique: true },
      { key: "role", type: "enum", required: true, values: [reader, curator] },
      { key: "active", type: "boolean", required: true },
    ]);
    equal(identity.indexes, [{ fields: ["active"] }]);
    equal(sessions.fields, [
      { key: "subjectRef", type: "string", required: true },
      {
        key: "status",
        type: "enum",
        required: true,
        values: ["active", "expired"],
      },
      { key: "expiresAt", type: "datetime", required: true },
    ]);
    equal(sessions.indexes, [{ fields: ["subjectRef", "status"] }]);
    equal(graph.domain.relations, [
      {
        from: session,
        to: principal,
        kind: "many-to-one",
        field: "subjectRef",
      },
    ]);
    equal(graph.policy.permissions, [
      { role: reader, resource: entity.key, actions: ["read"] },
      { role: reader, resource: principal, actions: ["read"] },
      {
        role: reader,
        resource: session,
        actions: ["create", "read", "update"],
      },
      {
        role: curator,
        resource: entity.key,
        actions: ["create", "read", "update", "submit", "cancel"],
      },
      { role: curator, resource: principal, actions: ["read"] },
      { role: curator, resource: session, actions: ["read"] },
    ]);
    const flow = graph.flow.flows[0];
    if (!flow) reject();
    equal(graph.flow.flows, [
      {
        id: flow.id,
        entity: entity.key,
        initialState: "hidden",
        states: ["hidden", "listed"],
        events: ["submit", "cancel"],
        transitions: [
          { from: "hidden", event: "submit", to: "listed", roles: [curator] },
          { from: "listed", event: "cancel", to: "hidden", roles: [curator] },
        ],
      },
    ]);
    if (graph.page.pages.length !== 3) reject();
    const pages = {} as { list: string; form: string; detail: string };
    for (const intent of ["list", "form", "detail"] as const) {
      const page = graph.page.pages.find(
        (item) => item.blocks[0]?.type === intent,
      );
      if (!page) reject();
      equal(page, {
        id: page.id,
        route: `/${page.id}`,
        title: page.title,
        blocks: [
          { id: `${page.id}-${intent}`, type: intent, entity: entity.key },
        ],
      });
      pages[intent] = page.id;
    }
    const list = graph.page.pages.find((page) => page.id === pages.list)!;
    equal(graph.page.navigation, [
      {
        id: `nav-${list.id}`,
        label: list.title,
        pageId: list.id,
        icon: "list",
      },
    ]);
    for (const seed of graph.domain.seedData ?? []) {
      const values = seed.values;
      if (
        seed.entity !== entity.key ||
        !validText(values.title, 120) ||
        !validText(values.summary, 280) ||
        !validText(values.body, 12000, true) ||
        !categories.includes(values.category as string) ||
        !["hidden", "listed"].includes(values.status as string)
      )
        reject();
      equal(Object.keys(values).sort(), [
        "body",
        "category",
        "status",
        "summary",
        "title",
      ]);
    }
    const symbol = (model: string, key: string) => ({
      graphSymbol: `graph.${model}.${key}`,
    });
    const bindings: Record<
      string,
      CapabilityCompositionLockV1["packages"][number]["bindings"]
    > = {
      "core.crud": {
        entityKey: symbol("domain", entity.key),
        routeKey: symbol("page", pages.list),
      },
      "core.workflow": { flowKey: symbol("flow", flow.id) },
      "core.identity-policy": {
        principalEntity: symbol("domain", principal),
        sessionEntity: symbol("domain", session),
        defaultRole: symbol("policy", reader),
        authenticatedRole: symbol("policy", curator),
      },
      // Existing owner-aware composer chooses the first actor when there is no approval decision.
      "core.audit": { actorRole: symbol("policy", reader) },
      "core.notification": { recipientRole: symbol("policy", reader) },
      "core.policy-declarations": {},
    };
    const expectedLock = createCapabilityCompositionLock({
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
    });
    // Re-resolution verifies packages, manifests, dependency closure, bindings and the complete lock digest.
    equal(compositionLock, expectedLock);
    return Object.freeze({
      key: "content-directory",
      version: "1.0.0",
      graphHash,
      entity: entity.key,
      workflow: flow.id,
      fields: Object.freeze({
        title: "title",
        summary: "summary",
        body: "body",
        category: "category",
        status: "status",
      } as const),
      roles: Object.freeze({ reader, curator }),
      pages: Object.freeze(pages),
      categories: Object.freeze([...categories]),
    });
  } catch {
    return reject();
  }
}
