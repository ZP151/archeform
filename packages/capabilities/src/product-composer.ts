import {
  CompositionError,
  matchServiceWorkOrdersBlueprintV1,
  matchCustomerRequestsBlueprintV1,
  matchEventRegistrationBlueprintV1,
  createCalculatedRequestTotalRuntime,
  isNumericFieldValueAllowed,
  assertCompositionPlan,
  assertProductBlueprint,
  canonicalEquals,
  hashApplicationGraph,
  hashApplicationGraphV3,
  hashProductCompositionDiff,
  type ApplicationGraphV3,
  type ApplicationGraphV1,
  type BlueprintEntityFieldV1,
  type CompositionPlanV1,
  type DraftRevisionV1,
  type GraphDiffV1,
  type ExperienceBriefV1,
  type ProductBlueprintV1,
  type ProductIntentV1,
  type ProductRecipeV2,
} from "@factory/graph";

import type {
  CapabilityBindingValueV1,
  CapabilitySelectionV1,
} from "./composition.js";
import { currentCapabilityAssets } from "./assets/index.js";
import { copyStrictOwnDataEnvelope } from "./commerce/product-recipe.js";
import {
  assertProductCapabilityCatalogue,
  currentCapabilityCatalogue,
  selectProductRecipeForIntent,
  type ProductCapabilityCatalogueV1,
} from "./capability-catalogue.js";
import { composeRestaurantProductGraph } from "./restaurant/product-graph.js";

/**
 * Deterministic composition of an accepted blueprint into a complete
 * Application Graph Diff over a blank Draft. The composer never selects
 * capability versions, routes, packages, providers, or credentials: it only
 * derives business semantics the plan already locked, and every derivation
 * rule below is pinned by tests. The model may propose business semantics
 * only — everything on this module's output surface is the planner's
 * approved capability lock material plus blueprint-derived content.
 */

const NAV_ICONS: Readonly<Record<string, string>> = Object.freeze({
  dashboard: "layout-grid",
  list: "list",
  queue: "inbox",
  calendar: "calendar",
  settings: "settings",
});

const NAV_INTENTS: ReadonlySet<string> = new Set([
  "dashboard",
  "list",
  "queue",
  "calendar",
  "settings",
]);

const BLOCK_TYPES: Readonly<Record<string, string>> = Object.freeze({
  dashboard: "stats",
  list: "list",
  form: "form",
  detail: "detail",
  queue: "queue",
  calendar: "calendar",
  settings: "settings",
});

/** Blueprint field types the approved Graph field schema can render. */
type BlueprintFieldType = BlueprintEntityFieldV1["type"];
type DomainFieldType =
  ApplicationGraphV1["domain"]["entities"][number]["fields"][number]["type"];
const FIELD_TYPES: Readonly<Record<BlueprintFieldType, DomainFieldType>> =
  Object.freeze({
    text: "string",
    "long-text": "text",
    number: "integer",
    currency: "decimal",
    boolean: "boolean",
    date: "date",
    datetime: "datetime",
    enum: "enum",
    file: "url",
    // Reference blueprint fields render as string fields; the dedicated
    // relation branch handles the link, this entry only closes the map.
    reference: "string",
  });

export interface ComposeProductRecipeInput {
  readonly intent: ProductIntentV1;
  readonly experience: ExperienceBriefV1;
  readonly baseDraft: DraftRevisionV1;
  readonly proposedRecipeKey?: string;
}

export interface ComposeProductRecipeOutcome {
  readonly recipe: ProductRecipeV2;
  readonly graph: ApplicationGraphV3;
  readonly graphHash: string;
}

export function composeProductRecipe(
  input: ComposeProductRecipeInput,
): ComposeProductRecipeOutcome;
export function composeProductRecipe(
  input: unknown,
): ComposeProductRecipeOutcome {
  const envelope = copyStrictOwnDataEnvelope(
    input,
    ["intent", "experience", "baseDraft"],
    ["proposedRecipeKey"],
    "Product Recipe composition input is invalid.",
  );
  const proposedRecipeKey = envelope.proposedRecipeKey;
  if (
    proposedRecipeKey !== undefined &&
    (typeof proposedRecipeKey !== "string" ||
      proposedRecipeKey.length > 128 ||
      !/^[a-z][a-z0-9-]*$/.test(proposedRecipeKey))
  ) {
    throw new CompositionError("Product Recipe composition input is invalid.");
  }
  const parsedInput: ComposeProductRecipeInput = {
    intent: envelope.intent as ProductIntentV1,
    experience: envelope.experience as ExperienceBriefV1,
    baseDraft: envelope.baseDraft as DraftRevisionV1,
    ...(proposedRecipeKey === undefined ? {} : { proposedRecipeKey }),
  };
  const recipe = selectProductRecipeForIntent({
    intent: parsedInput.intent,
    ...(proposedRecipeKey === undefined ? {} : { proposedRecipeKey }),
  });
  if (recipe === undefined || recipe.key !== "restaurant-ordering") {
    throw new CompositionError(
      `No eligible deterministic Product Recipe exists for intent '${parsedInput.intent.productType}'.`,
    );
  }
  const graph = composeRestaurantProductGraph(parsedInput);
  return { recipe, graph, graphHash: hashApplicationGraphV3(graph) };
}

export interface ProductDerivationInput {
  readonly blueprint: ProductBlueprintV1;
  /** The Graph application id of the blank base Draft (`metadata.id`). */
  readonly applicationId: string;
  /** Capability keys the alternative locked; the derivation responds to them. */
  readonly selectedKeys: readonly string[];
}

export interface ProductDerivationOutcome {
  readonly diff: GraphDiffV1;
  readonly checksum: string;
}

export function hasApprovalDecision(blueprint: ProductBlueprintV1): boolean {
  return blueprint.actors.some((actor) =>
    actor.permissions.some((permission) =>
      permission.actions.some(
        (action) => action === "approve" || action === "reject",
      ),
    ),
  );
}

function isDecisionActor(
  blueprint: ProductBlueprintV1,
  actorKey: string,
): boolean {
  const actor = blueprint.actors.find(
    (candidate) => candidate.key === actorKey,
  );
  return (
    actor !== undefined &&
    actor.permissions.some((permission) =>
      permission.actions.some(
        (action) => action === "approve" || action === "reject",
      ),
    )
  );
}

function firstEntityKey(blueprint: ProductBlueprintV1): string {
  return blueprint.entities[0].key;
}

/**
 * The primary list page of an entity: the blueprint's first `list` intent
 * for it, or the derived `{entity}-list` page when the blueprint declared
 * none.
 */
export function primaryListPage(
  blueprint: ProductBlueprintV1,
  entityKey: string,
): string {
  const declared = blueprint.pageIntents.find(
    (intent) => intent.intent === "list" && intent.entityKey === entityKey,
  );
  return declared === undefined ? `${entityKey}-list` : declared.key;
}

