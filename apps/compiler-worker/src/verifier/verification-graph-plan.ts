import { createHash } from "node:crypto";

import type { PublishedGraphInput } from "@factory/compiler";
import {
  VerificationContractError,
  type ApplicationGraphV1,
} from "@factory/graph";

import type { VerificationStepPlanEntry } from "./verification-lifecycle.js";
import {
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
 *   rejected once the record left the initial state), the remaining
 *   transitions as role journeys, and the denial targets the first
 *   transition with a role that is not allowed (falling back to an anonymous
 *   request, which the identity policy denies by default).
 * - Create bodies supply every required field with a type-derived value
 *   (the generated create handler fails closed on missing required fields);
 *   `status` and (for commerce order entities) `version` are runtime-supplied
 *   and never declared.
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
      return "2026-09-01";
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
  entity: ApplicationGraphV1["domain"]["entities"][number],
  hasFlow: boolean,
  isOrderEntity: boolean,
): string | undefined {
  const required = entity.fields.filter(
    (field) =>
      field.required &&
      !(field.key === "status" && hasFlow) &&
      !(field.key === "version" && isOrderEntity),
  );
  if (required.length === 0) return undefined;
  const body: Record<string, unknown> = {};
  for (const field of required) {
    body[field.key] = derivedCreateValue(entity.key, field);
  }
  return JSON.stringify(body);
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

    // Generic routes are deterministic for every entity.
    apiRegistry.push({
      action: `${entityKey}.list`,
      method: "GET",
      route: `/api/${entityKey}`,
      expectedStatus: 200,
    });
    if (createRole !== undefined) {
      const journeyId = `${entityKey}-create`;
      journeyIdPattern(journeyId);
      addStep({ stepId: journeyId, kind: "role-journey" });
      const body = createBodyFor(
        entity,
        flow !== undefined,
        entityKey === orderEntityKey,
      );
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
    if (
      flow === undefined ||
      recordId === undefined ||
      entityKey === orderEntityKey
    ) {
      continue;
    }

    const transitionRoles = (
      transition: ApplicationGraphV1["flow"]["flows"][number]["transitions"][number],
    ) => transition.roles ?? [];
    for (const [index, transition] of flow.transitions.entries()) {
      const roles = transitionRoles(transition);
      const role =
        roles[0] ??
        firstRoleWith(graph.policy.roles, permissions, entityKey, "read");
      if (role === undefined) continue;
      const journeyId = `${entityKey}-${transition.event}`;
      journeyIdPattern(journeyId);
      const makesProgress = transition.from !== transition.to;
      if (index === 0 && makesProgress) {
        // The first transition is exercised once and replayed: the seeded
        // record leaves the initial state, so the byte-identical replay is
        // rejected — the generated proof of no duplicate side effects.
        addStep({ stepId: journeyId, kind: "idempotency" });
        const idempotencyKey = `verify-${entityKey}-${transition.event}-${recordId}`;
        journeys[journeyId] = {
          ...journeyFor(
            graph,
            lock,
            journeyId,
            `${entityKey}.${transition.event}`,
            role,
          ),
          idempotencyKey,
          expectedVersion: 0,
        };
      } else {
        addStep({ stepId: journeyId, kind: "role-journey" });
        journeys[journeyId] = journeyFor(
          graph,
          lock,
          journeyId,
          `${entityKey}.${transition.event}`,
          role,
        );
      }
      apiRegistry.push({
        action: `${entityKey}.${transition.event}`,
        method: "POST",
        route: `/api/${entityKey}/${recordId}/events/${transition.event}`,
        expectedStatus: 201,
      });
    }

    // Authorization denial on the first transition: a role the transition
    // does not allow (the identity policy's default deny covers the case
    // where every role is allowed).
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
      `${entityKey}.${firstTransition.event}`,
      denialRole,
    );
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
