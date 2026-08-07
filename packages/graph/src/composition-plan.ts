import { z } from "zod";

import {
  canonicalEquals,
  capabilityKeySchema,
  CompositionError,
  compositionSurfaceSchema,
  digestJson,
  identifierSchema,
  parseStrict,
  safeBusinessTextSchema,
  semanticVersionSchema,
  sha256DigestSchema,
} from "./composition-shared.js";
import {
  createGraphSymbolIndex,
  hashApplicationGraph,
  type ApplicationGraphV1,
  type GraphSymbolIndexV1,
} from "./model.js";
import { applyGraphDiffToDraft, type DraftRevisionV1 } from "./index.js";
import {
  assertRequirementSpec,
  hashRequirementSpec,
  type RequirementSpecV1,
} from "./requirement-spec.js";

export const compositionDiffOperationSchema = z
  .object({
    op: z.enum(["add", "replace", "remove"]),
    path: z.string().min(1).startsWith("/"),
    value: z.unknown().optional(),
  })
  .strict()
  .superRefine((operation, context) => {
    if (operation.op !== "remove" && !("value" in operation)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add and replace operations require a value.",
      });
    }
  });

/**
 * Mirrors the public `factory.graph-diff/v1` exchange shape from index.ts
 * (strict here so an altered Diff is rejected before it is checksummed).
 */
export const compositionDiffSchema = z
  .object({
    apiVersion: z.literal("factory.graph-diff/v1"),
    baseGraphHash: sha256DigestSchema.optional(),
    operations: z.array(compositionDiffOperationSchema).min(1).max(100),
  })
  .strict();

export type CompositionDiffV1 = z.infer<typeof compositionDiffSchema>;

const capabilityLockReferenceSchema = z
  .object({
    key: capabilityKeySchema,
    version: semanticVersionSchema,
    manifestDigest: sha256DigestSchema,
  })
  .strict();

const graphBindingSchema = z
  .object({
    capabilityKey: capabilityKeySchema,
    inputKey: identifierSchema,
    graphSymbol: z
      .string()
      .regex(
        /^graph\.(domain\.[a-z][a-z0-9-]*(\.[a-zA-Z0-9_]+)?|page\.[a-z][a-z0-9-]*|policy\.[a-z][a-z0-9-]*|flow\.[a-z][a-z0-9-]*)$/,
      ),
  })
  .strict();

const outputSlotSchema = z
  .object({
    capabilityKey: capabilityKeySchema,
    slot: identifierSchema,
    surface: compositionSurfaceSchema,
  })
  .strict();

export const compositionPlanSchema = z
  .object({
    apiVersion: z.literal("factory.composition-plan/v1"),
    planId: identifierSchema,
    requirementChecksum: sha256DigestSchema,
    draftBaseChecksum: sha256DigestSchema,
    capabilityLocks: z.array(capabilityLockReferenceSchema).min(1).max(50),
    graphBindings: z.array(graphBindingSchema).min(1).max(200),
    outputSlots: z.array(outputSlotSchema).max(200),
    dependencyGraph: z
      .array(
        z
          .object({
            capabilityKey: capabilityKeySchema,
            dependsOn: capabilityKeySchema,
          })
          .strict(),
      )
      .max(400),
    compatibility: z
      .object({
        result: z.enum(["compatible", "conflict"]),
        reasons: z.array(safeBusinessTextSchema.max(500)).max(30),
      })
      .strict(),
    risks: z
      .array(
        z
          .object({
            key: identifierSchema,
            level: z.enum(["low", "medium", "high"]),
            description: safeBusinessTextSchema.max(500),
          })
          .strict(),
      )
      .max(20),
    assumptions: z.array(safeBusinessTextSchema.max(500)).max(20),
    complexity: z.enum(["low", "medium", "high"]),
    acceptanceJourneys: z
      .array(
        z
          .object({
            key: identifierSchema,
            description: safeBusinessTextSchema.max(1000),
          })
          .strict(),
      )
      .max(20),
    explanation: safeBusinessTextSchema.max(2000),
    proposedOperations: z.array(compositionDiffOperationSchema).min(1).max(100),
  })
  .strict();

export type CompositionPlanV1 = z.infer<typeof compositionPlanSchema>;

export const compositionClarificationSchema = z
  .object({
    apiVersion: z.literal("factory.composition-clarification/v1"),
    requirementChecksum: sha256DigestSchema,
    questions: z
      .array(
        z
          .object({
            key: identifierSchema,
            question: safeBusinessTextSchema.max(500),
          })
          .strict(),
      )
      .min(1)
      .max(30),
  })
  .strict();

export type CompositionClarificationV1 = z.infer<
  typeof compositionClarificationSchema
