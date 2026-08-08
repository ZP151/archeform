import {
  appendDraftRevision,
  applyApprovedComposition,
  applyGraphDiffToDraft,
  assertExperienceDesignSystem,
  hashApplicationGraph,
  hashCompositionDiff,
  hashCompositionPlan,
  resolveExperienceDesignSystem,
  type CompositionDecisionV1,
  type CompositionPlanV1,
  type DraftRevisionV1,
  type ExperienceDesignSystemV1,
  type PageLayoutVariant,
} from "@factory/graph";

/**
 * Build mode over the immutable Draft lifecycle. The accepted, checksum-bound
 * CompositionDecision advances the mutable Draft through
 * `applyApprovedComposition`; the lifecycle itself appends the next revision
 * (revision + 1, never mutation). Experience adjustments and page-layout
 * selections are constrained Graph Diffs over the Factory-owned Experience
 * System: values are schema-validated, variants are approved, and no
 * arbitrary CSS, packages, scripts, or component source can enter the Graph.
 * Restore appends the next revision from an earlier revision's content —
 * history is never rewritten.
 *
 * The deterministic default `decidedAt` is a pure-model fixture; the UI
 * passes the real acceptance timestamp.
 */

export type DesignTokenGroup =
  "colour" | "typography" | "spacing" | "radius" | "elevation" | "motion";

export interface BuildDecisionOptions {
  readonly decisionId?: string;
  readonly reviewer?: string;
  readonly decidedAt?: string;
  readonly rationale?: string;
}

const DEFAULT_DECIDED_AT = "2026-01-01T00:00:00.000Z";

export function createExpenseApprovalDecision(
  plan: CompositionPlanV1,
  baseDraft: DraftRevisionV1,
  options: BuildDecisionOptions = {},
): CompositionDecisionV1 {
  const diff = {
    apiVersion: "factory.graph-diff/v1" as const,
    operations: plan.proposedOperations,
  };
  return {
    apiVersion: "factory.composition-decision/v1",
    decisionId: options.decisionId ?? `golden-path-${plan.planId}`,
    draftId: baseDraft.id,
    planChecksum: hashCompositionPlan(plan),
    diffChecksum: hashCompositionDiff(diff),
    reviewer: options.reviewer ?? "golden-path-builder",
    decision: "approved",
    rationale:
      options.rationale ??
      "Accepted composition plan from Golden Path Plan mode.",
    decidedAt: options.decidedAt ?? DEFAULT_DECIDED_AT,
  };
}

/**
 * Advances the mutable Draft through the checksum-bound lifecycle. Fails
 * closed on a rejected decision, a tampered decision checksum, a stale base
 * Draft, unresolved bindings, or a Diff that diverges from the plan's
 * declared operations.
 */
export function applyBuildDecision(
  plan: CompositionPlanV1,
  baseDraft: DraftRevisionV1,
  decision: CompositionDecisionV1,
): DraftRevisionV1 {
  return applyApprovedComposition(decision, plan, baseDraft, {
    apiVersion: "factory.graph-diff/v1",
    operations: plan.proposedOperations,
  });
}

/** One-action Build: accept the chosen plan into the mutable Draft. */
export function buildExpenseApprovalDraft(
  plan: CompositionPlanV1,
  baseDraft: DraftRevisionV1,
  options: BuildDecisionOptions = {},
): DraftRevisionV1 {
  return applyBuildDecision(
    plan,
    baseDraft,
    createExpenseApprovalDecision(plan, baseDraft, options),
  );
}

export type ExperienceAdjustment =
  | {
      readonly kind: "token";
      readonly group: DesignTokenGroup;
      readonly theme?: "light" | "dark";
      readonly token: string;
      readonly value: string;
    }
  | {
      readonly kind: "page-layout";
      readonly pageId: string;
      readonly variant: PageLayoutVariant;
    }
  | { readonly kind: "shell"; readonly shell: "sidebar" | "topbar" }
  | { readonly kind: "density"; readonly density: "standard" | "compact" };

/**
 * Applies one bounded Experience adjustment as the next immutable Draft
 * revision: the resolved design system (deterministic defaults merged with
 * declared values) is adjusted, schema-validated, and written back through
 * the Graph Diff lifecycle. The Diff carries the base Graph hash, so a stale
 * Draft fails closed.
 */
export function adjustExperience(
  draft: DraftRevisionV1,
  adjustment: ExperienceAdjustment,
): DraftRevisionV1 {
  const next: ExperienceDesignSystemV1 = structuredClone(
    resolveExperienceDesignSystem(draft.graph.experience),
  );
  if (adjustment.kind === "token") {
    if (adjustment.group === "colour") {
      if (adjustment.theme === undefined) {
        throw new Error("Colour tokens require a theme ('light' or 'dark').");
      }
      next.tokens.colour[adjustment.theme][adjustment.token] = adjustment.value;
    } else {
      if (adjustment.theme !== undefined) {
        throw new Error(
          `Theme applies only to colour tokens, not '${adjustment.group}'.`,
        );
      }
      (next.tokens as unknown as Record<string, Record<string, string>>)[
        adjustment.group
      ][adjustment.token] = adjustment.value;
    }
  } else if (adjustment.kind === "page-layout") {
    if (!draft.graph.page.pages.some((page) => page.id === adjustment.pageId)) {
      throw new Error(
        `Page '${adjustment.pageId}' does not exist in the Draft.`,
      );
    }
    next.selection.pageLayouts[adjustment.pageId] = adjustment.variant;
  } else if (adjustment.kind === "shell") {
    next.selection.shell = adjustment.shell;
  } else {
    next.selection.density = adjustment.density;
  }
  // Validated before the Diff: unsafe values, unapproved variants, and
  // prototype-key material are rejected here, not at apply time.
  assertExperienceDesignSystem(next);
  const operation =
    draft.graph.experience.designSystem === undefined
      ? { op: "add" as const, path: "/experience/designSystem", value: next }
      : {
          op: "replace" as const,
          path: "/experience/designSystem",
          value: next,
        };
  return applyGraphDiffToDraft(draft, {
    apiVersion: "factory.graph-diff/v1",
    baseGraphHash: hashApplicationGraph(draft.graph),
    operations: [operation],
  });
}

export function adjustExperienceToken(
  draft: DraftRevisionV1,
  group: DesignTokenGroup,
  token: string,
  value: string,
  theme?: "light" | "dark",
): DraftRevisionV1 {
  return adjustExperience(draft, { kind: "token", group, token, value, theme });
}

export function adjustPageLayout(
  draft: DraftRevisionV1,
  pageId: string,
  variant: PageLayoutVariant,
): DraftRevisionV1 {
  return adjustExperience(draft, { kind: "page-layout", pageId, variant });
}

/**
 * Restore an earlier revision's content as the next immutable revision:
 * history is never rewritten or patched; the current Draft simply appends a
 * revision carrying the target's Graph.
 */
export function restoreDraftRevision(
  history: readonly DraftRevisionV1[],
  target: DraftRevisionV1,
): DraftRevisionV1 {
  const latest = history[history.length - 1];
  if (latest === undefined) {
    throw new Error("Draft history is empty.");
  }
  if (latest.status !== "draft") {
    throw new Error(
      "Only mutable Draft revisions can restore earlier content.",
    );
  }
  const known = history.some(
    (revision) =>
      revision.id === target.id && revision.revision === target.revision,
  );
  if (!known) {
    throw new Error(
      `Revision ${target.revision} of '${target.id}' is not part of the Draft history.`,
    );
  }
  return appendDraftRevision(target.graph, latest);
}