/** Every derived page route is `/{page key}`; never model-supplied. */
function derivedPages(
  blueprint: ProductBlueprintV1,
): ApplicationGraphV1["page"]["pages"] {
  const firstEntity = firstEntityKey(blueprint);
  const firstWorkflowEntity = blueprint.workflows[0]?.entityKey;
  const dateEntity = blueprint.entities.find((entity) =>
    entity.fields.some(
      (field) => field.type === "date" || field.type === "datetime",
    ),
  );
  const entityFor = (intent: {
    readonly entityKey?: string;
  }): string | undefined => intent.entityKey ?? firstEntity;

  const pages: ApplicationGraphV1["page"]["pages"] = [];
  for (const intent of blueprint.pageIntents) {
    const type = BLOCK_TYPES[intent.intent];
    let entity: string | undefined;
    if (intent.intent === "queue") {
      entity = intent.entityKey ?? firstWorkflowEntity ?? firstEntity;
    } else if (intent.intent === "calendar") {
      entity = intent.entityKey ?? dateEntity?.key ?? firstEntity;
    } else if (intent.intent === "settings") {
      entity = intent.entityKey;
    } else {
      entity = entityFor(intent);
    }
    // Unbound blocks (for example a settings page without a target entity)
    // carry no entity key at all: the Graph schema marks it optional, and
    // compiler target plans reject explicit undefined values.
    const block = {
      id: `${intent.key}-${type}`,
      type,
      ...(entity === undefined ? {} : { entity }),
    };
    pages.push({
      id: intent.key,
      route: `/${intent.key}`,
      title: intent.label,
      blocks: [block],
    });
  }
  // Inventory movement history is composed inside item detail, never an extra CRUD page.
  if (
    isInventoryOperationsBlueprint(blueprint) ||
    matchServiceWorkOrdersBlueprintV1(blueprint) ||
    matchCustomerRequestsBlueprintV1(blueprint) ||
    matchEventRegistrationBlueprintV1(blueprint)
  )
    return pages;
  for (const entity of blueprint.entities) {
    if (
      blueprint.pageIntents.some(
        (intent) => intent.intent === "list" && intent.entityKey === entity.key,
      )
    ) {
      continue;
    }
    pages.push({
      id: `${entity.key}-list`,
      route: `/${entity.key}-list`,
      title: entity.label,
      blocks: [
        { id: `${entity.key}-list-list`, type: "list", entity: entity.key },
      ],
    });
  }
  return pages;
}

function derivedNavigation(
  blueprint: ProductBlueprintV1,
  pages: ApplicationGraphV1["page"]["pages"],
): ApplicationGraphV1["page"]["navigation"] {
  const eventRegistration = matchEventRegistrationBlueprintV1(blueprint);
  if (eventRegistration)
    return [0, 3, 4].map((index, i) => ({
      id: `nav-${pages[index]!.id}`,
      label: pages[index]!.title,
      pageId: pages[index]!.id,
      icon: ["list", "user", "check"][i]!,
    }));
  const intentOf = (pageId: string): string =>
    blueprint.pageIntents.find((intent) => intent.key === pageId)?.intent ??
    "list";
  return pages
    .filter((page) => NAV_INTENTS.has(intentOf(page.id)))
    .map((page) => ({
      id: `nav-${page.id}`,
      label: page.title,
      pageId: page.id,
      icon: NAV_ICONS[intentOf(page.id)!],
    }));
}

function derivedEntities(
  blueprint: ProductBlueprintV1,
  applicationId: string,
): ApplicationGraphV1["domain"]["entities"] {
  const workflowStateValues = new Map<string, readonly string[]>();
  for (const workflow of blueprint.workflows) {
    const states = workflow.states.map((state) => state.key);
    const existing = workflowStateValues.get(workflow.entityKey) ?? [];
    workflowStateValues.set(
      workflow.entityKey,
      [...existing, ...states].filter(
        (state, index, all) => all.indexOf(state) === index,
      ),
    );
  }

  const entities: ApplicationGraphV1["domain"]["entities"] = [];
  for (const entity of blueprint.entities) {
    const fields: ApplicationGraphV1["domain"]["entities"][number]["fields"] =
      entity.fields.map((field) => {
        if (field.type === "reference") {
          return {
            key: referenceScalarKey(field.key),
            type: "string",
            required: field.required,
          };
        }
        if (field.type === "enum") {
          return {
            key: field.key,
            type: "enum",
            required: field.required,
            values: field.options,
          };
        }
        return {
          key: field.key,
          type: FIELD_TYPES[field.type],
          required: field.required,
          ...(field.numericDomain
            ? { numericDomain: field.numericDomain }
            : {}),
          ...(field.calculation ? { calculation: field.calculation } : {}),
        };
      });
    const states = workflowStateValues.get(entity.key);
    if (
      states !== undefined &&
      !fields.some((field) => field.key === "status")
    ) {
      fields.push({
        key: "status",
        type: "enum",
        required: true,
        values: [...states],
      });
    }
    const mapped: ApplicationGraphV1["domain"]["entities"][number] = {
      key: entity.key,
      label: entity.label,
      fields,
      indexes: fields.some((field) => field.key === "status")
        ? [{ fields: ["status"] }]
        : [],
    };
    if (isInventoryOperationsBlueprint(blueprint)) {
      if (entity === blueprint.entities[0])
        fields.find((field) => field.key === "sku")!.unique = true;
      else
        mapped.indexes.push({
          fields: ["stockItemId", "itemVersion"],
          unique: true,
        });
    }
    if (
      matchServiceWorkOrdersBlueprintV1(blueprint)?.historyEntity === entity.key
    )
      mapped.indexes.push({
        fields: ["workOrderId", "orderVersion"],
        unique: true,
      });
    const customerRequests = matchCustomerRequestsBlueprintV1(blueprint);
    if (customerRequests?.requestEntity === entity.key)
      mapped.indexes.push({ fields: ["customerPrincipalId"] });
    if (customerRequests?.historyEntity === entity.key)
      mapped.indexes.push({
        fields: ["requestId", "requestVersion"],
        unique: true,
      });
    const eventRegistration = matchEventRegistrationBlueprintV1(blueprint);
    if (eventRegistration) {
      if (entity.key === eventRegistration.eventEntity)
        mapped.indexes = [
          { fields: ["status", "startUtc"] },
          { fields: ["startUtc"] },
        ];
      if (entity.key === eventRegistration.registrationEntity)
        mapped.indexes = [
          { fields: ["eventId", "attendeePrincipalId"], unique: true },
          { fields: ["eventId", "status"] },
          { fields: ["attendeePrincipalId"] },
        ];
      if (entity.key === eventRegistration.eventHistoryEntity)
        mapped.indexes = [
          { fields: ["eventId", "eventVersion"], unique: true },
        ];
      if (entity.key === eventRegistration.registrationHistoryEntity)
        mapped.indexes = [
          { fields: ["registrationId", "registrationVersion"], unique: true },
        ];
    }
    entities.push(mapped);
  }

  const roleValues = blueprint.actors.map((actor) => actor.key);
  entities.push(
    {
      key: `${applicationId}-principal`,
      label: `${blueprint.title} principal`,
      fields: [
        { key: "subjectRef", type: "string", required: true, unique: true },
        { key: "role", type: "enum", required: true, values: roleValues },
        { key: "active", type: "boolean", required: true },
      ],
      indexes: [{ fields: ["active"] }],
    },
    {
      key: `${applicationId}-session`,
      label: `${blueprint.title} session`,
      fields: [
        { key: "subjectRef", type: "string", required: true },
        {
          key: "status",
          type: "enum",
          required: true,
          values: ["active", "expired"],
        },
        { key: "expiresAt", type: "datetime", required: true },
      ],
      indexes: [{ fields: ["subjectRef", "status"] }],
    },
  );
  return entities;
}

/**
 * Graph v1 relations do not carry an explicit target-field contract. The
 * database compiler therefore treats `*Id` and `*Key` scalar names as an
 * unambiguous reference to the target's injected id. Preserve already
 * explicit names and make every semantic reference name explicit before the
 * Graph crosses the immutable publish boundary.
 */
function referenceScalarKey(fieldKey: string): string {
  return /(?:id|key)$/i.test(fieldKey) ? fieldKey : `${fieldKey}Id`;
}

/** Recognize stock-specific structure even when required quantity coordinates are missing. */
function isInventoryCandidate(blueprint: ProductBlueprintV1): boolean {
  const entities = blueprint.entities.map((entity) => ({
    keys: new Set(entity.fields.map((field) => field.key)),
    stockKinds: entity.fields.some(
      (field) =>
        field.key === "kind" &&
        ["receive", "issue", "adjust"].every((kind) =>
          field.options?.includes(kind),
        ),
    ),
  }));
  const reference = (entity: (typeof entities)[number]) =>
    entity.keys.has("stockItem") || entity.keys.has("stockItemId");
  return (
    entities.some(
      (entity) =>
        ["sku", "unit", "quantity"].every((key) => entity.keys.has(key)) ||
        ["delta", "beforeQuantity", "afterQuantity"].every((key) =>
          entity.keys.has(key),
        ) ||
        (reference(entity) && entity.stockKinds),
    ) ||
    entities.some(
      (item) =>
        item.keys.has("sku") &&
        item.keys.has("unit") &&
        entities.some(
          (movement) =>
            movement !== item && (reference(movement) || movement.stockKinds),
        ),
    )
  );
}

