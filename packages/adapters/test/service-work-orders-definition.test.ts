import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  hashRequirementSpec,
  matchServiceWorkOrdersBlueprintV1,
  matchServiceWorkOrdersGraphV1,
} from "@factory/graph";
import { serviceWorkOrdersBlueprint } from "../../compiler/test/fixtures/service-work-orders.js";
import { composeInventoryInput } from "../../compiler/test/fixtures/inventory-operations.js";
import { selectServiceWorkOrdersProfile } from "../../compiler/src/service-work-orders-contract.js";
import {
  loadProductDefinitionData,
  parseProductDefinitionCatalogue,
  validateDefinitionBatch,
} from "../src/requirements/product-definition-data.js";
import {
  createDefinitionEntry,
  semanticFingerprint,
  validateFamilyDefinition,
} from "../src/requirements/definition-family-registry.js";
import {
  definitionSelectionCatalogue,
  projectDefinitionSelection,
} from "../src/requirements/definition-selection-catalogue.js";
import { OpenAIRequirementInterpreterAdapter } from "../src/requirements/openai-interpreter.js";

const key = "facilities-service-desk";
const selection = {
  definitionKey: key,
  disposition: "supported-default",
  requirementId: "facilities-desk",
  title: "Facilities Service Desk",
  outcome: "Dispatch facilities work and retain technician resolution history.",
  materialQuestions: [],
  businessParameters: null,
};
const definition = () => {
  const entry = loadProductDefinitionData().definitions.find(
    (e) => e.definitionKey === key,
  );
  expect(
    entry,
    "Canonical facilities definition must be registered.",
  ).toBeDefined();
  return structuredClone(entry!);
};
const bytes = (entry: unknown) =>
  Buffer.from(
    JSON.stringify({
      apiVersion: "factory.product-definition-catalogue/v1",
      definitions: [entry],
    }),
  );
const unsupported = [
  ["private accounts", "authorization", "Must staff use private accounts?"],
  ["photo uploads", "data", "Must technicians upload photos?"],
  ["messaging", "integration", "Must dispatch send messages?"],
  [
    "notifications",
    "integration",
    "Must staff receive outbound notifications?",
  ],
  ["maps", "integration", "Must work be shown on live maps?"],
  [
    "external actions",
    "integration",
    "Must this execute actions in another system?",
  ],
] as const;

