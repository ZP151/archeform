import { z } from "zod";

import {
  capabilityKeySchema,
  CompositionError,
  digestJson,
  graphFieldKeySchema,
  graphKeySchema,
  parseStrict,
  safeBusinessTextSchema,
  sha256DigestSchema,
} from "./composition-shared.js";
import { experienceDesignSystemSchema } from "./experience.js";
import {
  assertValidApplicationGraph,
  type ApplicationGraphV1,
} from "./model.js";
import {
  applicationSurfaceSchema,
  screenIntentSchema,
} from "./product-recipe.js";
import type { Sha256Digest } from "./product-intent.js";

const identifierSchema = graphKeySchema;
const publishedVersionSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9.-]+)?$/);

const pageBlockSchema = z
  .object({
    id: identifierSchema,
    type: z.string().min(1).max(128),
    entity: identifierSchema.optional(),
    props: z.record(z.unknown()).optional(),
    bindings: z.record(z.string()).optional(),
  })
  .strict();

const graphPageV2Schema = z
  .object({
    id: identifierSchema,
    route: z.string().min(1).startsWith("/"),
    title: z.string().min(1).max(160),
    blocks: z.array(pageBlockSchema),
    surfaceKey: graphKeySchema,
    screenIntent: screenIntentSchema,
    recipe: z
      .object({
        key: graphKeySchema,
        version: publishedVersionSchema,
        regions: z.array(
          z
            .object({
              key: graphKeySchema,
              blockIds: z.array(graphKeySchema),
            })
            .strict(),
        ),
      })
      .strict(),
  })
  .strict();

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

const domainFieldSchema = z
  .object({
    key: graphFieldKeySchema,
    type: fieldTypeSchema,
    required: z.boolean(),
    unique: z.boolean().optional(),
    values: z.array(z.string().min(1)).min(1).optional(),
  })
  .strict();

