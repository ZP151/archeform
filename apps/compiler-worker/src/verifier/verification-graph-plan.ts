import { isDeepStrictEqual } from "node:util";
import { createHash } from "node:crypto";

import type { PublishedGraphInput } from "@factory/compiler";
import {
  VerificationContractError,
  hashApplicationGraph,
  type ApplicationGraphV1,
} from "@factory/graph";

import type { VerificationStepPlanEntry } from "./verification-lifecycle.js";
import {
  type ChainJourneyStep,
  type IdempotencyJourneyFixture,
  type RegisteredApiAction,
  type RoleJourneyFixture,
} from "./role-journey.js";
import type { VerificationProfile } from "./verification-profiles.js";

/**
 * The graph-derived verification plan. When a verification run carries no
 * profile key, the worker derives the deterministic step plan, fixture
 * journeys, and API registry from the Published Graph itself, so ANY composed
 * product (not just the three static acceptance profiles) advances through
 * the same isolated verification lifecycle.
 *
 * The derivation mirrors the generated runtime's contracts exactly:
 *
 * - Every composed product locks `core.identity-policy` (a catalogue
 *   requirement), so the generated API resolves principals from
 *   `x-factory-fixture-session` (`fixture-session-<role>` per policy role)
 *   and denies 403 without a session; journeys carry that session.
 * - Routes are deterministic: `POST /api/:entity` (create, 201), `GET
 *   /api/:entity/:recordId` (read, 200), and `POST
 *   /api/:entity/:recordId/events/:event` (transition, 201), with every
 *   runtime rejection mapped to 403.
 * - The composed seed renders `sample-<entity>` records in the flow's
 *   initialState (product-composer `derivedSeedData`), so transitions run
 *   against the seeded record: the first transition that makes progress is
 *   exercised as the idempotency probe (the byte-identical replay is
 *   rejected once the record left the initial state), and the denial targets
 *   the first transition with a role that is not allowed (falling back to an
 *   anonymous request, which the identity policy denies by default).
 * - Branching transitions (approve AND reject) cannot both drive the seeded
 *   record — the first leaves the other's source state — so every transition
 *   after the idempotency probe runs as a chain journey on its own fresh
 *   record: the chain creates the record, walks the shortest path from the
 *   initial state to the transition's source state, then drives the
 *   transition itself. Each step carries the role the flow allows for it,
 *   and the create response's bounded `id` addresses the fresh record (the
 *   id is pattern-validated, never persisted, never evidenced).
 * - Create bodies supply every required field with a type-derived value
 *   (the generated create handler fails closed on missing required fields);
 *   `status` and (for commerce order entities) `version` are runtime-supplied
 *   and never declared. A required foreign-key scalar binds to the seeded
 *   target record (an id-referencing relation binds the seeded target id, a
 *   natural-key relation binds the seeded target value); a required
 *   reference that cannot bind — the derived identity session references a
 *   principal nothing seeds and no role may create — omits that create
 *   journey honestly instead of claiming undrivable evidence.
 *
 * Derivation is a pure function of the Published Graph + composition lock:
 * identical inputs derive identical plans. Everything the derivation cannot
 * verify honestly fails closed (a malformed graph, an enum without declared
 * values, a step-ID collision) or is simply omitted from the plan (a
 * transition the derivation cannot drive, e.g. commerce order semantics).
 */

type CompositionLock = PublishedGraphInput["compositionLock"];
type Permissions = ApplicationGraphV1["policy"]["permissions"];

const identityPolicyCapabilityKey = "core.identity-policy";
const commerceOrderCapabilityKey = "commerce.order";
const maximumStepPlanLength = 99;

const domainEntityBinding = /^graph\.domain\.([a-z][a-z0-9-]*)$/;

/**
 * The entity a locked commerce order handler drives. Order transitions
 * require expected-version + idempotency-key semantics over versioned
 * records, which the generic derived journeys cannot drive faithfully; the
 * derivation therefore omits order-entity transitions (create/read evidence
 * is still derived through the generic routes).
 */
function orderEntityKeyOf(lock: CompositionLock): string | undefined {
  const selection = lock.packages.find(
    ({ lock: asset }) => asset.key === commerceOrderCapabilityKey,
  );
  const binding = selection?.bindings?.orderEntity;
  if (
    !binding ||
    typeof binding !== "object" ||
    !("graphSymbol" in binding) ||
    typeof binding.graphSymbol !== "string"
  ) {
    return undefined;
  }
  const match = domainEntityBinding.exec(binding.graphSymbol);
  return match?.[1];
}

/** The generated API is session-bound exactly when identity policy is locked. */
function isSessionBound(lock: CompositionLock): boolean {
  return lock.packages.some(
    ({ lock: asset }) => asset.key === identityPolicyCapabilityKey,
  );
}

function can(
  permissions: Permissions,
  role: string,
  entityKey: string,
  action: string,
): boolean {
  return permissions.some(
    (permission) =>
      permission.role === role &&
      (permission.resource === entityKey || permission.resource === "*") &&
      permission.actions.includes(action),
  );
}

function firstRoleWith(
  roles: readonly string[],
  permissions: Permissions,
  entityKey: string,
  action: string,
): string | undefined {
  return roles.find((role) => can(permissions, role, entityKey, action));
}

/**
 * The seeded record ID the generated app renders for one entity
 * (`sample-<entity>` for composed products). Reads and transitions target
 * this deterministic record; without a seed entry the derivation omits the
 * journeys that would depend on it rather than claim unverifiable evidence.
 */
function seedRecordId(
  graph: ApplicationGraphV1,
  entityKey: string,
): string | undefined {
  const seeds = graph.domain.seedData ?? [];
  const index = seeds.findIndex((seed) => seed.entity === entityKey);
  if (index < 0) return undefined;
  return seeds[index].id ?? `seed-${entityKey}-${index + 1}`;
}

/**
 * A type-derived create value, distinct from the seed's `Sample …` values so
 * a created record never shadows the seeded one. Values only need to be
 * JSON-serializable: the generated create handler validates presence of
 * required fields, not their types. Graph fields carry no labels, so values
 * name the field key.
 */
