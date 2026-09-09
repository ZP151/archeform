import { z } from "zod";
import {
  graphKeySchema,
  hashRequirementSpec,
  safeBusinessTextSchema,
  type ProductBlueprintV1,
} from "@factory/graph";
import {
  assertRequirementInterpretation,
  deriveClarifications,
  type RequirementInterpretationV1,
} from "./requirement-interpreter.js";

type ApprovalDefinitionDescriptor<K extends string> = {
  readonly definitionKey: K;
  readonly fields: ProductBlueprintV1["entities"][number]["fields"];
  readonly identity: string;
  readonly integrations: string;
  readonly instruction: string;
  readonly guideTag: string;
  readonly copy: {
    readonly requirementId: string;
    readonly outcome: string;
    readonly requesterKey: string;
    readonly requesterLabel: string;
    readonly requesterDescription: string;
    readonly reviewerKey: string;
    readonly reviewerLabel: string;
    readonly reviewerDescription: string;
    readonly auditorKey: string;
    readonly auditorLabel: string;
    readonly auditorDescription: string;
    readonly entityKey: string;
    readonly entityLabel: string;
    readonly entityDescription: string;
    readonly decisionDescription: string;
    readonly workflowLabel: string;
    readonly submitScenarioKey: string;
    readonly submitGiven: string;
    readonly submitWhen: string;
    readonly submitThen: string;
    readonly approveScenarioKey: string;
    readonly decisionGiven: string;
    readonly approveWhen: string;
    readonly approveThen: string;
    readonly rejectScenarioKey: string;
    readonly rejectWhen: string;
    readonly rejectThen: string;
    readonly auditScenarioKey: string;
    readonly auditGiven: string;
    readonly auditWhen: string;
    readonly auditThen: string;
    readonly title: string;
    readonly requesterEntityDescription: string;
    readonly dashboardLabel: string;
    readonly listLabel: string;
    readonly formLabel: string;
    readonly detailLabel: string;
    readonly settingsLabel: string;
    readonly submitJourneyKey: string;
    readonly submitJourneyDescription: string;
    readonly submitAction: string;
    readonly decisionJourneyKey: string;
    readonly decisionJourneyDescription: string;
    readonly decisionAction: string;
    readonly auditJourneyKey: string;
    readonly auditJourneyDescription: string;
    readonly reviewAction: string;
    readonly auditAction: string;
  };
};