const domainModelSchema = z
  .object({
    entities: z.array(
      z
        .object({
          key: identifierSchema,
          label: z.string().min(1).max(120),
          fields: z.array(domainFieldSchema),
          indexes: z.array(
            z
              .object({
                fields: z.array(graphFieldKeySchema).min(1),
                unique: z.boolean().optional(),
              })
              .strict(),
          ),
        })
        .strict(),
    ),
    relations: z.array(
      z
        .object({
          from: identifierSchema,
          to: identifierSchema,
          kind: z.enum([
            "one-to-one",
            "one-to-many",
            "many-to-one",
            "many-to-many",
          ]),
          field: graphFieldKeySchema.optional(),
        })
        .strict(),
    ),
    seedData: z
      .array(
        z
          .object({
            entity: identifierSchema,
            id: identifierSchema.optional(),
            values: z.record(z.unknown()),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();

const policyModelSchema = z
  .object({
    roles: z.array(identifierSchema),
    permissions: z.array(
      z
        .object({
          role: identifierSchema,
          resource: z.union([identifierSchema, z.literal("*")]),
          actions: z.array(identifierSchema).min(1),
        })
        .strict(),
    ),
  })
  .strict();

const flowModelSchema = z
  .object({
    flows: z.array(
      z
        .object({
          id: identifierSchema,
          entity: identifierSchema,
          initialState: identifierSchema,
          states: z.array(identifierSchema).min(1),
          events: z.array(identifierSchema),
          transitions: z.array(
            z
              .object({
                from: identifierSchema,
                event: identifierSchema,
                to: identifierSchema,
                roles: z.array(identifierSchema).min(1).optional(),
                effects: z
                  .array(
                    z
                      .object({
                        capability: z.string().min(1),
                        operation: identifierSchema,
                      })
                      .strict(),
                  )
                  .optional(),
              })
              .strict(),
          ),
        })
        .strict(),
    ),
  })
  .strict();

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
      fieldKey: graphFieldKeySchema.optional(),
    })
    .strict(),
]);

const capabilityLockSchema = z
  .object({
    key: z.string().min(1).max(160),
    version: publishedVersionSchema,
    packageRoot: z.string().min(1).max(512),
    manifestDigest: sha256DigestSchema,
    lifecycle: z.literal("golden"),
  })
  .strict();

const integrationModelSchema = z
  .object({
    providers: z.array(
      z
        .object({
          id: identifierSchema,
          type: identifierSchema,
          version: z.string().min(1).max(64).optional(),
        })
        .strict(),
    ),
    capabilities: z.array(
      z
        .object({
          key: z.string().min(1).max(160),
          providerId: identifierSchema,
          operation: identifierSchema,
        })
        .strict(),
    ),
    compositionProfile: identifierSchema.optional(),
    assetLocks: z.array(capabilityLockSchema).optional(),
    compositionSelections: z
      .array(
        z
          .object({
            lock: capabilityLockSchema,
            bindings: z.record(compositionBindingValueSchema),
          })
          .strict(),
      )
      .optional(),
  })
  .strict()
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

const experienceModelV2Schema = z
  .object({
    theme: z
      .object({
        mode: z.enum(["light", "dark", "system"]),
        tokens: z.record(z.string().min(1)).default({}),
      })
      .strict(),
    designSystem: experienceDesignSystemSchema.optional(),
    locales: z.array(z.string().min(2).max(32)).min(1),
    responsiveNavigation: z.array(
      z
        .object({
          surfaceKey: graphKeySchema,
          compactAt: z.number().int().nonnegative(),
          collapse: z.enum(["drawer", "tabs", "none"]),
        })
        .strict(),
    ),
  })
  .strict();

const journeySchema = z
  .object({
    key: graphKeySchema,
    label: safeBusinessTextSchema.max(160),
    actorRoleKey: graphKeySchema,
    flowKeys: z.array(graphKeySchema).min(1),
    entryPageKey: graphKeySchema,
    outcome: safeBusinessTextSchema.max(500),
  })
  .strict();

const bindingPolicySchema = z
  .object({
    pageId: graphKeySchema,
    blockId: graphKeySchema,
    bindingKey: z
      .string()
      .min(1)
      .max(128)
      .regex(/^[a-z][a-zA-Z0-9-]*$/),
    entityKey: graphKeySchema,
    fieldKey: graphFieldKeySchema,
    access: z.enum(["read", "write"]),
    authority: z.enum(["client", "server"]),
  })
  .strict();

const fieldAuthoritySchema = z
  .object({
    entityKey: graphKeySchema,
    fieldKey: graphFieldKeySchema,
    authority: z.enum(["client", "server"]),
  })
  .strict();

export const applicationGraphV2Schema = z
  .object({
    apiVersion: z.literal("factory.application-graph/v2"),
    metadata: z
      .object({
        id: identifierSchema,
        workspaceId: identifierSchema,
        name: z.string().min(1).max(160),
      })
      .strict(),
    surfaces: z.array(applicationSurfaceSchema),
    page: z.object({ pages: z.array(graphPageV2Schema) }).strict(),
    domain: domainModelSchema,
    policy: policyModelSchema,
    flow: flowModelSchema,
    integration: integrationModelSchema,
    experience: experienceModelV2Schema,
    seedScenarios: z.array(
      z
        .object({
          key: graphKeySchema,
          label: safeBusinessTextSchema.max(160),
          actorKeys: z.array(graphKeySchema),
          records: z.array(
            z
              .object({
                entityKey: graphKeySchema,
                values: z.record(z.unknown()),
              })
              .strict(),
          ),
        })
        .strict(),
    ),
    journeys: z.array(journeySchema),
    fieldAuthorities: z.array(fieldAuthoritySchema),
    bindingPolicies: z.array(bindingPolicySchema),
  })
  .strict();

export type ApplicationGraphV2 = z.infer<typeof applicationGraphV2Schema>;

function assertUnique(values: readonly string[], label: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      throw new CompositionError(`${label} '${value}' is duplicated.`);
    }
    seen.add(value);
  }
}

function assertRetainedV1Semantics(graph: ApplicationGraphV2): void {
  const v1: ApplicationGraphV1 = {
    apiVersion: "factory.application-graph/v1",
    metadata: structuredClone(graph.metadata),
    page: {
      pages: graph.page.pages.map(
        ({ surfaceKey, screenIntent, recipe, ...page }) =>
          structuredClone(page),
      ),
      navigation: [],
    },
    domain: structuredClone(graph.domain),
    policy: structuredClone(graph.policy),
    flow: structuredClone(graph.flow),
    integration: structuredClone(graph.integration),
    experience: {
      theme: structuredClone(graph.experience.theme),
      ...(graph.experience.designSystem === undefined
        ? {}
        : { designSystem: structuredClone(graph.experience.designSystem) }),
      locales: structuredClone(graph.experience.locales),
    },
  };
  assertValidApplicationGraph(v1);
}