function derivedCreateValue(
  entityKey: string,
  field: ApplicationGraphV1["domain"]["entities"][number]["fields"][number],
): string | number | boolean | Record<string, unknown> {
  switch (field.type) {
    case "string":
      return `Verifier ${field.key}`;
    case "text":
      return `Verifier ${field.key} detail`;
    case "integer":
      return 7;
    case "decimal":
      return 37.5;
    case "boolean":
      return false;
    case "date":
      // The generated create handler writes through Prisma, whose DateTime
      // parser rejects a date-only value ("premature end of input. Expected
      // ISO-8601 DateTime.") — the same contract the database target renders.
      return "2026-09-01T00:00:00.000Z";
    case "datetime":
      return "2026-09-01T09:00:00Z";
    case "enum":
      if (field.values === undefined || field.values.length === 0) {
        throw new VerificationContractError(
          `Graph entity '${entityKey}' declares an enum field without values.`,
        );
      }
      return field.values[0];
    case "json":
      return { verifier: true };
    case "url":
      return "https://verifier.example.invalid";
    case "email":
      return "verifier@example.invalid";
    default:
      throw new VerificationContractError(
        `Graph entity field type '${field.type}' is not schema-declared.`,
      );
  }
}

function createBodyFor(
  graph: ApplicationGraphV1,
  entity: ApplicationGraphV1["domain"]["entities"][number],
  hasFlow: boolean,
  isOrderEntity: boolean,
): string | undefined {
  const required = requiredCreateFields(entity, hasFlow, isOrderEntity);
  if (required.length === 0) return undefined;
  const body: Record<string, unknown> = {};
  for (const field of required) {
    body[field.key] =
      foreignKeyValue(graph, entity.key, field.key) ??
      derivedCreateValue(entity.key, field);
  }
  return JSON.stringify(body);
}

function requiredCreateFields(
  entity: ApplicationGraphV1["domain"]["entities"][number],
  hasFlow: boolean,
  isOrderEntity: boolean,
): ApplicationGraphV1["domain"]["entities"][number]["fields"] {
  return entity.fields.filter(
    (field) =>
      field.required &&
      !(field.key === "status" && hasFlow) &&
      !(field.key === "version" && isOrderEntity),
  );
}

/**
 * Mirrors the database target's `resolveRelationForeignKey` for the fields a
 * generated create body must satisfy: a required scalar that owns a declared
 * relation (the composed products always declare `field`) must reference an
 * existing target record — the seeded target id for id-referencing relations,
 * the seeded target's declared value for natural-key relations. A relation
 * whose target resolves neither way leaves the create undrivable.
 */
function foreignKeyValue(
  graph: ApplicationGraphV1,
  entityKey: string,
  fieldKey: string,
): string | undefined {
  for (const relation of graph.domain.relations ?? []) {
    if (
      relation.kind === "many-to-many" ||
      relation.field !== fieldKey ||
      relation.from !== entityKey
    ) {
      continue;
    }
    const target = graph.domain.entities.find(
      (candidate) => candidate.key === relation.to,
    );
    if (target === undefined) return undefined;
    const naturalKeyCandidates = target.fields.filter(
      (field) =>
        field.unique === true &&
        relation.field!.toLowerCase().endsWith(field.key.toLowerCase()),
    );
    if (naturalKeyCandidates.length === 1) {
      const seed = (graph.domain.seedData ?? []).find(
        (candidate) => candidate.entity === relation.to,
      );
      const value = seed?.values[naturalKeyCandidates[0]!.key];
      return typeof value === "string" && value.length > 0 ? value : undefined;
    }
    return seedRecordId(graph, relation.to);
  }
  return undefined;
}

/**
 * A required create field that owns a foreign-key relation whose target
 * cannot bind leaves the create journey undrivable: the generated handler
 * would reject it with a foreign-key violation, so the derivation omits the
 * journey rather than claim failing evidence.
 */
function hasUnbindableRequiredForeignKey(
  graph: ApplicationGraphV1,
  entity: ApplicationGraphV1["domain"]["entities"][number],
  hasFlow: boolean,
  isOrderEntity: boolean,
): boolean {
  return requiredCreateFields(entity, hasFlow, isOrderEntity).some(
    (field) =>
      (graph.domain.relations ?? []).some(
        (relation) =>
          relation.kind !== "many-to-many" &&
          relation.field === field.key &&
          relation.from === entity.key,
      ) && foreignKeyValue(graph, entity.key, field.key) === undefined,
  );
}

/**
 * The shortest deterministic event path from the flow's initial state to the
 * target state (breadth-first over the declared transitions, so identical
 * flows derive identical chains). A transition whose source is unreachable
 * from the initial state, or whose path needs a step no role may drive, is
 * omitted honestly — the derivation never invents product semantics.
 */
function transitionPath(
  flow: ApplicationGraphV1["flow"]["flows"][number],
  targetState: string,
): readonly string[] | undefined {
  if (targetState === flow.initialState) return [];
  const predecessorEvent = new Map<string, string>();
  const visited = new Set<string>([flow.initialState]);
  const queue: string[] = [flow.initialState];
  while (queue.length > 0) {
    const state = queue.shift()!;
    for (const transition of flow.transitions) {
      if (transition.from !== state || transition.to === state) continue;
      if (visited.has(transition.to)) continue;
      visited.add(transition.to);
      predecessorEvent.set(transition.to, transition.event);
      if (transition.to === targetState) {
        const path: string[] = [];
        let current = targetState;
        while (current !== flow.initialState) {
          const event = predecessorEvent.get(current);
          if (event === undefined) return undefined;
          path.unshift(event);
          current = flow.transitions.find(
            (candidate) => candidate.event === event,
          )!.from;
        }
        return path;
      }
      queue.push(transition.to);
    }
  }
  return undefined;
}

/** The principal fixture for one role, in the journey's own principal kind. */
function principalFor(
  lock: CompositionLock,
  role: string,
): { sessionId: string } | { principal: string } {
  return isSessionBound(lock)
    ? { sessionId: `fixture-session-${role}` }
    : { principal: role };
}

/**
 * The chain prologue for a fresh-record journey: the create step (performed by
 * the entity's create role) followed by the shortest path from the flow's
 * initial state to the transition's source state, each step performed by the
 * role its own transition allows. Every path step resolves a `-fresh` template
 * registry action (deduplicated per entity; the natural-name static routes
 * address the seeded record). The final transition is the journey's own action
 * against a template route. Returns undefined — and the caller omits the
 * journey — when the path is unreachable, any step is unroleable, or the
 * entity's create journey is undrivable.
 */
