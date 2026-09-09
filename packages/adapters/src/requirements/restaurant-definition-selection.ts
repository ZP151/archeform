import { z } from "zod";

import {
  blueprintActionVerbs,
  graphKeySchema,
  hashRequirementSpec,
  safeBusinessTextSchema,
} from "@factory/graph";
import {
  getCanonicalRestaurantAuthority,
  parseRestaurantMenuParameters,
  type RestaurantMenuParametersV1,
  restaurantOrderingExperienceBrief,
  restaurantOrderingProductIntent,
  restaurantOrderingProductRecipe,
} from "@factory/capabilities";

import {
  assertRequirementInterpretation,
  deriveClarifications,
  type RequirementInterpretationV1,
} from "./requirement-interpreter.js";

const materialQuestionSchema = z
  .object({
    category: z.enum([
      "authorization",
      "visibility",
      "role",
      "business-rule",
      "data",
      "integration",
    ]),
    question: safeBusinessTextSchema.max(500),
  })
  .strict();

export const restaurantDefinitionSelectionSchema = z
  .object({
    definitionKey: z.literal("restaurant-ordering"),
    disposition: z.enum(["supported-default", "needs-clarification"]),
    requirementId: graphKeySchema,
    title: safeBusinessTextSchema
      .min(2)
      .max(80)
      .refine(
        (value) =>
          value.trim() === value && !/[\u0000-\u001f\u007f]/.test(value),
        "Restaurant display names must be trimmed and exclude control characters.",
      ),
    outcome: safeBusinessTextSchema.max(2000),
    materialQuestions: z.array(materialQuestionSchema).max(30),
    businessParameters: z
      .unknown()
      .transform((value, context): RestaurantMenuParametersV1 | null => {
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
      }),
  })
  .strict()
  .superRefine((selection, context) => {
    if (
      selection.disposition === "supported-default" &&
      selection.materialQuestions.length !== 0
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A supported default cannot contain material questions.",
      });
    }
    if (
      selection.disposition === "needs-clarification" &&
      selection.materialQuestions.length === 0
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A clarification selection requires a material question.",
      });
    }
  });

export type RestaurantDefinitionSelectionV1 = z.infer<
  typeof restaurantDefinitionSelectionSchema
>;

function canonicalDrift(): never {
  throw new Error("Canonical Restaurant projection drift.");
}

