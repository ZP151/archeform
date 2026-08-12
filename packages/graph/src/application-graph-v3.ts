import { z } from "zod";

import {
  applicationGraphV2Schema,
  assertApplicationGraphV2,
  type ApplicationGraphV2,
} from "./application-graph-v2.js";
import {
  CompositionError,
  digestJson,
  graphFieldKeySchema,
  graphKeySchema,
  parseStrict,
  safeBusinessTextSchema,
} from "./composition-shared.js";
import type { Sha256Digest } from "./product-intent.js";

export type ApplicationGraphV3JourneyStep = {
  flowKey: string;
  from: string;
  event: string;
  to: string;
  actorRoleKey: string;
};

export type ApplicationGraphV3Journey = {
  key: string;
  label: string;
  steps: ApplicationGraphV3JourneyStep[];
  entryPageKey: string;
  outcome: string;
};

export type ApplicationGraphV3DomainFieldBindingPolicy = {
  kind: "domain-field";
  pageId: string;
  blockId: string;
  bindingKey: string;
  entityKey: string;
  fieldKey: string;
  access: "read" | "write";
  authority: "client" | "server";
};

export type ApplicationGraphV3FlowTransitionBindingPolicy = {
  kind: "flow-transition";
  pageId: string;
  blockId: string;
  bindingKey: string;
  flowKey: string;
  from: string;
  event: string;
  to: string;
  access: "observe" | "request";
};

export type ApplicationGraphV3PolicyPermissionBindingPolicy = {
  kind: "policy-permission";
  pageId: string;
  blockId: string;
  bindingKey: string;
  roleKey: string;
  resource: string | "*";
  action: string;
  access: "evaluate";
};

export type ApplicationGraphV3BindingPolicy =
  | ApplicationGraphV3DomainFieldBindingPolicy
  | ApplicationGraphV3FlowTransitionBindingPolicy
  | ApplicationGraphV3PolicyPermissionBindingPolicy;

export type ApplicationGraphV3 = Omit<
  ApplicationGraphV2,
  "apiVersion" | "journeys" | "bindingPolicies"
> & {
  apiVersion: "factory.application-graph/v3";
  journeys: ApplicationGraphV3Journey[];
  bindingPolicies: ApplicationGraphV3BindingPolicy[];
};

const bindingKeySchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-z][a-zA-Z0-9-]*$/);

const journeyStepSchema = z
  .object({
    flowKey: graphKeySchema,
    from: graphKeySchema,
    event: graphKeySchema,
    to: graphKeySchema,
    actorRoleKey: graphKeySchema,
  })
  .strict();

const journeySchema = z
  .object({
    key: graphKeySchema,
    label: safeBusinessTextSchema.max(160),
    steps: z.array(journeyStepSchema).min(1),
    entryPageKey: graphKeySchema,
    outcome: safeBusinessTextSchema.max(500),
  })
  .strict();

const bindingPolicyBase = {
  pageId: graphKeySchema,
  blockId: graphKeySchema,
  bindingKey: bindingKeySchema,
};

const domainFieldBindingPolicySchema = z
  .object({
    kind: z.literal("domain-field"),
    ...bindingPolicyBase,
    entityKey: graphKeySchema,
    fieldKey: graphFieldKeySchema,
    access: z.enum(["read", "write"]),
    authority: z.enum(["client", "server"]),
  })
  .strict();

const flowTransitionBindingPolicySchema = z
  .object({
    kind: z.literal("flow-transition"),
    ...bindingPolicyBase,
    flowKey: graphKeySchema,
    from: graphKeySchema,
    event: graphKeySchema,
    to: graphKeySchema,
    access: z.enum(["observe", "request"]),
  })
  .strict();

const policyPermissionBindingPolicySchema = z
  .object({
    kind: z.literal("policy-permission"),
    ...bindingPolicyBase,
    roleKey: graphKeySchema,
    resource: z.union([graphKeySchema, z.literal("*")]),
    action: graphKeySchema,
    access: z.literal("evaluate"),
  })
  .strict();

const bindingPolicySchema = z.discriminatedUnion("kind", [
  domainFieldBindingPolicySchema,
  flowTransitionBindingPolicySchema,
  policyPermissionBindingPolicySchema,
]);

type StrictBoundaryCopyResult = { ok: true; value: unknown } | { ok: false };

function isCanonicalArrayIndex(key: string, length: number): boolean {
  const index = Number(key);
  return (
    Number.isInteger(index) &&
    index >= 0 &&
    index < length &&
    String(index) === key
  );
}