function chainFor(
  graph: ApplicationGraphV1,
  lock: CompositionLock,
  permissions: Permissions,
  entityKey: string,
  flow: ApplicationGraphV1["flow"]["flows"][number],
  transition: ApplicationGraphV1["flow"]["flows"][number]["transitions"][number],
  createRole: string | undefined,
  createUnbindable: boolean,
  freshActions: Set<string>,
  apiRegistry: RegisteredApiAction[],
  createBody: string | undefined,
): readonly ChainJourneyStep[] | undefined {
  if (createRole === undefined || createUnbindable) return undefined;
  const path = transitionPath(flow, transition.from);
  if (path === undefined) return undefined;
  const chain: ChainJourneyStep[] = [
    {
      action: `${entityKey}.create`,
      ...(createBody === undefined ? {} : { body: createBody }),
      ...principalFor(lock, createRole),
    },
  ];
  for (const event of path) {
    const stepTransition = flow.transitions.find(
      (candidate) => candidate.event === event,
    );
    if (stepTransition === undefined) return undefined;
    const stepRoles = stepTransition.roles ?? [];
    const stepRole =
      stepRoles[0] ??
      firstRoleWith(graph.policy.roles, permissions, entityKey, "read");
    if (stepRole === undefined) return undefined;
    const freshAction = `${entityKey}.${event}-fresh`;
    if (!freshActions.has(freshAction)) {
      freshActions.add(freshAction);
      apiRegistry.push({
        action: freshAction,
        method: "POST",
        route: `/api/${entityKey}/{recordId}/events/${event}`,
        expectedStatus: 201,
      });
    }
    chain.push({ action: freshAction, ...principalFor(lock, stepRole) });
  }
  return chain;
}

function journeyFor(
  graph: ApplicationGraphV1,
  lock: CompositionLock,
  journeyId: string,
  action: string,
  role: string | undefined,
  extra: Partial<RoleJourneyFixture> = {},
): RoleJourneyFixture {
  return {
    journeyId,
    action,
    ...(role === undefined
      ? {}
      : isSessionBound(lock)
        ? { sessionId: `fixture-session-${role}` }
        : { principal: role }),
    ...extra,
  };
}

function journeyIdPattern(journeyId: string): void {
  if (!/^[a-z0-9-]{1,64}$/.test(journeyId)) {
    throw new VerificationContractError(
      `Derived journey '${journeyId}' is not a bounded fixture identifier.`,
    );
  }
}

/**
 * Derives the verification profile for one Published Graph. The profile key
 * binds the plan to the graph identity (`graph-<metadata id>`, digest-bounded
 * when the id is too long for the contract), so the evidence names exactly
 * the plan that produced it.
 */