function assertPageAndSurfaceSemantics(graph: ApplicationGraphV2): void {
  assertUnique(
    graph.surfaces.map(({ key }) => key),
    "Application Graph V2 surface",
  );
  assertUnique(
    graph.page.pages.map(({ id }) => id),
    "Application Graph V2 page",
  );
  const roles = new Set(graph.policy.roles);
  const pages = new Map(graph.page.pages.map((page) => [page.id, page]));
  const surfaces = new Set(graph.surfaces.map(({ key }) => key));
  for (const page of graph.page.pages) {
    if (!surfaces.has(page.surfaceKey)) {
      throw new CompositionError(
        `Page '${page.id}' references unknown surface '${page.surfaceKey}'.`,
      );
    }
  }
  for (const surface of graph.surfaces) {
    assertUnique(
      surface.audienceRoles,
      `Surface '${surface.key}' audience role`,
    );
    assertUnique(
      surface.navigation.items.map(({ pageKey }) => pageKey),
      `Surface '${surface.key}' navigation target`,
    );
    for (const role of surface.audienceRoles) {
      if (!roles.has(role)) {
        throw new CompositionError(
          `Surface '${surface.key}' references unknown role '${role}'.`,
        );
      }
    }
    for (const pageKey of [
      surface.entryPageKey,
      ...surface.navigation.items.map(({ pageKey }) => pageKey),
    ]) {
      const page = pages.get(pageKey);
      if (!page) {
        throw new CompositionError(
          `Surface '${surface.key}' references unknown page '${pageKey}'.`,
        );
      }
      if (page.surfaceKey !== surface.key) {
        throw new CompositionError(
          `Surface navigation must target a page on the same surface; '${pageKey}' is cross-surface.`,
        );
      }
    }
  }

  for (const page of graph.page.pages) {
    if (page.screenIntent.key !== page.id) {
      throw new CompositionError(
        `Page '${page.id}' Screen Intent key must match its page id.`,
      );
    }
    if (page.recipe.key !== page.screenIntent.recipeKey) {
      throw new CompositionError(
        `Page '${page.id}' recipe does not match its Screen Intent recipe.`,
      );
    }
    assertUnique(
      page.blocks.map(({ id }) => id),
      `Page '${page.id}' block`,
    );
    assertUnique(
      page.recipe.regions.map(({ key }) => key),
      `Page '${page.id}' recipe region`,
    );
    const blockIds = new Set(page.blocks.map(({ id }) => id));
    const regionBlockIds = page.recipe.regions.flatMap(
      ({ blockIds }) => blockIds,
    );
    for (const blockId of regionBlockIds) {
      if (!blockIds.has(blockId)) {
        throw new CompositionError(
          `Page '${page.id}' recipe references unknown block '${blockId}'.`,
        );
      }
    }
    for (const blockId of blockIds) {
      if (
        regionBlockIds.filter((candidate) => candidate === blockId).length !== 1
      ) {
        throw new CompositionError(
          `Page '${page.id}' recipe must reference block '${blockId}' exactly once.`,
        );
      }
    }
  }

  const customerEntities = new Set<string>();
  const merchantEntities = new Set<string>();
  for (const page of graph.page.pages) {
    const surface = graph.surfaces.find(({ key }) => key === page.surfaceKey)!;
    const target =
      surface.kind === "customer"
        ? customerEntities
        : surface.kind === "merchant"
          ? merchantEntities
          : undefined;
    for (const entityKey of page.screenIntent.entityKeys) {
      target?.add(entityKey);
    }
  }
  if (
    graph.surfaces.some(({ kind }) => kind === "customer") &&
    graph.surfaces.some(({ kind }) => kind === "merchant") &&
    ![...customerEntities].some((entityKey) => merchantEntities.has(entityKey))
  ) {
    throw new CompositionError(
      "Customer and merchant surfaces must share at least one business entity; shadow domains are forbidden.",
    );
  }
}

