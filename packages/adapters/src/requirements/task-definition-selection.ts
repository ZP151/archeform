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

const categories = [
  "authorization",
  "visibility",
  "role",
  "business-rule",
  "data",
  "integration",
] as const;
const selectionSchema = z
  .object({
    definitionKey: z.literal("team-task-tracking"),
    disposition: z.enum(["supported-default", "needs-clarification"]),
    requirementId: graphKeySchema,
    title: safeBusinessTextSchema
      .min(2)
      .max(80)
      .refine(
        (value) =>
          value.trim() === value && !/[\u0000-\u001f\u007f]/.test(value),
        "Task display names must be trimmed and exclude control characters.",
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
    businessParameters: z.null(),
  })
  .strict()
  .superRefine((selection, context) => {
    if (
      (selection.disposition === "supported-default") !==
      (selection.materialQuestions.length === 0)
    )
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "The selection disposition must match its material questions.",
      });
  });

/** Private first-party definition: shared Task semantics, independent of approvals. */
export function canonicalTeamTaskInterpretation(): RequirementInterpretationV1 {
  const actors = [
    {
      key: "member",
      label: "Team member",
      description: "Creates, starts, completes and reopens shared tasks.",
    },
    { key: "viewer", label: "Viewer", description: "Reads all shared tasks." },
  ];
  const spec = {
    apiVersion: "factory.requirement-spec/v1" as const,
    requirementId: "team-task-tracking-requirement",
    outcome:
      "A team member creates, starts, completes and reopens shared tasks; a viewer reads the board.",
    actors,
    domainConcepts: [
      {
        key: "task",
        label: "Task",
        description:
          "Shared work with a display-only assignee, due date and priority.",
      },
    ],
    workflows: [
      {
        key: "task-lifecycle",
        label: "Task lifecycle",
        description: "Start new work, complete it and reopen completed work.",
      },
    ],
    constraints: [],
    openQuestions: [],
    acceptanceScenarios: [
      {
        key: "member-completes-task",
        given: "a team member has new work",
        when: "the member creates, starts and completes a task",
        then: "the task is completed and persists through reload",
      },
      {
        key: "member-reopens-task",
        given: "a completed task",
        when: "the member reopens and completes it again",
        then: "the same task returns to completed",
      },
      {
        key: "viewer-reads",
        given: "shared tasks",
        when: "a viewer reads the board",
        then: "all tasks are visible and every mutation is denied",
      },
    ],
  };
  const blueprint: ProductBlueprintV1 = {
    apiVersion: "factory.product-blueprint/v1",
    requirementChecksum: hashRequirementSpec(spec),
    title: "Team Task Tracking",
    actors: [
      {
        key: "member",
        label: "Team member",
        permissions: [
          {
            entityKey: "task",
            actions: ["create", "read", "start", "complete", "reopen"],
          },
        ],
      },
      {
        key: "viewer",
        label: "Viewer",
        permissions: [{ entityKey: "task", actions: ["read"] }],
      },
    ],
    entities: [
      {
        key: "task",
        label: "Task",
        description: "A shared team task.",
        fields: [
          { key: "title", label: "Title", type: "text", required: true },
          {
            key: "description",
            label: "Description",
            type: "long-text",
            required: false,
          },
          { key: "assignee", label: "Assignee", type: "text", required: true },
          { key: "dueDate", label: "Due date", type: "date", required: true },
          {
            key: "priority",
            label: "Priority",
            type: "enum",
            required: true,
            options: ["low", "medium", "high"],
          },
        ],
      },
    ],
    pageIntents: [
      {
        key: "task-overview",
        label: "Task overview",
        intent: "dashboard",
        entityKey: "task",
      },
      {
        key: "task-list",
        label: "All tasks",
        intent: "list",
        entityKey: "task",
      },
      {
        key: "task-form",
        label: "New task",
        intent: "form",
        entityKey: "task",
      },
      {
        key: "task-detail",
        label: "Task details",
        intent: "detail",
        entityKey: "task",
      },
      {
        key: "task-queue",
        label: "Task workflow",
        intent: "queue",
        entityKey: "task",
      },
    ],
    workflows: [
      {
        key: "task-lifecycle",
        label: "Task lifecycle",
        entityKey: "task",
        states: [
          { key: "not-started", label: "Not started" },
          { key: "in-progress", label: "In progress" },
          { key: "completed", label: "Completed" },
        ],
        transitions: [
          {
            key: "start",
            label: "Start",
            from: "not-started",
            to: "in-progress",
            actorKey: "member",
          },
          {
            key: "complete",
            label: "Complete",
            from: "in-progress",
            to: "completed",
            actorKey: "member",
          },
          {
            key: "reopen",
            label: "Reopen",
            from: "completed",
            to: "in-progress",
            actorKey: "member",
          },
        ],
      },
    ],
    acceptanceJourneys: [
      {
        key: "create-start-complete",
        description: "A member finishes new work.",
        steps: [
          { actorKey: "member", action: "creates a task" },
          { actorKey: "member", action: "starts the task" },
          { actorKey: "member", action: "completes the task" },
        ],
      },
      {
        key: "reopen-complete",
        description: "A member resumes completed work.",
        steps: [
          { actorKey: "member", action: "reopens the completed task" },
          { actorKey: "member", action: "completes the task again" },
        ],
      },
      {
        key: "viewer-reads",
        description: "A viewer reads the shared board.",
        steps: [
          {
            actorKey: "viewer",
            action:
              "reads all tasks and cannot create, start, complete or reopen",
          },
        ],
      },
    ],
  };
  return assertRequirementInterpretation({
    spec,
    blueprint,
    clarifications: [],
  });
}

