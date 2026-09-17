import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  composeProductDraft,
  planProductAlternatives,
} from "@factory/capabilities/node";
import {
  createBlankApplicationDraft,
  hashRequirementSpec,
} from "@factory/graph";
import {
  loadProductDefinitionData,
  parseProductDefinitionCatalogue,
  validateDefinitionBatch,
  MAX_DEFINITION_BYTES,
} from "../src/requirements/product-definition-data.js";
import { createDefinitionEntry } from "../src/requirements/definition-family-registry.js";

const bytes = (definitions: unknown[]) =>
  Buffer.from(
    JSON.stringify({
      apiVersion: "factory.product-definition-catalogue/v1",
      definitions,
    }),
  );
const candidate = () =>
  structuredClone(loadProductDefinitionData().definitions[1]!);
const report = (definitions: unknown[]) =>
  validateDefinitionBatch(bytes(definitions));

describe("Product definition data", () => {
  it("loads six immutable data entries and admits only the shipped catalogue", () => {
    const data = loadProductDefinitionData();
    expect(data.definitions).toHaveLength(6);
    expect(
      Object.isFrozen(
        data.definitions[1]!.canonical.blueprint.entities[0]!.fields,
      ),
    ).toBe(true);
    expect(
      validateDefinitionBatch(
        readFileSync(
          new URL(
            "../src/requirements/definitions/product-definitions.v1.json",
            import.meta.url,
          ),
        ),
      ),
    ).toMatchObject({ attempted: 6, valid: 6, distinct: 6, admitted: 6 });
  });
  it("admits the distinct reviewed Publication definition with its bounded scope", () => {
    const publication = loadProductDefinitionData().definitions.find(
      (definition) => definition.definitionKey === "publication-review",
    );
    expect(publication).toMatchObject({
      definitionVersion: "1.0.0",
      familyBinding: { key: "approval", version: "approval-correction/v1" },
      parameterPolicy: "none/v1",
      primaryJob: {
        actorKey: "author",
        operation: "submit",
        entityKey: "submission",
        successState: "submitted",
      },
    });
    expect(
      publication?.canonical.blueprint.actors.map(({ key }) => key),
    ).toEqual(["author", "editor", "auditor"]);
    expect(
      publication?.canonical.blueprint.entities[0]!.fields.map(
        ({ key, type, required, options }) => ({
          key,
          type,
          required,
          options,
        }),
      ),
    ).toEqual([
      { key: "articleTitle", type: "text", required: true, options: undefined },
      {
        key: "contentBody",
        type: "long-text",
        required: true,
        options: undefined,
      },
      {
        key: "channel",
        type: "enum",
        required: true,
        options: ["blog", "newsletter", "social", "documentation"],
      },
      {
        key: "editorialNotes",
        type: "long-text",
        required: false,
        options: undefined,
      },
    ]);
    expect(publication?.selection.providerInstruction).toContain(
      "external publishing",
    );
    expect(publication?.selection.providerInstruction).toContain(
      "scheduled publication",
    );
    expect(publication?.selection.providerInstruction).toContain("rich-text");
    expect(publication?.selection.providerInstruction).toContain(
      "multiple review stages",
    );
    expect(publication?.selection.providerInstruction).toContain(
      "real identity",
    );
  });
  it("admits Training Funding with the exact local Approval field contract", () => {
    const training = loadProductDefinitionData().definitions.find(
      (definition) => definition.definitionKey === "training-funding-approval",
    );
    expect(training).toBeDefined();
    if (!training)
      throw new Error("Training Funding definition was not found.");

    expect(training).toMatchObject({
      definitionVersion: "1.0.0",
      familyBinding: { key: "approval", version: "approval-correction/v1" },
      parameterPolicy: "none/v1",
      primaryJob: {
        actorKey: "employee",
        operation: "submit",
        entityKey: "training-request",
        successState: "submitted",
      },
      provenance: { decision: "ADR-0065" },
    });
    expect(training.canonical.blueprint.entities[0]).toMatchObject({
      key: "training-request",
      label: "Training request",
      fields: [
        { key: "courseTitle", type: "text", required: true },
        {
          key: "fee",
          type: "currency",
          required: true,
          numericDomain: {
            apiVersion: "factory.numeric-field-domain/v1",
            minimum: { value: 0, inclusive: false },
          },
        },
        { key: "sessionDate", type: "date", required: true },
        { key: "justification", type: "long-text", required: true },
      ],
    });
    expect(
      training.canonical.blueprint.entities[0]!.fields.map(
        ({ key, type, required, options }) => ({
          key,
          type,
          required,
          options,
        }),
      ),
    ).toEqual([
      { key: "courseTitle", type: "text", required: true, options: undefined },
      { key: "fee", type: "currency", required: true, options: undefined },
      { key: "sessionDate", type: "date", required: true, options: undefined },
      {
        key: "justification",
        type: "long-text",
        required: true,
        options: undefined,
      },
    ]);
    expect(training.canonical.blueprint.actors.map(({ key }) => key)).toEqual([
      "employee",
      "manager",
      "finance",
    ]);
    expect(
      training.canonical.blueprint.pageIntents.map(({ label }) => label),
    ).toContain("All training requests");
    expect(
      training.canonical.blueprint.pageIntents.map(({ label }) => label),
    ).toContain("New training request");
    expect(
      training.canonical.blueprint.workflows[0]!.states.map(({ key }) => key),
    ).toEqual(["draft", "submitted", "approved", "returned"]);
    expect(training.journeys.failure[0]?.steps).toEqual([
      {
        actorKey: "finance",
        entityKey: "training-request",
        operation: "approve",
        fromState: "submitted",
        toState: "approved",
        expectation: "denied",
      },
    ]);

    const entry = createDefinitionEntry(training);
    const selection = {
      definitionKey: training.definitionKey,
      disposition: "supported-default" as const,
      requirementId: "training-funding-admission-check",
      title: "Training Funding Approval",
      outcome: "Review local training funding.",
      materialQuestions: [],
      businessParameters: null,
    };
    const first = entry.project(selection);
    const second = entry.project(selection);
    expect(second).toEqual(first);
    expect(first.blueprint.requirementChecksum).toBe(
      hashRequirementSpec(first.spec),
    );

    const materialQuestions = [
      {
        category: "integration" as const,
        question: "Is payment execution required after a funding decision?",
      },
      {
        category: "integration" as const,
        question: "Is course enrollment required after approval?",
      },
      {
        category: "integration" as const,
        question: "Is calendar delivery required for the training session?",
      },
      {
        category: "visibility" as const,
        question: "Must each employee have private training requests?",
      },
    ];
    expect(
      entry.project({
        ...selection,
        disposition: "needs-clarification",
        materialQuestions,
      }).spec.openQuestions,
    ).toEqual(materialQuestions);
  });
  it("composes equivalent Training Funding Approval diffs from repeated selections", () => {
    const training = loadProductDefinitionData().definitions.find(
      (definition) => definition.definitionKey === "training-funding-approval",
    );
    expect(training).toBeDefined();
    if (!training)
      throw new Error("Training Funding definition was not found.");

    const entry = createDefinitionEntry(training);
    const selection = {
      definitionKey: training.definitionKey,
      disposition: "supported-default" as const,
      requirementId: "training-funding-composition",
      title: "Training Funding Approval",
      outcome: "Review local training funding.",
      materialQuestions: [],
      businessParameters: null,
    };
    const compose = () => {
      const interpretation = entry.project(selection);
      const baseDraft = createBlankApplicationDraft({
        applicationId: interpretation.spec.requirementId,
        workspaceId: "local-workspace",
        name: interpretation.blueprint.title,
      });
      const [standard] = planProductAlternatives({
        requirement: interpretation.spec,
        blueprint: interpretation.blueprint,
        baseDraft,
      });
      expect(standard?.plan.compatibility.result).toBe("compatible");
      return composeProductDraft({
        plan: standard!.plan,
        blueprint: interpretation.blueprint,
        baseDraft,
      }).diff;
    };

    const first = compose();
    const second = compose();
    expect(second).toEqual(first);
    expect(JSON.stringify(first)).toContain(
      '"apiVersion":"factory.numeric-field-domain/v1"',
    );
    expect(JSON.stringify(first)).toContain('"courseTitle"');
    expect(JSON.stringify(first)).toContain('"sessionDate"');
  });
  it("projects a validated supported Approval field variant from data without registration", () => {
    const data = candidate();
    data.definitionKey = "equipment-approval";
    data.selection.providerGuide.definitionKey = data.definitionKey;
    data.canonical.blueprint.entities[0]!.fields.push({
      key: "equipmentCode",
      label: "Equipment code",
      type: "text",
      required: true,
    });
    Object.assign(data.selection.providerGuide, {
      entities: structuredClone(data.canonical.blueprint.entities),
    });
    const parsed = parseProductDefinitionCatalogue(bytes([data]));
    const entry = createDefinitionEntry(parsed.definitions[0]!);
    const projected = entry.project({
      definitionKey: data.definitionKey,
      disposition: "supported-default",
      requirementId: "equipment-review",
      title: "Equipment Review",
      outcome: "Review equipment requests.",
      materialQuestions: [],
      businessParameters: null,
    });
    expect(projected.blueprint.entities[0]!.fields.at(-1)?.key).toBe(
      "equipmentCode",
    );
    expect(projected.blueprint.requirementChecksum).toBe(
      hashRequirementSpec(projected.spec),
    );
    expect(report([data])).toMatchObject({
      valid: 1,
      distinct: 1,
      admitted: 0,
    });
    expect(loadProductDefinitionData().definitions).toHaveLength(6);
  });
  it.each([
    '{"apiVersion":"x","apiVersion":"y"}',
    '{"nested":{"key":1,"\\u006bey":2}}',
    '{"items":[{"x":1,"x":2}]}',
    '{"x":1e999}',
    '{"x":"\\u0000"}',
    '{"x":"\\u0085"}',
    '{"x":NaN}',
    '{"x":1,}',
  ])("rejects malformed or ambiguous raw JSON %s", (raw) => {
    expect(
      validateDefinitionBatch(Buffer.from(raw)).reasonCounts[
        "definition.invalid-json"
      ],
    ).toBe(1);
  });
  it("rejects fatal UTF-8, excessive bytes and nesting with bounded diagnostics", () => {
    expect(
      validateDefinitionBatch(Buffer.from([0xff])).reasonCounts[
        "definition.invalid-json"
      ],
    ).toBe(1);
    expect(
      validateDefinitionBatch(Buffer.alloc(MAX_DEFINITION_BYTES + 1))
        .reasonCounts["definition.batch-limit"],
    ).toBe(1);
    expect(
      validateDefinitionBatch(
        Buffer.from("[".repeat(1000) + "0" + "]".repeat(1000)),
      ).reasonCounts["definition.batch-limit"],
    ).toBe(1);
    expect(
      report(Array.from({ length: 101 }, candidate)).reasonCounts[
        "definition.batch-limit"
      ],
    ).toBe(1);
  });
  it("rejects all duplicate key and semantic colliders", () => {
    const a = candidate(),
      b = candidate();
    expect(
      report([a, b]).entries.every((e) =>
        e.reasons.includes("definition.duplicate-key"),
      ),
    ).toBe(true);
    b.definitionKey = "renamed-approval";
    b.selection.providerGuide.definitionKey = b.definitionKey;
    b.canonical.blueprint.title = "Cosmetic title";
    b.selection.providerInstruction = "Reviewed business guidance.";
    b.journeys.correction[0]!.key = "renamed-case";
    expect(report([a, b])).toMatchObject({
      valid: 2,
      distinct: 0,
      admitted: 0,
    });
    expect(
      report([a, b]).entries.every((e) =>
        e.reasons.includes("definition.duplicate-semantics"),
      ),
    ).toBe(true);
  });
  it("rejects unknown keys without echoing their contents", () => {
    const data = { ...candidate(), script: "PRIVATE_SENTINEL" };
    const result = report([data]);
    expect(result.reasonCounts["definition.unknown-key"]).toBe(1);
    expect(JSON.stringify(result)).not.toContain("PRIVATE_SENTINEL");
  });
  it("rejects permission, state, binding and checksum drift", () => {
    const a = candidate();
    a.canonical.blueprint.actors[0]!.permissions[0]!.actions.push("delete");
    const b = candidate();
    b.canonical.blueprint.workflows[0]!.states.push({
      key: "escalated",
      label: "Escalated",
    });
    const c = candidate();
    c.admissionExpectations.compilerProfile = "other";
    const d = candidate();
    d.canonical.spec.outcome = "Changed checksum input.";
    for (const data of [a, b, c, d]) expect(report([data]).admitted).toBe(0);
    expect(report([a]).reasonCounts["definition.unsupported-semantics"]).toBe(
      1,
    );
    expect(report([b]).reasonCounts["definition.unsupported-semantics"]).toBe(
      1,
    );
    expect(report([c]).reasonCounts["definition.execution-drift"]).toBe(1);
    expect(report([d]).reasonCounts["definition.invalid-canonical"]).toBe(1);
  });
  it("requires meaningful correction and failure cases", () => {
    const a = candidate();
    a.journeys.correction = [];
    const b = candidate();
    b.journeys.failure = [];
    expect(report([a]).reasonCounts["definition.missing-correction"]).toBe(1);
    expect(report([b]).reasonCounts["definition.missing-failure"]).toBe(1);
  });
});
import { spawnSync } from "node:child_process";
import { semanticFingerprint } from "../src/requirements/definition-family-registry.js";