function assertJourneyAndScreenSemantics(graph: ApplicationGraphV2): void {
  assertUnique(
    graph.journeys.map(({ key }) => key),
    "Application Graph V2 journey",
  );
  const roles = new Set(graph.policy.roles);
  const flows = new Set(graph.flow.flows.map(({ id }) => id));
  const pages = new Set(graph.page.pages.map(({ id }) => id));
  const journeys = new Set(graph.journeys.map(({ key }) => key));
  const entities = new Set(graph.domain.entities.map(({ key }) => key));
  const capabilities = new Set(
    graph.integration.capabilities.map(({ key }) => key),
  );
  const reachableFlows = new Set<string>();
  for (const journey of graph.journeys) {
    if (!roles.has(journey.actorRoleKey)) {
      throw new CompositionError(
        `Journey '${journey.key}' references unknown role '${journey.actorRoleKey}'.`,
      );
    }
    assertUnique(journey.flowKeys, `Journey '${journey.key}' flow`);
    for (const flow of journey.flowKeys) {
      if (!flows.has(flow)) {
        throw new CompositionError(
          `Journey '${journey.key}' references unknown flow '${flow}'.`,
        );
      }
      reachableFlows.add(flow);
    }
    if (!pages.has(journey.entryPageKey)) {
      throw new CompositionError(
        `Journey '${journey.key}' references unknown page '${journey.entryPageKey}'.`,
      );
    }
  }
  for (const flow of flows) {
    if (!reachableFlows.has(flow)) {
      throw new CompositionError(
        `Graph flow '${flow}' is not reachable from a journey.`,
      );
    }
  }
  for (const page of graph.page.pages) {
    const screen = page.screenIntent;
    assertUnique(screen.primaryJourneyKeys, `Screen '${screen.key}' journey`);
    assertUnique(screen.entityKeys, `Screen '${screen.key}' entity`);
    assertUnique(screen.capabilityKeys, `Screen '${screen.key}' capability`);
    for (const journey of screen.primaryJourneyKeys) {
      if (!journeys.has(journey)) {
        throw new CompositionError(
          `Screen '${screen.key}' references unknown journey '${journey}'.`,
        );
      }
    }
    for (const entity of screen.entityKeys) {
      if (!entities.has(entity)) {
        throw new CompositionError(
          `Screen '${screen.key}' references unknown entity '${entity}'.`,
        );
      }
    }
    for (const capability of screen.capabilityKeys) {
      if (!capabilities.has(capability)) {
        throw new CompositionError(
          `Screen '${screen.key}' references unknown capability '${capability}'.`,
        );
      }
    }
  }
}

function assertFlowGrants(graph: ApplicationGraphV2): void {
  for (const flow of graph.flow.flows) {
    for (const transition of flow.transitions) {
      if (!transition.roles || transition.roles.length === 0) {
        throw new CompositionError(
          `Flow '${flow.id}' transition '${transition.event}' requires an actor grant.`,
        );
      }
      for (const role of transition.roles) {
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
    }
  }
}

function assertJourneyActorConsistency(graph: ApplicationGraphV2): void {
  const flows = new Map(graph.flow.flows.map((flow) => [flow.id, flow]));
  for (const journey of graph.journeys) {
    for (const flowKey of journey.flowKeys) {
      const flow = flows.get(flowKey)!;
      for (const transition of flow.transitions) {
        if (!transition.roles?.includes(journey.actorRoleKey)) {
          throw new CompositionError(
            `Journey '${journey.key}' actor '${journey.actorRoleKey}' is missing from flow '${flowKey}' transition '${transition.event}'.`,
          );
        }
      }
    }
  }
}

function assertSeedScenarios(graph: ApplicationGraphV2): void {
  assertUnique(
    graph.seedScenarios.map(({ key }) => key),
    "Application Graph V2 seed scenario",
  );
  const roles = new Set(graph.policy.roles);
  const entities = new Map(
    graph.domain.entities.map((entity) => [entity.key, entity]),
  );
  for (const scenario of graph.seedScenarios) {
    assertUnique(scenario.actorKeys, `Seed scenario '${scenario.key}' actor`);
    for (const actor of scenario.actorKeys) {
      if (!roles.has(actor)) {
        throw new CompositionError(
          `Seed scenario '${scenario.key}' references unknown role '${actor}'.`,
        );
      }
    }
    for (const record of scenario.records) {
      const entity = entities.get(record.entityKey);
      if (!entity) {
        throw new CompositionError(
          `Seed scenario '${scenario.key}' references unknown entity '${record.entityKey}'.`,
        );
      }
      const fields = new Map(entity.fields.map((field) => [field.key, field]));
      for (const field of entity.fields) {
        if (
          field.required &&
          !Object.prototype.hasOwnProperty.call(record.values, field.key)
        ) {
          throw new CompositionError(
            `Seed record for '${entity.key}' omits required field '${field.key}'.`,
          );
        }
      }
      for (const [fieldKey, value] of Object.entries(record.values)) {
        const field = fields.get(fieldKey);
        if (!field) {
          throw new CompositionError(
            `Seed record for '${entity.key}' references unknown field '${fieldKey}'.`,
          );
        }
        if (
          (field.type === "date" || field.type === "datetime") &&
          (typeof value !== "string" || Number.isNaN(Date.parse(value)))
        ) {
          throw new CompositionError(
            `Seed record field '${fieldKey}' has an invalid temporal value for ${field.type}.`,
          );
        }
      }
    }
  }
}

function assertBindingPolicies(graph: ApplicationGraphV2): void {
  const pages = new Map(graph.page.pages.map((page) => [page.id, page]));
  const entities = new Map(
    graph.domain.entities.map((entity) => [entity.key, entity]),
  );
  const policyKeys = graph.bindingPolicies.map(
    ({ pageId, blockId, bindingKey }) => `${pageId}:${blockId}:${bindingKey}`,
  );
  assertUnique(policyKeys, "Application Graph V2 binding policy");
  const policyCounts = new Map<string, number>();
  const fieldAuthorities = new Map(
    graph.fieldAuthorities.map(({ entityKey, fieldKey, authority }) => [
      `${entityKey}:${fieldKey}`,
      authority,
    ]),
  );
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
    const expectedBindingTarget = `graph.domain.${policy.entityKey}.${policy.fieldKey}`;
    if (block.bindings[policy.bindingKey] !== expectedBindingTarget) {
      throw new CompositionError(
        `Binding policy target '${expectedBindingTarget}' does not match binding '${policy.bindingKey}'.`,
      );
    }
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
    const key = `${policy.pageId}:${policy.blockId}:${policy.bindingKey}`;
    policyCounts.set(key, (policyCounts.get(key) ?? 0) + 1);
  }
  for (const page of graph.page.pages) {
    for (const block of page.blocks) {
      for (const bindingKey of Object.keys(block.bindings ?? {})) {
        const key = `${page.id}:${block.id}:${bindingKey}`;
        if (policyCounts.get(key) !== 1) {
          throw new CompositionError(
            `Block binding '${key}' requires exactly one policy.`,
          );
        }
      }
    }
  }
}

