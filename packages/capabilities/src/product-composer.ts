import {
  CompositionError,
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
  return blueprint.workflows.map((workflow) => ({
    id: workflow.key,
    entity: workflow.entityKey,
    initialState: workflow.states[0].key,
    states: workflow.states.map((state) => state.key),
    events: workflow.transitions.map((transition) => transition.key),
    transitions: workflow.transitions.map((transition) => {
      const effects: { capability: string; operation: string }[] = [];
      // Audit is locked for every product (identity-policy requires its
      // interface), but flow effects stay blueprint-driven: only products
      // with an approval decision record audit events.
      if (audit && hasApprovalDecision(blueprint))
        effects.push({ capability: "audit.record", operation: "record" });
      if (notification && isDecisionActor(blueprint, transition.actorKey)) {
        effects.push({ capability: "notification.send", operation: "send" });
      }
      const mapped: ApplicationGraphV1["flow"]["flows"][number]["transitions"][number] =
        {
          from: transition.from,
          event: transition.key,
          to: transition.to,
          roles: [transition.actorKey],
        };
      if (effects.length > 0) mapped.effects = effects;
      return mapped;
    }),
  }));
}

function derivedSeedData(
  blueprint: ProductBlueprintV1,
): ApplicationGraphV1["domain"]["seedData"] {
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
export function deriveProductOperations(
  input: ProductDerivationInput,
): GraphDiffV1 {
  const blueprint = assertProductBlueprint(input.blueprint);
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
  for (const binding of plan.graphBindings) {
    if (!seenLockKeys.has(binding.capabilityKey)) {
      throw new CompositionError(
        `Plan binds input '${binding.inputKey}' of capability '${binding.capabilityKey}' that is not locked.`,
      );
    }
    const current = bindingsByCapability.get(binding.capabilityKey) ?? {};
    const next: Record<string, CapabilityBindingValueV1> = { ...current };
    next[binding.inputKey] = { graphSymbol: binding.graphSymbol };
    bindingsByCapability.set(binding.capabilityKey, next);
  }
  for (const lock of plan.capabilityLocks) {
    const asset = catalogueAssetFor(catalogue, lock.key, lock.version);
    if (asset.manifestDigest !== lock.manifestDigest) {
      throw new CompositionError(
        `Plan lock for '${lock.key}@${lock.version}' has a stale manifest digest.`,
      );
    }
    const bindings = bindingsByCapability.get(lock.key) ?? {};
    for (const input of asset.inputs) {
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
