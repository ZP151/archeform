import type {
  DomainModel,
  FlowModel,
  IntegrationModel,
  PolicyModel,
} from "@factory/graph";

type DomainField = DomainModel["entities"][number]["fields"][number];
type DomainEntity = DomainModel["entities"][number];
type DomainIndex = DomainEntity["indexes"][number];
type DomainRelation = DomainModel["relations"][number];
type FlowEffect = NonNullable<
  FlowModel["flows"][number]["transitions"][number]["effects"]
>[number];

const fieldKeyPattern = /^[a-z][a-zA-Z0-9_]*$/;
const entityKeyPattern = /^[a-z][a-z0-9-]*$/;

function assertDomainField(field: DomainField) {
  if (field.key.length > 128 || !fieldKeyPattern.test(field.key)) {
    throw new Error(`Field key '${field.key}' is invalid.`);
  }
  if (
    field.type === "enum" &&
    (!field.values?.length || field.values.some((value) => !value.trim()))
  ) {
    throw new Error(`Enum field '${field.key}' requires at least one value.`);
  }
}

/**
 * Produces an immutable DomainModel edit. The Workbench persists the returned
 * Graph only through the Draft lifecycle; this helper never writes remotely.
 */
export function addDomainField(
  domain: DomainModel,
  entityKey: string,
  field: DomainField,
): DomainModel {
  const entity = domain.entities.find(
    (candidate) => candidate.key === entityKey,
  );
  if (!entity) throw new Error(`Unknown entity '${entityKey}'.`);
  assertDomainField(field);
  if (entity.fields.some((candidate) => candidate.key === field.key)) {
    throw new Error(`Entity '${entityKey}' already has field '${field.key}'.`);
  }
  return {
    ...domain,
    entities: domain.entities.map((candidate) =>
      candidate.key === entityKey
        ? { ...candidate, fields: [...candidate.fields, field] }
        : candidate,
    ),
  };
}

function findDomainEntity(
  domain: DomainModel,
  entityKey: string,
): DomainEntity {
  const entity = domain.entities.find(
    (candidate) => candidate.key === entityKey,
  );
  if (!entity) throw new Error(`Unknown entity '${entityKey}'.`);
  return entity;
}

function assertEntityFields(entity: DomainEntity) {
  const keys = new Set<string>();
  for (const field of entity.fields) {
    assertDomainField(field);
    if (keys.has(field.key)) {
      throw new Error(
        `Entity '${entity.key}' already has field '${field.key}'.`,
      );
    }
    keys.add(field.key);
  }
  for (const index of entity.indexes) {
    if (index.fields.length === 0) {
      throw new Error(`Index on '${entity.key}' requires at least one field.`);
    }
    for (const field of index.fields) {
      if (!keys.has(field)) {
        throw new Error(
          `Index on '${entity.key}' references unknown field '${field}'.`,
        );
      }
    }
  }
}

/** Adds a complete declared record type. It cannot implicitly add relations or policies. */
export function addDomainEntity(
  domain: DomainModel,
  entity: DomainEntity,
): DomainModel {
  if (entity.key.length > 128 || !entityKeyPattern.test(entity.key)) {
    throw new Error(`Entity key '${entity.key}' is invalid.`);
  }
  if (!entity.label.trim() || entity.label.length > 120) {
    throw new Error(
      `Entity '${entity.key}' needs a label of at most 120 characters.`,
    );
  }
  if (domain.entities.some((candidate) => candidate.key === entity.key)) {
    throw new Error(`Domain already has entity '${entity.key}'.`);
  }
  assertEntityFields(entity);
  return { ...domain, entities: [...domain.entities, structuredClone(entity)] };
}

/** Updates schema options while stripping enum-only values from non-enum fields. */
export function setDomainFieldOptions(
  domain: DomainModel,
  entityKey: string,
  fieldKey: string,
  options: Partial<
    Pick<DomainField, "type" | "required" | "unique" | "values">
  >,
): DomainModel {
  const entity = findDomainEntity(domain, entityKey);
  const current = entity.fields.find((field) => field.key === fieldKey);
  if (!current)
    throw new Error(`Entity '${entityKey}' has no field '${fieldKey}'.`);

  const type = options.type ?? current.type;
  const required = options.required ?? current.required;
  const unique = options.unique ?? current.unique;
  const values = options.values ?? current.values;
  if (type === "enum" && (!values || values.length === 0)) {
    throw new Error(`Enum field '${fieldKey}' requires at least one value.`);
  }
  const nextField: DomainField = {
    key: current.key,
    type,
    required,
    ...(unique ? { unique: true } : {}),
    ...(type === "enum" && values ? { values: [...values] } : {}),
  };
  assertDomainField(nextField);

  return {
    ...domain,
    entities: domain.entities.map((candidate) =>
      candidate.key === entityKey
        ? {
            ...candidate,
            fields: candidate.fields.map((field) =>
              field.key === fieldKey ? nextField : field,
            ),
          }
        : candidate,
    ),
  };
}