function assertFieldAuthorities(graph: ApplicationGraphV2): void {
  const entities = new Map(
    graph.domain.entities.map((entity) => [entity.key, entity]),
  );
  const authorityKeys = graph.fieldAuthorities.map(
    ({ entityKey, fieldKey }) => `${entityKey}:${fieldKey}`,
  );
  assertUnique(authorityKeys, "Application Graph V2 field authority");

  const authorityCounts = new Map<string, number>();
  for (const authority of graph.fieldAuthorities) {
    const entity = entities.get(authority.entityKey);
    if (!entity) {
      throw new CompositionError(
        `Field authority references unknown entity '${authority.entityKey}'.`,
      );
    }
    if (!entity.fields.some(({ key }) => key === authority.fieldKey)) {
      throw new CompositionError(
        `Field authority references unknown field '${authority.fieldKey}'.`,
      );
    }
    const key = `${authority.entityKey}:${authority.fieldKey}`;
    authorityCounts.set(key, (authorityCounts.get(key) ?? 0) + 1);
  }

  for (const entity of graph.domain.entities) {
    for (const field of entity.fields) {
      const key = `${entity.key}:${field.key}`;
      if (authorityCounts.get(key) !== 1) {
        throw new CompositionError(
          `Domain field '${entity.key}.${field.key}' requires exactly one field authority.`,
        );
      }
    }
  }
}

export function assertApplicationGraphV2(input: unknown): ApplicationGraphV2 {
  const graph = parseStrict(applicationGraphV2Schema, input);
  assertRetainedV1Semantics(graph);
  assertPageAndSurfaceSemantics(graph);
  assertJourneyAndScreenSemantics(graph);
  assertFlowGrants(graph);
  assertJourneyActorConsistency(graph);
  assertSeedScenarios(graph);
  assertFieldAuthorities(graph);
  assertBindingPolicies(graph);
  assertUnique(
    graph.experience.responsiveNavigation.map(({ surfaceKey }) => surfaceKey),
    "Responsive navigation surface",
  );
  const surfaces = new Set(graph.surfaces.map(({ key }) => key));
  for (const navigation of graph.experience.responsiveNavigation) {
    if (!surfaces.has(navigation.surfaceKey)) {
      throw new CompositionError(
        `Responsive navigation references unknown surface '${navigation.surfaceKey}'.`,
      );
    }
  }
  return graph;
}

export function hashApplicationGraphV2(input: unknown): Sha256Digest {
  return digestJson(assertApplicationGraphV2(input)) as Sha256Digest;
}
