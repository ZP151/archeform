import { z } from "zod";
import { createHash } from "node:crypto";
import {
  CompositionError,
  matchInventoryOperationsGraphV1,
  matchServiceWorkOrdersBlueprintV1,
  matchServiceWorkOrdersGraphV1,
  graphKeySchema,
  safeBusinessTextSchema,
  hashRequirementSpec,
  productBlueprintSchema,
  createBlankApplicationDraft,
  createDraftRevision,
  applyGraphDiffToDraft,
} from "@factory/graph";
import {
  composeDefaultCapabilityDraft,
  isContentDirectoryBlueprint,
  isAppointmentConsumerWorkspaceBlueprint,
  composeRestaurantProductGraph,
  parseRestaurantMenuParameters,
  getCanonicalRestaurantAuthority,
  restaurantOrderingProductIntent,
  restaurantOrderingExperienceBrief,
  restaurantOrderingProductRecipe,
} from "@factory/capabilities";
import {
  planProductAlternatives,
  composeProductDraft,
} from "@factory/capabilities/node";
import {
  assertRequirementInterpretation,
  deriveClarifications,
} from "./requirement-interpreter.js";
import type {
  ProductDefinitionData,
  DefinitionReason,
} from "./product-definition-data.js";

function selectionJsonSchema(definitionKey: string, family: string): object {
  if (family === "restaurant") {
    const restaurantSelectionJsonFields = {
      type: "object",
      additionalProperties: false,
      required: [
        "definitionKey",
        "disposition",
        "requirementId",
        "title",
        "outcome",
        "materialQuestions",
        "businessParameters",
      ],
      properties: {
        definitionKey: { type: "string", const: definitionKey },
        disposition: {
          type: "string",
          enum: ["supported-default", "needs-clarification"],
        },
        requirementId: { type: "string", pattern: "^[a-z][a-z0-9-]*$" },
        title: {
          type: "string",
          minLength: 2,
          maxLength: 80,
          pattern:
            "^[^\\s\\u0000-\\u001F\\u007F][^\\u0000-\\u001F\\u007F]*[^\\s\\u0000-\\u001F\\u007F]$",
        },
        outcome: { type: "string", minLength: 1, maxLength: 2000 },
        businessParameters: {
          anyOf: [
            {
              type: "object",
              additionalProperties: false,
              required: ["apiVersion", "mode", "currency", "items"],
              properties: {
                apiVersion: {
                  type: "string",
                  const: "factory.restaurant-menu-parameters/v1",
                },
                mode: {
                  type: "string",
                  enum: ["canonical-default", "provided"],
                },
                currency: { type: "string", const: "USD" },
                items: {
                  type: "array",
                  maxItems: 100,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["name", "description", "priceMinor"],
                    properties: {
                      name: {
                        type: "string",
                        minLength: 1,
                        maxLength: 120,
                      },
                      description: {
                        anyOf: [
                          { type: "string", minLength: 1, maxLength: 1000 },
                          { type: "null" },
                        ],
                      },
                      priceMinor: {
                        type: "integer",
                        minimum: 0,
                        maximum: 10000000,
                      },
                    },
                  },
                },
              },
            },
            { type: "null" },
          ],
        },
        materialQuestions: {
          type: "array",
          maxItems: 30,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["category", "question"],
            properties: {
              category: {
                type: "string",
                enum: [
                  "authorization",
                  "visibility",
                  "role",
                  "business-rule",
                  "data",
                  "integration",
                ],
              },
              question: { type: "string", minLength: 1, maxLength: 500 },
            },
          },
        },
      },
    };
    const restaurantDefinitionSelectionJsonSchema = {
      anyOf: (["supported-default", "needs-clarification"] as const).map(
        (disposition) => ({
          ...restaurantSelectionJsonFields,
          properties: {
            ...restaurantSelectionJsonFields.properties,
            disposition: { type: "string", const: disposition },
            materialQuestions: {
              ...restaurantSelectionJsonFields.properties.materialQuestions,
              minItems: disposition === "supported-default" ? 0 : 1,
              maxItems: disposition === "supported-default" ? 0 : 30,
            },
          },
        }),
      ),
    };

    return restaurantDefinitionSelectionJsonSchema;
  }
  const jsonSchema = {
    anyOf: (["supported-default", "needs-clarification"] as const).map(
      (disposition) => ({
        type: "object",
        additionalProperties: false,
        required: [
          "definitionKey",
          "disposition",
          "requirementId",
          "title",
          "outcome",
          "materialQuestions",
          "businessParameters",
        ],
        properties: {
          definitionKey: { type: "string", const: definitionKey },
          disposition: { type: "string", const: disposition },
          requirementId: {
            type: "string",
            minLength: 1,
            maxLength: 128,
            pattern: "^[a-z][a-z0-9-]*$",
          },
          title: {
            type: "string",
            minLength: 2,
            maxLength: 80,
          },
          outcome: {
            type: "string",
            minLength: 1,
            maxLength: 2000,
          },
          businessParameters: { type: "null" },
          materialQuestions: {
            type: "array",
            minItems: disposition === "supported-default" ? 0 : 1,
            maxItems: disposition === "supported-default" ? 0 : 30,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["category", "question"],
              properties: {
                category: {
                  type: "string",
                  enum: [
                    "authorization",
                    "visibility",
                    "role",
                    "business-rule",
                    "data",
                    "integration",
                  ],
                },
                question: {
                  type: "string",
                  minLength: 1,
                  maxLength: 500,
                },
              },
            },
          },
        },
      }),
    ),
  };

  return jsonSchema;
}