function copyStrictBoundaryInput(input: unknown): StrictBoundaryCopyResult {
  if (Array.isArray(input)) {
    if (Object.getPrototypeOf(input) !== Array.prototype) return { ok: false };
    for (const key of Reflect.ownKeys(input)) {
      if (key === "length") continue;
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (
        typeof key !== "string" ||
        !isCanonicalArrayIndex(key, input.length) ||
        descriptor?.enumerable !== true ||
        !("value" in descriptor)
      ) {
        return { ok: false };
      }
    }
    const copy: unknown[] = [];
    for (let index = 0; index < input.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(input, String(index));
      if (
        !descriptor ||
        descriptor.enumerable !== true ||
        !("value" in descriptor)
      ) {
        return { ok: false };
      }
      const nested = copyStrictBoundaryInput(descriptor.value);
      if (!nested.ok) return nested;
      copy.push(nested.value);
    }
    return { ok: true, value: copy };
  }
  if (input !== null && typeof input === "object") {
    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) {
      return { ok: false };
    }
    const copy: Record<string, unknown> = Object.create(null);
    for (const key of Reflect.ownKeys(input)) {
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (
        typeof key !== "string" ||
        descriptor?.enumerable !== true ||
        !("value" in descriptor)
      ) {
        return { ok: false };
      }
      const nested = copyStrictBoundaryInput(descriptor.value);
      if (!nested.ok) return nested;
      copy[key] = nested.value;
    }
    return { ok: true, value: copy };
  }
  return { ok: true, value: input };
}

const strictBoundarySchema = z.unknown().transform((input, context) => {
  const copied = copyStrictBoundaryInput(input);
  if (!copied.ok) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Input must contain only plain own records and arrays.",
    });
    return z.NEVER;
  }
  return copied.value;
});

const rawApplicationGraphV3Schema = applicationGraphV2Schema
  .omit({ apiVersion: true, journeys: true, bindingPolicies: true })
  .extend({
    apiVersion: z.literal("factory.application-graph/v3"),
    journeys: z.array(journeySchema),
    bindingPolicies: z.array(bindingPolicySchema),
  })
  .strict();

export const applicationGraphV3Schema = strictBoundarySchema.pipe(
  rawApplicationGraphV3Schema,
) as unknown as z.ZodType<ApplicationGraphV3>;

function transitionKey(
  flowKey: string,
  transition: { from: string; event: string; to: string },
): string {
  return `${flowKey}:${transition.from}:${transition.event}:${transition.to}`;
}

function bindingPolicyKey(policy: {
  pageId: string;
  blockId: string;
  bindingKey: string;
}): string {
  return `${policy.pageId}:${policy.blockId}:${policy.bindingKey}`;
}

