import { matchEventRegistrationBlueprintV1 } from "./event-registration-blueprint-witness.js";
import { matchCustomerRequestsBlueprintV1 } from "./customer-requests-blueprint-witness.js";
import { matchServiceWorkOrdersBlueprintV1 } from "./service-work-orders-blueprint-witness.js";
import {
  quantityUnitPriceTotalSchema,
  isCalculatedFieldSetValid,
} from "./calculated-request-total.js";
import { z } from "zod";
import {
  isNumericFieldDomainValidForType,
  numericFieldDomainSchema,
} from "./numeric-field-domain.js";

import {
  CompositionError,
  digestJson,
  factoryOwnedRecordIdentityDeclarationError,
  graphFieldKeySchema,
  graphKeySchema,
  identifierSchema,
  isFactoryOwnedRecordIdentityFieldKey,
  parseStrict,
  safeBusinessTextSchema,
  sha256DigestSchema,
} from "./composition-shared.js";

/** Approved page intents the deterministic composer may derive routes from. */
export const pageIntentSchema = z.enum([
  "dashboard",
  "list",
  "form",
  "detail",
  "queue",
  "calendar",
  "settings",
]);

/** Approved field types the deterministic composer may render. */
export const blueprintFieldTypeSchema = z.enum([
  "text",
  "long-text",
  "number",
  "currency",
  "boolean",
  "date",
  "datetime",
  "enum",
  "reference",
  "file",
]);

/**
 * The bounded business-action vocabulary a blueprint may declare. This is the
 * deterministic capability lock: the composed runtime authorizes
 * `(role, entity, event)` against grants of exactly these verbs, so both the
 * permission grants and the workflow transitions must be drawn from it. The
 * model proposes which of the approved verbs apply; it may never invent a
 * verb outside the vocabulary (a transition the runtime could never grant).
 */
export const blueprintActionVerbs = [
  "create",
  "read",
  "update",
  "delete",
  "submit",
  "approve",
  "reject",
  "confirm",
  "reschedule",
  "cancel",
  "audit",
  "manage",
  "start",
  "complete",
  "reopen",
  "read-availability",
  "assign",
  "reassign",
  "resolve",
  "reply",
  "check-in",
  "undo-check-in",
] as const;

/** Approved business actions a blueprint actor may hold over an entity. */
export const blueprintActionSchema = z.enum(blueprintActionVerbs);

// Actor, entity, workflow, and page-intent keys become graph-symbol segments
// verbatim (`graph.policy.<key>`, `graph.domain.<key>`, `graph.flow.<key>`,
// `graph.page.<key>`), so they must be lowercase-kebab graph keys. Field keys
// become graph domain entity field keys verbatim (`domain.entities[].fields[].key`),
// whose grammar is lowercase-first camelCase with underscores — never hyphens.
// Workflow state keys become graph flow state identifiers verbatim
// (`flow.flows[].states[].key`), which are lowercase-kebab like the other graph
// symbols. Each is locked to the exact grammar the Application Graph will
// re-validate at the apply seam.
const blueprintActorSchema = z
  .object({
    key: graphKeySchema,
    label: safeBusinessTextSchema.max(160),
    description: safeBusinessTextSchema.max(500).optional(),
    permissions: z
      .array(
        z
          .object({
            entityKey: identifierSchema,
            actions: z.array(blueprintActionSchema).min(1).max(12),
          })
          .strict(),
      )
      .min(1)
      .max(30),
  })
  .strict();

const blueprintEntityFieldSchema = z
  .object({
    key: graphFieldKeySchema,
    label: safeBusinessTextSchema.max(160),
    description: safeBusinessTextSchema.max(500).optional(),
    type: blueprintFieldTypeSchema,
    required: z.boolean(),
    options: z.array(safeBusinessTextSchema.max(160)).min(2).max(50).optional(),
    referenceTo: identifierSchema.optional(),
    numericDomain: numericFieldDomainSchema.optional(),
    calculation: quantityUnitPriceTotalSchema.optional(),
  })
  .strict();

const blueprintEntitySchema = z
  .object({
    key: graphKeySchema,
    label: safeBusinessTextSchema.max(160),
    description: safeBusinessTextSchema.max(500).optional(),
    fields: z.array(blueprintEntityFieldSchema).min(1).max(60),
  })
  .strict();