/** The accepted Directory blueprint semantics, independent of definition metadata. */
export function isContentDirectoryBlueprint(
  blueprint: ProductBlueprintV1,
): boolean {
  const [entity] = blueprint.entities;
  const [reader, curator] = blueprint.actors;
  const [workflow] = blueprint.workflows;
  if (
    !entity ||
    !reader ||
    !curator ||
    !workflow ||
    blueprint.entities.length !== 1 ||
    blueprint.actors.length !== 2 ||
    blueprint.workflows.length !== 1 ||
    reader.key === curator.key
  )
    return false;
  const options = entity.fields[3]?.options;
  if (
    !options ||
    options.length < 2 ||
    options.length > 12 ||
    options.some(
      (value) =>
        value !== value.trim() ||
        value.length < 1 ||
        value.length > 40 ||
        /[\u0000-\u001f\u007f]/.test(value),
    )
  )
    return false;
  const normalized = options.map((value) => value.trim().normalize("NFC"));
  if (
    normalized.some((value, index) => {
      const literal = value.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
      const pattern = new RegExp(`^(?:${literal})$`, "iu");
      return normalized.slice(index + 1).some((other) => pattern.test(other));
    })
  )
    return false;
  return (
    [reader, curator].every((actor, index) =>
      canonicalEquals(
        actor.permissions.map(({ entityKey, actions }) => ({
          entityKey,
          actions: [...actions].sort(),
        })),
        [
          {
            entityKey: entity.key,
            actions:
              index === 0
                ? ["read"]
                : ["cancel", "create", "read", "submit", "update"],
          },
        ],
      ),
    ) &&
    canonicalEquals(
      entity.fields.map(
        ({ label: _label, description: _description, ...field }) => field,
      ),
      [
        { key: "title", type: "text", required: true },
        { key: "summary", type: "text", required: true },
        { key: "body", type: "long-text", required: true },
        { key: "category", type: "enum", required: true, options },
      ],
    ) &&
    canonicalEquals(
      blueprint.pageIntents.map(({ intent, entityKey }) => ({
        intent,
        entityKey,
      })),
      ["list", "form", "detail"].map((intent) => ({
        intent,
        entityKey: entity.key,
      })),
    ) &&
    workflow.entityKey === entity.key &&
    canonicalEquals(
      workflow.states.map(({ key }) => key),
      ["hidden", "listed"],
    ) &&
    canonicalEquals(
      workflow.transitions.map(({ key, from, to, actorKey, label }) => [
        key,
        from,
        to,
        actorKey,
        label,
      ]),
      [
        ["submit", "hidden", "listed", curator.key, "Show entry"],
        ["cancel", "listed", "hidden", curator.key, "Hide entry"],
      ],
    )
  );
}

export function isInventoryOperationsBlueprint(
  blueprint: ProductBlueprintV1,
  selectedKeys?: readonly string[],
): boolean {
  if (
    blueprint.entities.length !== 2 ||
    blueprint.actors.length !== 2 ||
    blueprint.workflows.length !== 1 ||
    blueprint.pageIntents.length !== 3
  )
    return false;
  if (
    selectedKeys &&
    (selectedKeys.length !== 6 ||
      ![
        "core.crud",
        "core.workflow",
        "core.identity-policy",
        "core.policy-declarations",
        "core.audit",
        "core.notification",
      ].every((key) => selectedKeys.includes(key)))
  )
    return false;
  const [item, movement] = blueprint.entities;
  const [stockkeeper, observer] = blueprint.actors;
  const flow = blueprint.workflows[0]!;
  const domain = (minimum: number, maximum: number) => ({
    apiVersion: "factory.numeric-field-domain/v1",
    minimum: { value: minimum, inclusive: true },
    maximum: { value: maximum, inclusive: true },
  });
  const field = (key: string, type: string, required = true) => ({
    key,
    type,
    required,
  });
  const numeric = (key: string, min: number, max: number) => ({
    ...field(key, "number"),
    numericDomain: domain(min, max),
  });
  const semantics = (fields: typeof item.fields) =>
    fields.map(({ label: _label, ...value }) => value);
  return (
    item.key !== movement.key &&
    stockkeeper.key !== observer.key &&
    canonicalEquals(semantics(item.fields), [
      field("sku", "text"),
      field("name", "text"),
      field("unit", "text"),
      numeric("quantity", 0, 1000000000),
    ]) &&
    canonicalEquals(semantics(movement.fields), [
      { ...field("stockItem", "reference"), referenceTo: item.key },
      { ...field("kind", "enum"), options: ["receive", "issue", "adjust"] },
      numeric("delta", -1000000000, 1000000000),
      numeric("beforeQuantity", 0, 1000000000),
      numeric("afterQuantity", 0, 1000000000),
      numeric("itemVersion", 1, 2147483647),
      field("reason", "long-text"),
      field("actorRole", "text"),
      field("recordedAt", "datetime"),
      field("correctionOf", "text", false),
    ]) &&
    canonicalEquals(stockkeeper.permissions, [
      { entityKey: item.key, actions: ["create", "read", "update"] },
      {
        entityKey: movement.key,
        actions: ["create", "read", "submit", "audit"],
      },
    ]) &&
    canonicalEquals(observer.permissions, [
      { entityKey: item.key, actions: ["read"] },
    ]) &&
    flow.entityKey === movement.key &&
    canonicalEquals(
      flow.states.map((state) => state.key),
      ["draft", "recorded"],
    ) &&
    canonicalEquals(
      flow.transitions.map(({ label: _label, ...value }) => value),
      [
        {
          key: "submit",
          from: "draft",
          to: "recorded",
          actorKey: stockkeeper.key,
        },
      ],
    ) &&
    canonicalEquals(
      blueprint.pageIntents.map(
        ({ key: _key, label: _label, ...value }) => value,
      ),
      ["list", "form", "detail"].map((intent) => ({
        intent,
        entityKey: item.key,
      })),
    )
  );
}

const positiveAppointmentInteger = {
  apiVersion: "factory.numeric-field-domain/v1",
  minimum: { value: 0, inclusive: false },
} as const;

const appointmentLockKeys = [
  "core.crud",
  "core.workflow",
  "core.identity-policy",
  "core.policy-declarations",
  "core.audit",
  "core.notification",
  "scheduling.appointment",
] as const;

const sameArray = <T>(actual: readonly T[], expected: readonly T[]) =>
  actual.length === expected.length &&
  actual.every((value, index) => value === expected[index]);

const exactPositiveAppointmentInteger = (
  value: ProductBlueprintV1["entities"][number]["fields"][number]["numericDomain"],
) => JSON.stringify(value) === JSON.stringify(positiveAppointmentInteger);

type AppointmentBindingSlot = readonly [
  inputKey: string,
  entityIndex: number,
  fieldIndex?: number,
];

const appointmentBindingSlots: readonly AppointmentBindingSlot[] = [
  ["serviceEntity", 0],
  ["serviceNameField", 0, 0],
  ["serviceDurationMinutesField", 0, 1],
  ["serviceActiveField", 0, 2],
  ["scheduleEntity", 1],
  ["scheduleServiceReferenceField", 1, 0],
  ["scheduleStartField", 1, 1],
  ["scheduleEndField", 1, 2],
  ["scheduleTimezoneField", 1, 3],
  ["scheduleCapacityField", 1, 4],
  ["scheduleStatusField", 1, 5],
  ["appointmentEntity", 2],
  ["appointmentScheduleReferenceField", 2, 0],
  ["appointmentCustomerNameField", 2, 1],
  ["appointmentNotesField", 2, 2],
  ["appointmentCancellationReasonField", 2, 3],
  ["appointmentStatusField", 2, 4],
];