function labelFor(key: string): string {
  return key
    .split("-")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

/**
 * Builds the smallest valid planning projection for a model-selected canonical
 * Restaurant definition. The resulting public envelope remains ordinary
 * RequirementSpec/ProductBlueprint data; Restaurant composition is still
 * determined later by the canonical recipe and Graph authority.
 */
export function projectRestaurantDefinitionSelection(
  selection: RestaurantDefinitionSelectionV1,
): RequirementInterpretationV1 {
  const intent = restaurantOrderingProductIntent();
  const experience = restaurantOrderingExperienceBrief();
  const recipe = restaurantOrderingProductRecipe();
  const authority = getCanonicalRestaurantAuthority();
  if (
    intent.productType !== selection.definitionKey ||
    recipe.key !== selection.definitionKey
  ) {
    return canonicalDrift();
  }
  const customerSurface = experience.surfaces.find(
    (surface) => surface.key === "customer-mobile",
  );
  if (
    customerSurface?.device !== "mobile" ||
    !customerSurface.audience.includes("customer") ||
    customerSurface.navigation !== "bottom-tabs"
  ) {
    return canonicalDrift();
  }
  const journey = authority.journeys.find(
    (candidate) => candidate.key === "customer-place-order",
  );
  const step = journey?.steps[0];
  if (
    journey === undefined ||
    step === undefined ||
    step.actorRoleKey !== "customer"
  ) {
    return canonicalDrift();
  }
  const flow = authority.flows.find(
    (candidate) => candidate.id === step.flowKey,
  );
  const event = blueprintActionVerbs.find(
    (candidate) => candidate === step.event,
  );
  const customer = intent.actors.find(
    (actor) => actor.key === step.actorRoleKey,
  );
  const permission = authority.permissions.find(
    (candidate) =>
      candidate.role === step.actorRoleKey &&
      candidate.resource === flow?.entity &&
      candidate.actions.includes(step.event),
  );
  const ordersScreen = recipe.screens.find(
    (candidate) => candidate.key === "customer-orders",
  );
  if (
    flow === undefined ||
    event === undefined ||
    customer === undefined ||
    permission === undefined ||
    !authority.roles.includes(step.actorRoleKey) ||
    !flow.states.includes(step.from) ||
    !flow.states.includes(step.to) ||
    !flow.transitions.some(
      (transition) =>
        transition.from === step.from &&
        transition.event === step.event &&
        transition.to === step.to &&
        transition.roles?.includes(step.actorRoleKey),
    ) ||
    step.from === step.to ||
    ordersScreen === undefined ||
    !ordersScreen.entityKeys.includes(flow.entity) ||
    !ordersScreen.primaryJourneyKeys.includes(journey.key)
  ) {
    return canonicalDrift();
  }

  const spec = {
    apiVersion: "factory.requirement-spec/v1" as const,
    requirementId: selection.requirementId,
    productType: "restaurant-ordering" as const,
    outcome: selection.outcome,
    actors: intent.actors.map((actor) => ({
      key: actor.key,
      label: actor.label,
      description: actor.goals.join(" "),
    })),
    domainConcepts: [
      {
        key: flow.entity,
        label: labelFor(flow.entity),
        description: `A restaurant ${flow.entity}.`,
      },
    ],
    workflows: [
      {
        key: flow.id,
        label: labelFor(flow.id),
        description: `Restaurant ${flow.id} workflow.`,
      },
    ],
    constraints: [],
    openQuestions: selection.materialQuestions.map((question) => ({
      ...question,
    })),
    acceptanceScenarios: [
      {
        key: journey.key,
        given: `a ${flow.entity} is ${step.from}`,
        when: `${customer.label} performs ${event}`,
        then: `the ${flow.entity} becomes ${step.to}`,
      },
    ],
  };
  const requirementChecksum = hashRequirementSpec(spec);
  const blueprint = {
    apiVersion: "factory.product-blueprint/v1" as const,
    requirementChecksum,
    title: selection.title,
    actors: [
      {
        key: customer.key,
        label: customer.label,
        description: customer.goals.join(" "),
        permissions: [{ entityKey: flow.entity, actions: [event] }],
      },
    ],
    entities: [
      {
        key: flow.entity,
        label: labelFor(flow.entity),
        description: `Restaurant ${flow.entity} planning subset.`,
        fields: [
          {
            key: "status",
            label: "Status",
            description: "The current order workflow state.",
            type: "enum" as const,
            required: true,
            options: [step.from, step.to],
          },
        ],
      },
    ],
    pageIntents: [
      {
        key: ordersScreen.key,
        label: ordersScreen.label,
        intent: "list" as const,
        entityKey: flow.entity,
      },
    ],
    workflows: [
      {
        key: flow.id,
        label: labelFor(flow.id),
        entityKey: flow.entity,
        states: [
          { key: step.from, label: labelFor(step.from) },
          { key: step.to, label: labelFor(step.to) },
        ],
        transitions: [
          {
            key: event,
            from: step.from,
            to: step.to,
            label: labelFor(event),
            actorKey: customer.key,
          },
        ],
      },
    ],
    acceptanceJourneys: [
      {
        key: journey.key,
        description: "Customer submits an order for planning.",
        steps: [
          {
            actorKey: customer.key,
            action: `${customer.label} performs ${event}.`,
          },
        ],
      },
    ],
  };
  return assertRequirementInterpretation({
    spec,
    blueprint,
    clarifications: deriveClarifications(spec),
  });
}

function supportedRestaurantDefaultGuide(): {
  readonly productType: ReturnType<
    typeof restaurantOrderingProductIntent
  >["productType"];
  readonly actorKeys: readonly string[];
  readonly acceptanceJourneyKeys: readonly string[];
  readonly constraints: {
    readonly moneyMovement: ReturnType<
      typeof restaurantOrderingProductIntent
    >["constraints"]["moneyMovement"];
    readonly externalSideEffects: ReturnType<
      typeof restaurantOrderingProductIntent
    >["constraints"]["externalSideEffects"];
  };
  readonly surfaces: readonly {
    readonly key: string;
    readonly device: ReturnType<
      typeof restaurantOrderingExperienceBrief
    >["surfaces"][number]["device"];
    readonly audience: readonly string[];
    readonly navigation: ReturnType<
      typeof restaurantOrderingExperienceBrief
    >["surfaces"][number]["navigation"];
  }[];
} {
  const intent = restaurantOrderingProductIntent();
  const experience = restaurantOrderingExperienceBrief();
  const recipe = restaurantOrderingProductRecipe();
  return {
    productType: intent.productType,
    actorKeys: intent.actors.map((actor) => actor.key),
    acceptanceJourneyKeys: recipe.acceptanceJourneyKeys,
    constraints: {
      moneyMovement: intent.constraints.moneyMovement,
      externalSideEffects: intent.constraints.externalSideEffects,
    },
    surfaces: experience.surfaces.map((surface) => ({
      key: surface.key,
      device: surface.device,
      audience: surface.audience,
      navigation: surface.navigation,
    })),
  };
}

const supportedRestaurantDefaultInstruction = [
  "For every Restaurant brief, use this scoped canonical Restaurant definition when deciding its definition-selection disposition:",
  `<supported-restaurant-default>${JSON.stringify(supportedRestaurantDefaultGuide())}</supported-restaurant-default>`,
  "Apply every omitted canonical Restaurant detail as its own supported default, independently of whether another requested capability needs clarification. Every Restaurant result returns definition-selection with generatedInterpretation null; do not produce a full blueprint.",
  "When a Restaurant brief explicitly supplies an application display name, place that exact validated display name in the existing definition-selection title. A Restaurant display name must be trimmed safe business text from 2 through 80 characters. It must have no leading or trailing whitespace and no control characters. When no application display name is explicit, keep the validated provider title and do not ask a naming question. If an explicit display name is invalid, return needs-clarification with one material question that asks for a valid shorter display name; never truncate, replace, or encode the invalid name in title. If an answer still lacks a valid display name, retain needs-clarification so the existing bounded fail-closed follow-up behavior applies. Do not infer a legal or corporate identity from an application display name.",
  "Treat a sample, demo, or default menu, generic menu browsing, and application branding as canonical-default menu parameters with currency USD and zero items. A complete supplied initial menu of 1 through 100 dishes with names and explicit USD prices is supported: return provided businessParameters in supplied order, convert explicit prices exactly to integer minor units (cents), and use null description when omitted. Do not ask to edit a complete menu. Names must be trimmed safe text of 1..120 characters and non-null descriptions 1..1000, normalized to NFC; integer prices are 0..10000000. Never invent a missing name or price. An incomplete or unspecified custom menu requires businessParameters null and one consolidated material data question asking for the missing names and USD prices. Never encode menu data in title or other free-text fields as a transport substitute.",
  "The supplied-menu contract supports only names, optional descriptions, explicit USD prices, and order. Explicit currency other than USD, stock, availability, preparation time, images, categories, options, tax, or service-charge requirements remain material data clarification; never discard these requirements, convert another currency, or relabel it USD. Fixed omitted details are category mains, availability true, stock 100, preparation 15 minutes, and a local no-photo placeholder. Preserve a complete businessParameters value during unrelated material questions. For follow-ups, priorInterpretation is the exact versioned result wrapper: carry any complete provided menu unchanged through every clarification, including data questions about stock, currency, and options. Menu editing during clarification is not supported; incomplete null prior menu data may be completed with missing names and USD prices. Reevaluate and retain every independent unsupported requirement.",
  "An explicit contradiction remains unresolved. Do not suppress material access, privacy, business-rule, data or compliance, or integration questions. Never silently discard a material question or impose a count target to return supported-default. For an unsupported live payment or external capability, clearly state the current supported limitation and ask one meaningful scope decision for each genuinely independent material difference. When an unavailable external capability is the only explicit difference from the canonical Restaurant default, return exactly one integration material question that states the current supported limitation and asks whether to accept the supported scope or retain that capability as required. Do not infer downstream policy, data, authorization, implementation, processor, setup, or configuration questions from that one unavailable external capability. Preserve an access, privacy, data, or business-rule decision when the brief separately makes it explicit. Do not ask for provider setup, credentials, configuration, or integration implementation details that the supported product cannot implement. The simulated money movement and no external side effects default do not satisfy an explicit live payment request.",
  "A Restaurant follow-up may return supported-default when the supplied answer resolves its material question and no unresolved material requirement remains: missing menu names or USD prices must become complete, and an unsupported-scope question requires explicit acceptance of the supported scope. If an answer continues to require unsupported live payment or another external capability, retain needs-clarification.",
].join(" ");

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
    definitionKey: { type: "string", const: "restaurant-ordering" },
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

const restaurantStructure = projectRestaurantDefinitionSelection({
  definitionKey: "restaurant-ordering",
  disposition: "supported-default",
  requirementId: "restaurant-definition",
  title: "Restaurant",
  outcome: "Customers place orders and staff fulfill them.",
  materialQuestions: [],
  businessParameters: null,
});
export const restaurantDefinition = {
  definitionKey: "restaurant-ordering" as const,
  family: "restaurant" as const,
  parameterPolicy: "restaurant-menu" as const,
  structure: restaurantStructure,
  selectionSchema: restaurantDefinitionSelectionSchema,
  jsonSchema: restaurantDefinitionSelectionJsonSchema,
  guide: {
    definitionKey: "restaurant-ordering",
    ...supportedRestaurantDefaultGuide(),
  },
  instruction: supportedRestaurantDefaultInstruction,
  project: (input: unknown) =>
    projectRestaurantDefinitionSelection(
      restaurantDefinitionSelectionSchema.parse(input),
    ),
};