describe("Definition semantic identity and built command", () => {
  it("normalizes only structurally validated role, entity and workflow aliases", () => {
    const a = candidate(),
      b = candidate();
    b.definitionKey = "renamed-equivalent";
    b.selection.providerGuide.definitionKey = b.definitionKey;
    const old = b.canonical.blueprint,
      aliases = new Map([
        ...old.actors.map((a, i) => [a.key, `role-${i}`]),
        ...old.entities.map((e, i) => [e.key, `entity-${i}`]),
        ...old.workflows.map((w, i) => [w.key, `workflow-${i}`]),
      ]);
    const rewrite = (v: unknown): unknown =>
      typeof v === "string"
        ? (aliases.get(v) ?? v)
        : Array.isArray(v)
          ? v.map(rewrite)
          : v && typeof v === "object"
            ? Object.fromEntries(
                Object.entries(v).map(([k, x]) => [k, rewrite(x)]),
              )
            : v;
    b.canonical = rewrite(b.canonical) as typeof b.canonical;
    b.journeys = rewrite(b.journeys) as typeof b.journeys;
    b.primaryJob = rewrite(b.primaryJob) as typeof b.primaryJob;
    b.selection.providerGuide = rewrite(
      b.selection.providerGuide,
    ) as typeof b.selection.providerGuide;
    b.canonical.blueprint.requirementChecksum = hashRequirementSpec(
      b.canonical.spec,
    );
    expect(report([a, b])).toMatchObject({
      valid: 2,
      distinct: 0,
      admitted: 0,
    });
    expect(report([a, b]).reasonCounts["definition.duplicate-semantics"]).toBe(
      2,
    );
  });
  it("ignores case keys and collection order but preserves ordered fields and case steps", () => {
    const a = candidate();
    a.journeys.correction.push({
      key: "replay-correction",
      steps: [
        { ...a.journeys.correction[0]!.steps[1]!, expectation: "retry-replay" },
      ],
    });
    const b = structuredClone(a);
    b.journeys.correction.reverse();
    b.journeys.correction.forEach((c, i) => {
      c.key = `case-${i}`;
    });
    expect(semanticFingerprint(a)).toBe(semanticFingerprint(b));
    const c = structuredClone(a);
    c.canonical.blueprint.entities[0]!.fields.reverse();
    c.selection.providerGuide.entities = structuredClone(
      c.canonical.blueprint.entities,
    );
    expect(semanticFingerprint(c)).not.toBe(semanticFingerprint(a));
    const d = structuredClone(a);
    d.journeys.correction[0]!.steps.push({
      ...d.journeys.correction[0]!.steps.at(-1)!,
      expectation: "retry-replay",
    });
    expect(semanticFingerprint(d)).not.toBe(semanticFingerprint(a));
  });
  it("rejects guide authority drift and spoofed family primary jobs", () => {
    const a = candidate();
    const guide = a.selection.providerGuide as any;
    guide.actors[0].permissions[0].actions.push("delete");
    expect(report([a]).reasonCounts["definition.projection-drift"]).toBe(1);
    const b = candidate();
    b.primaryJob.actorKey = b.canonical.blueprint.actors[2]!.key;
    expect(report([b]).reasonCounts["definition.unsupported-semantics"]).toBe(
      1,
    );
  });
  it("rejects typed-field constraints that would be erased by projection", () => {
    const a = candidate();
    a.canonical.blueprint.entities[0]!.fields[0]!.options = ["one", "two"];
    expect(report([a]).admitted).toBe(0);
    const b = candidate();
    b.canonical.blueprint.entities[0]!.fields[0]!.key = "version";
    expect(report([b]).admitted).toBe(0);
  });
  it.each(["familyBinding", "parameterPolicy", "definitionVersion"])(
    "rejects unsupported binding coordinate %s",
    (key) => {
      const a = candidate();
      if (key === "familyBinding")
        a.familyBinding.version = "approval-correction/v99";
      else if (key === "parameterPolicy")
        a.parameterPolicy = "restaurant-menu/v1";
      else (a as any).definitionVersion = "9.0.0";
      expect(report([a]).entries[0]!.reasons.length).toBeGreaterThan(0);
    },
  );
  it("builds byte-identical shipped data and rejects unsafe CLI input without diagnostics", () => {
    const cli = new URL(
      "../dist/requirements/definition-batch-cli.js",
      import.meta.url,
    );
    const source = readFileSync(
      new URL(
        "../src/requirements/definitions/product-definitions.v1.json",
        import.meta.url,
      ),
    );
    expect(
      readFileSync(
        new URL(
          "../dist/requirements/definitions/product-definitions.v1.json",
          import.meta.url,
        ),
      ),
    ).toEqual(source);
    const run = (args: string[], input?: Buffer) =>
      spawnSync(
        process.execPath,
        [cli.pathname.replace(/^\/([A-Za-z]:)/, "$1"), ...args],
        { input, encoding: "utf8", timeout: 15000 },
      );
    const first = run([]),
      second = run(["--stdin"], source);
    expect(first.status).toBe(0);
    expect(second.status).toBe(0);
    const omitTime = (value: string) => {
      const data = JSON.parse(value);
      delete data.durationMs;
      return data;
    };
    expect(omitTime(first.stdout)).toEqual(omitTime(second.stdout));
    for (const input of [
      Buffer.from('{"x":1,"x":2}'),
      Buffer.from([0xff]),
      Buffer.alloc(MAX_DEFINITION_BYTES + 1),
    ]) {
      const result = run(["--stdin"], input);
      expect(result.status).toBe(1);
      expect(result.stderr).toBe("");
      expect(JSON.parse(result.stdout).admitted).toBe(0);
    }
    const argument = run(["PRIVATE_SENTINEL"]);
    expect(argument.status).toBe(2);
    expect(argument.stdout).toBe("");
    expect(argument.stderr).toBe("definition.validation-failed\n");
  });
});