/**
 * ADR-0072's closed Appointment V1 witness. It uses only typed structure and
 * ordered slots: entity and field keys may change, but labels and prose never
 * influence eligibility.
 */
export function isAppointmentBookingBlueprint(
  blueprint: ProductBlueprintV1,
  selectedKeys?: readonly string[],
): boolean {
  return isAppointmentBlueprint(blueprint, false, selectedKeys);
}

/** ADR-0081 V2 witness; only customer/staff gain bounded availability reads. */
export function isAppointmentConsumerWorkspaceBlueprint(
  blueprint: ProductBlueprintV1,
  selectedKeys?: readonly string[],
): boolean {
  return isAppointmentBlueprint(blueprint, true, selectedKeys);
}

function isAppointmentBlueprint(
  blueprint: ProductBlueprintV1,
  availability: boolean,
  selectedKeys?: readonly string[],
): boolean {
  if (
    blueprint.entities.length !== 3 ||
    blueprint.actors.length !== 3 ||
    blueprint.workflows.length !== 1 ||
    (selectedKeys !== undefined &&
      !sameArray(selectedKeys, appointmentLockKeys))
  )
    return false;
  const [service, schedule, appointment] = blueprint.entities;
  const [customer, staff, administrator] = blueprint.actors;
  const workflow = blueprint.workflows[0];
  if (
    !service ||
    !schedule ||
    !appointment ||
    !customer ||
    !staff ||
    !administrator ||
    !workflow
  )
    return false;
  const exactField = (
    field: ProductBlueprintV1["entities"][number]["fields"][number] | undefined,
    type: string,
    required: boolean,
    options?: readonly string[],
  ) =>
    field !== undefined &&
    field.type === type &&
    field.required === required &&
    field.calculation === undefined &&
    (options === undefined
      ? field.options === undefined
      : sameArray(field.options ?? [], options));
  const serviceFields = service.fields;
  const scheduleFields = schedule.fields;
  const appointmentFields = appointment.fields;
  const constrained = blueprint.entities.flatMap((entity) =>
    entity.fields.filter((field) => field.numericDomain),
  );
  if (
    serviceFields.length !== 3 ||
    scheduleFields.length !== 6 ||
    appointmentFields.length !== 5 ||
    !exactField(serviceFields[0], "text", true) ||
    !exactField(serviceFields[1], "number", true) ||
    !exactPositiveAppointmentInteger(serviceFields[1]?.numericDomain) ||
    !exactField(serviceFields[2], "boolean", true) ||
    !exactField(scheduleFields[0], "reference", true) ||
    scheduleFields[0]?.referenceTo !== service.key ||
    !exactField(scheduleFields[1], "datetime", true) ||
    !exactField(scheduleFields[2], "datetime", true) ||
    !exactField(scheduleFields[3], "text", true) ||
    !exactField(scheduleFields[4], "number", true) ||
    !exactPositiveAppointmentInteger(scheduleFields[4]?.numericDomain) ||
    !exactField(scheduleFields[5], "enum", true, ["open", "closed"]) ||
    scheduleFields[1]?.key !== "startUtc" ||
    scheduleFields[2]?.key !== "endUtc" ||
    !exactField(appointmentFields[0], "reference", true) ||
    appointmentFields[0]?.referenceTo !== schedule.key ||
    !exactField(appointmentFields[1], "text", true) ||
    !exactField(appointmentFields[2], "long-text", false) ||
    !exactField(appointmentFields[3], "long-text", false) ||
    !exactField(appointmentFields[4], "enum", true, [
      "requested",
      "confirmed",
      "cancelled",
    ]) ||
    appointmentFields[2]?.key !== "notes" ||
    appointmentFields[3]?.key !== "cancellationReason" ||
    constrained.length !== 2 ||
    constrained[0] !== serviceFields[1] ||
    constrained[1] !== scheduleFields[4]
  )
    return false;
  if (
    !sameArray(
      blueprint.actors.map(({ key }) => key),
      ["customer", "staff", "administrator"],
    ) ||
    !sameArray(
      customer.permissions.map(
        ({ entityKey, actions }) => `${entityKey}:${actions.join(",")}`,
      ),
      [
        `${appointment.key}:create,read,cancel`,
        ...(availability ? [`${schedule.key}:read-availability`] : []),
      ],
    ) ||
    !sameArray(
      staff.permissions.map(
        ({ entityKey, actions }) => `${entityKey}:${actions.join(",")}`,
      ),
      [
        `${appointment.key}:read,confirm,reschedule,cancel`,
        ...(availability ? [`${schedule.key}:read-availability`] : []),
      ],
    ) ||
    !sameArray(
      administrator.permissions.map(
        ({ entityKey, actions }) => `${entityKey}:${actions.join(",")}`,
      ),
      [
        `${service.key}:create,read,update,manage`,
        `${schedule.key}:create,read,update,manage`,
        `${appointment.key}:read,cancel`,
      ],
    ) ||
    workflow.entityKey !== appointment.key ||
    !sameArray(
      workflow.states.map(({ key }) => key),
      ["requested", "confirmed", "cancelled"],
    ) ||
    !sameArray(
      workflow.transitions.map(
        ({ key, from, to, actorKey }) => `${key}:${from}:${to}:${actorKey}`,
      ),
      [
        "confirm:requested:confirmed:staff",
        "cancel:requested:cancelled:customer",
        "reschedule:confirmed:requested:staff",
      ],
    ) ||
    blueprint.pageIntents.length !== 6 ||
    !sameArray(
      blueprint.pageIntents.map(
        ({ intent, entityKey }) => `${intent}:${entityKey ?? ""}`,
      ),
      [
        `calendar:${schedule.key}`,
        `list:${appointment.key}`,
        `form:${appointment.key}`,
        `detail:${appointment.key}`,
        "settings:",
        "settings:",
      ],
    )
  )
    return false;
  return true;
}

export function appointmentBookingGraphBindings(
  blueprint: ProductBlueprintV1,
): readonly { readonly inputKey: string; readonly graphSymbol: string }[] {
  if (
    !isAppointmentBookingBlueprint(blueprint) &&
    !isAppointmentConsumerWorkspaceBlueprint(blueprint)
  )
    throw new CompositionError(
      "Appointment Booking requires a closed V1 or V2 structural witness.",
    );
  return appointmentBindingSlots.map(([inputKey, entityIndex, fieldIndex]) => {
    const entity = blueprint.entities[entityIndex]!;
    if (fieldIndex === undefined)
      return { inputKey, graphSymbol: `graph.domain.${entity.key}` };
    const field = entity.fields[fieldIndex]!;
    const emitted =
      field.type === "reference" ? referenceScalarKey(field.key) : field.key;
    return { inputKey, graphSymbol: `graph.domain.${entity.key}.${emitted}` };
  });
}

function derivedRelations(
  blueprint: ProductBlueprintV1,
  applicationId: string,
): ApplicationGraphV1["domain"]["relations"] {
  const relations: ApplicationGraphV1["domain"]["relations"] = [];
  for (const entity of blueprint.entities) {
    for (const field of entity.fields) {
      if (field.type === "reference" && field.referenceTo !== undefined) {
        relations.push({
          from: entity.key,
          to: field.referenceTo,
          kind: "many-to-one",
          field: referenceScalarKey(field.key),
        });
      }
    }
  }
  relations.push({
    from: `${applicationId}-session`,
    to: `${applicationId}-principal`,
    kind: "many-to-one",
    field: "subjectRef",
  });
  return relations;
}

function derivedRoles(blueprint: ProductBlueprintV1): readonly string[] {
  return blueprint.actors.map((actor) => actor.key);
}