export function deriveVerificationProfile(
  graph: ApplicationGraphV1,
  lock: CompositionLock,
): VerificationProfile {
  if (
    !graph ||
    typeof graph !== "object" ||
    !Array.isArray(graph.domain.entities) ||
    graph.domain.entities.length === 0 ||
    !Array.isArray(graph.policy.roles) ||
    graph.policy.roles.length === 0 ||
    !graph.metadata ||
    typeof graph.metadata.id !== "string"
  ) {
    throw new VerificationContractError(
      "Graph-derived verification requires a Published Graph with entities and roles.",
    );
  }

  let correctionEntity: string | undefined;
  try {
    if (
      lock.applicationGraphChecksum === hashApplicationGraph(graph) &&
      (graph.integration.compositionSelections === undefined ||
        canonicalProtocol(
          [...lock.packages].sort((a, b) =>
            a.lock.key.localeCompare(b.lock.key),
          ),
        ) ===
          canonicalProtocol(
            [...(graph.integration.compositionSelections ?? [])].sort((a, b) =>
              a.lock.key.localeCompare(b.lock.key),
            ),
          ))
    )
      correctionEntity = approvalProtocolEntity(graph, lock.packages);
  } catch {
    /* Unsupported profiles retain their existing protocol. */
  }
  let taskEntity: string | undefined;
  try {
    taskEntity = taskProtocolEntity(graph, lock);
  } catch {
    /* Compilation rejects malformed Task candidates before verification. */
  }
  const sessionBound = isSessionBound(lock);
  const orderEntityKey = orderEntityKeyOf(lock);
  const permissions = graph.policy.permissions;
  const flows = graph.flow.flows.map((flow) =>
    flow.entity === taskEntity
      ? {
          ...flow,
          transitions: [...flow.transitions].sort(
            (a, b) =>
              ["start", "complete", "reopen"].indexOf(a.event) -
              ["start", "complete", "reopen"].indexOf(b.event),
          ),
        }
      : flow,
  );
  const stepPlan: VerificationStepPlanEntry[] = [
    { stepId: "migration", kind: "migration" },
    { stepId: "health", kind: "health" },
  ];
  const journeys: Record<
    string,
    RoleJourneyFixture | IdempotencyJourneyFixture
  > = {};
  const apiRegistry: RegisteredApiAction[] = [];
  const stepIds = new Set<string>();

  function addStep(entry: VerificationStepPlanEntry): void {
    if (stepIds.has(entry.stepId)) {
      throw new VerificationContractError(
        `Derived verification step '${entry.stepId}' collides with another step.`,
      );
    }
    stepIds.add(entry.stepId);
    stepPlan.push(entry);
  }

  for (const entity of graph.domain.entities) {
    const entityKey = entity.key;
    const flow = flows.find((candidate) => candidate.entity === entityKey);
    const recordId = seedRecordId(graph, entityKey);
    const createRole = firstRoleWith(
      graph.policy.roles,
      permissions,
      entityKey,
      "create",
    );
    const readRole = firstRoleWith(
      graph.policy.roles,
      permissions,
      entityKey,
      "read",
    );
    const hasFlow = flow !== undefined;
    const isOrderEntity = entityKey === orderEntityKey;
    // The derived identity session entity owns an unbindable required foreign
    // key (its subjectRef references principals nothing seeds and no role may
    // create): the create journey and its registry action are omitted honestly
    // instead of claiming evidence the generated handler rejects.
    const createUnbindable = hasUnbindableRequiredForeignKey(
      graph,
      entity,
      hasFlow,
      isOrderEntity,
    );

    // Generic routes are deterministic for every entity.
    apiRegistry.push({
      action: `${entityKey}.list`,
      method: "GET",
      route: `/api/${entityKey}`,
      expectedStatus: 200,
    });
    if (
      createRole !== undefined &&
      !createUnbindable &&
      (!taskEntity || entityKey === taskEntity)
    ) {
      const journeyId = `${entityKey}-create`;
      journeyIdPattern(journeyId);
      addStep({ stepId: journeyId, kind: "role-journey" });
      const body = createBodyFor(graph, entity, hasFlow, isOrderEntity);
      journeys[journeyId] = journeyFor(
        graph,
        lock,
        journeyId,
        `${entityKey}.create`,
        createRole,
        body === undefined ? {} : { body },
      );
      apiRegistry.push({
        action: `${entityKey}.create`,
        method: "POST",
        route: `/api/${entityKey}`,
        expectedStatus: 201,
      });
    }
    if (readRole !== undefined && recordId !== undefined) {
      const journeyId = `${entityKey}-read`;
      journeyIdPattern(journeyId);
      addStep({ stepId: journeyId, kind: "role-journey" });
      journeys[journeyId] = journeyFor(
        graph,
        lock,
        journeyId,
        `${entityKey}.read`,
        readRole,
      );
      apiRegistry.push({
        action: `${entityKey}.read`,
        method: "GET",
        route: `/api/${entityKey}/${recordId}`,
        expectedStatus: 200,
      });
    }

    // Order entities carry version + idempotency-key semantics the generic
    // derivation cannot drive; their transitions are omitted honestly.
    if (flow === undefined || recordId === undefined || isOrderEntity) {
      continue;
    }

    // The first transition's journey decision, captured for the authorization
    // denial that mirrors it: the denial can only be probed honestly when the
    // transition journey itself was derived (its action registered; for a
    // `{recordId}` template route, the fresh-record chain to substitute).
    let firstTransitionJourney:
      | {
          readonly action: string;
          readonly chain?: readonly ChainJourneyStep[];
        }
      | undefined;

    const transitionRoles = (
      transition: ApplicationGraphV1["flow"]["flows"][number]["transitions"][number],
    ) => transition.roles ?? [];

    // One `-fresh` template action per path event: chain journeys walk a fresh
    // record through their path steps, and each path step needs its own route
    // (the natural-name static routes address the seeded record, which the
    // idempotency probe already left in the initial state). Entries dedupe
    // per entity; a path step is only registered when a journey drives it.
    const freshActions = new Set<string>();
    for (const [index, transition] of flow.transitions.entries()) {
      const roles = transitionRoles(transition);
      const role =
        roles[0] ??
        firstRoleWith(graph.policy.roles, permissions, entityKey, "read");
      if (role === undefined) continue;
      const journeyId = `${entityKey}-${transition.event}`;
      journeyIdPattern(journeyId);
      // A flow may legitimately declare a `create` transition (the blueprint
      // draws its transition events from the same bounded verbs as the grants,
      // and `create` is one of them), but the entity create journey above
      // already claims `<entity>-create`. The transition journey takes its own
      // identity and the registry registers its transition route under the
      // matching action, so both evidence sets coexist: the create handler
      // (POST /api/<entity>) and the create transition on a fresh record
      // (POST /api/<entity>/{recordId}/events/create).
      const createCollision =
        transition.event === "create" && stepIds.has(journeyId);
      const stepJourneyId = createCollision
        ? `${journeyId}-transition`
        : journeyId;
      journeyIdPattern(stepJourneyId);
      const stepAction = createCollision
        ? `${entityKey}.${transition.event}-transition`
        : `${entityKey}.${transition.event}`;
      const makesProgress = transition.from !== transition.to;
      const drivesSeededRecord =
        index === 0 && makesProgress && transition.from === flow.initialState;
      if (drivesSeededRecord) {
        // The first making-progress transition from the initial state is
        // exercised once and replayed: the seeded record leaves the initial
        // state, so the byte-identical replay is rejected — the generated
        // proof of no duplicate side effects.
        addStep({ stepId: stepJourneyId, kind: "idempotency" });
        firstTransitionJourney = { action: stepAction };
        const idempotencyKey = `verify-${entityKey}-${transition.event}-${recordId}`;
        journeys[stepJourneyId] = {
          ...journeyFor(graph, lock, stepJourneyId, stepAction, role),
          idempotencyKey,
          expectedVersion: 0,
        };
      } else {
        // A later (or non-initial) transition cannot drive the seeded record:
        // the idempotency probe already moved it past the initial state, and a
        // branch transition shares its source state with the first transition.
        // The journey creates a fresh record, walks the shortest declared path
        // to the transition's source state (each step as the role its own
        // transition allows), then drives the transition on the fresh record.
        // A path the derivation cannot drive — unreachable source state, a
        // step no role may perform, or an undrivable create — omits the
        // journey honestly rather than claim failing evidence.
        const chain = chainFor(
          graph,
          lock,
          permissions,
          entityKey,
          flow,
          transition,
          createRole,
          createUnbindable,
          freshActions,
          apiRegistry,
          createBodyFor(graph, entity, hasFlow, isOrderEntity),
        );
        if (chain === undefined) continue;
        addStep({ stepId: stepJourneyId, kind: "role-journey" });
        journeys[stepJourneyId] = journeyFor(
          graph,
          lock,
          stepJourneyId,
          stepAction,
          role,
          { chain },
        );
        if (index === 0) {
          firstTransitionJourney = { action: stepAction, chain };
        }
      }
      apiRegistry.push({
        action: stepAction,
        method: "POST",
        route: drivesSeededRecord
          ? `/api/${entityKey}/${recordId}/events/${transition.event}`
          : `/api/${entityKey}/{recordId}/events/${transition.event}`,
        expectedStatus: 201,
      });
    }

    // Authorization denial on the first transition: a role the transition
    // does not allow (the identity policy's default deny covers the case
    // where every role is allowed). The denial mirrors the journey derived
    // for the first transition — the same action, and the fresh-record chain
    // when the transition route carries a `{recordId}` template. When the
    // first transition journey could not be derived (no role, or a chain the
    // derivation cannot drive), the denial is omitted honestly: probing an
    // unregistered action or a literal template route would crash instead of
    // denying.
    if (firstTransitionJourney !== undefined) {
      const firstTransition = flow.transitions[0];
      const denialRole = graph.policy.roles.find(
        (role) => !transitionRoles(firstTransition).includes(role),
      );
      const journeyId = `${entityKey}-denied-${firstTransition.event}`;
      journeyIdPattern(journeyId);
      addStep({ stepId: journeyId, kind: "authorization-denial" });
      journeys[journeyId] = journeyFor(
        graph,
        lock,
        journeyId,
        firstTransitionJourney.action,
        denialRole,
        firstTransitionJourney.chain === undefined
          ? {}
          : { chain: firstTransitionJourney.chain },
      );
    }
  }

  if (correctionEntity) {
    const entity = graph.domain.entities.find(
      (e) => e.key === correctionEntity,
    )!;
    const values = JSON.parse(
      createBodyFor(graph, entity, true, false) ?? "{}",
    ) as Record<string, unknown>;
    const operation = (action: string) =>
      action.slice(correctionEntity!.length + 1).replace(/-fresh$/, "");
    const bodyFor = (action: string, version: number, body?: string) => {
      const op = operation(action);
      return op === "create"
        ? JSON.stringify({ values: JSON.parse(body ?? JSON.stringify(values)) })
        : op === "update"
          ? JSON.stringify({ expectedVersion: version, values })
          : op === "reject"
            ? JSON.stringify({
                expectedVersion: version,
                reason: "Please correct this verification fixture.",
              })
            : JSON.stringify({ expectedVersion: version });
    };
    for (let index = 0; index < apiRegistry.length; index++) {
      const action = apiRegistry[index]!;
      if (
        !action.action.startsWith(correctionEntity + ".") ||
        action.method === "GET"
      )
        continue;
      const op = operation(action.action);
      apiRegistry[index] = {
        ...action,
        method: op === "update" ? "PATCH" : "POST",
        route:
          op === "update"
            ? action.route.replace("/events/update", "")
            : action.route,
        expectedStatus: op === "create" ? 201 : 200,
      };
    }
    for (const [id, journey] of Object.entries(journeys)) {
      if (
        !journey.action.startsWith(correctionEntity + ".") ||
        apiRegistry.find((a) => a.action === journey.action)?.method === "GET"
      )
        continue;
      const key =
        "verify-" + createHash("sha256").update(id).digest("hex").slice(0, 40);
      journeys[id] = {
        ...journey,
        headers: [{ name: "x-factory-idempotency-key", value: key }],
        body: bodyFor(
          journey.action,
          journey.chain ? journey.chain.length - 1 : 0,
          journey.body,
        ),
        ...(journey.chain
          ? {
              chain: journey.chain.map((step, index) => ({
                ...step,
                body: bodyFor(step.action, Math.max(0, index - 1), step.body),
              })),
            }
          : {}),
        ...("idempotencyKey" in journey
          ? {
              idempotencyKey: key,
              replayExpectation: "stored-success" as const,
            }
          : {}),
      };
    }
  }
  if (taskEntity) {
    const task = graph.domain.entities.find(
      (entity) => entity.key === taskEntity,
    )!;
    const member = graph.policy.permissions.find(
      (p) => p.resource === taskEntity && p.actions.includes("create"),
    )!.role;
    const createValues = createBodyFor(graph, task, true, false) ?? "{}";
    const op = (action: string) =>
      action.slice(taskEntity!.length + 1).replace(/-fresh$/, "");
    const commandKey = (id: string) =>
      "verify-" + createHash("sha256").update(id).digest("hex").slice(0, 40);
    const bodyFor = (action: string, version: number, body?: string) =>
      op(action) === "create"
        ? JSON.stringify({ values: JSON.parse(body ?? createValues) })
        : JSON.stringify({ expectedVersion: version });
    const finalId = taskEntity + "-recomplete";
    for (const event of ["start", "complete", "reopen"])
      if (
        !apiRegistry.some(
          (a) => a.action === taskEntity + "." + event + "-fresh",
        )
      )
        apiRegistry.push({
          action: taskEntity + "." + event + "-fresh",
          method: "POST",
          route: "/api/" + taskEntity + "/{recordId}/events/" + event,
          expectedStatus: 200,
        });
    addStep({ stepId: finalId, kind: "role-journey" });
    journeys[finalId] = journeyFor(
      graph,
      lock,
      finalId,
      taskEntity + ".complete-fresh",
      member,
      {
        chain: [
          {
            action: taskEntity + ".create",
            sessionId: "fixture-session-" + member,
            body: createValues,
          },
          ...["start", "complete", "reopen"].map((event) => ({
            action: taskEntity + "." + event + "-fresh",
            sessionId: "fixture-session-" + member,
          })),
        ],
      },
    );
    for (let index = 0; index < apiRegistry.length; index++) {
      const action = apiRegistry[index]!;
      if (
        action.action.startsWith(taskEntity + ".") &&
        action.method === "POST"
      )
        apiRegistry[index] = {
          ...action,
          expectedStatus: op(action.action) === "create" ? 201 : 200,
        };
    }
    for (const [id, journey] of Object.entries(journeys)) {
      if (
        !journey.action.startsWith(taskEntity + ".") ||
        apiRegistry.find((a) => a.action === journey.action)?.method === "GET"
      )
        continue;
      const key = commandKey(id);
      journeys[id] = {
        ...journey,
        headers: [{ name: "x-factory-idempotency-key", value: key }],
        body: bodyFor(
          journey.action,
          journey.chain ? journey.chain.length - 1 : 0,
          journey.body,
        ),
        ...(journey.chain
          ? {
              chain: journey.chain.map((step, index) => ({
                ...step,
                body: bodyFor(step.action, Math.max(0, index - 1), step.body),
                idempotencyKeyOverride: commandKey(id + "-step-" + index),
              })),
            }
          : {}),
        ...("idempotencyKey" in journey
          ? {
              idempotencyKey: key,
              replayExpectation: "stored-success" as const,
            }
          : {}),
      };
    }
  }
  if (stepPlan.length > maximumStepPlanLength) {
    throw new VerificationContractError(
      "The derived verification step plan exceeds the bounded plan length.",
    );
  }

  const metadataId = graph.metadata.id;
  const profileKey =
    metadataId.length <= 122
      ? `graph-${metadataId}`
      : // The digest prefix is bound to the graph id; the constant letter
        // guarantees the profile key contract's leading character is a letter
        // regardless of the digest's first hex digit.
        `graph-a${createHash("sha256")
          .update(metadataId, "utf8")
          .digest("hex")
          .slice(0, 31)}`;

  return {
    profileKey,
    stepPlan: Object.freeze(stepPlan),
    journeys: Object.freeze(journeys),
    apiRegistry: Object.freeze(apiRegistry),
  };
}