function assertJourneySemantics(graph: ApplicationGraphV3): void {
  const journeyKeys = new Set<string>();
  for (const journey of graph.journeys) {
    if (journeyKeys.has(journey.key)) {
      throw new CompositionError(
        `Application Graph V3 journey '${journey.key}' is duplicated.`,
      );
    }
    journeyKeys.add(journey.key);
  }

  const pages = new Set(graph.page.pages.map(({ id }) => id));
  const roles = new Set(graph.policy.roles);
  const flows = new Map(graph.flow.flows.map((flow) => [flow.id, flow]));
  const transitions = new Map<
    string,
    (typeof graph.flow.flows)[number]["transitions"][number]
  >();

  for (const flow of graph.flow.flows) {
    const seen = new Set<string>();
    for (const transition of flow.transitions) {
      const key = transitionKey(flow.id, transition);
      if (seen.has(key)) {
        throw new CompositionError(
          `Flow '${flow.id}' transition '${transition.from}:${transition.event}:${transition.to}' is duplicated.`,
        );
      }
      seen.add(key);
      transitions.set(key, transition);
      if (!transition.roles || transition.roles.length === 0) {
        throw new CompositionError(
          `Flow '${flow.id}' transition '${transition.event}' requires an actor grant.`,
        );
      }
    }
  }

  const coveredTransitions = new Set<string>();
  const reachableFlows = new Set<string>();
  for (const journey of graph.journeys) {
    if (!pages.has(journey.entryPageKey)) {
      throw new CompositionError(
        `Journey '${journey.key}' references unknown page '${journey.entryPageKey}'.`,
      );
    }
    const previousStepByFlow = new Map<string, { index: number; to: string }>();
    for (let index = 0; index < journey.steps.length; index += 1) {
      const step = journey.steps[index]!;
      const flow = flows.get(step.flowKey);
      if (!flow) {
        throw new CompositionError(
          `Journey '${journey.key}' step ${index} references unknown flow '${step.flowKey}'.`,
        );
      }
      if (!roles.has(step.actorRoleKey)) {
        throw new CompositionError(
          `Journey '${journey.key}' step ${index} references unknown role '${step.actorRoleKey}'.`,
        );
      }
      const key = transitionKey(step.flowKey, step);
      const transition = transitions.get(key);
      if (!transition) {
        throw new CompositionError(
          `Journey '${journey.key}' step ${index} does not match transition '${key}'.`,
        );
      }
      if (!transition.roles?.includes(step.actorRoleKey)) {
        throw new CompositionError(
          `Journey '${journey.key}' step ${index} actor '${step.actorRoleKey}' is not granted on transition '${key}'.`,
        );
      }
      const hasPermission = graph.policy.permissions.some(
        (permission) =>
          permission.role === step.actorRoleKey &&
          (permission.resource === flow.entity ||
            permission.resource === "*") &&
          permission.actions.includes(step.event),
      );
      if (!hasPermission) {
        throw new CompositionError(
          `Journey '${journey.key}' step ${index} actor '${step.actorRoleKey}' lacks Policy permission '${flow.entity}:${step.event}'.`,
        );
      }
      const previous = previousStepByFlow.get(step.flowKey);
      if (previous && previous.to !== step.from) {
        throw new CompositionError(
          `Journey '${journey.key}' steps ${previous.index} and ${index} for flow '${step.flowKey}' are discontinuous: '${previous.to}' does not equal '${step.from}'.`,
        );
      }
      previousStepByFlow.set(step.flowKey, { index, to: step.to });
      coveredTransitions.add(key);
      reachableFlows.add(step.flowKey);
    }
  }

  for (const flow of graph.flow.flows) {
    for (const transition of flow.transitions) {
      for (const role of transition.roles ?? []) {
        const granted = graph.policy.permissions.some(
          (permission) =>
            permission.role === role &&
            (permission.resource === flow.entity ||
              permission.resource === "*") &&
            permission.actions.includes(transition.event),
        );
        if (!granted) {
          throw new CompositionError(
            `Flow '${flow.id}' transition '${transition.event}' is not granted to role '${role}'.`,
          );
        }
      }
      const key = transitionKey(flow.id, transition);
      if (!coveredTransitions.has(key)) {
        throw new CompositionError(
          `Flow '${flow.id}' transition '${transition.from}:${transition.event}:${transition.to}' is not covered by a journey step.`,
        );
      }
    }
    if (!reachableFlows.has(flow.id)) {
      throw new CompositionError(
        `Graph flow '${flow.id}' is not reachable from a journey.`,
      );
    }
  }
}