function derivedPermissions(
  blueprint: ProductBlueprintV1,
  applicationId: string,
): ApplicationGraphV1["policy"]["permissions"] {
  const principal = `${applicationId}-principal`;
  const session = `${applicationId}-session`;
  const permissions: ApplicationGraphV1["policy"]["permissions"] = [];
  blueprint.actors.forEach((actor, index) => {
    for (const permission of actor.permissions) {
      permissions.push({
        role: actor.key,
        resource: permission.entityKey,
        actions: [...permission.actions],
      });
    }
    // Identity policy surfaces: the default role may create sessions; every
    // authenticated actor may read its own principal and session records.
    const sessionActions =
      index === 0 ? ["create", "read", "update"] : ["read"];
    permissions.push(
      { role: actor.key, resource: principal, actions: ["read"] },
      { role: actor.key, resource: session, actions: sessionActions },
    );
  });
  return permissions;
}

function derivedFlows(
  blueprint: ProductBlueprintV1,
  selectedKeys: ReadonlySet<string>,
): ApplicationGraphV1["flow"]["flows"] {
  const audit = selectedKeys.has("core.audit");
  const notification = selectedKeys.has("core.notification");
  const eventRegistration = matchEventRegistrationBlueprintV1(blueprint);
  return blueprint.workflows.map((workflow) => ({
    id: workflow.key,
    entity: workflow.entityKey,
    initialState: workflow.states[0].key,
    states: workflow.states.map((state) => state.key),
    events:
      matchServiceWorkOrdersBlueprintV1(blueprint) || eventRegistration
        ? [...new Set(workflow.transitions.map((transition) => transition.key))]
        : workflow.transitions.map((transition) => transition.key),
    transitions: workflow.transitions
      .filter(
        (_, index) =>
          !eventRegistration ||
          workflow.key !== eventRegistration.registrationWorkflow ||
          index !== 1,
      )
      .map((transition) => {
        const effects: { capability: string; operation: string }[] = [];
        // Audit is locked for every product (identity-policy requires its
        // interface), but flow effects stay blueprint-driven: only products
        // with an approval decision record audit events.
        if (
          audit &&
          (hasApprovalDecision(blueprint) ||
            isInventoryOperationsBlueprint(blueprint))
        )
          effects.push({ capability: "audit.record", operation: "record" });
        if (notification && isDecisionActor(blueprint, transition.actorKey)) {
          effects.push({ capability: "notification.send", operation: "send" });
        }
        const mapped: ApplicationGraphV1["flow"]["flows"][number]["transitions"][number] =
          {
            from: transition.from,
            event: transition.key,
            to: transition.to,
            roles:
              eventRegistration &&
              workflow.key === eventRegistration.registrationWorkflow &&
              transition.key === "cancel"
                ? [
                    eventRegistration.roles.attendee,
                    eventRegistration.roles.organizer,
                  ]
                : [transition.actorKey],
          };
        if (effects.length > 0) mapped.effects = effects;
        return mapped;
      }),
  }));
}

function derivedSeedData(
  blueprint: ProductBlueprintV1,
): ApplicationGraphV1["domain"]["seedData"] {
  if (
    isInventoryOperationsBlueprint(blueprint) ||
    matchServiceWorkOrdersBlueprintV1(blueprint) ||
    matchCustomerRequestsBlueprintV1(blueprint) ||
    matchEventRegistrationBlueprintV1(blueprint)
  )
    return [];
  if (
    isAppointmentBookingBlueprint(blueprint) ||
    isAppointmentConsumerWorkspaceBlueprint(blueprint)
  ) {
    const [service, schedule, appointment] = blueprint.entities;
    const field = (
      entity: ProductBlueprintV1["entities"][number],
      index: number,
    ) =>
      entity.fields[index]!.type === "reference"
        ? referenceScalarKey(entity.fields[index]!.key)
        : entity.fields[index]!.key;
    return [
      {
        entity: service!.key,
        id: `sample-${service!.key}`,
        values: {
          [field(service!, 0)]: "Sample service",
          [field(service!, 1)]: 30,
          [field(service!, 2)]: true,
        },
      },
      {
        entity: schedule!.key,
        id: `sample-${schedule!.key}`,
        values: {
          [field(schedule!, 0)]: `sample-${service!.key}`,
          [field(schedule!, 1)]: "2026-10-01T09:00:00Z",
          [field(schedule!, 2)]: "2026-10-01T09:30:00Z",
          [field(schedule!, 3)]: "UTC",
          [field(schedule!, 4)]: 3,
          [field(schedule!, 5)]: "open",
        },
      },
      {
        entity: schedule!.key,
        id: `sample-${schedule!.key}-alt`,
        values: {
          [field(schedule!, 0)]: `sample-${service!.key}`,
          [field(schedule!, 1)]: "2026-10-01T10:00:00Z",
          [field(schedule!, 2)]: "2026-10-01T10:30:00Z",
          [field(schedule!, 3)]: "UTC",
          [field(schedule!, 4)]: 1,
          [field(schedule!, 5)]: "open",
        },
      },
      {
        entity: appointment!.key,
        id: `sample-${appointment!.key}`,
        values: {
          [field(appointment!, 0)]: `sample-${schedule!.key}`,
          [field(appointment!, 1)]: "Sample customer",
          [field(appointment!, 2)]: "Synthetic fixture note",
          [field(appointment!, 3)]: "Synthetic fixture cancellation reason",
          [field(appointment!, 4)]: "requested",
        },
      },
    ];
  }
  return blueprint.entities.map((entity) => {
    const workflow = blueprint.workflows.find(
      (candidate) => candidate.entityKey === entity.key,
    );
    const values: Record<string, unknown> = {};
    for (const field of entity.fields) {
      if (field.type === "reference") continue;
      // assertProductBlueprint guarantees options for enum fields.
      if (field.type === "enum") values[field.key] = field.options![0];
      else if (field.type === "file")
        values[field.key] = `sample-${field.key}.pdf`;
      else if (field.type === "number") values[field.key] = 12;
      else if (field.type === "currency") values[field.key] = 125.5;
      else if (field.type === "boolean") values[field.key] = true;
      else if (field.type === "date") values[field.key] = "2026-08-01";
      else if (field.type === "datetime")
        values[field.key] = "2026-08-01T09:00:00Z";
      else if (field.type === "text")
        values[field.key] = `Sample ${field.label}`;
      else values[field.key] = `Sample ${field.label} detail`;
    }
    for (const output of entity.fields.filter((field) => field.calculation)) {
      const rule = output.calculation!;
      const quantity = entity.fields.find(
        (field) => field.key === rule.quantityFieldKey,
      )!;
      const price = entity.fields.find(
        (field) => field.key === rule.unitPriceFieldKey,
      )!;
      const total = createCalculatedRequestTotalRuntime().calculate(
        values[quantity.key],
        values[price.key],
        quantity.numericDomain!,
        price.numericDomain!,
      );
      if (total === null)
        throw new CompositionError(
          "Calculation does not admit the deterministic composition witness.",
        );
      values[output.key] = total;
    }
    if (workflow !== undefined) values["status"] = workflow.states[0].key;
    return { entity: entity.key, id: `sample-${entity.key}`, values };
  });
}

/**
 * The complete derived Diff: every operation that turns the blank base
 * Draft into the composed product, including derived page routes. Plan
 * carriers exclude page operations (`/page/pages/-`) because plans cannot
 * carry route strings; `hashProductCompositionDiff` binds the full Diff.
 */
