import { z } from "zod";
import {
  assertRequirementInterpretation,
  type RequirementInterpretationV1,
} from "./requirement-interpreter.js";
import { expenseApprovalDefinition } from "./approval-definition-selection.js";
import { purchaseRequestApprovalDefinition } from "./purchase-request-definition-selection.js";
import { restaurantDefinition } from "./restaurant-definition-selection.js";
import { teamTaskDefinition } from "./task-definition-selection.js";

type DefinitionEntry = {
  readonly definitionKey: string;
  readonly family: "restaurant" | "approval" | "task";
  readonly parameterPolicy: "restaurant-menu" | "none";
  readonly selectionSchema: z.ZodEffects<z.AnyZodObject>;
  readonly jsonSchema: object;
  readonly guide: { readonly definitionKey: string };
  readonly instruction: string;
  readonly structure: RequirementInterpretationV1;
  project(input: unknown): RequirementInterpretationV1;
};
function structureOf(result: RequirementInterpretationV1): string {
  const {
    requirementId: _id,
    outcome: _outcome,
    openQuestions: _questions,
    ...spec
  } = result.spec;
  const {
    title: _title,
    requirementChecksum: _checksum,
    ...blueprint
  } = result.blueprint;
  return JSON.stringify({ spec, blueprint });
}
/** Private, static registration validation; not an extension or public plugin API. */
export function validateDefinitionCatalogue(
  entries: readonly DefinitionEntry[],
): void {
  const keys = new Set<string>();
  for (const entry of entries) {
    const literal = entry.selectionSchema.innerType().shape.definitionKey.value;
    const branches =
      "anyOf" in entry.jsonSchema
        ? (
            entry.jsonSchema as {
              anyOf: readonly {
                properties: { definitionKey: { const: string } };
              }[];
            }
          ).anyOf
        : [
            entry.jsonSchema as {
              properties: { definitionKey: { const: string } };
            },
          ];
    if (
      keys.has(entry.definitionKey) ||
      literal !== entry.definitionKey ||
      entry.guide.definitionKey !== entry.definitionKey ||
      branches.some(
        (branch) =>
          branch.properties.definitionKey.const !== entry.definitionKey,
      ) ||
      (entry.family !== "restaurant") !== (entry.parameterPolicy === "none")
    )
      throw new Error("Definition registration is inconsistent.");
    keys.add(entry.definitionKey);
    const selection = entry.selectionSchema.parse({
      definitionKey: entry.definitionKey,
      disposition: "supported-default",
      requirementId: "definition-check",
      title: "Definition Check",
      outcome: "Review the supported business definition.",
      materialQuestions: [],
      businessParameters: null,
    });
    if (
      structureOf(assertRequirementInterpretation(entry.project(selection))) !==
      structureOf(entry.structure)
    )
      throw new Error("Definition projector is inconsistent.");
  }
}
export const definitionSelectionCatalogue = Object.freeze([
  Object.freeze(restaurantDefinition),
  Object.freeze(expenseApprovalDefinition),
  Object.freeze(purchaseRequestApprovalDefinition),
  Object.freeze(teamTaskDefinition),
] as const);
validateDefinitionCatalogue(definitionSelectionCatalogue);
const schemas = definitionSelectionCatalogue.map(
  (entry) => entry.selectionSchema,
);
export const definitionSelectionSchema = z.union(
  schemas as [
    (typeof schemas)[number],
    (typeof schemas)[number],
    ...(typeof schemas)[number][],
  ],
);
export const definitionSelectionJsonSchemas = definitionSelectionCatalogue.map(
  (entry) => entry.jsonSchema,
);
export const definitionSelectionInstructions = definitionSelectionCatalogue.map(
  (entry) => entry.instruction,
);
export function projectDefinitionSelection(
  input: unknown,
): RequirementInterpretationV1 {
  const selection = definitionSelectionSchema.parse(input);
  const entry = definitionSelectionCatalogue.find(
    (candidate) => candidate.definitionKey === selection.definitionKey,
  );
  if (!entry) throw new Error("Definition is not registered.");
  const result = assertRequirementInterpretation(entry.project(selection));
  if (structureOf(result) !== structureOf(entry.structure))
    throw new Error("Definition projector is inconsistent.");
  return result;
}
