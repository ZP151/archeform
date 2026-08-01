import { z } from "zod";

const identifier = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-z][a-z0-9-]*$/);
const fieldKey = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-z][a-zA-Z0-9_]*$/);

const fieldTypeSchema = z.enum([
  "string",
  "text",
  "integer",
  "decimal",
  "boolean",
  "date",
  "datetime",
  "enum",
  "json",
  "url",
  "email",
]);

const pageBlockSchema = z.object({
  id: identifier,
  type: z.string().min(1).max(128),
  entity: identifier.optional(),
  props: z.record(z.unknown()).optional(),
  bindings: z.record(z.string()).optional(),
});

const pageModelSchema = z.object({
  pages: z.array(
    z.object({
      id: identifier,
      route: z.string().min(1).startsWith("/"),
      title: z.string().min(1).max(160),
      blocks: z.array(pageBlockSchema),
    }),
  ),
  navigation: z.array(
    z.object({
      id: identifier,
      label: z.string().min(1).max(80),
      pageId: identifier,
      icon: z.string().min(1).max(80).optional(),
    }),
  ),
});

const domainModelSchema = z.object({
  entities: z.array(
    z.object({
      key: identifier,
      label: z.string().min(1).max(120),
      fields: z.array(
        z.object({
          key: fieldKey,
          type: fieldTypeSchema,
          required: z.boolean(),
          unique: z.boolean().optional(),
          values: z.array(z.string().min(1)).min(1).optional(),
        }),
      ),
      indexes: z.array(
        z.object({
          fields: z.array(fieldKey).min(1),
          unique: z.boolean().optional(),
        }),
      ),
    }),
  ),
  relations: z.array(
    z.object({
      from: identifier,
      to: identifier,
      kind: z.enum([
        "one-to-one",
        "one-to-many",
        "many-to-one",
        "many-to-many",
      ]),
      field: fieldKey.optional(),
    }),
  ),
  seedData: z
    .array(
      z.object({
        entity: identifier,
        id: identifier.optional(),
        values: z.record(z.unknown()),
      }),
    )
    .optional(),
});

const policyModelSchema = z.object({
  roles: z.array(identifier),
  permissions: z.array(
    z.object({
      role: identifier,
      resource: z.union([identifier, z.literal("*")]),
      actions: z.array(identifier).min(1),
    }),
  ),
});

const flowModelSchema = z.object({
  flows: z.array(
    z.object({
      id: identifier,
      entity: identifier,
      initialState: identifier,
      states: z.array(identifier).min(1),
      events: z.array(identifier),
      transitions: z.array(
        z.object({
          from: identifier,
          event: identifier,
          to: identifier,
          roles: z.array(identifier).min(1).optional(),
          effects: z
            .array(
              z.object({
                capability: z.string().min(1),
                operation: identifier,
              }),
            )
            .optional(),
        }),
      ),
    }),
  ),
});

const prototypeReservedCompositionBindingKeys = new Set([
  "constructor",
  "hasOwnProperty",
  "isPrototypeOf",
  "propertyIsEnumerable",
  "prototype",
  "toLocaleString",
  "toString",
  "valueOf",
]);
const compositionBindingKey = z
  .string()
  .regex(/^[a-z][a-zA-Z0-9]*$/)
  .refine(
    (key) => !prototypeReservedCompositionBindingKeys.has(key),
    "Composition binding key must be prototype-safe.",
  );
const compositionBindingValueSchema = z.union([
  z
    .string()
    .min(1)
    .max(160)
    .regex(/^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/),
  z.number().finite(),
  z.boolean(),
  z
    .object({
      graphSymbol: z
        .string()
        .regex(
          /^graph\.(?:page|domain|policy|flow|integration|experience)\.[a-z][a-z0-9-]*$/,
        ),
      fieldKey: fieldKey.optional(),
    })
    .strict()
    .superRefine((binding, context) => {
      if (
        binding.fieldKey !== undefined &&
        !binding.graphSymbol.startsWith("graph.domain.")
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A composition field binding must target a domain entity.",
          path: ["fieldKey"],
        });
      }
    }),
]);
const capabilitySelectionSchema = z
  .object({
    lock: z
      .object({
        key: z.string().min(1).max(160),
        version: z.string().regex(/^\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9.-]+)?$/),
        packageRoot: z.string().min(1).max(512),
        manifestDigest: z.string().regex(/^sha256:[a-f0-9]{64}$/),
        lifecycle: z.literal("golden"),
      })
      .strict(),
    bindings: z.record(compositionBindingKey, compositionBindingValueSchema),
  })
  .strict();