/** Numeric authoring is limited to the exact existing Approval family shape. */
function supportsNumericApprovalBlueprint(
  blueprint: ProductBlueprintV1,
  selectedKeys?: readonly string[],
): boolean {
  const equalSet = (actual: readonly string[], expected: readonly string[]) =>
    actual.length === expected.length &&
    new Set(actual).size === actual.length &&
    expected.every((value) => actual.includes(value));
  if (
    blueprint.workflows.length !== 1 ||
    blueprint.entities.length !== 2 ||
    blueprint.actors.length !== 3 ||
    (selectedKeys !== undefined &&
      !equalSet(selectedKeys, [
        "core.crud",
        "core.workflow",
        "core.identity-policy",
        "core.policy-declarations",
        "core.audit",
        "core.notification",
      ]))
  )
    return false;
  const flow = blueprint.workflows[0]!,
    primary = blueprint.entities[0]!,
    secondary = blueprint.entities[1]!;
  if (
    flow.entityKey !== primary.key ||
    secondary.fields.some(
      (field) => field.numericDomain || field.calculation,
    ) ||
    !equalSet(
      flow.states.map((s) => s.key),
      ["draft", "submitted", "approved", "returned"],
    ) ||
    flow.states[0]!.key !== "draft" ||
    flow.transitions.length !== 4
  )
    return false;
  const requester = flow.transitions.find((t) => t.key === "submit")?.actorKey,
    reviewer = flow.transitions.find((t) => t.key === "approve")?.actorKey;
  const auditor = blueprint.actors.find((a) =>
    a.permissions.some(
      (p) => p.entityKey === primary.key && p.actions.includes("audit"),
    ),
  )?.key;
  if (
    !requester ||
    !reviewer ||
    !auditor ||
    !equalSet(
      blueprint.actors.map((a) => a.key),
      [requester, reviewer, auditor],
    )
  )
    return false;
  for (const [key, from, to, actorKey] of [
    ["submit", "draft", "submitted", requester],
    ["approve", "submitted", "approved", reviewer],
    ["reject", "submitted", "returned", reviewer],
    ["update", "returned", "draft", requester],
  ])
    if (
      !flow.transitions.some(
        (t) =>
          t.key === key &&
          t.from === from &&
          t.to === to &&
          t.actorKey === actorKey,
      )
    )
      return false;
  const grants = blueprint.actors.flatMap((a) =>
    a.permissions.flatMap((p) =>
      p.actions.map((action) => a.key + ":" + p.entityKey + ":" + action),
    ),
  );
  const expected = [
    ...["create", "read", "update", "submit"].map(
      (action) => requester + ":" + primary.key + ":" + action,
    ),
    ...["read", "approve", "reject"].map(
      (action) => reviewer + ":" + primary.key + ":" + action,
    ),
    ...["read", "audit"].map(
      (action) => auditor + ":" + primary.key + ":" + action,
    ),
    ...["read", "update"].map(
      (action) => requester + ":" + secondary.key + ":" + action,
    ),
  ];
  return (
    equalSet(grants, expected) &&
    blueprint.pageIntents.length === 6 &&
    equalSet(
      blueprint.pageIntents.map((p) => p.intent),
      ["dashboard", "list", "form", "detail", "queue", "settings"],
    ) &&
    blueprint.pageIntents.every((p) =>
      p.intent === "settings"
        ? p.entityKey === undefined
        : p.entityKey === primary.key,
    )
  );
}

export function deriveProductOperations(
  input: ProductDerivationInput,
): GraphDiffV1 {
  const blueprint = assertProductBlueprint(input.blueprint);
  if (
    matchEventRegistrationBlueprintV1(blueprint) &&
    !isEventRegistrationBlueprint(blueprint, input.selectedKeys)
  )
    throw new CompositionError(
      "Event Registration requires exactly six core capability keys.",
    );
  if (
    matchCustomerRequestsBlueprintV1(blueprint) &&
    !isCustomerRequestsBlueprint(blueprint, input.selectedKeys)
  )
    throw new CompositionError(
      "Customer Requests requires exactly six core capability keys.",
    );
  if (
    matchServiceWorkOrdersBlueprintV1(blueprint) &&
    !isServiceWorkOrdersBlueprint(blueprint, input.selectedKeys)
  )
    throw new CompositionError(
      "Service Work Orders requires exactly six core capability keys.",
    );
  if (
    isInventoryCandidate(blueprint) &&
    !isInventoryOperationsBlueprint(blueprint, input.selectedKeys)
  )
    throw new CompositionError("Unsupported Inventory Operations blueprint.");
  if (
    blueprint.actors.some((actor) =>
      actor.permissions.some((permission) =>
        permission.actions.includes("read-availability"),
      ),
    ) &&
    !isAppointmentConsumerWorkspaceBlueprint(blueprint, input.selectedKeys)
  )
    throw new CompositionError(
      "Availability reads require the exact Appointment V2 witness.",
    );
  const calculations = blueprint.entities.flatMap((entity) =>
    entity.fields.filter((field) => field.calculation),
  );
  if (calculations.length) {
    const primary = blueprint.entities[0]!;
    if (
      calculations.length !== 1 ||
      !primary.fields.includes(calculations[0]!) ||
      !supportsNumericApprovalBlueprint(blueprint) ||
      primary.fields.filter((field) => field.type === "text" && field.required)
        .length !== 1 ||
      primary.fields.filter(
        (field) => field.type === "number" || field.type === "currency",
      ).length !== 3
    )
      throw new CompositionError(
        "Calculated totals require the complete supported Approval correction profile.",
      );
  }
  const constrained = blueprint.entities.flatMap((entity) =>
    entity.fields.filter((field) => field.numericDomain),
  );
  if (
    constrained.length &&
    !supportsNumericApprovalBlueprint(blueprint) &&
    !isAppointmentBookingBlueprint(blueprint, input.selectedKeys) &&
    !isAppointmentConsumerWorkspaceBlueprint(blueprint, input.selectedKeys) &&
    !isInventoryOperationsBlueprint(blueprint, input.selectedKeys) &&
    !isServiceWorkOrdersBlueprint(blueprint, input.selectedKeys) &&
    !isCustomerRequestsBlueprint(blueprint, input.selectedKeys) &&
    !isEventRegistrationBlueprint(blueprint, input.selectedKeys)
  )
    throw new CompositionError(
      "Numeric domains require the Approval correction target.",
    );
  for (const field of constrained)
    if (
      !isNumericFieldValueAllowed(
        field.type === "number" ? 12 : 125.5,
        field.type === "number" ? "integer" : "decimal",
        field.numericDomain!,
      )
    )
      throw new CompositionError(
        "Numeric domain does not admit the deterministic composition witness.",
      );
  const selectedKeys = new Set(input.selectedKeys);
  const pages = derivedPages(blueprint);
  const navigation = derivedNavigation(blueprint, pages);
  const entities = derivedEntities(blueprint, input.applicationId);
  const relations = derivedRelations(blueprint, input.applicationId);
  const roles = derivedRoles(blueprint);
  const permissions = derivedPermissions(blueprint, input.applicationId);
  const flows = derivedFlows(blueprint, selectedKeys);
  const seedData = derivedSeedData(blueprint);

  // Flow effects must reference declared integration capabilities: every
  // effect the derived flows carry, plus the identity-policy provider
  // surfaces the locked asset exposes.
  const capabilities: string[] = [];
  for (const flow of flows) {
    for (const transition of flow.transitions) {
      for (const effect of transition.effects ?? []) {
        if (!capabilities.includes(effect.capability)) {
          capabilities.push(effect.capability);
        }
      }
    }
  }
  if (selectedKeys.has("core.identity-policy")) {
    for (const capability of [
      "identity.context.resolve",
      "authorization.decision",
    ]) {
      if (!capabilities.includes(capability)) capabilities.push(capability);
    }
  }

  if (
    isServiceWorkOrdersBlueprint(blueprint, input.selectedKeys) ||
    isCustomerRequestsBlueprint(blueprint, input.selectedKeys) ||
    isEventRegistrationBlueprint(blueprint, input.selectedKeys)
  )
    capabilities.push("audit.record");
  const operations: GraphDiffV1["operations"] = [
    { op: "replace", path: "/metadata/name", value: blueprint.title },
    {
      op: "replace",
      path: "/integration/capabilities",
      value: capabilities.map((key) => ({
        key,
        providerId: "factory",
        operation: key.split(".").at(-1) ?? key,
      })),
    },
  ];
  for (const page of pages) {
    operations.push({ op: "add", path: "/page/pages/-", value: page });
  }
  for (const entry of navigation) {
    operations.push({ op: "add", path: "/page/navigation/-", value: entry });
  }
  for (const entity of entities) {
    operations.push({ op: "add", path: "/domain/entities/-", value: entity });
  }
  for (const relation of relations) {
    operations.push({
      op: "add",
      path: "/domain/relations/-",
      value: relation,
    });
  }
  // The blank base Draft has no seedData key; the whole derived surface is
  // added as one object-key operation (an array-index push cannot resolve).
  operations.push({ op: "add", path: "/domain/seedData", value: seedData });
  for (const role of roles) {
    operations.push({ op: "add", path: "/policy/roles/-", value: role });
  }
  for (const permission of permissions) {
    operations.push({
      op: "add",
      path: "/policy/permissions/-",
      value: permission,
    });
  }
  for (const flow of flows) {
    operations.push({ op: "add", path: "/flow/flows/-", value: flow });
  }
  return { apiVersion: "factory.graph-diff/v1", operations };
}