const categories = [
  "authorization",
  "visibility",
  "role",
  "business-rule",
  "data",
  "integration",
] as const;
const text = z.string().min(1).max(24000);
const bp = productBlueprintSchema.shape;
export const familyGuideSchemas = {
  "service-work-orders": productBlueprintSchema
    .extend({ definitionKey: graphKeySchema, identity: text })
    .strict(),
  "inventory-operations": productBlueprintSchema
    .extend({ definitionKey: graphKeySchema, identity: text })
    .strict(),
  "content-directory": productBlueprintSchema
    .extend({ definitionKey: graphKeySchema, identity: text })
    .strict(),
  appointment: productBlueprintSchema
    .extend({ definitionKey: graphKeySchema, identity: text })
    .strict(),
  approval: z
    .object({
      definitionKey: graphKeySchema,
      template: z
        .object({
          key: z.literal("approval-definition-template"),
          version: z.literal("2.0.0"),
        })
        .strict(),
      actors: bp.actors,
      entities: bp.entities,
      pageIntents: bp.pageIntents,
      workflows: bp.workflows,
      acceptanceJourneys: bp.acceptanceJourneys,
      identity: text,
      integrations: text,
    })
    .strict(),
  task: productBlueprintSchema
    .extend({ definitionKey: graphKeySchema, identity: text })
    .strict(),
  restaurant: z
    .object({
      definitionKey: graphKeySchema,
      productType: z.literal("restaurant-ordering"),
      actorKeys: z.array(graphKeySchema).max(20),
      acceptanceJourneyKeys: z.array(graphKeySchema).max(20),
      constraints: z
        .object({
          moneyMovement: z.literal("simulated"),
          externalSideEffects: z.literal(false),
        })
        .strict(),
      surfaces: z
        .array(
          z
            .object({
              key: graphKeySchema,
              device: z.enum(["mobile", "desktop", "tablet", "responsive"]),
              audience: z.array(graphKeySchema).max(20),
              navigation: z.enum(["bottom-tabs", "sidebar", "top-nav", "none"]),
            })
            .strict(),
        )
        .max(10),
    })
    .strict(),
};
const fixedLocks = [
  [
    "core.crud",
    "1.0.1",
    "8dede9ba8d63bea9b09c7bf7ac6ce784c52595b644d03eca52ea6996a31882d1",
  ],
  [
    "core.workflow",
    "1.0.1",
    "16ebf7d8128f30e656d7c86e39ef36323991cf7af7ea18a5d81a3ac0e4c06884",
  ],
  [
    "core.identity-policy",
    "1.0.0",
    "a216444b219f00431820a0df8e2bc3b604296430beb8fa6549f1b40c92025d82",
  ],
  [
    "core.policy-declarations",
    "1.0.0",
    "56e6ead5aaa6e9f5fe9cf7c608b6b51b16064964cf95cd123bdc3e0725642c54",
  ],
  [
    "core.audit",
    "1.0.2",
    "fe6616252c7b44efe61d516d305e689f3f593d70d5287baac31b5f31013addc8",
  ],
  [
    "core.notification",
    "1.1.1",
    "207eaa0fd719013129ba84bd8f66f82219b619ee1f5c9e2d4e3d896c339e6132",
  ],
].map(([key, version, digest]) => ({
  key: key!,
  version: version!,
  manifestDigest: "sha256:" + digest,
}));
const appointmentLocks = [
  ...fixedLocks,
  {
    key: "scheduling.appointment",
    version: "1.0.1",
    manifestDigest:
      "sha256:d77a8ec2a8bcaba17510b7d6a7d073b26ccc6a2857fd6644c9d80700d672a9c7",
  },
];
const restaurantLocks = [
  {
    key: "commerce.cart",
    version: "1.0.1",
    manifestDigest:
      "sha256:20b9900c018b5590bb6481b1c6fb30a0bece3fd1b42baa8ebfceb6a6bd5c5216",
  },
  {
    key: "commerce.catalog",
    version: "1.2.0",
    manifestDigest:
      "sha256:9819588b9b59c13a80a561c91ee1f14ebf73bbde16c3504f2de52e41934a8fcc",
  },
  {
    key: "commerce.inventory",
    version: "1.1.1",
    manifestDigest:
      "sha256:a6abfec1b2f2ff7d12c776a2efa706cab4267766ae309f3f3fbfa597c3fde34e",
  },
  {
    key: "commerce.inventory-ledger",
    version: "1.0.0",
    manifestDigest:
      "sha256:611d7b77c806ffbaea4fbe262a7df4a459bb0f7a1d9e1b95150d8053744e4cbb",
  },
  {
    key: "commerce.line-configuration",
    version: "1.1.2",
    manifestDigest:
      "sha256:c1913c2b949728d859d363812476200ed57d57d992c7f6cd8d6b3ec90c9a2872",
  },
  {
    key: "commerce.money-pricing",
    version: "1.1.0",
    manifestDigest:
      "sha256:09c15dd80f6bf8f15f37f7bd9f334f1a65c63e875fc0c6a7e4655a283b0d3a23",
  },
  {
    key: "commerce.order",
    version: "1.2.0",
    manifestDigest:
      "sha256:c8f5451b3144daac59ad589cb4e8483b5014c6c9cd98a4bc3e7b23577cb56f77",
  },
  {
    key: "commerce.order-operations",
    version: "1.1.0",
    manifestDigest:
      "sha256:652fe4c0e6695a92b2622c934af56b8175374bdecdb3bac3834d90a2c00b3a71",
  },
  {
    key: "core.audit",
    version: "1.0.2",
    manifestDigest:
      "sha256:fe6616252c7b44efe61d516d305e689f3f593d70d5287baac31b5f31013addc8",
  },
  {
    key: "core.crud",
    version: "1.0.1",
    manifestDigest:
      "sha256:8dede9ba8d63bea9b09c7bf7ac6ce784c52595b644d03eca52ea6996a31882d1",
  },
  {
    key: "core.files-media",
    version: "1.0.0",
    manifestDigest:
      "sha256:5c4fbf964825b8504efc91c965b68e63eb6c7e139201d333d806989f16d2e249",
  },
  {
    key: "core.identity-context",
    version: "1.0.0",
    manifestDigest:
      "sha256:c2fc92f426d6e3995565681e55a8d7d5a5c8379c30ce4b9d2ecb0b538c2b8ca1",
  },
  {
    key: "core.location-context",
    version: "1.0.0",
    manifestDigest:
      "sha256:591b260f53f2fa0b8e838cb8b9ab350819aa720326b49c1a67f99990ae61df0d",
  },
  {
    key: "core.workflow",
    version: "1.0.1",
    manifestDigest:
      "sha256:16ebf7d8128f30e656d7c86e39ef36323991cf7af7ea18a5d81a3ac0e4c06884",
  },
  {
    key: "restaurant.cashier",
    version: "1.1.0",
    manifestDigest:
      "sha256:c95c35b2069c9c331d8b7cb591ec0472c72acf59fddfdb65c1550e05283fd6ba",
  },
  {
    key: "restaurant.kitchen",
    version: "1.1.0",
    manifestDigest:
      "sha256:a1a925c3519fc135be3c1290aa85b1914025ba64440128abfe7cc9c7567702c7",
  },
  {
    key: "restaurant.menu",
    version: "1.0.0",
    manifestDigest:
      "sha256:1efb3891dba96a724ac2e07050d4d0d0ce34648bb0745c48799c85c2b486bf30",
  },
  {
    key: "restaurant.ordering",
    version: "1.1.0",
    manifestDigest:
      "sha256:9f6af7bff7e06ac630a80ae781955c13145666f38492632a04eabe092dd8cf30",
  },
  {
    key: "restaurant.reporting",
    version: "1.1.0",
    manifestDigest:
      "sha256:400fb6c041e1f2f4191c779be37af2144ba7c8d8be5675dc16191d676fa7d221",
  },
  {
    key: "restaurant.table-session",
    version: "1.1.0",
    manifestDigest:
      "sha256:9dff8a3a0348e30d19d2f2e62ce4dabab82885e2db80053791a6b6d30d3fdbf2",
  },
];
export const definitionFamilyRegistry = Object.freeze({
  "service-work-orders": Object.freeze({
    version: "service-work-orders/v1",
    parameterPolicy: "none/v1",
    presentation: { key: "service-work-orders-presentation", version: "1.0.0" },
    compilerProfile: "service-work-orders@1.0.0",
  }),
  "inventory-operations": Object.freeze({
    version: "inventory-operations/v1",
    parameterPolicy: "none/v1",
    presentation: {
      key: "inventory-operations-presentation",
      version: "1.0.0",
    },
    compilerProfile: "inventory-operations@1.0.0",
  }),
  "content-directory": Object.freeze({
    version: "content-directory/v1",
    parameterPolicy: "none/v1",
    presentation: { key: "content-directory-presentation", version: "1.0.0" },
    compilerProfile: "content-directory@1.0.0",
  }),
  appointment: Object.freeze({
    version: "appointment-booking/v1",
    parameterPolicy: "none/v1",
    presentation: { key: "appointment-booking", version: "1.0.0" },
    compilerProfile: "appointment-booking@1.0.0",
  }),
  restaurant: Object.freeze({
    version: "restaurant-ordering/v3",
    parameterPolicy: "restaurant-menu/v1",
    presentation: { key: "restaurant-v3", version: "1.0.0" },
  }),
  approval: Object.freeze({
    version: "approval-correction/v1",
    parameterPolicy: "none/v1",
    presentation: { key: "approval-v1", version: "1.0.0" },
  }),
  task: Object.freeze({
    version: "task-correction/v2",
    parameterPolicy: "none/v1",
    presentation: { key: "task-v1", version: "1.0.0" },
  }),
});
export function canonicalJson(value: unknown): string {
  const normalize = (v: unknown): unknown =>
    typeof v === "string"
      ? v.normalize("NFC")
      : Array.isArray(v)
        ? v.map(normalize)
        : v && typeof v === "object"
          ? Object.fromEntries(
              Object.entries(v)
                .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
                .map(([k, x]) => [k.normalize("NFC"), normalize(x)]),
            )
          : v;
  return JSON.stringify(normalize(value));
}
const equal = (a: unknown, b: unknown) => canonicalJson(a) === canonicalJson(b);
const setEqual = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length &&
  new Set(a).size === a.length &&
  b.every((x) => a.includes(x));