/** Fixed one-stage approval structure, parameterized only by reviewed business data. */
export function createApprovalDefinition<const K extends string>(
  descriptor: ApprovalDefinitionDescriptor<K>,
) {
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

  /** Private provider selection; never a public Graph or package-root contract. */
  const selectionSchema = z
    .object({
      definitionKey: z.literal(descriptor.definitionKey),
      disposition: z.enum(["supported-default", "needs-clarification"]),
      requirementId: graphKeySchema,
      title: safeBusinessTextSchema
        .min(2)
        .max(80)
        .refine(
          (value) =>
            value.trim() === value && !/[\u0000-\u001f\u007f]/.test(value),
          "Approval display names must be trimmed and exclude control characters.",
        ),
      outcome: safeBusinessTextSchema.max(2000),
      materialQuestions: z.array(materialQuestionSchema).max(30),
      businessParameters: z.null(),
    })
    .strict()
    .superRefine((selection, context) => {
      if (
        (selection.disposition === "supported-default") !==
        (selection.materialQuestions.length === 0)
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "The selection disposition must match its material questions.",
        });
      }
    });

  function canonical(): RequirementInterpretationV1 {
    const spec = {
      apiVersion: "factory.requirement-spec/v1" as const,
      requirementId: descriptor.copy.requirementId,
      outcome: descriptor.copy.outcome,
      actors: [
        {
          key: descriptor.copy.requesterKey,
          label: descriptor.copy.requesterLabel,
          description: descriptor.copy.requesterDescription,
        },
        {
          key: descriptor.copy.reviewerKey,
          label: descriptor.copy.reviewerLabel,
          description: descriptor.copy.reviewerDescription,
        },
        {
          key: descriptor.copy.auditorKey,
          label: descriptor.copy.auditorLabel,
          description: descriptor.copy.auditorDescription,
        },
      ],
      domainConcepts: [
        {
          key: descriptor.copy.entityKey,
          label: descriptor.copy.entityLabel,
          description: descriptor.copy.entityDescription,
        },
        {
          key: "approval",
          label: "Approval",
          description: descriptor.copy.decisionDescription,
        },
        {
          key: "audit-trail",
          label: "Audit trail",
          description: "The record of every decision.",
        },
      ],
      workflows: [
        {
          key: descriptor.definitionKey,
          label: descriptor.copy.workflowLabel,
          description: "From submission to decision.",
        },
      ],
      constraints: [],
      openQuestions: [],
      acceptanceScenarios: [
        {
          key: descriptor.copy.submitScenarioKey,
          given: descriptor.copy.submitGiven,
          when: descriptor.copy.submitWhen,
          then: descriptor.copy.submitThen,
        },
        {
          key: descriptor.copy.approveScenarioKey,
          given: descriptor.copy.decisionGiven,
          when: descriptor.copy.approveWhen,
          then: descriptor.copy.approveThen,
        },
        {
          key: descriptor.copy.rejectScenarioKey,
          given: descriptor.copy.decisionGiven,
          when: descriptor.copy.rejectWhen,
          then: descriptor.copy.rejectThen,
        },
        {
          key: descriptor.copy.auditScenarioKey,
          given: descriptor.copy.auditGiven,
          when: descriptor.copy.auditWhen,
          then: descriptor.copy.auditThen,
        },
      ],
    };

    const blueprint: ProductBlueprintV1 = {
      apiVersion: "factory.product-blueprint/v1" as const,
      requirementChecksum: "",
      title: descriptor.copy.title,
      actors: [
        {
          key: descriptor.copy.requesterKey,
          label: descriptor.copy.requesterLabel,
          permissions: [
            {
              entityKey: descriptor.copy.entityKey,
              actions: ["create", "read", "submit"],
            },
            {
              entityKey: descriptor.copy.requesterKey,
              actions: ["read", "update"],
            },
          ],
        },
        {
          key: descriptor.copy.reviewerKey,
          label: descriptor.copy.reviewerLabel,
          permissions: [
            {
              entityKey: descriptor.copy.entityKey,
              actions: ["read", "approve", "reject"],
            },
          ],
        },
        {
          key: descriptor.copy.auditorKey,
          label: descriptor.copy.auditorLabel,
          permissions: [
            {
              entityKey: descriptor.copy.entityKey,
              actions: ["read", "audit"],
            },
          ],
        },
      ],
      entities: [
        {
          key: descriptor.copy.entityKey,
          label: descriptor.copy.entityLabel,
          description: descriptor.copy.entityDescription,
          fields: structuredClone(descriptor.fields),
        },
        {
          key: descriptor.copy.requesterKey,
          label: descriptor.copy.requesterLabel,
          description: descriptor.copy.requesterEntityDescription,
          fields: [
            { key: "name", label: "Name", type: "text", required: true },
            {
              key: "department",
              label: "Department",
              type: "text",
              required: false,
            },
          ],
        },
      ],
      pageIntents: [
        {
          key: `${descriptor.copy.entityKey}-dashboard`,
          label: descriptor.copy.dashboardLabel,
          intent: "dashboard",
          entityKey: descriptor.copy.entityKey,
        },
        {
          key: `${descriptor.copy.entityKey}-list`,
          label: descriptor.copy.listLabel,
          intent: "list",
          entityKey: descriptor.copy.entityKey,
        },
        {
          key: `${descriptor.copy.entityKey}-form`,
          label: descriptor.copy.formLabel,
          intent: "form",
          entityKey: descriptor.copy.entityKey,
        },
        {
          key: `${descriptor.copy.entityKey}-detail`,
          label: descriptor.copy.detailLabel,
          intent: "detail",
          entityKey: descriptor.copy.entityKey,
        },
        {
          key: `${descriptor.copy.entityKey}-queue`,
          label: "Approval queue",
          intent: "queue",
          entityKey: descriptor.copy.entityKey,
        },
        {
          key: `${descriptor.copy.entityKey}-settings`,
          label: descriptor.copy.settingsLabel,
          intent: "settings",
        },
      ],
      workflows: [
        {
          key: descriptor.definitionKey,
          label: descriptor.copy.workflowLabel,
          entityKey: descriptor.copy.entityKey,
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
              actorKey: descriptor.copy.requesterKey,
            },
            {
              key: "approve",
              from: "submitted",
              to: "approved",
              label: "Approve",
              actorKey: descriptor.copy.reviewerKey,
            },
            {
              key: "reject",
              from: "submitted",
              to: "rejected",
              label: "Reject",
              actorKey: descriptor.copy.reviewerKey,
            },
          ],
        },
      ],
      acceptanceJourneys: [
        {
          key: descriptor.copy.submitJourneyKey,
          description: descriptor.copy.submitJourneyDescription,
          steps: [
            {
              actorKey: descriptor.copy.requesterKey,
              action: descriptor.copy.submitAction,
            },
          ],
        },
        {
          key: descriptor.copy.decisionJourneyKey,
          description: descriptor.copy.decisionJourneyDescription,
          steps: [
            {
              actorKey: descriptor.copy.requesterKey,
              action: descriptor.copy.submitAction,
            },
            {
              actorKey: descriptor.copy.reviewerKey,
              action: descriptor.copy.decisionAction,
            },
          ],
        },
        {
          key: descriptor.copy.auditJourneyKey,
          description: descriptor.copy.auditJourneyDescription,
          steps: [
            {
              actorKey: descriptor.copy.requesterKey,
              action: descriptor.copy.submitAction,
            },
            {
              actorKey: descriptor.copy.reviewerKey,
              action: descriptor.copy.reviewAction,
            },
            {
              actorKey: descriptor.copy.auditorKey,
              action: descriptor.copy.auditAction,
            },
          ],
        },
      ],
    };
    blueprint.requirementChecksum = hashRequirementSpec(spec);
    return { spec, blueprint, clarifications: [] };
  }

  function project(input: unknown): RequirementInterpretationV1 {
    const selection = selectionSchema.parse(input);
    const baseline = canonical();
    const spec = {
      ...baseline.spec,
      requirementId: selection.requirementId,
      outcome: selection.outcome,
      openQuestions: selection.materialQuestions.map((question) => ({
        ...question,
      })),
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
          definitionKey: { type: "string", const: descriptor.definitionKey },
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

  function guide() {
    const { actors, entities, pageIntents, workflows, acceptanceJourneys } =
      canonical().blueprint;
    return {
      definitionKey: descriptor.definitionKey,
      actors,
      entities,
      pageIntents,
      workflows,
      acceptanceJourneys,
      identity: descriptor.identity,
      integrations: descriptor.integrations,
    };
  }

  return {
    definitionKey: descriptor.definitionKey,
    family: "approval" as const,
    parameterPolicy: "none" as const,
    selectionSchema,
    jsonSchema,
    canonical,
    project,
    structure: canonical(),
    guide: guide(),
    instruction:
      descriptor.instruction +
      ` <${descriptor.guideTag}>${JSON.stringify(guide())}</${descriptor.guideTag}>`,
  };
}