>;

export const compositionDecisionSchema = z
  .object({
    apiVersion: z.literal("factory.composition-decision/v1"),
    decisionId: identifierSchema,
    draftId: identifierSchema,
    planChecksum: sha256DigestSchema,
    diffChecksum: sha256DigestSchema,
    reviewer: safeBusinessTextSchema.max(120),
    decision: z.enum(["approved", "rejected"]),
    rationale: safeBusinessTextSchema.max(1000),
    decidedAt: z.string().datetime(),
  })
  .strict();

export type CompositionDecisionV1 = z.infer<typeof compositionDecisionSchema>;

const mutableRoots = new Set([
  "page",
  "domain",
  "policy",
  "flow",
  "integration",
  "experience",
  "metadata",
]);

function decodePointer(path: string): string[] {
  return path
    .slice(1)
    .split("/")
    .map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"));
}

function assertSafeCompositionOperationPath(path: string): void {
  const segments = decodePointer(path);
  // Check the decoded segments: `~1`-escaped pointers decode to `/`, so a
  // path like `/page/~1__proto__` must be rejected after decoding, and any
  // segment carrying prototype material is never legitimate Graph structure.
  if (
    segments.some(
      (segment) =>
        segment.includes("__proto__") ||
        ["constructor", "prototype"].includes(segment),
    )
  ) {
    throw new CompositionError(
      "Composition Diff paths cannot reference prototype keys.",
    );
  }
  const [root, second] = segments;
  if (!mutableRoots.has(root)) {
    throw new CompositionError(
      `Composition Diff path '${path}' is outside the mutable Application Graph.`,
    );
  }
  if (root === "metadata" && second !== "name") {
    throw new CompositionError(
      "Composition Diff may update metadata.name but never Graph identity or workspace scope.",
    );
  }
  if (root === "integration" && second === undefined) {
    throw new CompositionError(
      "Composition Diff cannot replace the whole integration subtree (capability assets and composition profile are plan-selected).",
    );
  }
  if (
    root === "integration" &&
    (second === "assetLocks" || second === "compositionProfile")
  ) {
    throw new CompositionError(
      "Composition Diff cannot select capability assets or change the composition profile.",
    );
  }
}

export function parseCompositionPlan(input: unknown): CompositionPlanV1 {
  const plan = parseStrict(compositionPlanSchema, input);
  const lockedKeyOnly = new Set(plan.capabilityLocks.map((lock) => lock.key));

  const lockIds = new Set<string>();
  for (const lock of plan.capabilityLocks) {
    const id = `${lock.key}@${lock.version}`;
    if (lockIds.has(id)) {
      throw new CompositionError(
        `Composition Plan locks capability '${id}' more than once.`,
      );
    }
    lockIds.add(id);
  }

  const bindingIds = new Set<string>();
  for (const binding of plan.graphBindings) {
    if (!lockedKeyOnly.has(binding.capabilityKey)) {
      throw new CompositionError(
        `Composition Plan binds capability '${binding.capabilityKey}' that is not locked.`,
      );
    }
    const id = `${binding.capabilityKey}:${binding.inputKey}`;
    if (bindingIds.has(id)) {
      throw new CompositionError(
        `Composition Plan duplicates binding '${id}'.`,
      );
    }
    bindingIds.add(id);
  }

  const slotIds = new Set<string>();
  for (const slot of plan.outputSlots) {
    if (!lockedKeyOnly.has(slot.capabilityKey)) {
      throw new CompositionError(
        `Composition Plan declares an output slot for capability '${slot.capabilityKey}' that is not locked.`,
      );
    }
    const id = `${slot.capabilityKey}:${slot.slot}`;
    if (slotIds.has(id)) {
      throw new CompositionError(
        `Composition Plan duplicates output slot '${id}'.`,
      );
    }
    slotIds.add(id);
  }

  for (const edge of plan.dependencyGraph) {
    if (edge.capabilityKey === edge.dependsOn) {
      throw new CompositionError(
        `Composition Plan dependency '${edge.capabilityKey}' cannot depend on itself.`,
      );
    }
    if (!lockedKeyOnly.has(edge.capabilityKey)) {
      throw new CompositionError(
        `Composition Plan dependency names unknown capability '${edge.capabilityKey}'.`,
      );
    }
    if (!lockedKeyOnly.has(edge.dependsOn)) {
      throw new CompositionError(
        `Composition Plan dependency names unknown capability '${edge.dependsOn}'.`,
      );
    }
  }

  for (const operation of plan.proposedOperations) {
    assertSafeCompositionOperationPath(operation.path);
  }
  return plan;
}