const sortSet = <T>(values: T[]) =>
  [...values].sort((a, b) =>
    canonicalJson(a) < canonicalJson(b)
      ? -1
      : canonicalJson(a) > canonicalJson(b)
        ? 1
        : 0,
  );
type Slots = {
  roles: Map<string, string>;
  entities: Map<string, string>;
  workflows: Map<string, string>;
};
function slotsFor(entry: ProductDefinitionData): Slots {
  const b = entry.canonical.blueprint,
    f = b.workflows[0]!;
  const roleNames =
    entry.familyBinding.key === "service-work-orders"
      ? ["dispatcher", "technician"]
      : entry.familyBinding.key === "inventory-operations"
        ? ["stockkeeper", "observer"]
        : entry.familyBinding.key === "appointment"
          ? ["customer", "staff", "administrator"]
          : entry.familyBinding.key === "approval"
            ? ["requester", "reviewer", "auditor"]
            : entry.familyBinding.key === "task"
              ? ["member", "viewer"]
              : entry.familyBinding.key === "content-directory"
                ? ["reader", "curator"]
                : ["customer"];
  return {
    roles: new Map(b.actors.map((a, i) => [a.key, roleNames[i]!])),
    entities: new Map(
      b.entities.map((e, i) => [
        e.key,
        entry.familyBinding.key === "service-work-orders"
          ? ["order", "history"][i]!
          : entry.familyBinding.key === "inventory-operations"
            ? ["item", "movement"][i]!
            : entry.familyBinding.key === "appointment"
              ? ["service", "schedule", "appointment"][i]!
              : i === 0
                ? "primary"
                : "requester-profile",
      ]),
    ),
    workflows: new Map([[f.key, "lifecycle"]]),
  };
}
function semanticBlueprint(
  entry: ProductDefinitionData,
  normalizeCalculatedFields = false,
) {
  const b = entry.canonical.blueprint,
    m = slotsFor(entry),
    role = (s: string) => m.roles.get(s) ?? s,
    entity = (s: string) => m.entities.get(s) ?? s;
  return {
    actors: b.actors.map((a) => ({
      slot: role(a.key),
      permissions: sortSet(
        a.permissions.map((p) => ({
          entity: entity(p.entityKey),
          actions: [...p.actions].sort(),
        })),
      ),
    })),
    entities: b.entities.map((e) => ({
      slot: entity(e.key),
      fields: e.fields.map((f, index) => ({
        key:
          normalizeCalculatedFields &&
          e.fields.some((field) => field.calculation)
            ? `field-${index}`
            : f.key,
        type: f.type,
        required: f.required,
        ...(f.options
          ? {
              options:
                normalizeCalculatedFields &&
                entry.familyBinding.key === "content-directory"
                  ? ["reviewed-categories"]
                  : f.options,
            }
          : {}),
        ...(f.numericDomain ? { numericDomain: f.numericDomain } : {}),
        ...(f.calculation
          ? {
              calculation: {
                ...f.calculation,
                quantityFieldKey: normalizeCalculatedFields
                  ? `field-${e.fields.findIndex((field) => field.key === f.calculation!.quantityFieldKey)}`
                  : f.calculation.quantityFieldKey,
                unitPriceFieldKey: normalizeCalculatedFields
                  ? `field-${e.fields.findIndex((field) => field.key === f.calculation!.unitPriceFieldKey)}`
                  : f.calculation.unitPriceFieldKey,
              },
            }
          : {}),
        ...(f.referenceTo ? { referenceTo: entity(f.referenceTo) } : {}),
      })),
    })),
    pages: b.pageIntents.map((p) => ({
      intent: p.intent,
      ...(p.entityKey ? { entity: entity(p.entityKey) } : {}),
    })),
    workflows: b.workflows.map((w) => ({
      slot: m.workflows.get(w.key),
      entity: entity(w.entityKey),
      states: w.states.map((s) => s.key),
      transitions: w.transitions.map((t) => ({
        operation: t.key,
        from: t.from,
        to: t.to,
        role: role(t.actorKey),
      })),
    })),
  };
}

const appointmentPositiveInteger = {
  apiVersion: "factory.numeric-field-domain/v1",
  minimum: { value: 0, inclusive: false },
};
const sameOrdered = <T>(actual: readonly T[], expected: readonly T[]) =>
  actual.length === expected.length &&
  actual.every((value, index) => value === expected[index]);
const appointmentReferenceScalar = (key: string) =>
  /(?:id|key)$/i.test(key) ? key : `${key}Id`;

