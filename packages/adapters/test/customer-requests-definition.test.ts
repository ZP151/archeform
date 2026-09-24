import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  hashRequirementSpec,
  matchCustomerRequestsBlueprintV1,
  matchCustomerRequestsGraphV1,
} from "@factory/graph";
import { customerRequestsBlueprint } from "../../compiler/test/fixtures/customer-requests.js";
import { composeInventoryInput } from "../../compiler/test/fixtures/inventory-operations.js";
import { selectCustomerRequestsProfile } from "../../compiler/src/customer-requests-contract.js";
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

const key = "customer-support-desk";
const selection = {
  definitionKey: key,
  disposition: "supported-default",
  requirementId: "support-desk",
  title: "Customer Support Desk",
  outcome: "Resolve owned requests with a customer-visible conversation.",
  materialQuestions: [],
  businessParameters: null,
};
const definition = () => {
  const entry = loadProductDefinitionData().definitions.find(
    (e) => e.definitionKey === key,
  );
  expect(
    entry,
    "Canonical Customer Support Desk must be registered.",
  ).toBeDefined();
  return structuredClone(entry!);
};
const bytes = (...definitions: unknown[]) =>
  Buffer.from(
    JSON.stringify({
      apiVersion: "factory.product-definition-catalogue/v1",
      definitions,
    }),
  );
const unsupported = [
  ["private accounts", "authorization", "Must customers use private accounts?"],
  ["attachments", "data", "Must customers upload attachments?"],
  [
    "external intake",
    "integration",
    "Must requests arrive through external intake?",
  ],
  ["messages", "integration", "Must staff send external messages?"],
  [
    "notifications",
    "integration",
    "Must customers receive outbound notifications?",
  ],
  ["assignment", "business-rule", "Must requests support staff assignment?"],
  [
    "internal notes",
    "visibility",
    "Must staff write internal notes hidden from customers?",
  ],
  ["SLA", "business-rule", "Must requests enforce SLA deadlines?"],
] as const;