// Worker-local consumer predicate mirrors the accepted compiler-private protocol.
const equalSet = (actual: readonly string[], expected: readonly string[]) =>
  actual.length === expected.length &&
  new Set(actual).size === actual.length &&
  expected.every((x) => actual.includes(x));
const locks = {
  "core.crud": [
    "1.0.1",
    "8dede9ba8d63bea9b09c7bf7ac6ce784c52595b644d03eca52ea6996a31882d1",
  ],
  "core.workflow": [
    "1.0.1",
    "16ebf7d8128f30e656d7c86e39ef36323991cf7af7ea18a5d81a3ac0e4c06884",
  ],
  "core.identity-policy": [
    "1.0.0",
    "a216444b219f00431820a0df8e2bc3b604296430beb8fa6549f1b40c92025d82",
  ],
  "core.policy-declarations": [
    "1.0.0",
    "56e6ead5aaa6e9f5fe9cf7c608b6b51b16064964cf95cd123bdc3e0725642c54",
  ],
  "core.audit": [
    "1.0.2",
    "fe6616252c7b44efe61d516d305e689f3f593d70d5287baac31b5f31013addc8",
  ],
  "core.notification": [
    "1.1.1",
    "207eaa0fd719013129ba84bd8f66f82219b619ee1f5c9e2d4e3d896c339e6132",
  ],
} as const;
function approvalProtocolEntity(
  graph: ApplicationGraphV1,
  selections: CompositionLock["packages"] = graph.integration
    .compositionSelections ?? [],
): string | undefined {
  const candidate = graph.flow.flows.some(
    (f) =>
      (f.states.includes("returned") ||
        f.transitions.some(
          (t) => t.event === "update" && t.from === "returned",
        )) &&
      f.transitions.some((t) => t.event === "approve" || t.event === "reject"),
  );
  if (!candidate) return undefined;
  const deny = (): never => {
    throw new Error("Approval correction shape is not supported.");
  };
  if (graph.flow.flows.length !== 1) return deny();
  const flow = graph.flow.flows[0]!;
  if (
    flow.initialState !== "draft" ||
    !equalSet(flow.states, ["draft", "submitted", "approved", "returned"]) ||
    !equalSet(flow.events, ["submit", "approve", "reject", "update"]) ||
    flow.transitions.length !== 4
  )
    return deny();
  const submit = flow.transitions.find((t) => t.event === "submit");
  const approve = flow.transitions.find((t) => t.event === "approve");
  const requester = submit?.roles?.[0],
    reviewer = approve?.roles?.[0];
  const grants = graph.policy.permissions.filter(
    (p) => p.resource === flow.entity,
  );
  const auditor = grants.find((p) => p.actions.includes("audit"))?.role;
  if (
    !requester ||
    !reviewer ||
    !auditor ||
    new Set([requester, reviewer, auditor]).size !== 3 ||
    !equalSet(graph.policy.roles, [requester, reviewer, auditor]) ||
    grants.length !== 3
  )
    return deny();
  for (const [role, actions] of [
    [requester, ["create", "read", "update", "submit"]],
    [reviewer, ["read", "approve", "reject"]],
    [auditor, ["read", "audit"]],
  ] as const)
    if (!grants.some((p) => p.role === role && equalSet(p.actions, actions)))
      return deny();
  for (const [event, from, to, role] of [
    ["submit", "draft", "submitted", requester],
    ["approve", "submitted", "approved", reviewer],
    ["reject", "submitted", "returned", reviewer],
    ["update", "returned", "draft", requester],
  ]) {
    const transition = flow.transitions.find((t) => t.event === event);
    const expected =
      event === "approve" || event === "reject"
        ? ["audit.record:record", "notification.send:send"]
        : ["audit.record:record"];
    if (
      !transition ||
      transition.from !== from ||
      transition.to !== to ||
      !equalSet(transition.roles ?? [], [role!]) ||
      !equalSet(
        (transition.effects ?? []).map((e) => e.capability + ":" + e.operation),
        expected,
      )
    )
      return deny();
  }
  const blocks = graph.page.pages.flatMap((p) =>
    p.blocks.map((b) => ({ page: p, block: b })),
  );
  for (const type of ["form", "list", "queue", "detail"])
    if (
      blocks.filter(
        ({ block }) => block.entity === flow.entity && block.type === type,
      ).length !== 1
    )
      return deny();
  if (
    selections.length !== 6 ||
    !equalSet(
      selections.map((s) => s.lock.key),
      Object.keys(locks),
    )
  )
    return deny();
  const byKey = new Map(selections.map((s) => [s.lock.key, s]));
  for (const [key, [version, digest]] of Object.entries(locks)) {
    const lock = byKey.get(key)!.lock;
    if (
      lock.version !== version ||
      lock.manifestDigest !== "sha256:" + digest ||
      lock.packageRoot !== `packages/capabilities/assets/${key}/${version}` ||
      lock.lifecycle !== "golden"
    )
      return deny();
  }
  const bindings = (key: string, expected: Record<string, string>) => {
    const b = byKey.get(key)!.bindings;
    return (
      equalSet(Object.keys(b), Object.keys(expected)) &&
      Object.entries(expected).every(
        ([k, v]) => JSON.stringify(b[k]) === JSON.stringify({ graphSymbol: v }),
      )
    );
  };
  const listPage = blocks.find(
    ({ block }) => block.entity === flow.entity && block.type === "list",
  )!.page;
  if (
    !bindings("core.crud", {
      entityKey: "graph.domain." + flow.entity,
      routeKey: "graph.page." + listPage.id,
    }) ||
    !bindings("core.workflow", { flowKey: "graph.flow." + flow.id }) ||
    !bindings("core.audit", { actorRole: "graph.policy." + reviewer }) ||
    !bindings("core.notification", {
      recipientRole: "graph.policy." + requester,
    }) ||
    !bindings("core.policy-declarations", {})
  )
    return deny();
  const identity = byKey.get("core.identity-policy")!.bindings as Record<
    string,
    { graphSymbol?: string }
  >;
  if (
    !equalSet(Object.keys(identity), [
      "principalEntity",
      "sessionEntity",
      "defaultRole",
      "authenticatedRole",
    ]) ||
    identity.defaultRole?.graphSymbol !== "graph.policy." + requester ||
    identity.authenticatedRole?.graphSymbol !== "graph.policy." + reviewer ||
    !graph.domain.entities.some(
      (e) => "graph.domain." + e.key === identity.principalEntity?.graphSymbol,
    ) ||
    !graph.domain.entities.some(
      (e) => "graph.domain." + e.key === identity.sessionEntity?.graphSymbol,
    )
  )
    return deny();
  const principal = identity.principalEntity!.graphSymbol!.slice(
      "graph.domain.".length,
    ),
    session = identity.sessionEntity!.graphSymbol!.slice(
      "graph.domain.".length,
    );
  const secondary = graph.domain.entities.filter(
    (e) => ![flow.entity, principal, session].includes(e.key),
  );
  if (
    secondary.length !== 1 ||
    new Set([flow.entity, principal, session]).size !== 3 ||
    graph.domain.entities.length !== 4
  )
    return deny();
  const permissionPairs = graph.policy.permissions.flatMap((p) =>
    p.actions.map((a) => p.role + ":" + p.resource + ":" + a),
  );
  const expectedPairs = [
    ...grants.flatMap((p) =>
      p.actions.map((a) => p.role + ":" + flow.entity + ":" + a),
    ),
    requester + ":" + secondary[0]!.key + ":read",
    requester + ":" + secondary[0]!.key + ":update",
    ...[requester, reviewer, auditor].flatMap((role) => [
      role + ":" + principal + ":read",
      role + ":" + session + ":read",
    ]),
    requester + ":" + session + ":create",
    requester + ":" + session + ":update",
  ];
  if (!equalSet(permissionPairs, expectedPairs)) return deny();
  if (
    graph.page.pages.length !== 7 ||
    blocks.length !== 7 ||
    blocks.filter(({ block }) => block.entity === flow.entity).length !== 5 ||
    blocks.filter(
      ({ block }) => block.type === "stats" && block.entity === flow.entity,
    ).length !== 1 ||
    blocks.filter(({ block }) => block.type === "settings" && !block.entity)
      .length !== 1 ||
    blocks.filter(
      ({ block }) =>
        block.type === "list" && block.entity === secondary[0]!.key,
    ).length !== 1
  )
    return deny();
  if (
    graph.integration.providers.length !== 0 ||
    !equalSet(
      graph.integration.capabilities.map(
        (c) => c.key + ":" + c.operation + ":" + c.providerId,
      ),
      [
        "audit.record:record:factory",
        "notification.send:send:factory",
        "identity.context.resolve:resolve:factory",
        "authorization.decision:decision:factory",
      ],
    )
  )
    return deny();
  const entity = graph.domain.entities.filter((e) => e.key === flow.entity);
  if (
    entity.length !== 1 ||
    entity[0]!.fields.some((f) =>
      ["id", "version", "createdAt", "updatedAt"].includes(f.key),
    )
  )
    return deny();
  const status = entity[0]!.fields.find((field) => field.key === "status");
  if (
    !status ||
    status.type !== "enum" ||
    status.required !== true ||
    !equalSet(status.values ?? [], [
      "draft",
      "submitted",
      "approved",
      "returned",
    ])
  )
    return deny();
  return flow.entity;
}