function assertBindingPolicies(graph: ApplicationGraphV3): void {
  const seen = new Set<string>();
  for (const policy of graph.bindingPolicies) {
    const key = bindingPolicyKey(policy);
    if (seen.has(key)) {
      throw new CompositionError(
        `Application Graph V3 binding policy '${key}' is duplicated.`,
      );
    }
    seen.add(key);
  }

  const pages = new Map(graph.page.pages.map((page) => [page.id, page]));
  const entities = new Map(
    graph.domain.entities.map((entity) => [entity.key, entity]),
  );
  const flows = new Map(graph.flow.flows.map((flow) => [flow.id, flow]));
  const roles = new Set(graph.policy.roles);
  const fieldAuthorities = new Map(
    graph.fieldAuthorities.map(({ entityKey, fieldKey, authority }) => [
      `${entityKey}:${fieldKey}`,
      authority,
    ]),
  );
  const counts = new Map<string, number>();

  for (const policy of graph.bindingPolicies) {
    const page = pages.get(policy.pageId);
    if (!page) {
      throw new CompositionError(
        `Binding policy references unknown page '${policy.pageId}'.`,
      );
    }
    const block = page.blocks.find(({ id }) => id === policy.blockId);
    if (!block) {
      throw new CompositionError(
        `Binding policy references unknown block '${policy.blockId}'.`,
      );
    }
    if (
      !block.bindings ||
      !Object.prototype.hasOwnProperty.call(block.bindings, policy.bindingKey)
    ) {
      throw new CompositionError(
        `Binding policy references unknown binding '${policy.bindingKey}'.`,
      );
    }

    let expectedTarget: string;
    if (policy.kind === "domain-field") {
      const entity = entities.get(policy.entityKey);
      if (!entity) {
        throw new CompositionError(
          `Binding policy references unknown entity '${policy.entityKey}'.`,
        );
      }
      if (!entity.fields.some(({ key }) => key === policy.fieldKey)) {
        throw new CompositionError(
          `Binding policy references unknown field '${policy.fieldKey}'.`,
        );
      }
      expectedTarget = `graph.domain.${policy.entityKey}.${policy.fieldKey}`;
      const intrinsicAuthority = fieldAuthorities.get(
        `${policy.entityKey}:${policy.fieldKey}`,
      );
      if (policy.authority !== intrinsicAuthority) {
        throw new CompositionError(
          `Binding policy authority for '${policy.entityKey}.${policy.fieldKey}' does not match its intrinsic field authority.`,
        );
      }
      if (policy.access === "write" && intrinsicAuthority !== "client") {
        throw new CompositionError(
          "A server-authoritative field is read-only and cannot grant client write access.",
        );
      }
    } else if (policy.kind === "flow-transition") {
      const flow = flows.get(policy.flowKey);
      if (!flow) {
        throw new CompositionError(
          `Flow binding policy references unknown flow '${policy.flowKey}'.`,
        );
      }
      if (
        !flow.transitions.some(
          (transition) =>
            transition.from === policy.from &&
            transition.event === policy.event &&
            transition.to === policy.to,
        )
      ) {
        throw new CompositionError(
          `Flow binding policy references unknown transition '${policy.flowKey}:${policy.from}:${policy.event}:${policy.to}'.`,
        );
      }
      expectedTarget = `graph.flow.${policy.flowKey}.${policy.from}.${policy.event}.${policy.to}`;
    } else {
      if (!roles.has(policy.roleKey)) {
        throw new CompositionError(
          `Policy binding policy references unknown role '${policy.roleKey}'.`,
        );
      }
      const declared = graph.policy.permissions.some(
        (permission) =>
          permission.role === policy.roleKey &&
          permission.resource === policy.resource &&
          permission.actions.includes(policy.action),
      );
      if (!declared) {
        throw new CompositionError(
          `Policy binding policy references undeclared permission '${policy.roleKey}:${policy.resource}:${policy.action}'.`,
        );
      }
      expectedTarget = `graph.policy.${policy.roleKey}.${policy.resource}.${policy.action}`;
    }

    if (block.bindings[policy.bindingKey] !== expectedTarget) {
      throw new CompositionError(
        `Binding policy target '${expectedTarget}' does not match binding '${policy.bindingKey}'.`,
      );
    }
    const key = bindingPolicyKey(policy);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  for (const page of graph.page.pages) {
    for (const block of page.blocks) {
      for (const bindingKey of Object.keys(block.bindings ?? {})) {
        const key = `${page.id}:${block.id}:${bindingKey}`;
        if (counts.get(key) !== 1) {
          throw new CompositionError(
            `Block binding '${key}' requires exactly one policy.`,
          );
        }
      }
    }
  }
}

function assertRetainedV2Semantics(graph: ApplicationGraphV3): void {
  const projected = structuredClone(graph) as unknown as Record<string, any>;
  projected.apiVersion = "factory.application-graph/v2";
  projected.journeys = graph.journeys.map((journey) => ({
    key: journey.key,
    label: journey.label,
    actorRoleKey: journey.steps[0]!.actorRoleKey,
    flowKeys: [...new Set(journey.steps.map(({ flowKey }) => flowKey))],
    entryPageKey: journey.entryPageKey,
    outcome: journey.outcome,
  }));

  const projectedActorsByFlow = new Map<string, Set<string>>();
  for (const journey of projected.journeys as Array<{
    actorRoleKey: string;
    flowKeys: string[];
  }>) {
    for (const flowKey of journey.flowKeys) {
      const actors = projectedActorsByFlow.get(flowKey) ?? new Set<string>();
      actors.add(journey.actorRoleKey);
      projectedActorsByFlow.set(flowKey, actors);
    }
  }
  for (const flow of projected.flow.flows as Array<Record<string, any>>) {
    const actors = projectedActorsByFlow.get(flow.id) ?? new Set<string>();
    for (const transition of flow.transitions as Array<Record<string, any>>) {
      transition.roles = [...new Set([...(transition.roles ?? []), ...actors])];
    }
    for (const actor of actors) {
      projected.policy.permissions.push({
        role: actor,
        resource: flow.entity,
        actions: [
          ...new Set(
            (flow.transitions as Array<Record<string, any>>).map(
              ({ event }) => event as string,
            ),
          ),
        ],
      });
    }
  }

  for (const page of projected.page.pages as Array<Record<string, any>>) {
    for (const block of page.blocks as Array<Record<string, any>>) {
      delete block.bindings;
    }
  }
  projected.bindingPolicies = [];
  assertApplicationGraphV2(projected);
}

export function assertApplicationGraphV3(input: unknown): ApplicationGraphV3 {
  const graph = parseStrict(applicationGraphV3Schema, input);
  assertJourneySemantics(graph);
  assertRetainedV2Semantics(graph);
  assertBindingPolicies(graph);
  return graph;
}

export function hashApplicationGraphV3(input: unknown): Sha256Digest {
  return digestJson(assertApplicationGraphV3(input)) as Sha256Digest;
}