it("rejects unresolved actors in structured provider guide journeys", () => {
  const data = candidate();
  (
    data.selection.providerGuide.acceptanceJourneys as Array<{
      steps: Array<{ actorKey: string }>;
    }>
  )[0]!.steps[0]!.actorKey = "unknown-actor";
  expect(report([data]).reasonCounts["definition.projection-drift"]).toBe(1);
});

it.each(['{"x":"\\ud800"}', '{"x":"\\udc00"}'])(
  "rejects an unpaired escaped Unicode surrogate %s",
  (raw) => {
    expect(
      validateDefinitionBatch(Buffer.from(raw)).reasonCounts[
        "definition.invalid-json"
      ],
    ).toBe(1);
  },
);

describe("calculation definition semantics", () => {
  function calculated() {
    const data = candidate();
    const positive = {
      apiVersion: "factory.numeric-field-domain/v1" as const,
      minimum: { value: 0, inclusive: false },
    };
    data.definitionKey = "calculated-fixture";
    data.selection.providerGuide.definitionKey = data.definitionKey;
    data.canonical.blueprint.entities[0]!.fields = [
      { key: "item", label: "Item", type: "text", required: true },
      {
        key: "quantity",
        label: "Quantity",
        type: "number",
        required: true,
        numericDomain: positive,
      },
      {
        key: "price",
        label: "Price",
        type: "currency",
        required: true,
        numericDomain: positive,
      },
      {
        key: "total",
        label: "Total",
        type: "currency",
        required: true,
        calculation: {
          apiVersion: "factory.quantity-unit-price-total/v1",
          quantityFieldKey: "quantity",
          unitPriceFieldKey: "price",
        },
      },
    ];
    data.selection.providerGuide.entities = structuredClone(
      data.canonical.blueprint.entities,
    );
    return data;
  }
  it("includes calculation semantics and normalizes equivalent field aliases", () => {
    const a = calculated(),
      b = calculated();
    b.definitionKey = "renamed-calculated";
    b.selection.providerGuide.definitionKey = b.definitionKey;
    const fields = b.canonical.blueprint.entities[0]!.fields;
    fields.forEach((field, index) => {
      field.key = `renamed${index}`;
    });
    fields[3]!.calculation!.quantityFieldKey = "renamed1";
    fields[3]!.calculation!.unitPriceFieldKey = "renamed2";
    b.selection.providerGuide.entities = structuredClone(
      b.canonical.blueprint.entities,
    );
    expect(semanticFingerprint(a)).toBe(semanticFingerprint(b));
    const manual = calculated();
    delete manual.canonical.blueprint.entities[0]!.fields[3]!.calculation;
    manual.selection.providerGuide.entities = structuredClone(
      manual.canonical.blueprint.entities,
    );
    expect(semanticFingerprint(a)).not.toBe(semanticFingerprint(manual));
  });
  it("keeps reviewed projected calculation immutable and denies guide rewriting", () => {
    const a = calculated();
    const entry = createDefinitionEntry(a);
    const projected = entry.project({
      definitionKey: a.definitionKey,
      disposition: "supported-default",
      requirementId: "calculated",
      title: "Calculated",
      outcome: "Review requests.",
      materialQuestions: [],
      businessParameters: null,
    });
    expect(projected.blueprint.entities[0]!.fields[3]!.calculation).toEqual(
      a.canonical.blueprint.entities[0]!.fields[3]!.calculation,
    );
    projected.blueprint.entities[0]!.fields[3]!.calculation!.quantityFieldKey =
      "changed";
    expect(
      entry.canonical().blueprint.entities[0]!.fields[3]!.calculation!
        .quantityFieldKey,
    ).toBe("quantity");
    expect(() =>
      entry.project({
        definitionKey: a.definitionKey,
        disposition: "supported-default",
        requirementId: "calculated",
        title: "Calculated",
        outcome: "Review requests.",
        materialQuestions: [],
        businessParameters: null,
        calculation: {},
      }),
    ).toThrow();

    const drift = calculated();
    (
      drift.selection.providerGuide.entities as any[]
    )[0].fields[3].calculation.unitPriceFieldKey = "quantity";
    expect(() => createDefinitionEntry(drift)).toThrow();
  });
});