/** Adds a validated index. Every indexed field must belong to the entity. */
export function addDomainIndex(
  domain: DomainModel,
  entityKey: string,
  index: DomainIndex,
): DomainModel {
  const entity = findDomainEntity(domain, entityKey);
  if (index.fields.length === 0) {
    throw new Error(`Index on '${entityKey}' requires at least one field.`);
  }
  const fieldKeys = new Set(entity.fields.map((field) => field.key));
  for (const field of index.fields) {
    if (!fieldKeys.has(field)) {
      throw new Error(
        `Index on '${entityKey}' references unknown field '${field}'.`,
      );
    }
  }
  if (new Set(index.fields).size !== index.fields.length) {
    throw new Error(`Index on '${entityKey}' repeats a field.`);
  }
  if (
    entity.indexes.some(
      (candidate) =>
        candidate.unique === index.unique &&
        candidate.fields.length === index.fields.length &&
        candidate.fields.every(
          (field, position) => field === index.fields[position],
        ),
    )
  ) {
    throw new Error(`Entity '${entityKey}' already has this index.`);
  }
  return {
    ...domain,
    entities: domain.entities.map((candidate) =>
      candidate.key === entityKey
        ? {
            ...candidate,
            indexes: [...candidate.indexes, structuredClone(index)],
          }
        : candidate,
    ),
  };
}

/** Adds one declared relationship only after both record types are known. */
export function addDomainRelation(
  domain: DomainModel,
  relation: DomainRelation,
): DomainModel {
  const source = findDomainEntity(domain, relation.from);
  findDomainEntity(domain, relation.to);
  if (
    relation.field &&
    !source.fields.some((field) => field.key === relation.field)
  ) {
    throw new Error(
      `Relation source '${relation.from}' has no field '${relation.field}'.`,
    );
  }
  if (
    domain.relations.some(
      (candidate) =>
        candidate.from === relation.from &&
        candidate.to === relation.to &&
        candidate.kind === relation.kind &&
        candidate.field === relation.field,
    )
  ) {
    throw new Error("Domain already has this relation.");
  }
  return {
    ...domain,
    relations: [...domain.relations, structuredClone(relation)],
  };
}

/**
 * Sets one role/resource/action cell while maintaining one normalized
 * permission row per role and resource.
 */
export function setPolicyAction(
  policy: PolicyModel,
  role: string,
  resource: string,
  action: string,
  enabled: boolean,
): PolicyModel {
  const existing = policy.permissions.find(
    (permission) =>
      permission.role === role && permission.resource === resource,
  );
  const nextActions = new Set(existing?.actions ?? []);
  if (enabled) nextActions.add(action);
  else nextActions.delete(action);
  const nextPermission = {
    role,
    resource,
    actions: [...nextActions].sort(),
  };
  const remaining = policy.permissions.filter(
    (permission) =>
      permission.role !== role || permission.resource !== resource,
  );
  return {
    ...policy,
    permissions: nextPermission.actions.length
      ? [...remaining, nextPermission]
      : remaining,
  };
}

type FlowTransition = FlowModel["flows"][number]["transitions"][number];

/**
 * Adds one declarative transition after checking the FlowModel vocabulary.
 * It deliberately has no extension point for scripts, URLs, or generated code.
 */
export function addFlowTransition(
  flowModel: FlowModel,
  flowId: string,
  transition: FlowTransition,
): FlowModel {
  const flow = flowModel.flows.find((candidate) => candidate.id === flowId);
  if (!flow) throw new Error(`Unknown flow '${flowId}'.`);
  if (!flow.states.includes(transition.from)) {
    throw new Error(
      `Flow '${flowId}' has unknown source state '${transition.from}'.`,
    );
  }
  if (!flow.states.includes(transition.to)) {
    throw new Error(
      `Flow '${flowId}' has unknown target state '${transition.to}'.`,
    );
  }
  if (!flow.events.includes(transition.event)) {
    throw new Error(
      `Flow '${flowId}' has unknown event '${transition.event}'.`,
    );
  }
  if (
    flow.transitions.some(
      (candidate) =>
        candidate.from === transition.from &&
        candidate.event === transition.event,
    )
  ) {
    throw new Error(
      `Flow '${flowId}' already maps '${transition.from}' and '${transition.event}'.`,
    );
  }
  return {
    ...flowModel,
    flows: flowModel.flows.map((candidate) =>
      candidate.id === flowId
        ? { ...candidate, transitions: [...candidate.transitions, transition] }
        : candidate,
    ),
  };
}

/**
 * Replaces effects for one declared transition with capability operations that
 * exist in the Graph's IntegrationModel. No URL, script, or opaque runtime
 * callback can be added through this command.
 */
export function setFlowTransitionEffects(
  flowModel: FlowModel,
  flowId: string,
  from: string,
  event: string,
  effects: readonly FlowEffect[],
  capabilities: readonly IntegrationModel["capabilities"][number][],
): FlowModel {
  const flow = flowModel.flows.find((candidate) => candidate.id === flowId);
  if (!flow) throw new Error(`Unknown flow '${flowId}'.`);
  const transition = flow.transitions.find(
    (candidate) => candidate.from === from && candidate.event === event,
  );
  if (!transition) {
    throw new Error(
      `Flow '${flowId}' has no '${from}' → '${event}' transition.`,
    );
  }
  const seen = new Set<string>();
  for (const effect of effects) {
    const signature = `${effect.capability}:${effect.operation}`;
    if (seen.has(signature))
      throw new Error(`Transition repeats effect '${signature}'.`);
    seen.add(signature);
    if (
      !capabilities.some(
        (capability) =>
          capability.key === effect.capability &&
          capability.operation === effect.operation,
      )
    ) {
      throw new Error(
        `Effect '${signature}' is not declared by IntegrationModel.`,
      );
    }
  }
  return {
    ...flowModel,
    flows: flowModel.flows.map((candidate) =>
      candidate.id === flowId
        ? {
            ...candidate,
            transitions: candidate.transitions.map((entry) =>
              entry.from === from && entry.event === event
                ? {
                    ...entry,
                    effects: effects.length ? [...effects] : undefined,
                  }
                : entry,
            ),
          }
        : candidate,
    ),
  };
}