function canonicalProtocol(value: unknown): string {
  if (Array.isArray(value))
    return "[" + value.map(canonicalProtocol).join(",") + "]";
  if (value && typeof value === "object")
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map(
          (k) =>
            JSON.stringify(k) +
            ":" +
            canonicalProtocol((value as Record<string, unknown>)[k]),
        )
        .join(",") +
      "}"
    );
  return JSON.stringify(value);
}

// Worker-private mirror of the frozen Task protocol; no public compiler API.
const exactSet = (actual: readonly string[], expected: readonly string[]) =>
  actual.length === expected.length &&
  new Set(actual).size === actual.length &&
  expected.every((value) => actual.includes(value));
const taskLocks = {
  "core.crud": "1.0.1",
  "core.workflow": "1.0.1",
  "core.identity-policy": "1.0.0",
  "core.policy-declarations": "1.0.0",
  "core.audit": "1.0.2",
  "core.notification": "1.1.1",
} as const;
const businessFields = [
  ["title", "string", true],
  ["description", "text", false],
  ["assignee", "string", true],
  ["dueDate", "date", true],
  ["priority", "enum", true],
] as const;
function hasTaskFields(
  entity: ApplicationGraphV1["domain"]["entities"][number],
): boolean {
  const fields = entity.fields.filter((f) => f.key !== "status");
  return (
    fields.length === 5 &&
    businessFields.every(([key, type, required]) =>
      fields.some(
        (f) =>
          f.key === key &&
          f.type === type &&
          f.required === required &&
          (key === "priority"
            ? exactSet(f.values ?? [], ["low", "medium", "high"])
            : f.values === undefined),
      ),
    )
  );
}

