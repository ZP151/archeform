import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { hashRequirementSpec } from "@factory/graph";
import {
  loadProductDefinitionData,
  parseProductDefinitionCatalogue,
} from "../src/requirements/product-definition-data.js";
import {
  semanticFingerprint,
  validateFamilyDefinition,
} from "../src/requirements/definition-family-registry.js";
import {
  definitionSelectionCatalogue,
  projectDefinitionSelection,
} from "../src/requirements/definition-selection-catalogue.js";
import { OpenAIRequirementInterpreterAdapter } from "../src/requirements/openai-interpreter.js";
import type { OpenAITransportRequest } from "../src/ai.js";
import { composeDirectoryInput } from "../../compiler/test/fixtures/content-directory.js";
import { selectContentDirectoryProfile } from "../../compiler/src/content-directory-contract.js";

const key = "knowledge-resource-directory";
const selection = {
  definitionKey: key,
  disposition: "supported-default",
  requirementId: "knowledge-library",
  title: "Knowledge Library",
  outcome: "Find useful knowledge and keep it current.",
  materialQuestions: [],
  businessParameters: null,
};
function directory() {
  const entry = loadProductDefinitionData().definitions.find(
    (item) => item.definitionKey === key,
  );
  expect(entry, "canonical directory registration").toBeDefined();
  return structuredClone(entry!);
}
function guide(entry: ReturnType<typeof directory>) {
  entry.selection.providerGuide = {
    ...structuredClone(entry.canonical.blueprint),
    definitionKey: key,
    identity: "Local demo reader and curator roles; no private identity.",
  };
}
describe("Knowledge Resource Directory definition", () => {
  it("appends the exact family without changing the historical eight entries", () => {
    const entry = directory();
    expect(entry).toMatchObject({
      definitionVersion: "1.0.0",
      familyBinding: {
        key: "content-directory",
        version: "content-directory/v1",
      },
      parameterPolicy: "none/v1",
      primaryJob: {
        actorKey: "curator",
        entityKey: "resource",
        operation: "submit",
        successState: "listed",
      },
      admissionExpectations: {
        presentation: {
          key: "content-directory-presentation",
          version: "1.0.0",
        },
        compilerProfile: "content-directory@1.0.0",
      },
      provenance: { decision: "ADR-0065" },
    });
    const raw = JSON.parse(
      readFileSync(
        new URL(
          "../src/requirements/definitions/product-definitions.v1.json",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    expect(
      createHash("sha256")
        .update(JSON.stringify(raw.definitions.slice(0, 8)))
        .digest("hex"),
    ).toBe("b431f992dc1ce50ebeacd9ee77f7e4bc842f550c92e7faaa5ab2438cc91c3289");
    expect(validateFamilyDefinition(entry)).toEqual([]);
    expect(entry.canonical.blueprint.requirementChecksum).toBe(
      hashRequirementSpec(entry.canonical.spec),
    );
  });
  it("projects only safe business text and composes the accepted exact immutable profile", () => {
    const result = projectDefinitionSelection(selection);
    const input = composeDirectoryInput(result.spec, result.blueprint);
    expect(
      selectContentDirectoryProfile(input.graph, input.compositionLock),
    ).toMatchObject({
      key: "content-directory",
      version: "1.0.0",
      entity: "resource",
      roles: { reader: "reader", curator: "curator" },
      categories: ["Guides", "Reference", "Checklists"],
    });
    expect(
      result.blueprint.entities[0]!.fields.map(({ key, type, required }) => ({
        key,
        type,
        required,
      })),
    ).toEqual([
      { key: "title", type: "text", required: true },
      { key: "summary", type: "text", required: true },
      { key: "body", type: "long-text", required: true },
      { key: "category", type: "enum", required: true },
    ]);
    for (const patch of [
      { businessParameters: { categories: ["Custom"] } },
      { routes: [] },
      { fields: [] },
      {
        materialQuestions: [
          { category: "data", question: "Do you require uploads?" },
        ],
      },
    ])
      expect(() =>
        projectDefinitionSelection({ ...selection, ...patch }),
      ).toThrow();
  });
  it.each([
    "contacts",
    "submissions",
    "uploads",
    "URLs",
    "private identity",
    "extra fields",
    "extra rules",
    "email",
    "plain text",
    "title 1..120 characters",
    "summary 1..280 characters",
    "body 1..12000 characters",
  ])("states the %s boundary in provider guidance", (term) => {
    expect(directory().selection.providerInstruction).toContain(term);
  });
  it.each([
    [
      "unreviewed capability digest",
      (entry: ReturnType<typeof directory>) => {
        entry.admissionExpectations.capabilityLocks[0]!.manifestDigest = `sha256:${"0".repeat(64)}`;
      },
    ],
    [
      "different compiler profile",
      (entry: ReturnType<typeof directory>) => {
        entry.admissionExpectations.compilerProfile = "task-correction/v2";
      },
    ],
    [
      "private identity relation",
      (entry: ReturnType<typeof directory>) => {
        entry.canonical.blueprint.entities[0]!.fields[0]!.referenceTo =
          "principal";
      },
    ],
    [
      "reader writes",
      (entry: ReturnType<typeof directory>) =>
        entry.canonical.blueprint.actors[0]!.permissions[0]!.actions.push(
          "create",
        ),
    ],
    [
      "extra fields",
      (entry: ReturnType<typeof directory>) =>
        entry.canonical.blueprint.entities[0]!.fields.push({
          key: "contact",
          label: "Contact",
          type: "text",
          required: true,
        }),
    ],
    [
      "uploaded body",
      (entry: ReturnType<typeof directory>) => {
        entry.canonical.blueprint.entities[0]!.fields[2]!.type = "file";
      },
    ],
    [
      "extra page",
      (entry: ReturnType<typeof directory>) =>
        entry.canonical.blueprint.pageIntents.push({
          key: "dashboard",
          label: "Dashboard",
          intent: "dashboard",
          entityKey: "resource",
        }),
    ],
    [
      "wrong action label",
      (entry: ReturnType<typeof directory>) => {
        entry.canonical.blueprint.workflows[0]!.transitions[0]!.label =
          "Publish";
      },
    ],
    [
      "missing correction",
      (entry: ReturnType<typeof directory>) => {
        entry.journeys.correction = [];
      },
    ],
    [
      "missing failure",
      (entry: ReturnType<typeof directory>) => {
        entry.journeys.failure = [];
      },
    ],
    [
      "wrong primary job",
      (entry: ReturnType<typeof directory>) => {
        entry.primaryJob.operation = "read";
        entry.primaryJob.successState = null;
      },
    ],
    [
      "hidden reader success",
      (entry: ReturnType<typeof directory>) => {
        entry.journeys.failure[1]!.steps[0]!.expectation = "success";
      },
    ],
  ])("rejects %s even with matching provider structure", (_name, mutate) => {
    const entry = directory();
    mutate(entry);
    guide(entry);
    expect(validateFamilyDefinition(entry).length).toBeGreaterThan(0);
  });
  it.each([
    [["Straße", "STRAẞE"], false],
    [["i", "ı"], true],
    [["ß", "ss"], true],
    [["Café", "Cafe\u0301"], false],
    [["a.*", "abc"], true],
    [["one"], false],
    [Array.from({ length: 13 }, (_, i) => `Category ${i}`), false],
    [["a".repeat(41), "b"], false],
    [[" Guides ", "Reference"], false],
    [["a/b", "a\\b"], true],
    [["a".repeat(40), "b"], true],
    [Array.from({ length: 12 }, (_, i) => `Category ${i}`), true],
  ] as [string[], boolean][])(
    "validates literal simple Unicode categories %j",
    (options, valid) => {
      const entry = directory();
      entry.canonical.blueprint.entities[0]!.fields[3]!.options = options;
      guide(entry);
      expect(validateFamilyDefinition(entry)).toEqual(
        valid
          ? []
          : expect.arrayContaining(["definition.unsupported-semantics"]),
      );
    },
  );
  it("does not count category-only variation as another distinct business job", () => {
    const original = directory(),
      variant = directory();
    variant.canonical.blueprint.entities[0]!.fields[3]!.options = [
      "Handbooks",
      "Procedures",
    ];
    guide(variant);
    expect(semanticFingerprint(variant)).toBe(semanticFingerprint(original));
    variant.definitionKey = "another-resource-directory";
    variant.selection.providerGuide.definitionKey = variant.definitionKey;
    expect(() =>
      parseProductDefinitionCatalogue(
        Buffer.from(
          JSON.stringify({
            apiVersion: "factory.product-definition-catalogue/v1",
            definitions: [original, variant],
          }),
        ),
      ),
    ).toThrow();
  });
  it("routes deterministic provider selections and preserves unsupported requirements as material questions", async () => {
    const requests: OpenAITransportRequest[] = [];
    let response: Record<string, unknown> = { ...selection };
    const adapter = new OpenAIRequirementInterpreterAdapter({
      readEnvironment: () => "fixture-key",
      transport: {
        async create(request) {
          requests.push(request);
          return {
            outputText: JSON.stringify({
              resultKind: "definition-selection",
              definitionSelection: response,
              generatedInterpretation: null,
            }),
          };
        },
      },
    });
    const result = await adapter.interpret({
      brief: "Build a knowledge resource directory for readers and curators.",
    });
    expect(result.interpretation.blueprint.entities[0]!.key).toBe("resource");
    expect(result.interpretation.clarifications).toEqual([]);
    const materialQuestions = [
      {
        category: "data",
        question:
          "Can you accept plain text without uploads, URLs, or contacts?",
      },
      {
        category: "authorization",
        question:
          "Can you accept demo roles without private identity or reader submissions?",
      },
      {
        category: "business-rule",
        question: "Can you accept the fixed fields and visibility rules?",
      },
    ];
    response = {
      ...selection,
      disposition: "needs-clarification",
      materialQuestions,
    };
    const unresolved = await adapter.interpret({
      brief:
        "Also require uploads, contacts, private identity, submissions and extra rules.",
    });
    expect(unresolved.interpretation.spec.openQuestions).toEqual(
      materialQuestions,
    );
    expect(unresolved.interpretation.clarifications[0]!.questions).toHaveLength(
      3,
    );
    expect(requests).toHaveLength(2);
    expect(
      definitionSelectionCatalogue.find((entry) => entry.definitionKey === key)
        ?.instruction,
    ).toContain("Only explicit acceptance");
  });
});