function catalogueAssetFor(
  catalogue: ProductCapabilityCatalogueV1,
  key: string,
  version: string,
): ProductCapabilityCatalogueV1["required"][number] {
  const asset = [
    ...catalogue.required,
    ...catalogue.optional.map((o) => o.asset),
  ].find((candidate) => candidate.key === key && candidate.version === version);
  if (asset === undefined) {
    throw new CompositionError(
      `Plan locks capability '${key}@${version}' outside the approved catalogue.`,
    );
  }
  return asset;
}

function registeredCapabilityAssetFor(
  asset: ProductCapabilityCatalogueV1["required"][number],
) {
  const registered = currentCapabilityAssets.find(
    (candidate) =>
      candidate.manifest.key === asset.key &&
      candidate.manifest.version === asset.version &&
      candidate.manifest.packageRoot === asset.packageRoot &&
      candidate.manifest.manifestDigest === asset.manifestDigest &&
      candidate.manifest.lifecycle === asset.lifecycle,
  );
  if (!registered)
    throw new CompositionError(
      `Catalogue asset '${asset.key}@${asset.version}' is not an exact registered capability manifest.`,
    );
  return registered;
}

function capabilityBindingValue(
  asset: ReturnType<typeof registeredCapabilityAssetFor>,
  inputKey: string,
  graphSymbol: string,
): CapabilityBindingValueV1 {
  const input = asset.manifest.inputSchema.find(
    (candidate) => candidate.key === inputKey,
  );
  if (!input)
    throw new CompositionError(
      `Capability '${asset.manifest.key}' has no input '${inputKey}'.`,
    );
  if (input.type !== "domain.field") return { graphSymbol };
  const parts = graphSymbol.split(".");
  if (parts.length !== 4 || parts[0] !== "graph" || parts[1] !== "domain")
    throw new CompositionError(
      `Capability '${asset.manifest.key}' field '${inputKey}' requires a qualified domain field symbol.`,
    );
  return {
    graphSymbol: `graph.domain.${parts[2]!}`,
    fieldKey: parts[3]!,
  };
}

/**
 * The capability selection record the composed product must carry: every
 * plan lock materialized against the approved catalogue, with its plan
 * bindings. Unknown locks, stale digests, and missing required bindings
 * fail closed before any graph surface changes.
 */
export function composeProductIntegration(
  planInput: unknown,
  catalogueInput?: unknown,
): CapabilitySelectionV1[] {
  const plan = assertCompositionPlan(planInput);
  const catalogue =
    catalogueInput === undefined
      ? currentCapabilityCatalogue()
      : assertProductCapabilityCatalogue(catalogueInput);
  const seenLockKeys = new Set<string>();
  for (const lock of plan.capabilityLocks) {
    if (seenLockKeys.has(lock.key)) {
      throw new CompositionError(
        `Plan selects capability '${lock.key}' more than once.`,
      );
    }
    seenLockKeys.add(lock.key);
  }
  const bindingsByCapability = new Map<
    string,
    CapabilitySelectionV1["bindings"]
  >();
  const registeredAssets = new Map<
    string,
    ReturnType<typeof registeredCapabilityAssetFor>
  >();
  for (const lock of plan.capabilityLocks) {
    const asset = catalogueAssetFor(catalogue, lock.key, lock.version);
    if (asset.manifestDigest !== lock.manifestDigest) {
      throw new CompositionError(
        `Plan lock for '${lock.key}@${lock.version}' has a stale manifest digest.`,
      );
    }
    registeredAssets.set(lock.key, registeredCapabilityAssetFor(asset));
  }
  for (const binding of plan.graphBindings) {
    if (!seenLockKeys.has(binding.capabilityKey)) {
      throw new CompositionError(
        `Plan binds input '${binding.inputKey}' of capability '${binding.capabilityKey}' that is not locked.`,
      );
    }
    const current = bindingsByCapability.get(binding.capabilityKey) ?? {};
    if (binding.inputKey in current) {
      throw new CompositionError(
        `Plan binds input '${binding.inputKey}' of capability '${binding.capabilityKey}' more than once.`,
      );
    }
    const next: Record<string, CapabilityBindingValueV1> = { ...current };
    next[binding.inputKey] = capabilityBindingValue(
      registeredAssets.get(binding.capabilityKey)!,
      binding.inputKey,
      binding.graphSymbol,
    );
    bindingsByCapability.set(binding.capabilityKey, next);
  }
  for (const lock of plan.capabilityLocks) {
    const asset = catalogueAssetFor(catalogue, lock.key, lock.version);
    const registered = registeredAssets.get(lock.key)!;
    const bindings = bindingsByCapability.get(lock.key) ?? {};
    for (const input of registered.manifest.inputSchema) {
      if (input.required && !(input.key in bindings)) {
        throw new CompositionError(
          `Plan leaves required binding '${input.key}' of '${lock.key}' unbound.`,
        );
      }
    }
  }
  return plan.capabilityLocks.map((lock) => {
    const asset = catalogueAssetFor(catalogue, lock.key, lock.version);
    return {
      lock: {
        key: asset.key,
        version: asset.version,
        packageRoot: asset.packageRoot,
        manifestDigest: asset.manifestDigest,
        lifecycle: asset.lifecycle,
      },
      bindings: bindingsByCapability.get(lock.key) ?? {},
    };
  });
}

function assertBlankProductBase(draft: DraftRevisionV1): void {
  if (draft.status !== "draft") {
    throw new CompositionError(
      "Product composition requires a mutable Draft base.",
    );
  }
  const graph = draft.graph;
  if (
    graph.page.pages.length > 0 ||
    graph.page.navigation.length > 0 ||
    graph.domain.entities.length > 0 ||
    graph.domain.relations.length > 0 ||
    graph.policy.roles.length > 0 ||
    graph.policy.permissions.length > 0 ||
    graph.flow.flows.length > 0
  ) {
    throw new CompositionError(
      "Product composition requires a blank Draft base; the base Draft already carries product content.",
    );
  }
}

/**
 * Derives the complete product Diff for an accepted plan and blueprint over
 * the blank base Draft, and binds its canonical checksum. The plan declares
 * every operation except derived page routes; any drift between the accepted
 * plan and the deterministic derivation fails closed.
 */