const blueprintPageIntentSchema = z
  .object({
    key: graphKeySchema,
    label: safeBusinessTextSchema.max(160),
    intent: pageIntentSchema,
    entityKey: identifierSchema.optional(),
  })
  .strict();

const blueprintStateSchema = z
  .object({
    key: graphKeySchema,
    label: safeBusinessTextSchema.max(160),
  })
  .strict();

// A transition key is the event the generated API authorizes
// `(role, entity, event)` against, so it must come from the same bounded
// action vocabulary the permission grants are drawn from. A key outside the
// vocabulary could never be granted and the runtime could never serve it.
const blueprintTransitionSchema = z
  .object({
    key: z.enum(blueprintActionVerbs),
    from: identifierSchema,
    to: identifierSchema,
    label: safeBusinessTextSchema.max(160),
    actorKey: identifierSchema,
  })
  .strict();

const blueprintWorkflowSchema = z
  .object({
    key: graphKeySchema,
    label: safeBusinessTextSchema.max(160),
    entityKey: identifierSchema,
    states: z.array(blueprintStateSchema).min(2).max(20),
    transitions: z.array(blueprintTransitionSchema).min(1).max(40),
  })
  .strict();

const blueprintJourneyStepSchema = z
  .object({
    actorKey: identifierSchema,
    action: safeBusinessTextSchema.max(500),
  })
  .strict();

const blueprintJourneySchema = z
  .object({
    key: identifierSchema,
    description: safeBusinessTextSchema.max(500),
    steps: z.array(blueprintJourneyStepSchema).min(1).max(20),
  })
  .strict();

/**
 * A constrained semantic blueprint derived from a free-form business brief.
 * It proposes business semantics only — actors, entities with typed fields,
 * page intents from the approved enum, workflows with states and transitions,
 * and acceptance journeys. It can never carry routes, URLs, paths, capability
 * or package selections, source, or provider material: those fields do not
 * exist, the identifier/type schemas are exact-key, and every text surface is
 * business text.
 */
export const productBlueprintSchema = z
  .object({
    apiVersion: z.literal("factory.product-blueprint/v1"),
    requirementChecksum: sha256DigestSchema,
    title: safeBusinessTextSchema.max(200),
    actors: z.array(blueprintActorSchema).min(1).max(20),
    entities: z.array(blueprintEntitySchema).min(1).max(30),
    pageIntents: z.array(blueprintPageIntentSchema).min(1).max(40),
    workflows: z.array(blueprintWorkflowSchema).min(1).max(20),
    acceptanceJourneys: z.array(blueprintJourneySchema).min(1).max(20),
  })
  .strict();

export type ProductBlueprintV1 = z.infer<typeof productBlueprintSchema>;
export type BlueprintActorV1 = z.infer<typeof blueprintActorSchema>;
export type BlueprintEntityV1 = z.infer<typeof blueprintEntitySchema>;
export type BlueprintEntityFieldV1 = z.infer<typeof blueprintEntityFieldSchema>;
export type BlueprintPageIntentV1 = z.infer<typeof blueprintPageIntentSchema>;
export type BlueprintWorkflowV1 = z.infer<typeof blueprintWorkflowSchema>;
export type BlueprintStateV1 = z.infer<typeof blueprintStateSchema>;
export type BlueprintTransitionV1 = z.infer<typeof blueprintTransitionSchema>;
export type BlueprintJourneyV1 = z.infer<typeof blueprintJourneySchema>;

function assertUniqueKeys(
  items: readonly { key: string }[],
  label: string,
): void {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.key)) {
      throw new CompositionError(
        `Blueprint ${label} key '${item.key}' is duplicated.`,
      );
    }
    seen.add(item.key);
  }
}