const integrationModelSchema = z
  .object({
    providers: z.array(
      z.object({
        id: identifier,
        type: identifier,
        version: z.string().min(1).max(64).optional(),
      }),
    ),
    capabilities: z.array(
      z.object({
        key: z.string().min(1).max(160),
        providerId: identifier,
        operation: identifier,
      }),
    ),
    compositionProfile: identifier.optional(),
    assetLocks: z
      .array(
        z.object({
          key: z.string().min(1).max(160),
          version: z.string().regex(/^\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9.-]+)?$/),
          packageRoot: z.string().min(1).max(512),
          manifestDigest: z.string().regex(/^sha256:[a-f0-9]{64}$/),
          lifecycle: z.literal("golden"),
        }),
      )
      .optional(),
    compositionSelections: z.array(capabilitySelectionSchema).optional(),
  })
  .superRefine((integration, context) => {
    if (
      integration.assetLocks !== undefined &&
      integration.compositionSelections !== undefined
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Legacy asset locks and composition selections cannot be combined.",
        path: ["compositionSelections"],
      });
    }
  });

const experienceModelSchema = z.object({
  theme: z.object({
    mode: z.enum(["light", "dark", "system"]),
    tokens: z.record(z.string().min(1)).default({}),
  }),
  locales: z.array(z.string().min(2).max(32)).min(1),
});

export const applicationGraphSchema = z.object({
  apiVersion: z.literal("factory.application-graph/v1"),
  metadata: z.object({
    id: identifier,
    workspaceId: identifier,
    name: z.string().min(1).max(160),
  }),
  page: pageModelSchema,
  domain: domainModelSchema,
  policy: policyModelSchema,
  flow: flowModelSchema,
  integration: integrationModelSchema,
  experience: experienceModelSchema,
});

export type ApplicationGraphV1 = z.infer<typeof applicationGraphSchema>;
export type PageModel = ApplicationGraphV1["page"];
export type DomainModel = ApplicationGraphV1["domain"];
export type PolicyModel = ApplicationGraphV1["policy"];
export type FlowModel = ApplicationGraphV1["flow"];
export type IntegrationModel = ApplicationGraphV1["integration"];
export type ExperienceModel = ApplicationGraphV1["experience"];

type DomainEntityV1 = DomainModel["entities"][number];
type DomainFieldV1 = DomainEntityV1["fields"][number];
type PageV1 = PageModel["pages"][number];
type NavigationEntryV1 = PageModel["navigation"][number];
type FlowV1 = FlowModel["flows"][number];
type IntegrationProviderV1 = IntegrationModel["providers"][number];

export type GraphSymbolIndexV1 = {
  readonly entities: ReadonlyMap<string, DomainEntityV1>;
  readonly fieldsByEntity: ReadonlyMap<
    string,
    ReadonlyMap<string, DomainFieldV1>
  >;
  readonly pages: ReadonlyMap<string, PageV1>;
  readonly navigationEntries: ReadonlyMap<string, NavigationEntryV1>;
  readonly roles: ReadonlyMap<string, string>;
  readonly flows: ReadonlyMap<string, FlowV1>;
  readonly providers: ReadonlyMap<string, IntegrationProviderV1>;
  readonly experienceTokens: ReadonlyMap<string, string>;
  readonly entity: (key: string) => DomainEntityV1 | undefined;
  readonly field: (
    entityKey: string,
    fieldKey: string,
  ) => DomainFieldV1 | undefined;
  readonly page: (id: string) => PageV1 | undefined;
  readonly navigation: (id: string) => NavigationEntryV1 | undefined;
  readonly role: (key: string) => string | undefined;
  readonly flow: (id: string) => FlowV1 | undefined;
  readonly provider: (id: string) => IntegrationProviderV1 | undefined;
  readonly experienceToken: (key: string) => string | undefined;
};