describe("Facilities Service Desk authored definition", () => {
  it("registers the exact canonical family and complete guide", () => {
    const entry = definition();
    expect(entry).toMatchObject({
      definitionVersion: "1.0.0",
      familyBinding: {
        key: "service-work-orders",
        version: "service-work-orders/v1",
      },
      parameterPolicy: "none/v1",
      primaryJob: {
        actorKey: "technician",
        entityKey: "work-order",
        operation: "resolve",
        successState: "resolved",
      },
      admissionExpectations: {
        compilerProfile: "service-work-orders@1.0.0",
        presentation: {
          key: "service-work-orders-presentation",
          version: "1.0.0",
        },
      },
    });
    expect(entry.canonical).toEqual(serviceWorkOrdersBlueprint());
    expect(entry.selection.providerGuide).toEqual({
      ...entry.canonical.blueprint,
      definitionKey: key,
      identity: expect.stringContaining("synthetic staff"),
    });
    expect(entry.admissionExpectations.capabilityLocks).toHaveLength(6);
    expect(validateFamilyDefinition(entry)).toEqual([]);
    expect(
      parseProductDefinitionCatalogue(bytes(entry)).definitions,
    ).toHaveLength(1);
    expect(definitionSelectionCatalogue).toHaveLength(12);
  });

  it("preserves all eleven prior rows and their original source prefix", () => {
    const raw = readFileSync(
      new URL(
        "../src/requirements/definitions/product-definitions.v1.json",
        import.meta.url,
      ),
      "utf8",
    );
    const baseline = {
      rows: 11,
      prefixLength: 271801,
      prefixSha256:
        "4c861dbe425cce9c44dbbe18a4e1d9c51907f0a86a24da7d5032c871f83926a5",
      rowsSha256:
        "beb7890961025caf46ab7b97de9a7460f44fa6812d8700f3a0bb853cbd99ba79",
    };
    const hash = (value: string) =>
      createHash("sha256").update(value).digest("hex");
    expect(hash(raw.slice(0, baseline.prefixLength))).toBe(
      baseline.prefixSha256,
    );
    expect(hash(JSON.stringify(JSON.parse(raw).definitions.slice(0, 11)))).toBe(
      baseline.rowsSha256,
    );
    expect(validateDefinitionBatch(Buffer.from(raw))).toMatchObject({
      attempted: 12,
      valid: 12,
      distinct: 12,
      admitted: 12,
      reasonCounts: {},
    });
  });

  it("projects a coarse local selection through persisted exact compiler admission", () => {
    const projected = projectDefinitionSelection(selection);
    expect(projected.clarifications).toEqual([]);
    expect(projected.spec.openQuestions).toEqual([]);
    expect(projected.blueprint.requirementChecksum).toBe(
      hashRequirementSpec(projected.spec),
    );
    expect(
      matchServiceWorkOrdersBlueprintV1(projected.blueprint),
    ).toMatchObject({
      orderEntity: "work-order",
      historyEntity: "work-order-history",
    });
    const input = JSON.parse(
      JSON.stringify(
        composeInventoryInput(projected.spec, projected.blueprint),
      ),
    );
    expect(input.graph.domain.seedData).toEqual([]);
    expect(matchServiceWorkOrdersGraphV1(input.graph)).toBeDefined();
    expect(
      selectServiceWorkOrdersProfile(input.graph, input.compositionLock),
    ).toMatchObject({
      key: "service-work-orders",
      orderEntity: "work-order",
      historyEntity: "work-order-history",
      principalEntity: "facilities-desk-principal",
      roles: { dispatcher: "dispatcher", technician: "technician" },
    });
  });

  it.each([
    "family-version",
    "parameter-policy",
    "history-bound",
    "history-reference",
    "history-grant",
    "technician-grant",
    "field",
    "page",
    "seed",
    "cancel-transition",
    "primary-job",
    "lock",
    "presentation",
    "compiler",
    "guide-field",
    "guide-journey",
    "guide-extra",
    "guide-checksum",
    "journey-operation",
    "journey-actor",
    "journey-history-write",
    "journey-resolved-update",
    "journey-cancelled-assignment",
    "journey-create-state",
    "missing-correction",
    "missing-failure",
  ])("rejects independently altered %s", (change) => {
    const e = definition();
    const b = e.canonical.blueprint;
    if (change === "family-version")
      e.familyBinding.version = "service-work-orders/v2";
    if (change === "parameter-policy") e.parameterPolicy = "custom/v1";
    if (change === "history-bound")
      b.entities[1]!.fields.find(
        (f) => f.key === "orderVersion",
      )!.numericDomain!.maximum!.value = 2147483648;
    if (change === "history-reference")
      b.entities[1]!.fields[0]!.referenceTo = "work-order-history";
    if (change === "history-grant")
      b.actors[0]!.permissions[1]!.actions.push("update");
    if (change === "technician-grant")
      b.actors[1]!.permissions[0]!.actions.push("assign");
    if (change === "field")
      b.entities[0]!.fields.push({
        key: "photo",
        label: "Photo",
        type: "text",
        required: false,
      });
    if (change === "page") b.pageIntents[0]!.entityKey = "work-order-history";
    if (change === "seed")
      Object.assign(b, { seedData: [{ id: "seed-order" }] });
    if (change === "cancel-transition") b.workflows[0]!.transitions.pop();
    if (change === "primary-job") e.primaryJob.actorKey = "dispatcher";
    if (change === "lock")
      e.admissionExpectations.capabilityLocks[0]!.manifestDigest = `sha256:${"0".repeat(64)}`;
    if (change === "presentation")
      e.admissionExpectations.presentation.version = "2.0.0";
    if (change === "compiler")
      e.admissionExpectations.compilerProfile = "task-correction/v2";
    if (change === "guide-field")
      (e.selection.providerGuide.entities as any[])[1].fields.pop();
    if (change === "guide-journey")
      (
        e.selection.providerGuide.acceptanceJourneys as any[]
      )[0].steps[0].action = "Upload photos and notify staff.";
    if (change === "guide-extra") e.selection.providerGuide.extra = true;
    if (change === "guide-checksum")
      e.selection.providerGuide.requirementChecksum = `sha256:${"0".repeat(64)}`;
    const step = e.journeys.correction[0]!.steps[0]!;
    if (change === "journey-operation") step.operation = "delete";
    if (change === "journey-actor") step.actorKey = "technician";
    if (change === "journey-history-write")
      step.entityKey = "work-order-history";
    if (change === "journey-resolved-update")
      step.fromState = step.toState = "resolved";
    if (change === "journey-cancelled-assignment") {
      step.operation = "assign";
      step.fromState = step.toState = "cancelled";
    }
    if (change === "journey-create-state") {
      step.operation = "create";
      step.fromState = step.toState = "resolved";
    }
    if (change === "missing-correction") e.journeys.correction = [];
    if (change === "missing-failure") e.journeys.failure = [];
    expect(() => parseProductDefinitionCatalogue(bytes(e))).toThrow();
  });

  it("normalizes renamed role/entity symbols without admitting duplicate semantics", () => {
    const original = definition();
    const names: Record<string, string> = {
      dispatcher: "coordinator",
      technician: "operator",
      "work-order": "repair",
      "work-order-history": "repair-history",
      "fulfil-order": "repair-flow",
      dispatch: "repair-list",
      "new-order": "repair-form",
      "order-detail": "repair-detail",
      "assigned-work": "repair-queue",
    };
    const renamed = JSON.parse(
      JSON.stringify(original, (_key, value) =>
        typeof value === "string" ? (names[value] ?? value) : value,
      ),
    );
    renamed.definitionKey = "repair-desk";
    renamed.selection.providerGuide.definitionKey = renamed.definitionKey;
    renamed.canonical.blueprint.requirementChecksum = hashRequirementSpec(
      renamed.canonical.spec,
    );
    renamed.selection.providerGuide.requirementChecksum =
      renamed.canonical.blueprint.requirementChecksum;
    expect(validateFamilyDefinition(renamed)).toEqual([]);
    expect(semanticFingerprint(renamed)).toBe(semanticFingerprint(original));
    expect(() =>
      parseProductDefinitionCatalogue(
        Buffer.from(
          JSON.stringify({
            apiVersion: "factory.product-definition-catalogue/v1",
            definitions: [original, renamed],
          }),
        ),
      ),
    ).toThrow("definition.duplicate-semantics");
    const projection = createDefinitionEntry(renamed).project({
      ...selection,
      definitionKey: "repair-desk",
    });
    const input = JSON.parse(
      JSON.stringify(
        composeInventoryInput(projection.spec, projection.blueprint),
      ),
    );
    expect(
      selectServiceWorkOrdersProfile(input.graph, input.compositionLock)?.roles,
    ).toEqual({ dispatcher: "coordinator", technician: "operator" });
  });

  // Authored provider responses test routing and retention, not live-model selection accuracy.
  it.each([
    "Build a facilities dispatch desk.",
    "Track local maintenance requests through assignment and technician resolution.",
  ])(
    "routes an authored supported selection for the coarse brief: %s",
    async (brief) => {
      let guideIncluded = false;
      const adapter = new OpenAIRequirementInterpreterAdapter({
        readEnvironment: () => "test-only",
        transport: {
          async create(request) {
            guideIncluded = request.instructions.includes(
              definition().selection.providerInstruction,
            );
            return {
              outputText: JSON.stringify({
                resultKind: "definition-selection",
                definitionSelection: selection,
                generatedInterpretation: null,
              }),
            };
          },
        },
      });
      const result = await adapter.interpret({ brief, answers: {} });
      expect(guideIncluded).toBe(true);
      expect(result.interpretation).toEqual(
        projectDefinitionSelection(selection),
      );
      expect(result.interpretation.clarifications).toEqual([]);
    },
  );

  it.each(unsupported)(
    "retains required %s through initial and answered clarification",
    async (term, category, question) => {
      expect(definition().selection.providerInstruction).toContain(term);
      const materialQuestions = [{ category, question }];
      const adapter = new OpenAIRequirementInterpreterAdapter({
        readEnvironment: () => "test-only",
        transport: {
          async create() {
            return {
              outputText: JSON.stringify({
                resultKind: "definition-selection",
                definitionSelection: {
                  ...selection,
                  disposition: "needs-clarification",
                  materialQuestions,
                },
                generatedInterpretation: null,
              }),
            };
          },
        },
      });
      const initial = await adapter.interpret({
        brief: `Build a facilities desk requiring ${term}.`,
        answers: {},
      });
      expect(initial.interpretation.spec.openQuestions).toEqual(
        materialQuestions,
      );
      const before = structuredClone(initial);
      const clarification =
        initial.interpretation.clarifications[0]!.questions[0]!;
      await expect(
        adapter.interpret({
          brief: `Build a facilities desk requiring ${term}.`,
          answers: { [clarification.key]: "Still required." },
          clarificationContext: [
            { ...clarification, answer: "Still required." },
          ],
          priorInterpretation: initial,
        }),
      ).rejects.toMatchObject({ code: "definition_scope_unresolved" });
      expect(initial).toEqual(before);
    },
  );

  it("projects supported scope only after explicit acceptance of the local limitation", async () => {
    let attempt = 0;
    const adapter = new OpenAIRequirementInterpreterAdapter({
      readEnvironment: () => "test-only",
      transport: {
        async create() {
          return {
            outputText: JSON.stringify({
              resultKind: "definition-selection",
              definitionSelection:
                attempt++ === 0
                  ? {
                      ...selection,
                      disposition: "needs-clarification",
                      materialQuestions: [
                        {
                          category: "authorization",
                          question: "Must staff use private accounts?",
                        },
                      ],
                    }
                  : selection,
              generatedInterpretation: null,
            }),
          };
        },
      },
    });
    const initial = await adapter.interpret({
      brief: "Build a facilities desk with private accounts.",
      answers: {},
    });
    const question = initial.interpretation.clarifications[0]!.questions[0]!;
    const answer =
      "Use local synthetic staff only; private accounts are not required.";
    const accepted = await adapter.interpret({
      brief: "Build a facilities desk with private accounts.",
      answers: { [question.key]: answer },
      clarificationContext: [{ ...question, answer }],
      priorInterpretation: initial,
    });
    expect(accepted.interpretation.clarifications).toEqual([]);
    expect(accepted.interpretation.spec.openQuestions).toEqual([]);
    expect(accepted.interpretation.blueprint.entities).toEqual(
      definition().canonical.blueprint.entities,
    );
  });
});