function assertFieldShape(
  field: BlueprintEntityFieldV1,
  entityKey: string,
  entityKeys: ReadonlySet<string>,
): void {
  if (
    field.numericDomain !== undefined &&
    ((field.type !== "number" && field.type !== "currency") ||
      !isNumericFieldDomainValidForType(
        field.numericDomain,
        field.type === "number" ? "integer" : "decimal",
      ))
  ) {
    throw new CompositionError(
      `Field '${field.key}' of entity '${entityKey}' declares an invalid numeric domain for its type.`,
    );
  }
  if (field.type === "enum" && field.options === undefined) {
    throw new CompositionError(
      `Field '${field.key}' of entity '${entityKey}' is an enum and requires options.`,
    );
  }
  if (field.type !== "enum" && field.options !== undefined) {
    throw new CompositionError(
      `Field '${field.key}' of entity '${entityKey}' declares options but is not an enum field.`,
    );
  }
  if (field.type === "reference") {
    if (field.referenceTo === undefined) {
      throw new CompositionError(
        `Field '${field.key}' of entity '${entityKey}' is a reference and requires referenceTo.`,
      );
    }
    if (!entityKeys.has(field.referenceTo)) {
      throw new CompositionError(
        `Field '${field.key}' of entity '${entityKey}' references unknown entity '${field.referenceTo}'.`,
      );
    }
  } else if (field.referenceTo !== undefined) {
    throw new CompositionError(
      `Field '${field.key}' of entity '${entityKey}' sets referenceTo but is not a reference field.`,
    );
  }
}

/**
 * Validates a product blueprint: exact-key schema first, then semantic
 * cross-references (duplicate keys, unknown entity/state/actor references,
 * field type/enum/reference pairing). Route, URL, path, capability, package,
 * and provider material cannot exist in the validated record.
 */
