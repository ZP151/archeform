import { describe, expect, it } from "vitest";

import { digestJson } from "../src/composition-shared.js";
import { hashRequirementSpec } from "../src/requirement-spec.js";
import {
  assertProductBlueprint,
  hashProductBlueprint,
} from "../src/product-blueprint.js";

/** A compact, schema-valid blueprint used as the mutation base. */
function validBlueprint(): Record<string, unknown> {
  return {
    apiVersion: "factory.product-blueprint/v1",
    requirementChecksum: digestJson({
      apiVersion: "factory.requirement-spec/v1",
      requirementId: "expense-lite",
      outcome: "Employees submit expenses and managers decide them.",
      actors: [
        {
          key: "employee",
          label: "Employee",
          description: "Submits expenses.",
        },
        {
          key: "manager",
          label: "Manager",
          description: "Approves or rejects expenses.",
        },
      ],
      domainConcepts: [],
      workflows: [],
      constraints: [],
      openQuestions: [],
      acceptanceScenarios: [
        {
          key: "submit-then-decide",
          given: "an employee has an expense",
          when: "the employee submits it",
          then: "the manager decides it",
        },
      ],
    }),
    title: "Expense Approval",
    actors: [
      {
        key: "employee",
        label: "Employee",
        permissions: [
          {
            entityKey: "expense",
            actions: ["create", "submit"],
          },
        ],
      },
      {
        key: "manager",
        label: "Manager",
        permissions: [
          {
            entityKey: "expense",
            actions: ["read", "approve", "reject"],
          },
        ],
      },
    ],
    entities: [
      {
        key: "expense",
        label: "Expense",
        fields: [
          { key: "amount", label: "Amount", type: "currency", required: true },
          {
            key: "category",
            label: "Category",
            type: "enum",
            required: true,
            options: ["travel", "meals", "software"],
          },
          { key: "receipt", label: "Receipt", type: "file", required: false },
        ],
      },
    ],
    pageIntents: [
      {
        key: "expense-list",
        label: "Expense list",
        intent: "list",
        entityKey: "expense",
      },
      {
        key: "expense-form",
        label: "Expense form",
        intent: "form",
        entityKey: "expense",
      },
    ],
    workflows: [
      {
        key: "expense-approval",
        label: "Expense approval",
        entityKey: "expense",
        states: [
          { key: "draft", label: "Draft" },
          { key: "submitted", label: "Submitted" },
          { key: "approved", label: "Approved" },
          { key: "rejected", label: "Rejected" },
        ],
        transitions: [
          {
            key: "submit",
            from: "draft",
            to: "submitted",
            label: "Submit",
            actorKey: "employee",
          },
          {
            key: "approve",
            from: "submitted",
            to: "approved",
            label: "Approve",
            actorKey: "manager",
          },
        ],
      },
    ],
    acceptanceJourneys: [
      {
        key: "submit-and-approve",
        description: "An employee submits and a manager approves.",
        steps: [
          { actorKey: "employee", action: "submits an expense" },
          { actorKey: "manager", action: "approves it" },
        ],
      },
    ],
  };
}