export function composeProductDraft(input: {
  readonly plan: CompositionPlanV1;
  readonly blueprint: ProductBlueprintV1;
  readonly baseDraft: DraftRevisionV1;
  readonly catalogue?: unknown;
}): ProductDerivationOutcome {
  const plan = assertCompositionPlan(input.plan);
  const blueprint = assertProductBlueprint(input.blueprint);
  if (blueprint.requirementChecksum !== plan.requirementChecksum) {
    throw new CompositionError(
      "Blueprint requirement checksum does not match the accepted plan.",
    );
  }
  assertBlankProductBase(input.baseDraft);
  const baseHash = hashApplicationGraph(input.baseDraft.graph);
  if (plan.draftBaseChecksum !== baseHash) {
    throw new CompositionError(
      "Product composition base Draft does not match the plan's draft base checksum.",
    );
  }
  const selectedKeys = plan.capabilityLocks.map((lock) => lock.key);
  if (
    blueprint.entities.some((entity) =>
      entity.fields.some((field) => field.numericDomain),
    ) &&
    !supportsNumericApprovalBlueprint(blueprint, selectedKeys) &&
    !isAppointmentBookingBlueprint(blueprint, selectedKeys) &&
    !isAppointmentConsumerWorkspaceBlueprint(blueprint, selectedKeys) &&
    !isInventoryOperationsBlueprint(blueprint, selectedKeys) &&
    !isServiceWorkOrdersBlueprint(blueprint, selectedKeys) &&
    !isCustomerRequestsBlueprint(blueprint, selectedKeys) &&
    !isEventRegistrationBlueprint(blueprint, selectedKeys)
  )
    throw new CompositionError(
      "Numeric domains require the Approval correction target.",
    );
  if (
    isAppointmentConsumerWorkspaceBlueprint(blueprint) ||
    isServiceWorkOrdersBlueprint(blueprint, selectedKeys) ||
    isCustomerRequestsBlueprint(blueprint, selectedKeys) ||
    isEventRegistrationBlueprint(blueprint, selectedKeys)
  ) {
    const catalogue = currentCapabilityCatalogue();
    const assets = [
      ...catalogue.required,
      ...catalogue.optional.map((entry) => entry.asset),
    ];
    const exactKeys =
      matchServiceWorkOrdersBlueprintV1(blueprint) ||
      matchCustomerRequestsBlueprintV1(blueprint) ||
      matchEventRegistrationBlueprintV1(blueprint)
        ? serviceWorkOrdersLockKeys
        : appointmentLockKeys;
    const locks = exactKeys.map((key) => {
      const asset = assets.find((candidate) => candidate.key === key)!;
      return {
        key: asset.key,
        version: asset.version,
        manifestDigest: asset.manifestDigest,
      };
    });
    if (
      !canonicalEquals(plan.capabilityLocks, locks) ||
      !canonicalEquals(
        plan.graphBindings,
        productGraphBindings(
          blueprint,
          input.baseDraft.graph.metadata.id,
          new Set(exactKeys),
        ),
      )
    )
      throw new CompositionError(
        matchEventRegistrationBlueprintV1(blueprint)
          ? "Event Registration requires the exact current locks and ordered owner bindings."
          : matchCustomerRequestsBlueprintV1(blueprint)
            ? "Customer Requests requires the exact current locks and ordered owner bindings."
            : matchServiceWorkOrdersBlueprintV1(blueprint)
              ? "Service Work Orders requires the exact current locks and ordered owner bindings."
              : "Appointment V2 requires the exact current locks and ordered owner bindings.",
      );
  }
  const derived = deriveProductOperations({
    blueprint,
    applicationId: input.baseDraft.graph.metadata.id,
    selectedKeys,
  });
  const selections = composeProductIntegration(plan, input.catalogue);
  const operations: GraphDiffV1["operations"] = [
    ...derived.operations,
    {
      op: "add",
      path: "/integration/compositionSelections",
      value: selections,
    },
  ];
  const declared = operations.filter(
    (operation) => !operation.path.startsWith("/page/pages/"),
  );
  if (!canonicalEquals(plan.proposedOperations, declared)) {
    throw new CompositionError(
      "Plan proposed operations no longer match the blueprint derivation.",
    );
  }
  const diff: GraphDiffV1 = {
    apiVersion: "factory.graph-diff/v1",
    baseGraphHash: baseHash,
    operations,
  };
  return { diff, checksum: hashProductCompositionDiff(diff) };
}

export function productGraphBindings(
  blueprint: ProductBlueprintV1,
  applicationId: string,
  keys: ReadonlySet<string>,
): CompositionPlanV1["graphBindings"] {
  const bindings: CompositionPlanV1["graphBindings"] = [];
  if (keys.has("core.crud")) {
    const primary = blueprint.entities[0];
    bindings.push(
      {
        capabilityKey: "core.crud",
        inputKey: "entityKey",
        graphSymbol: `graph.domain.${primary.key}`,
      },
      {
        capabilityKey: "core.crud",
        inputKey: "routeKey",
        graphSymbol: `graph.page.${primaryListPage(blueprint, primary.key)}`,
      },
    );
  }
  if (keys.has("core.workflow")) {
    bindings.push({
      capabilityKey: "core.workflow",
      inputKey: "flowKey",
      graphSymbol: `graph.flow.${blueprint.workflows[0].key}`,
    });
  }
  if (keys.has("core.identity-policy")) {
    const [defaultRole, authenticatedRole = defaultRole] = blueprint.actors.map(
      (actor) => actor.key,
    );
    bindings.push(
      {
        capabilityKey: "core.identity-policy",
        inputKey: "principalEntity",
        graphSymbol: `graph.domain.${applicationId}-principal`,
      },
      {
        capabilityKey: "core.identity-policy",
        inputKey: "sessionEntity",
        graphSymbol: `graph.domain.${applicationId}-session`,
      },
      {
        capabilityKey: "core.identity-policy",
        inputKey: "defaultRole",
        graphSymbol: `graph.policy.${defaultRole}`,
      },
      {
        capabilityKey: "core.identity-policy",
        inputKey: "authenticatedRole",
        graphSymbol: `graph.policy.${authenticatedRole}`,
      },
    );
  }
  if (keys.has("core.audit")) {
    // The audit actor is the approval-deciding role when the product has
    // one; otherwise the primary actor is the audited actor. Every locked
    // product binds `actorRole`, so the audit runtime always has a role.
    const approver =
      blueprint.actors.find((actor) =>
        actor.permissions.some((permission) =>
          permission.actions.some(
            (action) => action === "approve" || action === "reject",
          ),
        ),
      ) ?? blueprint.actors[0];
    if (approver === undefined) {
      throw new CompositionError(
        "Audit capability requires at least one blueprint actor.",
      );
    }
    bindings.push({
      capabilityKey: "core.audit",
      inputKey: "actorRole",
      graphSymbol: `graph.policy.${approver.key}`,
    });
  }
  if (keys.has("core.notification")) {
    bindings.push({
      capabilityKey: "core.notification",
      inputKey: "recipientRole",
      graphSymbol: `graph.policy.${blueprint.actors[0].key}`,
    });
  }
  if (keys.has("scheduling.appointment")) {
    for (const binding of appointmentBookingGraphBindings(blueprint)) {
      bindings.push({
        capabilityKey: "scheduling.appointment",
        ...binding,
      });
    }
  }
  return bindings;
}

const serviceWorkOrdersLockKeys = [
  "core.crud",
  "core.workflow",
  "core.identity-policy",
  "core.policy-declarations",
  "core.audit",
  "core.notification",
] as const;
function isServiceWorkOrdersBlueprint(
  blueprint: ProductBlueprintV1,
  keys: readonly string[],
): boolean {
  return (
    matchServiceWorkOrdersBlueprintV1(blueprint) !== undefined &&
    keys.length === serviceWorkOrdersLockKeys.length &&
    new Set(keys).size === keys.length &&
    serviceWorkOrdersLockKeys.every((key) => keys.includes(key))
  );
}

function isCustomerRequestsBlueprint(
  blueprint: ProductBlueprintV1,
  keys: readonly string[],
): boolean {
  return (
    matchCustomerRequestsBlueprintV1(blueprint) !== undefined &&
    keys.length === serviceWorkOrdersLockKeys.length &&
    new Set(keys).size === keys.length &&
    serviceWorkOrdersLockKeys.every((key) => keys.includes(key))
  );
}

function isEventRegistrationBlueprint(
  blueprint: ProductBlueprintV1,
  keys: readonly string[],
): boolean {
  return (
    matchEventRegistrationBlueprintV1(blueprint) !== undefined &&
    keys.length === serviceWorkOrdersLockKeys.length &&
    new Set(keys).size === keys.length &&
    serviceWorkOrdersLockKeys.every((key) => keys.includes(key))
  );
}
