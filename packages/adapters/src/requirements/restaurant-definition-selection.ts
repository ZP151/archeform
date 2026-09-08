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