describe("productBlueprintSchema", () => {
  it.each([
    {
      name: "optional string",
      fields: [
        { key: "id", label: "Identifier", type: "text", required: false },
      ],
    },
    {
      name: "required non-string",
      fields: [
        { key: "id", label: "Identifier", type: "number", required: true },
      ],
    },
    {
      name: "duplicate declarations",
      fields: [
        { key: "id", label: "Identifier", type: "text", required: true },
        {
          key: "id",
          label: "Second identifier",
          type: "number",
          required: false,
        },
      ],
    },
  ])(
    "rejects $name entity-declared Factory identity with one fixed safe error",
    ({ fields }) => {
      const blueprint = validBlueprint();
      (blueprint.entities as Record<string, unknown>[])[0].fields = fields;

      expect(() => assertProductBlueprint(blueprint)).toThrow(
        "Entity fields cannot declare Factory-owned record identity 'id'.",
      );
    },
  );

  it("accepts a schema-valid blueprint and computes a stable hash", () => {
    const blueprint = assertProductBlueprint(validBlueprint());
    expect(blueprint.title).toBe("Expense Approval");
    expect(blueprint.actors).toHaveLength(2);
    expect(hashProductBlueprint(blueprint)).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(hashProductBlueprint(blueprint)).toBe(
      hashProductBlueprint(assertProductBlueprint(validBlueprint())),
    );
  });

  it("rejects unknown keys everywhere (strict), including route/URL/package material", () => {
    const withRoutes = validBlueprint();
    withRoutes.routes = ["/expenses"];
    expect(() => assertProductBlueprint(withRoutes)).toThrow(
      /Unrecognized key/,
    );

    const withPackageSelection = validBlueprint();
    (withPackageSelection.entities as Record<string, unknown>[])[0].packageKey =
      "core.approvals@1.0.0";
    expect(() => assertProductBlueprint(withPackageSelection)).toThrow(
      /Unrecognized key/,
    );

    const withUrlField = validBlueprint();
    (withUrlField.entities as Record<string, unknown>[])[0].sourceUrl =
      "https://example.com";
    expect(() => assertProductBlueprint(withUrlField)).toThrow(
      /Unrecognized key/,
    );

    const withProviderMaterial = validBlueprint();
    (withProviderMaterial.actors as Record<string, unknown>[])[0].provider =
      "openai";
    expect(() => assertProductBlueprint(withProviderMaterial)).toThrow(
      /Unrecognized key/,
    );
  });

  it("rejects unsafe business text on every text surface", () => {
    for (const path of ["title", "actors.0.label"]) {
      const blueprint = validBlueprint();
      const segments = path.split(".");
      let target: Record<string, unknown> = blueprint;
      for (const segment of segments.slice(0, -1)) {
        target = target[segment] as Record<string, unknown>;
      }
      target[segments.at(-1) as string] = "See https://example.com";
      expect(() => assertProductBlueprint(blueprint)).toThrow(/Business text/);
    }

    const unsafeOption = validBlueprint();
    const expense = (unsafeOption.entities as Record<string, unknown>[])[0];
    (expense.fields as Record<string, unknown>[])[1].options = [
      "travel",
      "C:\\local",
    ];
    expect(() => assertProductBlueprint(unsafeOption)).toThrow(/Business text/);
  });

  it("rejects duplicate semantic keys", () => {
    const duplicateActors = validBlueprint();
    (duplicateActors.actors as Record<string, unknown>[]).push({
      key: "employee",
      label: "Duplicate",
      permissions: [{ entityKey: "expense", actions: ["read"] }],
    });
    expect(() => assertProductBlueprint(duplicateActors)).toThrow(/duplicated/);

    const duplicateFields = validBlueprint();
    (duplicateFields.entities as Record<string, unknown>[])[0].fields = [
      { key: "amount", label: "Amount", type: "currency", required: true },
      { key: "amount", label: "Amount again", type: "number", required: false },
    ];
    expect(() => assertProductBlueprint(duplicateFields)).toThrow(/duplicated/);

    const duplicatePages = validBlueprint();
    (duplicatePages.pageIntents as Record<string, unknown>[]).push({
      key: "expense-list",
      label: "Duplicate list",
      intent: "list",
      entityKey: "expense",
    });
    expect(() => assertProductBlueprint(duplicatePages)).toThrow(/duplicated/);

    const duplicateTransitions = validBlueprint();
    const workflow = (
      duplicateTransitions.workflows as Record<string, unknown>[]
    )[0];
    (workflow.transitions as Record<string, unknown>[]).push({
      key: "submit",
      from: "submitted",
      to: "approved",
      label: "Submit again",
      actorKey: "manager",
    });
    expect(() => assertProductBlueprint(duplicateTransitions)).toThrow(
      /duplicated/,
    );
  });

  it("rejects missing references (actor entity, field reference, page entity, workflow entity, transition states, journey actor)", () => {
    const unknownPermissionEntity = validBlueprint();
    (
      unknownPermissionEntity.actors as Record<string, unknown>[]
    )[0].permissions = [{ entityKey: "missing-entity", actions: ["create"] }];
    expect(() => assertProductBlueprint(unknownPermissionEntity)).toThrow(
      /unknown entity/,
    );

    const unknownReference = validBlueprint();
    const fields = (
      (unknownReference.entities as Record<string, unknown>[])[0]
        .fields as Record<string, unknown>[]
    ).concat([
      {
        key: "paidBy",
        label: "Paid by",
        type: "reference",
        required: true,
        referenceTo: "employee",
      },
    ]);
    (unknownReference.entities as Record<string, unknown>[])[0].fields = fields;
    expect(() => assertProductBlueprint(unknownReference)).toThrow(
      /unknown entity/,
    );

    const unknownPageEntity = validBlueprint();
    (unknownPageEntity.pageIntents as Record<string, unknown>[]).push({
      key: "ghost-page",
      label: "Ghost page",
      intent: "detail",
      entityKey: "ghost",
    });
    expect(() => assertProductBlueprint(unknownPageEntity)).toThrow(
      /unknown entity/,
    );

    const unknownWorkflowEntity = validBlueprint();
    (
      unknownWorkflowEntity.workflows as Record<string, unknown>[]
    )[0].entityKey = "ghost";
    expect(() => assertProductBlueprint(unknownWorkflowEntity)).toThrow(
      /unknown entity/,
    );

    const unknownTransitionState = validBlueprint();
    const workflow = (
      unknownTransitionState.workflows as Record<string, unknown>[]
    )[0];
    (workflow.transitions as Record<string, unknown>[])[0].from = "ghost-state";
    expect(() => assertProductBlueprint(unknownTransitionState)).toThrow(
      /unknown state/,
    );

    const unknownJourneyActor = validBlueprint();
    (
      (unknownJourneyActor.acceptanceJourneys as Record<string, unknown>[])[0]
        .steps as Record<string, unknown>[]
    )[0].actorKey = "ghost";
    expect(() => assertProductBlueprint(unknownJourneyActor)).toThrow(
      /unknown actor/,
    );
  });

  it("rejects a transition its actor is not granted (the composed runtime could never serve it)", () => {
    const ungranted = validBlueprint();
    const workflow = (ungranted.workflows as Record<string, unknown>[])[0];
    const approve = (workflow.transitions as Record<string, unknown>[]).find(
      (transition) => transition.key === "approve",
    );
    expect(approve).toBeDefined();
    // The employee actor holds create/read/submit only; driving "approve"
    // with the employee role would 403 at runtime.
    approve!.actorKey = "employee";
    expect(() => assertProductBlueprint(ungranted)).toThrow(/not granted/);

    // The inverse direction stays open: a granted action with no declared
    // transition is a conservative grant, not an undrivable flow.
    const extraGrant = validBlueprint();
    expect(() => assertProductBlueprint(extraGrant)).not.toThrow();
  });

  it("rejects a transition whose event is outside the bounded action vocabulary (the runtime could never grant it)", () => {
    const inventedVerb = validBlueprint();
    const workflow = (inventedVerb.workflows as Record<string, unknown>[])[0];
    workflow.transitions = (
      workflow.transitions as Record<string, unknown>[]
    ).map((transition) =>
      transition.key === "approve"
        ? { ...transition, key: "audit-from-approved" }
        : transition,
    );
    expect(() => assertProductBlueprint(inventedVerb)).toThrow(
      /Invalid enum value/,
    );
  });

  it("rejects invalid state/transition sets (unreachable or undefined)", () => {
    const singleState = validBlueprint();
    (singleState.workflows as Record<string, unknown>[])[0].states = [
      { key: "draft", label: "Draft" },
    ];
    expect(() => assertProductBlueprint(singleState)).toThrow(/at least 2/);

    const transitionToNowhere = validBlueprint();
    (
      (transitionToNowhere.workflows as Record<string, unknown>[])[0]
        .transitions as Record<string, unknown>[]
    )[0].to = "ghost";
    expect(() => assertProductBlueprint(transitionToNowhere)).toThrow(
      /unknown state/,
    );
  });

  it("rejects field type/enum/reference misuse", () => {
    const enumWithoutOptions = validBlueprint();
    const fields = (
      (enumWithoutOptions.entities as Record<string, unknown>[])[0]
        .fields as Record<string, unknown>[]
    ).slice(1, 2);
    fields[0].options = undefined;
    expect(() => assertProductBlueprint(enumWithoutOptions)).toThrow(/options/);

    const referenceWithoutTarget = validBlueprint();
    const refFields = (
      (referenceWithoutTarget.entities as Record<string, unknown>[])[0]
        .fields as Record<string, unknown>[]
    ).concat([
      { key: "paidBy", label: "Paid by", type: "reference", required: false },
    ]);
    (referenceWithoutTarget.entities as Record<string, unknown>[])[0].fields =
      refFields;
    expect(() => assertProductBlueprint(referenceWithoutTarget)).toThrow(
      /referenceTo/,
    );

    const nonEnumWithOptions = validBlueprint();
    const currencyField = (
      (nonEnumWithOptions.entities as Record<string, unknown>[])[0]
        .fields as Record<string, unknown>[]
    )[0];
    currencyField.options = ["x", "y"];
    expect(() => assertProductBlueprint(nonEnumWithOptions)).toThrow(/enum/);

    const nonReferenceWithTarget = validBlueprint();
    const textField = (
      (nonReferenceWithTarget.entities as Record<string, unknown>[])[0]
        .fields as Record<string, unknown>[]
    )[2];
    textField.referenceTo = "expense";
    expect(() => assertProductBlueprint(nonReferenceWithTarget)).toThrow(
      /reference/,
    );
  });

  it("rejects an invalid requirement checksum and a wrong apiVersion", () => {
    const badChecksum = validBlueprint();
    badChecksum.requirementChecksum = "sha256:not-hex";
    expect(() => assertProductBlueprint(badChecksum)).toThrow(/invalid/);

    const badVersion = validBlueprint();
    badVersion.apiVersion = "factory.product-blueprint/v2";
    expect(() => assertProductBlueprint(badVersion)).toThrow(/invalid/);
  });

  it("rejects keys that cannot become graph-symbol segments (camelCase)", () => {
    // Blueprint keys become plan graph symbols verbatim (`graph.flow.<workflow>`,
    // `graph.domain.<entity>`, `graph.policy.<actor>`, `graph.page.<intent>`)
    // whose grammar is lowercase-kebab only; a camelCase key could never
    // produce a plan the seam accepts, so it must fail here at the blueprint
    // boundary instead of dead-ending the planning request later.
    const camelWorkflow = validBlueprint();
    (camelWorkflow.workflows as Record<string, unknown>[])[0].key =
      "expenseApproval";
    expect(() => assertProductBlueprint(camelWorkflow)).toThrow(/invalid/);

    const camelEntity = validBlueprint();
    (camelEntity.entities as Record<string, unknown>[])[0].key =
      "expenseRecord";
    expect(() => assertProductBlueprint(camelEntity)).toThrow(/invalid/);

    const camelActor = validBlueprint();
    (camelActor.actors as Record<string, unknown>[])[0].key = "financeManager";
    expect(() => assertProductBlueprint(camelActor)).toThrow(/invalid/);

    const camelIntent = validBlueprint();
    (camelIntent.pageIntents as Record<string, unknown>[])[0].key =
      "expenseList";
    expect(() => assertProductBlueprint(camelIntent)).toThrow(/invalid/);
  });

  it("rejects field keys the graph field grammar could never accept (hyphenated)", () => {
    // Entity field keys become graph `domain.entities[].fields[].key` verbatim,
    // whose grammar is lowercase-first camelCase with underscores — hyphens are
    // forbidden. A hyphenated field key (the apply seam's raw-ZodError class of
    // failure) must die here at the blueprint boundary.
    const hyphenField = validBlueprint();
    const hyphenFields = (hyphenField.entities as Record<string, unknown>[])[0]
      .fields as Record<string, unknown>[];
    hyphenFields[0].key = "submitted-by";
    expect(() => assertProductBlueprint(hyphenField)).toThrow(/invalid/);

    const hyphenIndexedField = validBlueprint();
    const hyphenIndexedFields = (
      hyphenIndexedField.entities as Record<string, unknown>[]
    )[0].fields as Record<string, unknown>[];
    hyphenIndexedFields[1].key = "audited-by";
    expect(() => assertProductBlueprint(hyphenIndexedField)).toThrow(/invalid/);

    // The other direction stays legal: camelCase/underscore field keys pass.
    const camelField = validBlueprint();
    const camelFields = (camelField.entities as Record<string, unknown>[])[0]
      .fields as Record<string, unknown>[];
    camelFields[0].key = "submittedBy";
    expect(() => assertProductBlueprint(camelField)).not.toThrow();
  });

  it("rejects workflow state keys the graph flow grammar could never accept (camelCase)", () => {
    // Workflow state keys become graph `flow.flows[].states[].key` verbatim,
    // which are lowercase-kebab like the other graph symbols; a camelCase state
    // key could never compose into a graph the apply seam accepts.
    const camelState = validBlueprint();
    const camelStates = (camelState.workflows as Record<string, unknown>[])[0]
      .states as Record<string, unknown>[];
    camelStates[1].key = "inReview";
    expect(() => assertProductBlueprint(camelState)).toThrow(/invalid/);

    // The other direction stays legal: kebab state keys pass. (The `rejected`
    // state is unreferenced by any transition, so renaming it cannot trip the
    // semantic cross-reference checks.)
    const kebabState = validBlueprint();
    const kebabStates = (kebabState.workflows as Record<string, unknown>[])[0]
      .states as Record<string, unknown>[];
    kebabStates[3].key = "in-review";
    expect(() => assertProductBlueprint(kebabState)).not.toThrow();
  });

  it("rejects identifier-shaped material (dotted capability keys, paths)", () => {
    const dottedKey = validBlueprint();
    (dottedKey.actors as Record<string, unknown>[])[0].key = "core.approvals";
    expect(() => assertProductBlueprint(dottedKey)).toThrow(/invalid/);

    const slashKey = validBlueprint();
    (slashKey.entities as Record<string, unknown>[])[0].key = "expense/notes";
    expect(() => assertProductBlueprint(slashKey)).toThrow(/invalid/);
  });

  it("proves the blueprint binds the exact requirement checksum", () => {
    const blueprint = assertProductBlueprint(validBlueprint());
    const spec = {
      apiVersion: "factory.requirement-spec/v1",
      requirementId: "expense-lite",
      outcome: "Employees submit expenses and managers decide them.",
      actors: [
        {
          key: "employee",
          label: "Employee",
          description: "Submits expenses.",
        },
        {
          key: "manager",
          label: "Manager",
          description: "Approves or rejects expenses.",
        },
      ],
      domainConcepts: [],
      workflows: [],
      constraints: [],
      openQuestions: [],
      acceptanceScenarios: [
        {
          key: "submit-then-decide",
          given: "an employee has an expense",
          when: "the employee submits it",
          then: "the manager decides it",
        },
      ],
    };
    expect(blueprint.requirementChecksum).toBe(hashRequirementSpec(spec));
  });
});
