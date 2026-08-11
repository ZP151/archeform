import { createHash } from "node:crypto";

import type { PublishedGraphInput } from "@factory/compiler";
import {
  VerificationContractError,
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

  const sessionBound = isSessionBound(lock);
  const orderEntityKey = orderEntityKeyOf(lock);
  const permissions = graph.policy.permissions;
  const flows = graph.flow.flows;
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
    if (createRole !== undefined && !createUnbindable) {
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