/** ADR-0072's local family witness; keys may be renamed but ordered slots may not. */
function appointmentPlanningSemantics(entry: ProductDefinitionData): boolean {
  const { spec, blueprint } = entry.canonical;
  const consumerWorkspace =
    entry.familyBinding.version === "appointment-booking/v2";
  if (consumerWorkspace && !isAppointmentConsumerWorkspaceBlueprint(blueprint))
    return false;
  if (
    spec.productType !== undefined ||
    spec.constraints.length !== 0 ||
    spec.openQuestions.length !== 0 ||
    spec.workflows.length !== 1 ||
    blueprint.entities.length !== 3 ||
    blueprint.actors.length !== 3 ||
    blueprint.workflows.length !== 1
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
  const exactDomain = (value: unknown) =>
    equal(value, appointmentPositiveInteger);
  const field = (
    value: (typeof service.fields)[number] | undefined,
    type: string,
    required: boolean,
    options?: readonly string[],
  ) =>
    value !== undefined &&
    value.type === type &&
    value.required === required &&
    value.calculation === undefined &&
    (options === undefined
      ? value.options === undefined
      : sameOrdered(value.options ?? [], options));
  const constrained = blueprint.entities.flatMap((entity) =>
    entity.fields.filter((candidate) => candidate.numericDomain),
  );
  if (
    service.fields.length !== 3 ||
    schedule.fields.length !== 6 ||
    appointment.fields.length !== 5 ||
    !field(service.fields[0], "text", true) ||
    !field(service.fields[1], "number", true) ||
    !exactDomain(service.fields[1]?.numericDomain) ||
    !field(service.fields[2], "boolean", true) ||
    !field(schedule.fields[0], "reference", true) ||
    schedule.fields[0]?.referenceTo !== service.key ||
    !field(schedule.fields[1], "datetime", true) ||
    !field(schedule.fields[2], "datetime", true) ||
    !field(schedule.fields[3], "text", true) ||
    !field(schedule.fields[4], "number", true) ||
    !exactDomain(schedule.fields[4]?.numericDomain) ||
    !field(schedule.fields[5], "enum", true, ["open", "closed"]) ||
    schedule.fields[1]?.key !== "startUtc" ||
    schedule.fields[2]?.key !== "endUtc" ||
    !field(appointment.fields[0], "reference", true) ||
    appointment.fields[0]?.referenceTo !== schedule.key ||
    !field(appointment.fields[1], "text", true) ||
    !field(appointment.fields[2], "long-text", false) ||
    !field(appointment.fields[3], "long-text", false) ||
    !field(appointment.fields[4], "enum", true, [
      "requested",
      "confirmed",
      "cancelled",
    ]) ||
    appointment.fields[2]?.key !== "notes" ||
    appointment.fields[3]?.key !== "cancellationReason" ||
    constrained.length !== 2 ||
    constrained[0] !== service.fields[1] ||
    constrained[1] !== schedule.fields[4]
  )
    return false;
  if (
    !sameOrdered(
      blueprint.actors.map((actor) => actor.key),
      ["customer", "staff", "administrator"],
    ) ||
    !sameOrdered(
      customer.permissions.map(
        (permission) =>
          `${permission.entityKey}:${permission.actions.join(",")}`,
      ),
      [
        `${appointment.key}:create,read,cancel`,
        ...(consumerWorkspace ? [`${schedule.key}:read-availability`] : []),
      ],
    ) ||
    !sameOrdered(
      staff.permissions.map(
        (permission) =>
          `${permission.entityKey}:${permission.actions.join(",")}`,
      ),
      [
        `${appointment.key}:read,confirm,reschedule,cancel`,
        ...(consumerWorkspace ? [`${schedule.key}:read-availability`] : []),
      ],
    ) ||
    !sameOrdered(
      administrator.permissions.map(
        (permission) =>
          `${permission.entityKey}:${permission.actions.join(",")}`,
      ),
      [
        `${service.key}:create,read,update,manage`,
        `${schedule.key}:create,read,update,manage`,
        `${appointment.key}:read,cancel`,
      ],
    ) ||
    workflow.entityKey !== appointment.key ||
    !sameOrdered(
      workflow.states.map((state) => state.key),
      ["requested", "confirmed", "cancelled"],
    ) ||
    !sameOrdered(
      workflow.transitions.map(
        (transition) =>
          `${transition.key}:${transition.from}:${transition.to}:${transition.actorKey}`,
      ),
      [
        "confirm:requested:confirmed:staff",
        "cancel:requested:cancelled:customer",
        "reschedule:confirmed:requested:staff",
      ],
    ) ||
    blueprint.pageIntents.length !== 6 ||
    !sameOrdered(
      blueprint.pageIntents.map(
        (page) => `${page.intent}:${page.entityKey ?? ""}`,
      ),
      [
        `calendar:${schedule.key}`,
        `list:${appointment.key}`,
        `form:${appointment.key}`,
        `detail:${appointment.key}`,
        "settings:",
        "settings:",
      ],
    ) ||
    !sameOrdered(
      spec.actors.map((actor) => actor.key),
      blueprint.actors.map((actor) => actor.key),
    ) ||
    !sameOrdered(
      spec.domainConcepts.map((concept) => concept.key),
      blueprint.entities.map((entity) => entity.key),
    ) ||
    spec.workflows[0]?.key !== workflow.key
  )
    return false;
  return true;
}
function directoryPlanningSemantics(entry: ProductDefinitionData): boolean {
  const { spec, blueprint: b } = entry.canonical;
  if (!isContentDirectoryBlueprint(b)) return false;
  const [entity] = b.entities;
  const [reader, curator] = b.actors;
  return (
    spec.productType === undefined &&
    equal(
      spec.actors.map((a) => a.key),
      b.actors.map((a) => a.key),
    ) &&
    equal(
      spec.domainConcepts.map((c) => c.key),
      [entity!.key],
    ) &&
    equal(entry.primaryJob, {
      actorKey: curator!.key,
      entityKey: entity!.key,
      operation: "submit",
      successState: "listed",
    }) &&
    b.acceptanceJourneys.every((j) =>
      j.steps.every((s) => [reader!.key, curator!.key].includes(s.actorKey)),
    )
  );
}
/** Planning uses the exact existing composer and shared Graph witness; no second Inventory predicate. */
function inventoryPlanningSemantics(entry: ProductDefinitionData): boolean {
  const { spec, blueprint } = entry.canonical;
  if (
    spec.productType !== undefined ||
    !equal(
      spec.actors.map((a) => a.key),
      blueprint.actors.map((a) => a.key),
    ) ||
    !equal(
      spec.domainConcepts.map((e) => e.key),
      blueprint.entities.map((e) => e.key),
    )
  )
    return false;
  try {
    const baseDraft = createBlankApplicationDraft({
      applicationId: spec.requirementId,
      workspaceId: "local-workspace",
      name: blueprint.title,
    });
    const [standard] = planProductAlternatives({
      requirement: spec,
      blueprint,
      baseDraft,
    });
    if (!standard) return false;
    const { diff } = composeProductDraft({
      plan: standard.plan,
      blueprint,
      baseDraft,
    });
    const witness = matchInventoryOperationsGraphV1(
      applyGraphDiffToDraft(baseDraft, diff).graph,
    );
    return (
      !!witness &&
      equal(entry.primaryJob, {
        actorKey: witness.roles.stockkeeper,
        entityKey: witness.movementEntity,
        operation: "submit",
        successState: "recorded",
      })
    );
  } catch {
    return false;
  }
}
function validatePlanningSemantics(entry: ProductDefinitionData): boolean {
  const { spec, blueprint: b } = entry.canonical,
    f = b.workflows[0];
  if (
    !f ||
    b.workflows.length !== 1 ||
    spec.constraints.length ||
    spec.openQuestions.length ||
    spec.workflows.length !== 1 ||
    spec.workflows[0]!.key !== f.key
  )
    return false;
  if (entry.familyBinding.key === "restaurant") {
    const authority = getCanonicalRestaurantAuthority(),
      intent = restaurantOrderingProductIntent(),
      flow = authority.flows.find((v) => v.id === "restaurant-order")!;
    const journey = authority.journeys.find(
        (j) => j.key === "customer-place-order",
      ),
      step = journey?.steps[0],
      recipe = restaurantOrderingProductRecipe(),
      experience = restaurantOrderingExperienceBrief(),
      screen = recipe.screens.find((s) => s.key === "customer-orders"),
      surface = experience.surfaces.find((s) => s.key === "customer-mobile");
    if (
      !flow ||
      !step ||
      step.flowKey !== flow.id ||
      step.actorRoleKey !== "customer" ||
      step.event !== "submit" ||
      step.from !== "cart" ||
      step.to !== "submitted" ||
      !authority.roles.includes("customer") ||
      !flow.states.includes("cart") ||
      !flow.states.includes("submitted") ||
      !flow.transitions.some(
        (t) =>
          t.from === "cart" &&
          t.event === "submit" &&
          t.to === "submitted" &&
          t.roles?.includes("customer"),
      ) ||
      !authority.permissions.some(
        (p) =>
          p.role === "customer" &&
          p.resource === "order" &&
          p.actions.includes("submit"),
      ) ||
      !screen?.entityKeys.includes("order") ||
      !screen.primaryJourneyKeys.includes(journey!.key) ||
      surface?.device !== "mobile" ||
      surface.navigation !== "bottom-tabs" ||
      !surface.audience.includes("customer") ||
      intent.productType !== "restaurant-ordering" ||
      recipe.key !== "restaurant-ordering"
    )
      return false;
    if (
      spec.productType !== "restaurant-ordering" ||
      !setEqual(
        spec.actors.map((a) => a.key),
        intent.actors.map((a) => a.key),
      ) ||
      b.actors[0]?.key !== "customer" ||
      f.key !== flow.id ||
      f.entityKey !== flow.entity ||
      b.entities[0]?.key !== flow.entity
    )
      return false;
    return (
      equal(semanticBlueprint(entry), {
        actors: [
          {
            slot: "customer",
            permissions: [{ entity: "primary", actions: ["submit"] }],
          },
        ],
        entities: [
          {
            slot: "primary",
            fields: [
              {
                key: "status",
                type: "enum",
                required: true,
                options: ["cart", "submitted"],
              },
            ],
          },
        ],
        pages: [{ intent: "list", entity: "primary" }],
        workflows: [
          {
            slot: "lifecycle",
            entity: "primary",
            states: ["cart", "submitted"],
            transitions: [
              {
                operation: "submit",
                from: "cart",
                to: "submitted",
                role: "customer",
              },
            ],
          },
        ],
      }) &&
      spec.domainConcepts.length === 1 &&
      spec.domainConcepts[0]!.key === flow.entity
    );
  }
  if (entry.familyBinding.key === "service-work-orders") {
    const witness = matchServiceWorkOrdersBlueprintV1(b);
    return (
      !!witness &&
      spec.productType === undefined &&
      equal(
        spec.actors.map((a) => a.key),
        b.actors.map((a) => a.key),
      ) &&
      equal(
        spec.domainConcepts.map((e) => e.key),
        b.entities.map((e) => e.key),
      ) &&
      equal(entry.primaryJob, {
        actorKey: witness.roles.technician,
        entityKey: witness.orderEntity,
        operation: "resolve",
        successState: "resolved",
      })
    );
  }
  if (entry.familyBinding.key === "inventory-operations")
    return inventoryPlanningSemantics(entry);
  if (entry.familyBinding.key === "appointment")
    return appointmentPlanningSemantics(entry);
  if (entry.familyBinding.key === "content-directory")
    return directoryPlanningSemantics(entry);
  if (
    spec.productType !== undefined ||
    !equal(
      spec.actors.map((a) => a.key),
      b.actors.map((a) => a.key),
    )
  )
    return false;
  const approval = entry.familyBinding.key === "approval",
    expectedRoles = approval
      ? ["requester", "reviewer", "auditor"]
      : ["member", "viewer"];
  if (
    b.actors.length !== expectedRoles.length ||
    new Set(b.actors.map((a) => a.key)).size !== expectedRoles.length ||
    b.entities.length !== (approval ? 2 : 1) ||
    f.entityKey !== b.entities[0]!.key
  )
    return false;
  const m = slotsFor(entry),
    role = (s: string) => m.roles.get(s);
  const expectedGrants = approval
    ? [
        {
          slot: "requester",
          permissions: sortSet([
            {
              entity: "primary",
              actions: ["create", "read", "submit", "update"],
            },
            { entity: "requester-profile", actions: ["read", "update"] },
          ]),
        },
        {
          slot: "reviewer",
          permissions: [
            { entity: "primary", actions: ["approve", "read", "reject"] },
          ],
        },
        {
          slot: "auditor",
          permissions: [{ entity: "primary", actions: ["audit", "read"] }],
        },
      ]
    : [
        {
          slot: "member",
          permissions: [
            {
              entity: "primary",
              actions: [
                "complete",
                "create",
                "read",
                "reopen",
                "start",
                "update",
              ],
            },
          ],
        },
        {
          slot: "viewer",
          permissions: [{ entity: "primary", actions: ["read"] }],
        },
      ];
  const semantic = semanticBlueprint(entry);
  if (
    !equal(semantic.actors, expectedGrants) ||
    !equal(
      semantic.pages,
      approval
        ? ["dashboard", "list", "form", "detail", "queue", "settings"].map(
            (intent) => ({
              intent,
              ...(intent === "settings" ? {} : { entity: "primary" }),
            }),
          )
        : ["dashboard", "list", "form", "detail", "queue"].map((intent) => ({
            intent,
            entity: "primary",
          })),
    )
  )
    return false;
  const transitions = approval
    ? [
        ["submit", "draft", "submitted", "requester"],
        ["approve", "submitted", "approved", "reviewer"],
        ["reject", "submitted", "returned", "reviewer"],
        ["update", "returned", "draft", "requester"],
      ]
    : [
        ["start", "not-started", "in-progress", "member"],
        ["complete", "in-progress", "completed", "member"],
        ["reopen", "completed", "in-progress", "member"],
      ];
  if (
    !equal(
      f.states.map((s) => s.key),
      approval
        ? ["draft", "submitted", "approved", "returned"]
        : ["not-started", "in-progress", "completed"],
    ) ||
    !equal(
      f.transitions.map((t) => [t.key, t.from, t.to, role(t.actorKey)]),
      transitions,
    )
  )
    return false;
  if (
    b.acceptanceJourneys.some((j) =>
      j.steps.some((s) => !m.roles.has(s.actorKey)),
    )
  )
    return false;
  if (approval) {
    if (
      !setEqual(
        spec.domainConcepts.map((d) => d.key),
        [b.entities[0]!.key, "approval", "audit-trail"],
      )
    )
      return false;
    if (
      !equal(semantic.entities[1]!.fields, [
        { key: "name", type: "text", required: true },
        { key: "department", type: "text", required: false },
      ])
    )
      return false;
    const fields = b.entities[0]!.fields;
    if (
      fields.some(
        (field) =>
          ["id", "status", "version", "createdAt", "updatedAt"].includes(
            field.key,
          ) ||
          ![
            "text",
            "long-text",
            "number",
            "currency",
            "boolean",
            "date",
            "datetime",
            "enum",
            "file",
          ].includes(field.type) ||
          field.referenceTo !== undefined ||
          (field.type === "enum") !== (field.options !== undefined),
      )
    )
      return false;
  } else {
    if (
      spec.domainConcepts.length !== 1 ||
      spec.domainConcepts[0]!.key !== b.entities[0]!.key
    )
      return false;
    if (
      !equal(semantic.entities[0]!.fields, [
        { key: "title", type: "text", required: true },
        { key: "description", type: "long-text", required: false },
        { key: "assignee", type: "text", required: true },
        { key: "dueDate", type: "date", required: true },
        {
          key: "priority",
          type: "enum",
          required: true,
          options: ["low", "medium", "high"],
        },
      ])
    )
      return false;
  }
  return true;
}
function validateJourneys(entry: ProductDefinitionData): DefinitionReason[] {
  const restaurant = entry.familyBinding.key === "restaurant",
    authority = getCanonicalRestaurantAuthority(),
    b = entry.canonical.blueprint;
  const roles = restaurant ? authority.roles : b.actors.map((a) => a.key);
  const grants = restaurant
    ? authority.permissions
    : b.actors.flatMap((a) =>
        a.permissions.map((p) => ({
          role: a.key,
          resource: p.entityKey,
          actions: p.actions as readonly string[],
        })),
      );
  const flows = restaurant
    ? authority.flows
    : b.workflows.map((w) => ({
        entity: w.entityKey,
        states: w.states.map((s) => s.key),
        transitions: w.transitions.map((t) => ({
          event: t.key,
          from: t.from,
          to: t.to,
          roles: [t.actorKey],
        })),
      }));
  const supported = (
    s: ProductDefinitionData["journeys"]["correction"][number]["steps"][number],
  ) => {
    const flow = flows.find((f) => f.entity === s.entityKey);
    if (entry.familyBinding.key === "service-work-orders") {
      const witness = matchServiceWorkOrdersBlueprintV1(b);
      if (!witness || !roles.includes(s.actorKey)) return false;
      const granted = grants.some(
        (p) =>
          p.role === s.actorKey &&
          p.resource === s.entityKey &&
          p.actions.includes(s.operation),
      );
      if (s.entityKey === witness.historyEntity)
        return (
          s.operation === "read" &&
          s.fromState === null &&
          s.toState === null &&
          (s.expectation === "success" ||
            (s.actorKey === witness.roles.technician &&
              s.expectation === "not-found"))
        );
      if (
        s.entityKey !== witness.orderEntity ||
        !flow ||
        ![s.fromState, s.toState].every(
          (state) => state === null || flow.states.includes(state),
        )
      )
        return false;
      const transition = flow.transitions.some(
        (t) =>
          t.event === s.operation &&
          t.from === s.fromState &&
          t.to === s.toState &&
          t.roles?.includes(s.actorKey) === true,
      );
      const sameState = s.fromState !== null && s.fromState === s.toState;
      const ordinary =
        transition ||
        (s.operation === "create" &&
          s.fromState === null &&
          s.toState === "open") ||
        (s.operation === "read" && sameState) ||
        (["update", "reassign"].includes(s.operation) &&
          sameState &&
          ["open", "in-progress"].includes(s.fromState!)) ||
        (s.operation === "assign" && sameState && s.fromState === "open");
      const known = grants.some(
        (p) => p.resource === s.entityKey && p.actions.includes(s.operation),
      );
      const scoped =
        s.actorKey === witness.roles.technician &&
        ["read", "start", "resolve"].includes(s.operation);
      if (s.expectation === "denied")
        return known && (!granted || !ordinary || scoped);
      if (s.expectation === "not-found") return granted && ordinary && scoped;
      return granted && ordinary;
    }
    if (
      entry.familyBinding.key === "inventory-operations" &&
      s.entityKey === b.entities[0]?.key
    ) {
      if (
        !roles.includes(s.actorKey) ||
        s.fromState !== null ||
        s.toState !== null ||
        !["create", "read", "update"].includes(s.operation)
      )
        return false;
      const granted = grants.some(
        (p) =>
          p.role === s.actorKey &&
          p.resource === s.entityKey &&
          p.actions.includes(s.operation),
      );
      return s.expectation === "denied" ? !granted : granted;
    }
    if (
      !roles.includes(s.actorKey) ||
      !flow ||
      ![s.fromState, s.toState].every(
        (state) => state === null || flow.states.includes(state),
      )
    )
      return false;
    const operationKnown =
      grants.some(
        (p) => p.resource === s.entityKey && p.actions.includes(s.operation),
      ) || flow.transitions.some((t) => t.event === s.operation);
    if (!operationKnown) return false;
    if (
      entry.familyBinding.key === "content-directory" &&
      s.operation === "read" &&
      s.actorKey === b.actors[0]!.key &&
      s.fromState === "hidden"
    )
      return s.toState === "hidden" && s.expectation === "not-found";
    const granted = grants.some(
      (p) =>
        p.role === s.actorKey &&
        p.resource === s.entityKey &&
        p.actions.includes(s.operation),
    );
    const transition = flow.transitions.find(
      (t) =>
        t.event === s.operation && t.from === s.fromState && t.to === s.toState,
    );
    const ordinary = transition
      ? transition.roles?.includes(s.actorKey) === true
      : !flow.transitions.some((t) => t.event === s.operation) &&
        s.fromState === s.toState;
    const editable =
      entry.familyBinding.key !== "task" ||
      s.operation !== "update" ||
      ["not-started", "in-progress"].includes(s.fromState ?? "");
    if (s.expectation === "denied") return !granted || !ordinary || !editable;
    if (s.expectation === "success" || s.expectation === "retry-replay")
      return granted && ordinary && editable;
    return granted;
  };
  const reasons: DefinitionReason[] = [];
  for (const kind of ["correction", "failure"] as const) {
    const cases = entry.journeys[kind];
    if (
      new Set(cases.map((c) => c.key)).size !== cases.length ||
      cases.some((c) => c.steps.some((s) => !supported(s)))
    )
      reasons.push("definition.unsupported-semantics");
  }
  if (
    !entry.journeys.correction.some(
      (c) =>
        c.steps.some(
          (s) =>
            [
              "update",
              "reopen",
              "cancel",
              "record-manager-adjustment",
            ].includes(s.operation) && s.expectation === "success",
        ) || c.steps.some((s) => s.expectation === "retry-replay"),
    )
  )
    reasons.push("definition.missing-correction");
  if (
    !entry.journeys.failure.some((c) =>
      c.steps.some((s) =>
        [
          "denied",
          "validation-error",
          "version-conflict",
          "not-found",
        ].includes(s.expectation),
      ),
    )
  )
    reasons.push("definition.missing-failure");
  const job = entry.primaryJob,
    flow = flows.find((f) => f.entity === job.entityKey);
  if (
    !roles.includes(job.actorKey) ||
    !flow ||
    !grants.some(
      (p) =>
        p.role === job.actorKey &&
        p.resource === job.entityKey &&
        p.actions.includes(job.operation),
    ) ||
    (job.successState !== null &&
      !flow.transitions.some(
        (t) =>
          t.event === job.operation &&
          t.to === job.successState &&
          t.roles?.includes(job.actorKey),
      ))
  )
    reasons.push("definition.unsupported-semantics");
  return reasons;
}
function familyProfileFor(entry: ProductDefinitionData) {
  if (
    entry.familyBinding.key === "appointment" &&
    entry.familyBinding.version === "appointment-booking/v2"
  ) {
    return {
      version: "appointment-booking/v2",
      parameterPolicy: "none/v1",
      presentation: { key: "appointment-booking", version: "2.0.0" },
      compilerProfile: "appointment-booking@2.0.0",
    };
  }
  return definitionFamilyRegistry[
    entry.familyBinding.key as keyof typeof definitionFamilyRegistry
  ];
}
function executionMatches(entry: ProductDefinitionData): boolean {
  const row = familyProfileFor(entry);
  const expectedLocks =
    entry.familyBinding.key === "restaurant"
      ? restaurantLocks
      : entry.familyBinding.key === "appointment"
        ? appointmentLocks
        : fixedLocks;
  if (
    !equal(
      sortSet(entry.admissionExpectations.capabilityLocks),
      sortSet(expectedLocks),
    ) ||
    !equal(entry.admissionExpectations.presentation, row.presentation) ||
    entry.admissionExpectations.compilerProfile !==
      ("compilerProfile" in row ? row.compilerProfile : row.version)
  )
    return false;
  if (entry.familyBinding.key === "restaurant") {
    const base = composeDefaultCapabilityDraft({
      profile: "restaurant-ordering",
    });
    const graph = composeRestaurantProductGraph({
      intent: restaurantOrderingProductIntent(),
      experience: restaurantOrderingExperienceBrief(),
      baseDraft: createDraftRevision(
        base.graph,
        "restaurant-definition-validation",
      ),
    });
    const locks = graph.integration.compositionSelections ?? [],
      authority = getCanonicalRestaurantAuthority();
    return (
      equal(
        sortSet(
          locks.map((s) => ({
            key: s.lock.key,
            version: s.lock.version,
            manifestDigest: s.lock.manifestDigest,
          })),
        ),
        sortSet(restaurantLocks),
      ) &&
      graph.surfaces.length === 2 &&
      graph.page.pages.length === 15 &&
      graph.journeys.length === 7 &&
      graph.fieldAuthorities.length === 99 &&
      graph.bindingPolicies.length === 135 &&
      equal(
        {
          roles: graph.policy.roles,
          permissions: graph.policy.permissions,
          flows: graph.flow.flows,
          journeys: graph.journeys,
        },
        authority,
      )
    );
  }
  const { spec, blueprint } = entry.canonical,
    baseDraft = createBlankApplicationDraft({
      applicationId: spec.requirementId,
      workspaceId: "local-workspace",
      name: blueprint.title,
    });
  const [standard] = planProductAlternatives({
    requirement: spec,
    blueprint,
    baseDraft,
  });
  if (!standard) return false;
  const { diff } = composeProductDraft({
      plan: standard.plan,
      blueprint,
      baseDraft,
    }),
    graph = applyGraphDiffToDraft(baseDraft, diff).graph;
  const actual = graph.integration.compositionSelections ?? [];
  if (
    !equal(
      sortSet(
        actual.map((s) => ({
          key: s.lock.key,
          version: s.lock.version,
          manifestDigest: s.lock.manifestDigest,
        })),
      ),
      sortSet(expectedLocks),
    )
  )
    return false;
  if (entry.familyBinding.key === "service-work-orders") {
    const witness = matchServiceWorkOrdersGraphV1(graph);
    if (!witness) return false;
    const symbol = (model: string, key: string) => ({
      graphSymbol: `graph.${model}.${key}`,
    });
    const expectedBindings = {
      "core.crud": {
        entityKey: symbol("domain", witness.orderEntity),
        routeKey: symbol("page", witness.pages.list),
      },
      "core.workflow": { flowKey: symbol("flow", witness.workflow) },
      "core.identity-policy": {
        principalEntity: symbol("domain", witness.principalEntity),
        sessionEntity: symbol("domain", witness.sessionEntity),
        defaultRole: symbol("policy", witness.roles.dispatcher),
        authenticatedRole: symbol("policy", witness.roles.technician),
      },
      "core.audit": { actorRole: symbol("policy", witness.roles.dispatcher) },
      "core.notification": {
        recipientRole: symbol("policy", witness.roles.dispatcher),
      },
      "core.policy-declarations": {},
    };
    return actual.every((selection) =>
      equal(
        selection.bindings,
        expectedBindings[selection.lock.key as keyof typeof expectedBindings],
      ),
    );
  }
  if (entry.familyBinding.key === "inventory-operations") {
    const witness = matchInventoryOperationsGraphV1(graph);
    if (!witness) return false;
    const symbol = (model: string, key: string) => ({
      graphSymbol: `graph.${model}.${key}`,
    });
    const expectedBindings = {
      "core.crud": {
        entityKey: symbol("domain", witness.itemEntity),
        routeKey: symbol("page", witness.pages.list),
      },
      "core.workflow": { flowKey: symbol("flow", witness.workflow) },
      "core.identity-policy": {
        principalEntity: symbol("domain", spec.requirementId + "-principal"),
        sessionEntity: symbol("domain", spec.requirementId + "-session"),
        defaultRole: symbol("policy", witness.roles.stockkeeper),
        authenticatedRole: symbol("policy", witness.roles.observer),
      },
      "core.audit": { actorRole: symbol("policy", witness.roles.stockkeeper) },
      "core.notification": {
        recipientRole: symbol("policy", witness.roles.stockkeeper),
      },
      "core.policy-declarations": {},
    };
    return actual.every((selection) =>
      equal(
        selection.bindings,
        expectedBindings[selection.lock.key as keyof typeof expectedBindings],
      ),
    );
  }
  if (entry.familyBinding.key === "appointment") {
    const [service, schedule, appointment] = blueprint.entities;
    if (!service || !schedule || !appointment) return false;
    const binding = (
      entity: typeof service,
      field?: (typeof service.fields)[number],
    ) =>
      field
        ? {
            graphSymbol: `graph.domain.${entity.key}`,
            fieldKey:
              field.type === "reference"
                ? appointmentReferenceScalar(field.key)
                : field.key,
          }
        : { graphSymbol: `graph.domain.${entity.key}` };
    const expectedBindings = {
      serviceEntity: binding(service),
      serviceNameField: binding(service, service.fields[0]),
      serviceDurationMinutesField: binding(service, service.fields[1]),
      serviceActiveField: binding(service, service.fields[2]),
      scheduleEntity: binding(schedule),
      scheduleServiceReferenceField: binding(schedule, schedule.fields[0]),
      scheduleStartField: binding(schedule, schedule.fields[1]),
      scheduleEndField: binding(schedule, schedule.fields[2]),
      scheduleTimezoneField: binding(schedule, schedule.fields[3]),
      scheduleCapacityField: binding(schedule, schedule.fields[4]),
      scheduleStatusField: binding(schedule, schedule.fields[5]),
      appointmentEntity: binding(appointment),
      appointmentScheduleReferenceField: binding(
        appointment,
        appointment.fields[0],
      ),
      appointmentCustomerNameField: binding(appointment, appointment.fields[1]),
      appointmentNotesField: binding(appointment, appointment.fields[2]),
      appointmentCancellationReasonField: binding(
        appointment,
        appointment.fields[3],
      ),
      appointmentStatusField: binding(appointment, appointment.fields[4]),
    };
    const selection = actual.find(
      ({ lock }) => lock.key === "scheduling.appointment",
    );
    const expectedSeeds = [
      {
        entity: service.key,
        id: `sample-${service.key}`,
        values: {
          [service.fields[0]!.key]: "Sample service",
          [service.fields[1]!.key]: 30,
          [service.fields[2]!.key]: true,
        },
      },
      {
        entity: schedule.key,
        id: `sample-${schedule.key}`,
        values: {
          [appointmentReferenceScalar(schedule.fields[0]!.key)]:
            `sample-${service.key}`,
          [schedule.fields[1]!.key]: "2026-10-01T09:00:00Z",
          [schedule.fields[2]!.key]: "2026-10-01T09:30:00Z",
          [schedule.fields[3]!.key]: "UTC",
          [schedule.fields[4]!.key]: 3,
          [schedule.fields[5]!.key]: "open",
        },
      },
      {
        entity: schedule.key,
        id: `sample-${schedule.key}-alt`,
        values: {
          [appointmentReferenceScalar(schedule.fields[0]!.key)]:
            `sample-${service.key}`,
          [schedule.fields[1]!.key]: "2026-10-01T10:00:00Z",
          [schedule.fields[2]!.key]: "2026-10-01T10:30:00Z",
          [schedule.fields[3]!.key]: "UTC",
          [schedule.fields[4]!.key]: 1,
          [schedule.fields[5]!.key]: "open",
        },
      },
      {
        entity: appointment.key,
        id: `sample-${appointment.key}`,
        values: {
          [appointmentReferenceScalar(appointment.fields[0]!.key)]:
            `sample-${schedule.key}`,
          [appointment.fields[1]!.key]: "Sample customer",
          [appointment.fields[2]!.key]: "Synthetic fixture note",
          [appointment.fields[3]!.key]: "Synthetic fixture cancellation reason",
          [appointment.fields[4]!.key]: "requested",
        },
      },
    ];
    return (
      equal(selection?.bindings, expectedBindings) &&
      graph.domain.entities.length === 5 &&
      graph.page.pages.length === 8 &&
      graph.flow.flows.length === 1 &&
      equal(graph.domain.seedData, expectedSeeds)
    );
  }
  // Lock binding resolution is performed by the existing composer, never by input claims.
  const flow = graph.flow.flows[0],
    primary = entry.canonical.blueprint.entities[0]!.key;
  if (!flow || flow.entity !== primary) return false;
  const byKey = new Map(actual.map((s) => [s.lock.key, s]));
  const list = graph.page.pages.find((p) =>
    p.blocks.some((b) => b.type === "list" && b.entity === primary),
  );
  const actors = entry.canonical.blueprint.actors,
    requester = actors[0]!.key,
    reviewer =
      entry.familyBinding.key === "approval" ? actors[1]!.key : requester;
  const identity = {
    principalEntity: {
      graphSymbol: "graph.domain." + spec.requirementId + "-principal",
    },
    sessionEntity: {
      graphSymbol: "graph.domain." + spec.requirementId + "-session",
    },
    defaultRole: { graphSymbol: "graph.policy." + requester },
    authenticatedRole: { graphSymbol: "graph.policy." + actors[1]!.key },
  };
  if (
    !equal(byKey.get("core.identity-policy")?.bindings, identity) ||
    !equal(byKey.get("core.audit")?.bindings, {
      actorRole: { graphSymbol: "graph.policy." + reviewer },
    }) ||
    !equal(byKey.get("core.notification")?.bindings, {
      recipientRole: { graphSymbol: "graph.policy." + requester },
    }) ||
    !equal(byKey.get("core.policy-declarations")?.bindings, {})
  )
    return false;
  if (
    graph.integration.providers.length !== 0 ||
    graph.flow.flows.length !== 1 ||
    graph.page.pages.length !==
      (entry.familyBinding.key === "approval"
        ? 7
        : entry.familyBinding.key === "content-directory"
          ? 3
          : 5) ||
    graph.domain.entities.length !==
      (entry.familyBinding.key === "approval" ? 4 : 3) ||
    !equal(
      graph.policy.roles,
      actors.map((a) => a.key),
    )
  )
    return false;
  const expectedTransitions = blueprint.workflows[0]!.transitions.map((t) => ({
    from: t.from,
    event: t.key,
    to: t.to,
    roles: [t.actorKey],
    effects:
      entry.familyBinding.key === "approval"
        ? t.key === "approve" || t.key === "reject"
          ? [
              { capability: "audit.record", operation: "record" },
              { capability: "notification.send", operation: "send" },
            ]
          : [{ capability: "audit.record", operation: "record" }]
        : [],
  }));
  if (
    !equal(
      flow.transitions.map((t) => ({ ...t, effects: t.effects ?? [] })),
      expectedTransitions,
    )
  )
    return false;
  return (
    equal(byKey.get("core.crud")?.bindings, {
      entityKey: { graphSymbol: "graph.domain." + primary },
      routeKey: { graphSymbol: "graph.page." + list?.id },
    }) &&
    equal(byKey.get("core.workflow")?.bindings, {
      flowKey: { graphSymbol: "graph.flow." + flow.id },
    })
  );
}
function guideMatches(entry: ProductDefinitionData): boolean {
  const guide = entry.selection.providerGuide,
    b = entry.canonical.blueprint;
  if (entry.familyBinding.key === "service-work-orders") {
    const { definitionKey, identity: _identity, ...blueprint } = guide;
    return definitionKey === entry.definitionKey && equal(blueprint, b);
  }
  if (entry.familyBinding.key === "restaurant") {
    const intent = restaurantOrderingProductIntent(),
      experience = restaurantOrderingExperienceBrief(),
      recipe = restaurantOrderingProductRecipe();
    return equal(guide, {
      definitionKey: entry.definitionKey,
      productType: intent.productType,
      actorKeys: intent.actors.map((a) => a.key),
      acceptanceJourneyKeys: recipe.acceptanceJourneyKeys,
      constraints: {
        moneyMovement: intent.constraints.moneyMovement,
        externalSideEffects: intent.constraints.externalSideEffects,
      },
      surfaces: experience.surfaces.map((s) => ({
        key: s.key,
        device: s.device,
        audience: s.audience,
        navigation: s.navigation,
      })),
    });
  }
  const candidate = {
    ...entry,
    canonical: {
      ...entry.canonical,
      blueprint: {
        ...b,
        actors: guide.actors,
        entities: guide.entities,
        pageIntents: guide.pageIntents,
        workflows: guide.workflows,
        acceptanceJourneys: guide.acceptanceJourneys,
      } as typeof b,
    },
  };
  return (
    equal(semanticBlueprint(candidate), semanticBlueprint(entry)) &&
    equal(
      candidate.canonical.blueprint.acceptanceJourneys.map((j) =>
        j.steps.map((step) => step.actorKey),
      ),
      b.acceptanceJourneys.map((j) => j.steps.map((step) => step.actorKey)),
    ) &&
    equal(
      candidate.canonical.blueprint.actors.map((a) => a.key),
      b.actors.map((a) => a.key),
    ) &&
    equal(
      candidate.canonical.blueprint.entities.map((e) => e.key),
      b.entities.map((e) => e.key),
    ) &&
    equal(
      candidate.canonical.blueprint.workflows.map((w) => w.key),
      b.workflows.map((w) => w.key),
    )
  );
}
export function validateFamilyDefinition(
  entry: ProductDefinitionData,
): DefinitionReason[] {
  const row = familyProfileFor(entry);
  if (!row) return ["definition.unknown-family"];
  if (entry.familyBinding.version !== row.version)
    return ["definition.unsupported-family-version"];
  if (entry.parameterPolicy !== row.parameterPolicy)
    return ["definition.invalid-binding"];
  const reasons: DefinitionReason[] = [];
  if (
    entry.familyBinding.key !== "approval" &&
    entry.familyBinding.key !== "inventory-operations" &&
    entry.familyBinding.key !== "service-work-orders" &&
    entry.familyBinding.key !== "appointment" &&
    entry.canonical.blueprint.entities.some((e) =>
      e.fields.some((f) => f.numericDomain || f.calculation),
    )
  )
    reasons.push("definition.unsupported-semantics");
  if (entry.selection.providerGuide.definitionKey !== entry.definitionKey)
    reasons.push("definition.invalid-binding");
  if (!validatePlanningSemantics(entry))
    reasons.push("definition.unsupported-semantics");
  reasons.push(...validateJourneys(entry));
  if (!guideMatches(entry)) reasons.push("definition.projection-drift");
  if (!reasons.length) {
    try {
      if (!executionMatches(entry)) reasons.push("definition.execution-drift");
    } catch (error) {
      if (!(error instanceof CompositionError)) throw error;
      reasons.push("definition.execution-drift");
    }
  }
  return [...new Set(reasons)].sort();
}
export function semanticFingerprint(entry: ProductDefinitionData): string {
  const reasons = validateFamilyDefinition(entry);
  if (reasons.length) throw new Error("Definition semantics are invalid.");
  const slots = slotsFor(entry),
    role = (s: string) => slots.roles.get(s) ?? s,
    entity = (s: string) => slots.entities.get(s) ?? s;
  const cases = (items: ProductDefinitionData["journeys"]["correction"]) =>
    sortSet(
      items.map((c) => ({
        steps: c.steps.map((s) => ({
          ...s,
          actorKey: role(s.actorKey),
          entityKey: entity(s.entityKey),
        })),
      })),
    );
  const semantic = {
    familyBinding: entry.familyBinding,
    parameterPolicy: entry.parameterPolicy,
    primaryJob: {
      ...entry.primaryJob,
      actorKey: role(entry.primaryJob.actorKey),
      entityKey: entity(entry.primaryJob.entityKey),
    },
    blueprint: semanticBlueprint(entry, true),
    journeys: {
      correction: cases(entry.journeys.correction),
      failure: cases(entry.journeys.failure),
    },
    admissionExpectations: {
      ...entry.admissionExpectations,
      capabilityLocks: sortSet(entry.admissionExpectations.capabilityLocks),
    },
  };
  return (
    "sha256:" +
    createHash("sha256").update(canonicalJson(semantic)).digest("hex")
  );
}
export function createDefinitionEntry(data: ProductDefinitionData) {
  const reasons = validateFamilyDefinition(data);
  if (reasons.length) throw new Error("Definition semantics are invalid.");
  const family = data.familyBinding
    .key as keyof typeof definitionFamilyRegistry;
  const parameters =
    family === "restaurant"
      ? z.unknown().transform((value, context) => {
          if (value === null) return null;
          try {
            return parseRestaurantMenuParameters(value);
          } catch {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Invalid Restaurant menu parameters.",
            });
            return z.NEVER;
          }
        })
      : z.null();
  const selectionSchema = z
    .object({
      definitionKey: z.literal(data.definitionKey),
      disposition: z.enum(["supported-default", "needs-clarification"]),
      requirementId: graphKeySchema,
      title: safeBusinessTextSchema
        .min(2)
        .max(80)
        .refine(
          (value) =>
            value.trim() === value && !/[\u0000-\u001f\u007f]/.test(value),
          "Display names must be trimmed and exclude control characters.",
        ),
      outcome: safeBusinessTextSchema.max(2000),
      materialQuestions: z
        .array(
          z
            .object({
              category: z.enum(categories),
              question: safeBusinessTextSchema.max(500),
            })
            .strict(),
        )
        .max(30),
      businessParameters: parameters,
    })
    .strict()
    .superRefine((selection, context) => {
      if (
        (selection.disposition === "supported-default") !==
        (selection.materialQuestions.length === 0)
      )
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "The selection disposition must match its material questions.",
        });
    });
  const canonical = () =>
    assertRequirementInterpretation({
      ...structuredClone(data.canonical),
      clarifications: [],
    });
  const project = (input: unknown) => {
    if (!validatePlanningSemantics(data))
      throw new Error("Definition projection drift.");
    const selection = selectionSchema.parse(input),
      baseline = canonical(),
      spec = {
        ...baseline.spec,
        requirementId: selection.requirementId,
        outcome: selection.outcome,
        openQuestions: selection.materialQuestions.map((q) => ({ ...q })),
      };
    return assertRequirementInterpretation({
      spec,
      blueprint: {
        ...baseline.blueprint,
        title: selection.title,
        requirementChecksum: hashRequirementSpec(spec),
      },
      clarifications: deriveClarifications(spec),
    });
  };
  return Object.freeze({
    definitionKey: data.definitionKey,
    family,
    parameterPolicy:
      family === "restaurant"
        ? ("restaurant-menu" as const)
        : ("none" as const),
    selectionSchema,
    jsonSchema: selectionJsonSchema(data.definitionKey, family),
    guide: data.selection.providerGuide,
    instruction: data.selection.providerInstruction,
    structure: canonical(),
    canonical,
    project,
  });
}