function project(input: unknown): RequirementInterpretationV1 {
  const selection = selectionSchema.parse(input);
  const baseline = canonicalTeamTaskInterpretation();
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
        definitionKey: { type: "string", const: "team-task-tracking" },
        disposition: { type: "string", const: disposition },
        requirementId: {
          type: "string",
          minLength: 1,
          maxLength: 128,
          pattern: "^[a-z][a-z0-9-]*$",
        },
        title: { type: "string", minLength: 2, maxLength: 80 },
        outcome: { type: "string", minLength: 1, maxLength: 2000 },
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
              category: { type: "string", enum: [...categories] },
              question: { type: "string", minLength: 1, maxLength: 500 },
            },
          },
        },
      },
    }),
  ),
};
const guide = {
  definitionKey: "team-task-tracking",
  ...canonicalTeamTaskInterpretation().blueprint,
  identity:
    "Local shared board with selectable demo roles. Assignee is display text only; both roles read every task. No real accounts or tenant isolation.",
};
export const teamTaskDefinition = {
  definitionKey: "team-task-tracking",
  family: "task" as const,
  parameterPolicy: "none" as const,
  selectionSchema,
  jsonSchema,
  canonical: canonicalTeamTaskInterpretation,
  structure: canonicalTeamTaskInterpretation(),
  project,
  guide,
  instruction: [
    "Every Team Task or shared task tracking brief returns definition-selection with definitionKey team-task-tracking, generatedInterpretation null and businessParameters null. Never generate its fields, roles, pages or workflow in the selection.",
    "A coarse shared team task request accepts the exact canonical default with zero materialQuestions. Team member creates, reads, starts, completes and reopens; Viewer reads every task. Fields are required title, required display-only assignee, required dueDate, required priority (low, medium, high) and optional description. States are not-started, in-progress, completed; start moves not-started to in-progress, complete moves in-progress to completed, reopen moves completed to in-progress.",
    "Any explicit incompatible or ambiguous requirement returns needs-clarification with every independent material question. Assignment is text, never a principal reference: assignee-only or owner-only actions, personal/private tasks, accounts, invitations, team membership, SSO and tenant boundaries require authorization or visibility clarification. Both demo roles see all records; omitted identity is not an identity claim.",
    "Edits after creation, custom or optional fields or states, delete or archive, subtasks, dependencies, recurring tasks, comments, attachments, reminders, notifications, calendars, integrations, estimates, time tracking, bulk actions and automation require business-rule, data or integration clarification. Do not silently discard those requirements. No audit or notification delivery claim is made.",
    "Follow-ups retain every still-required unsupported capability. Only explicit acceptance of the exact supported scope resolves a material question. Display title, requirementId and outcome customize safe identity text only. Use only authorization, visibility, role, business-rule, data or integration question categories; no technical handoff or credential question.",
    `<supported-team-task-default>${JSON.stringify(guide)}</supported-team-task-default>`,
  ].join(" "),
};