describe("Customer Support Desk authored definition", () => {
  it("admits the exact canonical family through immutable compiler inputs", () => {
    const entry = definition();
    expect(entry).toMatchObject({
      definitionVersion: "1.0.0",
      familyBinding: {
        key: "customer-requests",
        version: "customer-requests/v1",
      },
      parameterPolicy: "none/v1",
      primaryJob: {
        actorKey: "staff",
        entityKey: "customer-request",
        operation: "complete",
        successState: "resolved",
      },
      admissionExpectations: {
        compilerProfile: "customer-requests@1.0.0",
        presentation: {
          key: "customer-requests-presentation",
          version: "1.0.0",
        },
      },
    });
    expect(entry.canonical).toEqual(customerRequestsBlueprint());
    expect(entry.selection.providerGuide).toEqual({
      ...entry.canonical.blueprint,
      definitionKey: key,
      identity: expect.stringContaining("two synthetic customers"),
    });
    expect(validateFamilyDefinition(entry)).toEqual([]);
    expect(
      parseProductDefinitionCatalogue(bytes(entry)).definitions,
    ).toHaveLength(1);
    expect(definitionSelectionCatalogue).toHaveLength(13);
    const projected = projectDefinitionSelection(selection);
    expect(projected.clarifications).toEqual([]);
    expect(projected.blueprint.requirementChecksum).toBe(
      hashRequirementSpec(projected.spec),
    );
    expect(matchCustomerRequestsBlueprintV1(projected.blueprint)).toBeDefined();
    const input = JSON.parse(
      JSON.stringify(
        composeInventoryInput(projected.spec, projected.blueprint),
      ),
    );
    expect(input.graph.domain.seedData).toEqual([]);
    expect(matchCustomerRequestsGraphV1(input.graph)).toBeDefined();
    expect(
      selectCustomerRequestsProfile(input.graph, input.compositionLock),
    ).toMatchObject({
      key: "customer-requests",
      requestEntity: "customer-request",
      historyEntity: "request-history",
      principalEntity: "support-desk-principal",
      roles: { staff: "staff", customer: "customer" },
    });
    expect(
      input.graph.flow.flows.flatMap((flow: any) =>
        flow.transitions.flatMap((transition: any) => transition.effects ?? []),
      ),
    ).not.toContainEqual({
      capability: "notification.send",
      operation: "send",
    });
  });

  it("preserves the exact twelve historical rows and physical source prefix", () => {
    const raw = readFileSync(
      new URL(
        "../src/requirements/definitions/product-definitions.v1.json",
        import.meta.url,
      ),
      "utf8",
    );
    const hash = (value: string | Uint8Array) =>
      createHash("sha256").update(value).digest("hex");
    expect(hash(Buffer.from(raw).subarray(0, 305343))).toBe(
      "47743f131dea1d8de3c87471b6762eccd6a4b355962476bb045de2844a1e4ea3",
    );
    expect(hash(JSON.stringify(JSON.parse(raw).definitions.slice(0, 12)))).toBe(
      "1fdd26d5f779436ef83f5795e327a38c112922731304bede9afc06eff59449cf",
    );
    expect(validateDefinitionBatch(Buffer.from(raw))).toMatchObject({
      attempted: 13,
      valid: 13,
      distinct: 13,
      admitted: 13,
      reasonCounts: {},
    });
  });

  it.each([
    "family-version",
    "parameter-policy",
    "owner",
    "owner-required",
    "history-bound",
    "correction-bound",
    "history-reference",
    "history-grant",
    "staff-grant",
    "customer-grant",
    "field",
    "page",
    "seed",
    "cancel-transition",
    "primary-job",
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
    "journey-cancelled-reply",
    "journey-create-state",
    "missing-correction",
    "missing-failure",
  ])("rejects independently altered %s", (change) => {
    const e = definition(),
      b = e.canonical.blueprint;
    if (change === "family-version")
      e.familyBinding.version = "customer-requests/v2";
    if (change === "parameter-policy") e.parameterPolicy = "custom/v1";
    if (change === "owner")
      b.entities[0]!.fields[3]!.key = "assigneePrincipalId";
    if (change === "owner-required") b.entities[0]!.fields[3]!.required = false;
    if (change === "history-bound")
      b.entities[1]!.fields[2]!.numericDomain!.maximum!.value = 2147483648;
    if (change === "correction-bound")
      b.entities[1]!.fields[10]!.numericDomain!.minimum!.value = -1;
    if (change === "history-reference")
      b.entities[1]!.fields[0]!.referenceTo = "request-history";
    if (change === "history-grant")
      b.actors[0]!.permissions[1]!.actions.push("update");
    if (change === "staff-grant")
      b.actors[0]!.permissions[0]!.actions.push("create");
    if (change === "customer-grant")
      b.actors[1]!.permissions[0]!.actions.push("complete");
    if (change === "field")
      b.entities[0]!.fields.push({
        key: "attachment",
        label: "Attachment",
        type: "text",
        required: false,
      });
    if (change === "page") b.pageIntents[0]!.entityKey = "request-history";
    if (change === "seed")
      Object.assign(b, { seedData: [{ id: "seed-request" }] });
    if (change === "cancel-transition") b.workflows[0]!.transitions.pop();
    if (change === "primary-job") e.primaryJob.actorKey = "customer";
    if (change === "presentation")
      e.admissionExpectations.presentation.version = "2.0.0";
    if (change === "compiler")
      e.admissionExpectations.compilerProfile = "service-work-orders@1.0.0";
    if (change === "guide-field")
      (e.selection.providerGuide.entities as any[])[1].fields.pop();
    if (change === "guide-journey")
      (
        e.selection.providerGuide.acceptanceJourneys as any[]
      )[0].steps[0].action = "Upload attachments and notify staff.";
    if (change === "guide-extra") e.selection.providerGuide.extra = true;
    if (change === "guide-checksum")
      e.selection.providerGuide.requirementChecksum = `sha256:${"0".repeat(64)}`;
    const step = e.journeys.correction[0]!.steps[0]!;
    if (change === "journey-operation") step.operation = "delete";
    if (change === "journey-actor") step.actorKey = "staff";
    if (change === "journey-history-write") step.entityKey = "request-history";
    if (change === "journey-resolved-update")
      step.fromState = step.toState = "resolved";
    if (change === "journey-cancelled-reply") {
      step.operation = "reply";
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

  it.each([
    "core.crud",
    "core.workflow",
    "core.identity-policy",
    "core.policy-declarations",
    "core.audit",
    "core.notification",
  ])("requires the exact physical %s lock", (lockKey) => {
    const e = definition();
    e.admissionExpectations.capabilityLocks.find(
      (lock) => lock.key === lockKey,
    )!.manifestDigest = `sha256:${"0".repeat(64)}`;
    expect(() => parseProductDefinitionCatalogue(bytes(e))).toThrow(
      "definition.execution-drift",
    );
  });

  it.each([
    ["agent", "requester"],
    ["customer", "staff"],
    ["s".repeat(128), "c".repeat(128)],
  ])(
    "admits renamed roles %s / %s without treating them as distinct semantics",
    (staff, customer) => {
      const original = definition();
      const names: Record<string, string> = {
        staff,
        customer,
        "customer-request": "support-ticket",
        "request-history": "ticket-history",
        "handle-request": "ticket-flow",
        "my-requests": "ticket-list",
        "new-request": "ticket-form",
        "request-detail": "ticket-detail",
        "staff-queue": "ticket-queue",
      };
      const renamed = JSON.parse(
        JSON.stringify(original, (_key, value) =>
          typeof value === "string" ? (names[value] ?? value) : value,
        ),
      );
      renamed.definitionKey = "renamed-support";
      renamed.selection.providerGuide.definitionKey = renamed.definitionKey;
      renamed.canonical.blueprint.requirementChecksum = hashRequirementSpec(
        renamed.canonical.spec,
      );
      renamed.selection.providerGuide.requirementChecksum =
        renamed.canonical.blueprint.requirementChecksum;
      expect(validateFamilyDefinition(renamed)).toEqual([]);
      expect(semanticFingerprint(renamed)).toBe(semanticFingerprint(original));
      expect(() =>
        parseProductDefinitionCatalogue(bytes(original, renamed)),
      ).toThrow("definition.duplicate-semantics");
      const projection = createDefinitionEntry(renamed).project({
        ...selection,
        definitionKey: renamed.definitionKey,
      });
      const input = JSON.parse(
        JSON.stringify(
          composeInventoryInput(projection.spec, projection.blueprint),
        ),
      );
      expect(
        selectCustomerRequestsProfile(input.graph, input.compositionLock)
          ?.roles,
      ).toEqual({ staff, customer });
    },
  );

  it("rejects a label-only duplicate", () => {
    const original = definition(),
      duplicate = definition();
    duplicate.definitionKey = "returns-support";
    duplicate.canonical.blueprint.title = "Returns Support";
    duplicate.canonical.blueprint.entities[0]!.label = "Return enquiry";
    duplicate.selection.providerGuide = {
      ...structuredClone(duplicate.canonical.blueprint),
      definitionKey: duplicate.definitionKey,
      identity: original.selection.providerGuide.identity,
    };
    expect(() =>
      parseProductDefinitionCatalogue(bytes(original, duplicate)),
    ).toThrow("definition.duplicate-semantics");
  });

  it.each([
    ["customer", "create"],
    ["customer", "update"],
    ["customer", "reply"],
    ["staff", "reply"],
    ["staff", "complete"],
    ["customer", "reopen"],
    ["customer", "cancel"],
    ["customer", "read"],
    ["staff", "read"],
  ])("requires the %s %s lifecycle journey", (actor, operation) => {
    const e = definition();
    for (const journey of e.journeys.correction)
      journey.steps = journey.steps.filter(
        (step) => step.actorKey !== actor || step.operation !== operation,
      );
    e.journeys.correction = e.journeys.correction.filter(
      (journey) => journey.steps.length,
    );
    expect(validateFamilyDefinition(e)).toContain(
      "definition.missing-correction",
    );
  });

  it("requires same-role request and history isolation journeys even with other failures present", () => {
    const e = definition();
    e.journeys.failure = e.journeys.failure.filter(
      (journey) => journey.key !== "same-role-other-customer-denied",
    );
    expect(validateFamilyDefinition(e)).toContain("definition.missing-failure");
  });

  it("routes an authored supported provider selection through the registered projection", async () => {
    const adapter = new OpenAIRequirementInterpreterAdapter({
      readEnvironment: () => "test-only",
      transport: {
        async create() {
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
    const result = await adapter.interpret({
      brief: "Build a customer support desk with local request conversations.",
      answers: {},
    });
    expect(result.interpretation).toEqual(
      projectDefinitionSelection(selection),
    );
  });

  // Authored responses verify ADR-0078 retention, not live provider accuracy.
  it.each(unsupported)(
    "retains required %s through answered clarification",
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
      const brief = `Build a customer support desk requiring ${term}.`;
      const initial = await adapter.interpret({ brief, answers: {} });
      expect(initial.interpretation.spec.openQuestions).toEqual(
        materialQuestions,
      );
      const before = structuredClone(initial),
        questionContext =
          initial.interpretation.clarifications[0]!.questions[0]!;
      await expect(
        adapter.interpret({
          brief,
          answers: { [questionContext.key]: "Still required." },
          clarificationContext: [
            { ...questionContext, answer: "Still required." },
          ],
          priorInterpretation: initial,
        }),
      ).rejects.toMatchObject({ code: "definition_scope_unresolved" });
      expect(initial).toEqual(before);
    },
  );

  it("projects bounded support only after explicit acceptance of the local limitation", async () => {
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
                          question: "Must customers use private accounts?",
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
    const brief = "Build a customer support desk with private accounts.";
    const initial = await adapter.interpret({ brief, answers: {} });
    const question = initial.interpretation.clarifications[0]!.questions[0]!;
    const answer =
      "Use the public local demo with synthetic customers; private accounts are not required.";
    const accepted = await adapter.interpret({
      brief,
      answers: { [question.key]: answer },
      clarificationContext: [{ ...question, answer }],
      priorInterpretation: initial,
    });
    expect(accepted.interpretation.spec.openQuestions).toEqual([]);
    expect(accepted.interpretation.clarifications).toEqual([]);
    expect(accepted.interpretation.blueprint.entities).toEqual(
      definition().canonical.blueprint.entities,
    );
  });
});