function indexBy<T>(
  values: readonly T[],
  key: (value: T) => string,
  namespace: string,
): ReadonlyMap<string, T> {
  const index = new Map<string, T>();
  for (const value of values) {
    const identifier = key(value);
    if (index.has(identifier)) {
      throw new GraphSemanticError([
        {
          code: "graph_symbol.duplicate",
          message: `Graph symbol '${identifier}' is duplicated in the '${namespace}' namespace.`,
          path: [],
        },
      ]);
    }
    index.set(identifier, value);
  }
  return index;
}

/**
 * Builds capability-agnostic, independently typed lookup namespaces for one
 * Application Graph. Domain fields are reachable only through their owning
 * entity.
 */
export function createGraphSymbolIndex(
  graph: ApplicationGraphV1,
): GraphSymbolIndexV1 {
  const entities = indexBy(
    graph.domain.entities,
    ({ key }) => key,
    "domain.entity",
  );
  const fieldsByEntity = new Map(
    graph.domain.entities.map((entity) => [
      entity.key,
      indexBy(entity.fields, ({ key }) => key, "domain.field"),
    ]),
  );
  const pages = indexBy(graph.page.pages, ({ id }) => id, "page.page");
  const navigationEntries = indexBy(
    graph.page.navigation,
    ({ id }) => id,
    "page.navigation",
  );
  const roles = indexBy(graph.policy.roles, (role) => role, "policy.role");
  const flows = indexBy(graph.flow.flows, ({ id }) => id, "flow.flow");
  const providers = indexBy(
    graph.integration.providers,
    ({ id }) => id,
    "integration.provider",
  );
  const experienceTokens = new Map(
    Object.entries(graph.experience.theme.tokens),
  );

  return {
    entities,
    fieldsByEntity,
    pages,
    navigationEntries,
    roles,
    flows,
    providers,
    experienceTokens,
    entity: (key) => entities.get(key),
    field: (entityKey, fieldKey) =>
      fieldsByEntity.get(entityKey)?.get(fieldKey),
    page: (id) => pages.get(id),
    navigation: (id) => navigationEntries.get(id),
    role: (key) => roles.get(key),
    flow: (id) => flows.get(id),
    provider: (id) => providers.get(id),
    experienceToken: (key) => experienceTokens.get(key),
  };
}

export function parsePageModel(input: unknown): PageModel {
  return pageModelSchema.parse(input);
}

export function parseFlowModel(input: unknown): FlowModel {
  return flowModelSchema.parse(input);
}

export type GraphValidationIssue = {
  code: string;
  message: string;
  path: readonly (string | number)[];
};

export class GraphSemanticError extends Error {
  public constructor(public readonly issues: readonly GraphValidationIssue[]) {
    super(
      `Application Graph failed semantic validation (${issues.length} issue(s)).`,
    );
    this.name = "GraphSemanticError";
  }
}

function candidateCapabilityIssues(
  graph: ApplicationGraphV1,
): GraphValidationIssue[] {
  return graph.integration.capabilities.flatMap((capability, index) =>
    capability.key.startsWith("candidate.")
      ? [
          {
            code: "integration.capability.candidate_reserved",
            message: `Capability '${capability.key}' uses the reserved Candidate namespace.`,
            path: ["integration", "capabilities", index, "key"] as const,
          },
        ]
      : [],
  );
}

function ambiguousTypedSymbolIssues(
  graph: ApplicationGraphV1,
): GraphValidationIssue[] {
  return [
    ...duplicateValues(graph.page.navigation.map(({ id }) => id)).map(
      (duplicate) => ({
        code: "page.navigation.id.duplicate",
        message: `Navigation id '${duplicate}' is duplicated.`,
        path: ["page", "navigation"] as const,
      }),
    ),
    ...duplicateValues(graph.flow.flows.map(({ id }) => id)).map(
      (duplicate) => ({
        code: "flow.id.duplicate",
        message: `Flow id '${duplicate}' is duplicated.`,
        path: ["flow", "flows"] as const,
      }),
    ),
  ];
}