/** One lock-bound selection result activates both Task presentation and mutation. */
function taskProtocolEntity(
  graph: ApplicationGraphV1,
  compositionLock?: CompositionLock,
): string | undefined {
  const selections =
    compositionLock?.packages ?? graph.integration.compositionSelections ?? [];
  const locked =
    selections.length === 6 &&
    exactSet(
      selections.map((s) => s.lock.key),
      Object.keys(taskLocks),
    ) &&
    selections.every(
      (s) => taskLocks[s.lock.key as keyof typeof taskLocks] === s.lock.version,
    );
  if (!locked) return undefined;
  const byKey = new Map(selections.map((s) => [s.lock.key, s]));
  const binding = (key: string, expected: Record<string, string>) => {
    const actual = byKey.get(key)?.bindings ?? {};
    return (
      exactSet(Object.keys(actual), Object.keys(expected)) &&
      Object.entries(expected).every(([k, v]) =>
        isDeepStrictEqual(actual[k], { graphSymbol: v }),
      )
    );
  };
  const signatures = graph.domain.entities.filter(hasTaskFields);
  const candidate = signatures.some((entity) =>
    graph.flow.flows.some(
      (flow) =>
        flow.entity === entity.key &&
        flow.events.some((e) => ["start", "complete", "reopen"].includes(e)) &&
        binding("core.crud", {
          entityKey: "graph.domain." + entity.key,
          routeKey:
            "graph.page." +
            graph.page.pages.find((p) =>
              p.blocks.some(
                (b) => b.entity === entity.key && b.type === "list",
              ),
            )?.id,
        }) &&
        binding("core.workflow", { flowKey: "graph.flow." + flow.id }) &&
        binding("core.identity-policy", {
          principalEntity: "graph.domain." + graph.metadata.id + "-principal",
          sessionEntity: "graph.domain." + graph.metadata.id + "-session",
          defaultRole: "graph.policy." + graph.policy.roles[0],
          authenticatedRole: "graph.policy." + graph.policy.roles[1],
        }) &&
        binding("core.audit", {
          actorRole: "graph.policy." + graph.policy.roles[0],
        }) &&
        binding("core.notification", {
          recipientRole: "graph.policy." + graph.policy.roles[0],
        }) &&
        binding("core.policy-declarations", {}),
    ),
  );
  if (!candidate) return undefined;
  const deny = (): never => {
    throw new Error("Task contract shape is not supported.");
  };
  if (
    compositionLock &&
    (compositionLock.applicationGraphChecksum !== hashApplicationGraph(graph) ||
      (graph.integration.compositionSelections !== undefined &&
        !isDeepStrictEqual(
          [...selections].sort((a, b) => a.lock.key.localeCompare(b.lock.key)),
          [...graph.integration.compositionSelections].sort((a, b) =>
            a.lock.key.localeCompare(b.lock.key),
          ),
        )))
  )
    return deny();
  if (
    signatures.length !== 1 ||
    graph.flow.flows.length !== 1 ||
    graph.policy.roles.length !== 2 ||
    graph.domain.entities.length !== 3
  )
    return deny();
  const entity = signatures[0]!,
    flow = graph.flow.flows[0]!;
  if (
    flow.entity !== entity.key ||
    flow.initialState !== "not-started" ||
    !exactSet(flow.states, ["not-started", "in-progress", "completed"]) ||
    !exactSet(flow.events, ["start", "complete", "reopen"]) ||
    flow.transitions.length !== 3 ||
    entity.fields.length !== 6
  )
    return deny();
  const status = entity.fields.find((f) => f.key === "status");
  if (
    !status ||
    status.type !== "enum" ||
    status.required !== true ||
    !exactSet(status.values ?? [], ["not-started", "in-progress", "completed"])
  )
    return deny();
  const grants = graph.policy.permissions.filter(
    (p) => p.resource === entity.key,
  );
  const member = grants.find((p) =>
    exactSet(p.actions, ["create", "read", "start", "complete", "reopen"]),
  )?.role;
  const viewer = grants.find((p) => exactSet(p.actions, ["read"]))?.role;
  if (
    !member ||
    !viewer ||
    member === viewer ||
    grants.length !== 2 ||
    !exactSet(graph.policy.roles, [member, viewer])
  )
    return deny();
  for (const [event, from, to] of [
    ["start", "not-started", "in-progress"],
    ["complete", "in-progress", "completed"],
    ["reopen", "completed", "in-progress"],
  ]) {
    const transition = flow.transitions.find((t) => t.event === event);
    if (
      !transition ||
      transition.from !== from ||
      transition.to !== to ||
      !exactSet(transition.roles ?? [], [member]) ||
      !exactSet(
        (transition.effects ?? []).map((e) => e.capability + ":" + e.operation),
        [],
      )
    )
      return deny();
  }
  const blocks = graph.page.pages.flatMap((page) =>
    page.blocks.map((block) => ({ page, block })),
  );
  if (
    graph.page.pages.length !== 5 ||
    blocks.length !== 5 ||
    blocks.some(({ block }) => block.entity !== entity.key) ||
    !exactSet(
      blocks.map(({ block }) => block.type),
      ["stats", "list", "form", "detail", "queue"],
    )
  )
    return deny();
  const list = blocks.find(({ block }) => block.type === "list")!.page;
  const first = graph.policy.roles[0]!,
    second = graph.policy.roles[1]!;
  const principal = graph.metadata.id + "-principal",
    session = graph.metadata.id + "-session";
  if (
    !exactSet(
      graph.domain.entities.map((e) => e.key),
      [entity.key, principal, session],
    ) ||
    !binding("core.crud", {
      entityKey: "graph.domain." + entity.key,
      routeKey: "graph.page." + list.id,
    }) ||
    !binding("core.workflow", { flowKey: "graph.flow." + flow.id }) ||
    !binding("core.identity-policy", {
      principalEntity: "graph.domain." + principal,
      sessionEntity: "graph.domain." + session,
      defaultRole: "graph.policy." + first,
      authenticatedRole: "graph.policy." + second,
    }) ||
    !binding("core.audit", { actorRole: "graph.policy." + first }) ||
    !binding("core.notification", { recipientRole: "graph.policy." + first }) ||
    !binding("core.policy-declarations", {})
  )
    return deny();
  const expectedPermissions = [
    ...grants.flatMap((p) =>
      p.actions.map((a) => p.role + ":" + entity.key + ":" + a),
    ),
    ...graph.policy.roles.flatMap((role) => [
      role + ":" + principal + ":read",
      role + ":" + session + ":read",
    ]),
    first + ":" + session + ":create",
    first + ":" + session + ":update",
  ];
  if (
    !exactSet(
      graph.policy.permissions.flatMap((p) =>
        p.actions.map((a) => p.role + ":" + p.resource + ":" + a),
      ),
      expectedPermissions,
    )
  )
    return deny();
  return entity.key;
}