export function assertProductBlueprint(input: unknown): ProductBlueprintV1 {
  const blueprint = parseStrict(productBlueprintSchema, input);
  const workOrders = matchServiceWorkOrdersBlueprintV1(blueprint);
  const customerRequests = matchCustomerRequestsBlueprintV1(blueprint);
  const eventRegistration = matchEventRegistrationBlueprintV1(blueprint);
  if (
    !eventRegistration &&
    (blueprint.entities.some(
      (entity) =>
        [
          "startUtc",
          "endUtc",
          "capacity",
          "cancellationReason",
          "cancelledAt",
        ].every((key) => entity.fields.some((field) => field.key === key)) ||
        (["event", "eventId", "registration", "registrationId"].some((key) =>
          entity.fields.some((field) => field.key === key),
        ) &&
          entity.fields.some((field) => field.key === "actorPrincipalId")),
    ) ||
      blueprint.entities.some((entity) =>
        entity.fields.some((field) =>
          [
            "attendeePrincipalId",
            "reservedSeats",
            "eventVersion",
            "registrationVersion",
          ].includes(field.key),
        ),
      ) ||
      blueprint.actors.some((actor) =>
        actor.permissions.some((permission) =>
          permission.actions.some((action) =>
            ["check-in", "undo-check-in"].includes(action),
          ),
        ),
      ) ||
      blueprint.workflows.some((workflow) =>
        workflow.transitions.some((transition) =>
          ["check-in", "undo-check-in"].includes(transition.key),
        ),
      ))
  )
    throw new CompositionError(
      "Event ownership and attendance require the complete Event Registration Blueprint.",
    );
  if (
    !customerRequests &&
    (blueprint.entities.some((entity) =>
      entity.fields.some((field) =>
        ["customerPrincipalId", "requestVersion", "correctsVersion"].includes(
          field.key,
        ),
      ),
    ) ||
      blueprint.actors.some((actor) =>
        actor.permissions.some((permission) =>
          permission.actions.includes("reply"),
        ),
      ) ||
      blueprint.workflows.some((workflow) =>
        workflow.transitions.some((transition) => transition.key === "reply"),
      ))
  )
    throw new CompositionError(
      "Replies and request ownership require the complete Customer Requests Blueprint.",
    );
  if (
    !workOrders &&
    (blueprint.actors.some((actor) =>
      actor.permissions.some((permission) =>
        permission.actions.some((action) =>
          ["assign", "reassign", "resolve"].includes(action),
        ),
      ),
    ) ||
      blueprint.workflows.some((workflow) =>
        workflow.transitions.some((transition) =>
          ["assign", "reassign", "resolve"].includes(transition.key),
        ),
      ))
  )
    throw new CompositionError(
      "Assignment and resolution require the complete Service Work Orders Blueprint.",
    );
  for (const entity of blueprint.entities) {
    if (
      entity.fields.some((field) =>
        isFactoryOwnedRecordIdentityFieldKey(field.key),
      )
    ) {
      throw new CompositionError(factoryOwnedRecordIdentityDeclarationError);
    }
  }
  assertUniqueKeys(blueprint.actors, "actor");
  assertUniqueKeys(blueprint.entities, "entity");
  assertUniqueKeys(blueprint.pageIntents, "page intent");
  assertUniqueKeys(blueprint.workflows, "workflow");
  assertUniqueKeys(blueprint.acceptanceJourneys, "acceptance journey");

  const entityKeys = new Set(blueprint.entities.map((entity) => entity.key));
  const actorKeys = new Set(blueprint.actors.map((actor) => actor.key));

  // The grant map backs the flow consistency invariant below: every declared
  // transition event must be granted to its actor, or the composed runtime's
  // policy could never serve the declared flow (every transition composes
  // verbatim into `flow.flows[].transitions[]` and the generated API
  // authorizes `(role, entity, event)` against the composed permissions).
  const grantedActions = new Map<
    string,
    ReadonlyMap<string, ReadonlySet<string>>
  >();
  for (const actor of blueprint.actors) {
    const byEntity = new Map<string, Set<string>>();
    for (const permission of actor.permissions) {
      byEntity.set(permission.entityKey, new Set(permission.actions));
    }
    grantedActions.set(actor.key, byEntity);
  }

  for (const actor of blueprint.actors) {
    const entityKeysSeen = new Set<string>();
    for (const permission of actor.permissions) {
      if (!entityKeys.has(permission.entityKey)) {
        throw new CompositionError(
          `Actor '${actor.key}' permission references unknown entity '${permission.entityKey}'.`,
        );
      }
      if (entityKeysSeen.has(permission.entityKey)) {
        throw new CompositionError(
          `Actor '${actor.key}' declares duplicate permission for entity '${permission.entityKey}'.`,
        );
      }
      entityKeysSeen.add(permission.entityKey);
    }
  }

  for (const entity of blueprint.entities) {
    assertUniqueKeys(entity.fields, `field`);
    if (!isCalculatedFieldSetValid(entity.fields))
      throw new CompositionError(
        "Invalid calculated request total field relationships.",
      );
    for (const field of entity.fields) {
      assertFieldShape(field, entity.key, entityKeys);
    }
  }

  for (const page of blueprint.pageIntents) {
    if (page.entityKey !== undefined && !entityKeys.has(page.entityKey)) {
      throw new CompositionError(
        `Page '${page.key}' references unknown entity '${page.entityKey}'.`,
      );
    }
  }

  for (const workflow of blueprint.workflows) {
    if (!entityKeys.has(workflow.entityKey)) {
      throw new CompositionError(
        `Workflow '${workflow.key}' references unknown entity '${workflow.entityKey}'.`,
      );
    }
    assertUniqueKeys(workflow.states, `state`);
    assertUniqueKeys(
      workOrders || eventRegistration
        ? workflow.transitions.filter(
            (transition, index) =>
              transition.key !== "cancel" ||
              index ===
                workflow.transitions.findIndex((item) => item.key === "cancel"),
          )
        : workflow.transitions,
      `transition`,
    );
    const stateKeys = new Set(workflow.states.map((state) => state.key));
    for (const transition of workflow.transitions) {
      if (!stateKeys.has(transition.from)) {
        throw new CompositionError(
          `Transition '${transition.key}' references unknown state '${transition.from}'.`,
        );
      }
      if (!stateKeys.has(transition.to)) {
        throw new CompositionError(
          `Transition '${transition.key}' references unknown state '${transition.to}'.`,
        );
      }
      if (!actorKeys.has(transition.actorKey)) {
        throw new CompositionError(
          `Transition '${transition.key}' references unknown actor '${transition.actorKey}'.`,
        );
      }
      const grants = grantedActions
        .get(transition.actorKey)
        ?.get(workflow.entityKey);
      if (grants === undefined || !grants.has(transition.key)) {
        throw new CompositionError(
          `Transition '${transition.key}' of workflow '${workflow.key}' is not granted to its actor '${transition.actorKey}' for entity '${workflow.entityKey}' — the composed runtime could never serve the declared flow. Grant '${transition.key}' to the actor, or drop the transition.`,
        );
      }
    }
  }

  for (const journey of blueprint.acceptanceJourneys) {
    for (const step of journey.steps) {
      if (!actorKeys.has(step.actorKey)) {
        throw new CompositionError(
          `Journey step references unknown actor '${step.actorKey}'.`,
        );
      }
    }
  }

  return blueprint;
}

export function parseProductBlueprint(input: unknown): ProductBlueprintV1 {
  return assertProductBlueprint(input);
}

export function hashProductBlueprint(input: unknown): string {
  return digestJson(assertProductBlueprint(input));
}