export function parseApplicationGraph(input: unknown): ApplicationGraphV1 {
  const graph = applicationGraphSchema.parse(input);
  const parsingIssues = [
    ...candidateCapabilityIssues(graph),
    ...ambiguousTypedSymbolIssues(graph),
    ...compositionGraphSymbolIssues(graph),
  ];
  if (parsingIssues.length > 0) {
    throw new GraphSemanticError(parsingIssues);
  }
  return graph;
}

function duplicateValues(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

function compositionGraphSymbolIssues(
  graph: ApplicationGraphV1,
): GraphValidationIssue[] {
  const symbolIds: Readonly<Record<string, ReadonlySet<string>>> = {
    page: new Set([
      ...graph.page.pages.map(({ id }) => id),
      ...graph.page.navigation.map(({ id }) => id),
    ]),
    domain: new Set([
      ...graph.domain.entities.map(({ key }) => key),
      ...graph.domain.entities.flatMap(({ fields }) =>
        fields.map(({ key }) => key),
      ),
    ]),
    policy: new Set(graph.policy.roles),
    flow: new Set([
      ...graph.flow.flows.map(({ id }) => id),
      ...graph.flow.flows.flatMap(({ states }) => states),
      ...graph.flow.flows.flatMap(({ events }) => events),
    ]),
    integration: new Set([
      ...graph.integration.providers.map(({ id }) => id),
      ...graph.integration.capabilities.map(({ key }) => key),
    ]),
    experience: new Set([
      ...Object.keys(graph.experience.theme.tokens),
      ...graph.experience.locales,
    ]),
  };
  const issues: GraphValidationIssue[] = [];
  graph.integration.compositionSelections?.forEach(
    (selection, selectionIndex) => {
      for (const [bindingKey, bindingValue] of Object.entries(
        selection.bindings,
      )) {
        if (typeof bindingValue !== "object") continue;
        const [, model, id] = bindingValue.graphSymbol.split(".");
        if (model && id && symbolIds[model]?.has(id)) {
          if (
            model === "domain" &&
            bindingValue.fieldKey !== undefined &&
            !graph.domain.entities
              .find((entity) => entity.key === id)
              ?.fields.some((field) => field.key === bindingValue.fieldKey)
          ) {
            issues.push({
              code: "integration.composition_binding.field_missing",
              message: `Field '${bindingValue.fieldKey}' does not exist on domain entity '${id}'.`,
              path: [
                "integration",
                "compositionSelections",
                selectionIndex,
                "bindings",
                bindingKey,
                "fieldKey",
              ],
            });
          }
          continue;
        }
        issues.push({
          code: "integration.composition_binding.symbol_missing",
          message: `Graph symbol '${bindingValue.graphSymbol}' does not exist in the Application Graph.`,
          path: [
            "integration",
            "compositionSelections",
            selectionIndex,
            "bindings",
            bindingKey,
            "graphSymbol",
          ],
        });
      }
    },
  );
  return issues;
}

/**
 * Validates relationships across otherwise independently parseable Graph models.
 * It never mutates the supplied graph and returns all known issues in one pass.
 */
export function validateApplicationGraph(
  input: unknown,
): GraphValidationIssue[] {
  const parsed = applicationGraphSchema.safeParse(input);
  if (!parsed.success) {
    return parsed.error.issues.map((issue) => ({
      code: `schema.${issue.code}`,
      message: issue.message,
      path: issue.path,
    }));
  }

  const graph = parsed.data;
  const issues: GraphValidationIssue[] = [];
  const issue = (
    code: string,
    message: string,
    path: readonly (string | number)[],
  ) => issues.push({ code, message, path });
  issues.push(...candidateCapabilityIssues(graph));
  issues.push(...ambiguousTypedSymbolIssues(graph));

  const pageIds = new Set(graph.page.pages.map((page) => page.id));
  for (const duplicate of duplicateValues(
    graph.page.pages.map((page) => page.id),
  )) {
    issue("page.id.duplicate", `Page id '${duplicate}' is duplicated.`, [
      "page",
      "pages",
    ]);
  }
  if (
    (graph.integration.assetLocks?.length ?? 0) > 0 &&
    !graph.integration.compositionProfile
  ) {
    issue(
      "integration.asset_lock.profile_missing",
      "Golden capability asset locks require an explicit composition profile.",
      ["integration", "compositionProfile"],
    );
  }
  for (const duplicate of duplicateValues(
    graph.page.pages.map((page) => page.route),
  )) {
    issue("page.route.duplicate", `Route '${duplicate}' is duplicated.`, [
      "page",
      "pages",
    ]);
  }
  graph.page.navigation.forEach((item, index) => {
    if (!pageIds.has(item.pageId)) {
      issue(
        "page.navigation.target_missing",
        `Navigation item '${item.id}' references unknown page '${item.pageId}'.`,
        ["page", "navigation", index, "pageId"],
      );
    }
  });

  const entityKeys = new Set(graph.domain.entities.map((entity) => entity.key));
  for (const duplicate of duplicateValues(
    graph.domain.entities.map((entity) => entity.key),
  )) {
    issue("domain.entity.duplicate", `Entity '${duplicate}' is duplicated.`, [
      "domain",
      "entities",
    ]);
  }
  graph.domain.entities.forEach((entity, entityIndex) => {
    const fieldKeys = new Set(entity.fields.map((field) => field.key));
    for (const duplicate of duplicateValues(
      entity.fields.map((field) => field.key),
    )) {
      issue(
        "domain.field.duplicate",
        `Entity '${entity.key}' contains duplicate field '${duplicate}'.`,
        ["domain", "entities", entityIndex, "fields"],
      );
    }
    entity.indexes.forEach((index, indexIndex) => {
      index.fields.forEach((field, fieldIndex) => {
        if (!fieldKeys.has(field)) {
          issue(
            "domain.index.field_missing",
            `Index on '${entity.key}' references unknown field '${field}'.`,
            [
              "domain",
              "entities",
              entityIndex,
              "indexes",
              indexIndex,
              "fields",
              fieldIndex,
            ],
          );
        }
      });
    });
  });
  graph.domain.relations.forEach((relation, index) => {
    if (!entityKeys.has(relation.from)) {
      issue(
        "domain.relation.source_missing",
        `Relation source '${relation.from}' is unknown.`,
        ["domain", "relations", index, "from"],
      );
    }
    if (!entityKeys.has(relation.to)) {
      issue(
        "domain.relation.target_missing",
        `Relation target '${relation.to}' is unknown.`,
        ["domain", "relations", index, "to"],
      );
    }
  });
  (graph.domain.seedData ?? []).forEach((seed, index) => {
    const entity = graph.domain.entities.find(
      (candidate) => candidate.key === seed.entity,
    );
    if (!entity) {
      issue(
        "domain.seed.entity_missing",
        `Seed record references unknown entity '${seed.entity}'.`,
        ["domain", "seedData", index, "entity"],
      );
      return;
    }
    const fieldKeys = new Set(entity.fields.map((field) => field.key));
    Object.keys(seed.values).forEach((field) => {
      if (!fieldKeys.has(field)) {
        issue(
          "domain.seed.field_missing",
          `Seed record for '${seed.entity}' contains unknown field '${field}'.`,
          ["domain", "seedData", index, "values", field],
        );
      }
    });
  });
  graph.page.pages.forEach((page, pageIndex) =>
    page.blocks.forEach((block, blockIndex) => {
      if (block.entity && !entityKeys.has(block.entity)) {
        issue(
          "page.block.entity_missing",
          `Block '${block.id}' references unknown entity '${block.entity}'.`,
          ["page", "pages", pageIndex, "blocks", blockIndex, "entity"],
        );
      }
    }),
  );

  const roles = new Set(graph.policy.roles);
  for (const duplicate of duplicateValues(graph.policy.roles)) {
    issue("policy.role.duplicate", `Role '${duplicate}' is duplicated.`, [
      "policy",
      "roles",
    ]);
  }
  graph.policy.permissions.forEach((permission, index) => {
    if (!roles.has(permission.role)) {
      issue(
        "policy.permission.role_missing",
        `Permission references unknown role '${permission.role}'.`,
        ["policy", "permissions", index, "role"],
      );
    }
    if (permission.resource !== "*" && !entityKeys.has(permission.resource)) {
      issue(
        "policy.permission.resource_missing",
        `Permission references unknown resource '${permission.resource}'.`,
        ["policy", "permissions", index, "resource"],
      );
    }
  });

  const capabilities = new Set(
    graph.integration.capabilities.map((capability) => capability.key),
  );
  const providerIds = new Set(
    graph.integration.providers.map((provider) => provider.id),
  );
  for (const duplicate of duplicateValues(
    graph.integration.providers.map((provider) => provider.id),
  )) {
    issue(
      "integration.provider.duplicate",
      `Provider '${duplicate}' is duplicated.`,
      ["integration", "providers"],
    );
  }
  for (const duplicate of duplicateValues(
    graph.integration.capabilities.map((capability) => capability.key),
  )) {
    issue(
      "integration.capability.duplicate",
      `Capability '${duplicate}' is duplicated.`,
      ["integration", "capabilities"],
    );
  }
  for (const duplicate of duplicateValues(
    (graph.integration.assetLocks ?? []).map((assetLock) => assetLock.key),
  )) {
    issue(
      "integration.asset_lock.duplicate",
      `Capability asset lock '${duplicate}' is duplicated.`,
      ["integration", "assetLocks"],
    );
  }
  graph.integration.capabilities.forEach((capability, index) => {
    if (
      capability.providerId !== "factory" &&
      !providerIds.has(capability.providerId)
    ) {
      issue(
        "integration.capability.provider_missing",
        `Capability '${capability.key}' references unknown provider '${capability.providerId}'.`,
        ["integration", "capabilities", index, "providerId"],
      );
    }
  });
  issues.push(...compositionGraphSymbolIssues(graph));

  graph.flow.flows.forEach((flow, flowIndex) => {
    const states = new Set(flow.states);
    const events = new Set(flow.events);
    if (!entityKeys.has(flow.entity)) {
      issue(
        "flow.entity_missing",
        `Flow '${flow.id}' references unknown entity '${flow.entity}'.`,
        ["flow", "flows", flowIndex, "entity"],
      );
    }
    if (!states.has(flow.initialState)) {
      issue(
        "flow.initial_state_missing",
        `Flow '${flow.id}' initial state '${flow.initialState}' is not declared.`,
        ["flow", "flows", flowIndex, "initialState"],
      );
    }
    flow.transitions.forEach((transition, transitionIndex) => {
      const transitionPath = [
        "flow",
        "flows",
        flowIndex,
        "transitions",
        transitionIndex,
      ] as const;
      if (!states.has(transition.from)) {
        issue(
          "flow.transition.source_missing",
          `Flow '${flow.id}' source state '${transition.from}' is unknown.`,
          [...transitionPath, "from"],
        );
      }
      if (!states.has(transition.to)) {
        issue(
          "flow.transition.target_missing",
          `Flow '${flow.id}' target state '${transition.to}' is unknown.`,
          [...transitionPath, "to"],
        );
      }
      if (!events.has(transition.event)) {
        issue(
          "flow.transition.event_missing",
          `Flow '${flow.id}' event '${transition.event}' is not declared.`,
          [...transitionPath, "event"],
        );
      }
      transition.roles?.forEach((role, roleIndex) => {
        if (!roles.has(role)) {
          issue(
            "flow.transition.role_missing",
            `Transition references unknown role '${role}'.`,
            [...transitionPath, "roles", roleIndex],
          );
        }
      });
      transition.effects?.forEach((effect, effectIndex) => {
        if (!capabilities.has(effect.capability)) {
          issue(
            "flow.effect.capability_missing",
            `Transition effect references unknown capability '${effect.capability}'.`,
            [...transitionPath, "effects", effectIndex, "capability"],
          );
        }
      });
    });
  });

  return issues;
}

export function assertValidApplicationGraph(
  input: unknown,
): ApplicationGraphV1 {
  const graph = parseApplicationGraph(input);
  const issues = validateApplicationGraph(graph);
  if (issues.length > 0) throw new GraphSemanticError(issues);
  return graph;
}