export function assertCompositionPlan(input: unknown): CompositionPlanV1 {
  return parseCompositionPlan(input);
}

export function hashCompositionPlan(input: unknown): string {
  return digestJson(assertCompositionPlan(input));
}

export function parseCompositionClarification(
  input: unknown,
): CompositionClarificationV1 {
  return parseStrict(compositionClarificationSchema, input);
}

export function assertCompositionClarification(
  input: unknown,
): CompositionClarificationV1 {
  return parseCompositionClarification(input);
}

export function parseCompositionDecision(
  input: unknown,
): CompositionDecisionV1 {
  return parseStrict(compositionDecisionSchema, input);
}

export function assertCompositionDecision(
  input: unknown,
): CompositionDecisionV1 {
  return parseCompositionDecision(input);
}

export function hashCompositionDiff(input: unknown): string {
  const diff = parseStrict(compositionDiffSchema, input);
  return digestJson(diff);
}

/** A plan is bound to exactly the requirement it was planned from. */
export function assertPlanAgainstRequirement(
  plan: CompositionPlanV1,
  requirement: RequirementSpecV1,
): void {
  const checksum = hashRequirementSpec(assertRequirementSpec(requirement));
  if (plan.requirementChecksum !== checksum) {
    throw new CompositionError(
      "Composition Plan requirement checksum does not match the requirement.",
    );
  }
}

/** A plan is bound to a mutable Draft revision by content hash. */
export function assertPlanAgainstDraft(
  plan: CompositionPlanV1,
  draft: DraftRevisionV1,
): void {
  if (draft.status !== "draft") {
    throw new CompositionError(
      "Composition Plans apply only to mutable Draft revisions.",
    );
  }
  const checksum = hashApplicationGraph(draft.graph);
  if (plan.draftBaseChecksum !== checksum) {
    throw new CompositionError(
      "Composition Plan base Draft checksum does not match the Draft revision.",
    );
  }
}

export function resolveCompositionGraphSymbol(
  index: GraphSymbolIndexV1,
  symbol: string,
): boolean {
  const parts = symbol.split(".");
  if (parts[0] !== "graph") return false;
  const [root, id, field] = parts.slice(1);
  if (root === "domain") {
    if (!index.entity(id)) return false;
    return field === undefined || index.field(id, field) !== undefined;
  }
  if (root === "page") return index.page(id) !== undefined;
  if (root === "policy") return index.role(id) !== undefined;
  if (root === "flow") return index.flow(id) !== undefined;
  return false;
}

export function assertPlanBindingsResolve(
  plan: CompositionPlanV1,
  draft: DraftRevisionV1,
): void {
  const index = createGraphSymbolIndex(assertGraph(draft.graph));
  for (const binding of plan.graphBindings) {
    if (!resolveCompositionGraphSymbol(index, binding.graphSymbol)) {
      throw new CompositionError(
        `Composition Plan binding '${binding.capabilityKey}:${binding.inputKey}' references unknown Graph symbol '${binding.graphSymbol}'.`,
      );
    }
  }
}

function assertGraph(graph: ApplicationGraphV1): ApplicationGraphV1 {
  hashApplicationGraph(graph);
  return graph;
}

/**
 * Applies an approved Composition Decision to a mutable Draft. The decision
 * must approve the exact plan and the exact constrained Diff, the plan must
 * bind the exact Draft revision, every binding must resolve, and the Diff
 * must equal the plan's declared operations before the existing Draft-only
 * boundary applies it.
 */
export function applyApprovedComposition(
  decisionInput: unknown,
  planInput: unknown,
  draft: DraftRevisionV1,
  diffInput: unknown,
): DraftRevisionV1 {
  const decision = assertCompositionDecision(decisionInput);
  const plan = assertCompositionPlan(planInput);
  if (decision.decision !== "approved") {
    throw new CompositionError(
      "Composition Diff application requires an approved decision.",
    );
  }
  if (decision.planChecksum !== hashCompositionPlan(plan)) {
    throw new CompositionError(
      "Composition Decision plan checksum does not match the plan.",
    );
  }
  const diff = parseStrict(compositionDiffSchema, diffInput);
  if (decision.diffChecksum !== hashCompositionDiff(diff)) {
    throw new CompositionError(
      "Composition Decision Diff checksum does not match the Diff.",
    );
  }
  assertPlanAgainstDraft(plan, draft);
  assertPlanBindingsResolve(plan, draft);
  if (!canonicalEquals(plan.proposedOperations, diff.operations)) {
    throw new CompositionError(
      "Composition Diff operations must equal the plan's declared operations.",
    );
  }
  return applyGraphDiffToDraft(draft, diff);
}
