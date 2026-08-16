import { z } from "zod";

import {
  hashApplicationGraph,
  parseApplicationGraph,
  type ApplicationGraphV1,
} from "./model.js";
import {
  parseVerificationEvidence,
  VerificationContractError,
  type DiagnosisV1,
  type DraftDiffOperationV1,
  type DraftDiffV1,
  type VerificationEvidenceV1,
  type VerificationStepV1,
} from "./verification.js";

/**
 * Deterministic diagnosis of a failed verification run.
 *
 * `diagnoseVerification` maps the FIRST failed evidence step (evidence order)
 * to one bounded DiagnosisV1. The mapping is a pure function of the failure
 * code, the step facts, the immutable Published Graph, and the composition
 * lock; evidence summaries are never copied into the diagnosis, and a Draft
 * Diff is proposed only when a concrete, safe operation can be derived (an
 * unbound identity policy for a missed denial, or a fixable idempotencyKey
 * constraint for an accepted replay). Every other failure produces no diff.
 *
 * The derived `baseDraftRevisionId` is a symbolic reference
 * (`draft-<graph metadata id>`) to the mutable Draft revision of the graph's
 * application graph; it is not a persisted row id. The Control Plane approval
 * path resolves it by application-graph identity (the lifecycle enforces that
 * every draft revision of an application graph carries the same metadata id),
 * takes the LATEST mutable Draft revision of that application graph, and
 * refuses when `hashApplicationGraph(draft.graph)` diverges from the diff's
 * `baseGraphHash` — a draft edited after the published snapshot is not a valid
 * approval base.
 */

/** Revision envelopes are not Published Graphs; they fail closed. */
const revisionEnvelopeKeys = new Set([
  "status",
  "revision",
  "publishedRevision",
  "draftRevisionId",
]);

/**
 * Segments the graphEvidencePath contract refuses. The domain entity-key schema
 * permits these keys, so an entity may be named `constructor`; a diagnosis that
 * addresses it as `/domain/constructor` would itself be schema-invalid, so such
 * entities are treated as not addressable and the mapping fails closed.
 */
const blockedPathSegments = new Set([
  ".",
  "..",
  "__proto__",
  "constructor",
  "prototype",
]);

/** Structural validation of the immutable composition lock. */
const compositionLockSchema = z
  .object({
    apiVersion: z.literal("factory.composition/v1"),
    applicationGraphChecksum: z.string().regex(/^sha256:[a-f0-9]{64}$/),
    packages: z.array(
      z.object({
        lock: z.object({ key: z.string().min(1).max(160) }),
        bindings: z.record(z.unknown()),
      }),
    ),
    resolvedContributionDigests: z.array(z.string()),
    providedAndRequiredInterfaces: z.array(z.string()),
    targetRuntimeInterfaceVersions: z.array(z.string()),
    resolvedDependencyOrder: z.array(z.string()),
    lockDigest: z.string(),
  })
  .strict();

type DiagnosisCategory = DiagnosisV1["category"];

type MappedDiagnosis = {
  readonly category: DiagnosisCategory;
  readonly code: string;
  readonly summary: string;
  readonly affectedPaths: readonly string[];
  readonly diff: DraftDiffV1 | null;
};

function entityOf(action: string | undefined): string | undefined {
  if (action === undefined) return undefined;
  return action.split(".")[0] || action;
}

/** The diff rationale code is the diagnosis code with underscores hyphenated. */
function rationaleFor(code: string): string {
  return code.replaceAll("_", "-");
}

/**
 * Derived IDs must stay within the factoryId bound (128). A schema-legal
 * source at its own maximum length would otherwise overflow the prefix, so
 * the source is trimmed deterministically — identity binding still travels
 * in the intact verificationRunId/baseGraphHash fields.
 */
function derivedId(prefix: string, source: string): string {
  return `${prefix}${source.slice(0, 128 - prefix.length)}`;
}

function runtime(
  code: string,
  summary: string,
  paths: readonly string[],
): MappedDiagnosis {
  return {
    category: "runtime",
    code,
    summary,
    affectedPaths: paths,
    diff: null,
  };
}

function unknown(code: string, summary: string): MappedDiagnosis {
  return {
    category: "unknown",
    code,
    summary,
    affectedPaths: ["/metadata"],
    diff: null,
  };
}

function graphUnknown(summary: string): MappedDiagnosis {
  return {
    category: "graph",
    code: "graph.unknown_entity",
    summary,
    affectedPaths: ["/domain"],
    diff: null,
  };
}

function bindingStatusMismatch(entity: string): MappedDiagnosis {
  return {
    category: "binding",
    code: "binding.status_mismatch",
    summary:
      "The declared status expectation does not match the observed response; no safe automated change is proposed.",
    affectedPaths: [`/domain/${entity}`],
    diff: null,
  };
}

function denial(
  graph: ApplicationGraphV1,
  baseGraphHash: string,
  entity: string,
  lock: z.infer<typeof compositionLockSchema>,
): MappedDiagnosis {
  const identityPolicyBound = lock.packages.some(
    (selection) => selection.lock.key === "core.identity-policy",
  );
  if (!identityPolicyBound) {
    const diff = makeDiff(
      graph,
      baseGraphHash,
      [
        {
          op: "add-binding",
          capability: "core.identity-policy",
          graphSymbol: `graph.domain.${entity}`,
        },
      ],
      [`/domain/${entity}`],
      "binding.denial-policy-not-bound",
      "Bind the identity policy capability to the journey entity so declared denials are enforced.",
    );
    return {
      category: "binding",
      code: "binding.denial_policy_not_bound",
      summary:
        "The declared denial is not enforced because the identity policy capability is not bound.",
      affectedPaths: [`/domain/${entity}`],
      diff,
    };
  }
  return {
    category: "binding",
    code: "binding.denial_not_enforced",
    summary:
      "The declared denial was not enforced even though the identity policy capability is bound.",
    affectedPaths: [`/domain/${entity}`],
    diff: null,
  };
}

function idempotency(
  graph: ApplicationGraphV1,
  baseGraphHash: string,
  entity: string,
): MappedDiagnosis {
  const idempotencyField = graph.domain.entities
    .find((candidate) => candidate.key === entity)
    ?.fields.find((field) => field.key === "idempotencyKey");

  if (idempotencyField === undefined) {
    return {
      category: "capability",
      code: "capability.idempotency_field_missing",
      summary:
        "The journey entity declares no idempotencyKey field, so repeated requests cannot be rejected.",
      affectedPaths: [`/domain/${entity}`],
      diff: null,
    };
  }
  if (idempotencyField.type !== "string") {
    return {
      category: "capability",
      code: "capability.idempotency_field_wrong_type",
      summary:
        "The idempotencyKey field must be a string for repeated-key rejection.",
      affectedPaths: [`/domain/${entity}`],
      diff: makeDiff(
        graph,
        baseGraphHash,
        [
          {
            op: "change-constraint",
            entity,
            field: "idempotencyKey",
            constraint: "type",
            value: "string",
          },
        ],
        [`/domain/${entity}`],
        "capability.idempotency-field-wrong-type",
        "Require the idempotencyKey field to be a string on the journey entity.",
      ),
    };
  }
  if (idempotencyField.unique !== true) {
    return {
      category: "capability",
      code: "capability.idempotency_field_not_unique",
      summary:
        "The idempotencyKey field is not unique, so repeated keys are not rejected.",
      affectedPaths: [`/domain/${entity}`],
      diff: makeDiff(
        graph,
        baseGraphHash,
        [
          {
            op: "change-constraint",
            entity,
            field: "idempotencyKey",
            constraint: "unique",
            value: true,
          },
        ],
        [`/domain/${entity}`],
        "capability.idempotency-field-not-unique",
        "Make the idempotencyKey field unique on the journey entity.",
      ),
    };
  }
  if (idempotencyField.required !== true) {
    return {
      category: "capability",
      code: "capability.idempotency_field_not_required",
      summary:
        "The idempotencyKey field is optional, so repeated keys are not rejected.",
      affectedPaths: [`/domain/${entity}`],
      diff: makeDiff(
        graph,
        baseGraphHash,
        [
          {
            op: "change-constraint",
            entity,
            field: "idempotencyKey",
            constraint: "required",
            value: true,
          },
        ],
        [`/domain/${entity}`],
        "capability.idempotency-field-not-required",
        "Require the idempotencyKey field on the journey entity.",
      ),
    };
  }
  return {
    category: "capability",
    code: "capability.idempotency_not_enforced",
    summary:
      "The idempotencyKey field is correct, yet repeated requests were not rejected; this is not a Graph change.",
    affectedPaths: [`/domain/${entity}`],
    diff: null,
  };
}

function makeDiff(
  graph: ApplicationGraphV1,
  baseGraphHash: string,
  operations: readonly DraftDiffOperationV1[],
  affectedPaths: readonly string[],
  rationaleCode: string,
  summary: string,
): DraftDiffV1 {
  return {
    apiVersion: "factory.draft-diff/v1",
    baseDraftRevisionId: derivedId("draft-", graph.metadata.id),
    baseGraphHash,
    operations: [...operations],
    affectedPaths: [...affectedPaths],
    rationaleCode,
    summary,
  };
}

function makeDiagnosis(
  evidence: VerificationEvidenceV1,
  mapped: MappedDiagnosis,
): DiagnosisV1 {
  return {
    apiVersion: "factory.verification-diagnosis/v1",
    diagnosisId: derivedId("diagnosis-", evidence.verificationRunId),
    verificationRunId: evidence.verificationRunId,
    category: mapped.category,
    code: mapped.code,
    summary: mapped.summary,
    affectedPaths: [...mapped.affectedPaths],
    draftDiff: mapped.diff,
  };
}

/**
 * Diagnoses the first failed step of a verification evidence bundle. The
 * graph snapshot must be an immutable Published Graph and the composition
 * lock must match its checksum; draft or exchange envelopes, hostile evidence,
 * and unmapped failure codes all fail closed.
 */
export function diagnoseVerification(
  evidence: VerificationEvidenceV1,
  graphSnapshot: unknown,
  compositionLock: unknown,
): DiagnosisV1 {
  // Hostile or malformed evidence fails closed before any mapping.
  const parsedEvidence = parseVerificationEvidence(evidence);

  // Immutable Published Graph protection: revision and exchange envelopes are
  // mutable carriers and are rejected before any diff is derived.
  if (
    graphSnapshot !== null &&
    typeof graphSnapshot === "object" &&
    [...revisionEnvelopeKeys].some((key) => key in (graphSnapshot as object))
  ) {
    throw new VerificationContractError(
      "diagnoseVerification requires an immutable Published Graph, not a draft or exchange envelope.",
    );
  }

  const graph = parseApplicationGraph(graphSnapshot);
  const baseGraphHash = hashApplicationGraph(graph);

  const lock = compositionLockSchema.safeParse(compositionLock);
  if (!lock.success) {
    throw new VerificationContractError(
      "Composition lock is not contract-shaped.",
    );
  }

  // A lock resolved for a different Graph invalidates every mapping.
  if (lock.data.applicationGraphChecksum !== baseGraphHash) {
    return makeDiagnosis(parsedEvidence, {
      category: "target",
      code: "target.graph_lock_mismatch",
      summary:
        "The composition lock does not match the Published Graph checksum.",
      affectedPaths: ["/metadata"],
      diff: null,
    });
  }

  const failed = parsedEvidence.steps.find((step) => step.status === "failed");
  if (failed === undefined) {
    throw new VerificationContractError(
      "Evidence has no failed steps to diagnose.",
    );
  }

  const mapped = mapFailure(failed, graph, baseGraphHash, lock.data);
  return makeDiagnosis(parsedEvidence, mapped);
}

function mapFailure(
  step: VerificationStepV1,
  graph: ApplicationGraphV1,
  baseGraphHash: string,
  lock: z.infer<typeof compositionLockSchema>,
): MappedDiagnosis {
  if (step.failureCode === undefined) {
    // Only the cleanup step omits a failure code; anything else fails closed.
    return step.kind === "cleanup"
      ? runtime(
          "runtime.cleanup_failed",
          "Preview cleanup failed; no Graph change is proposed.",
          ["/metadata"],
        )
      : unknown(
          "unknown.probe_crashed",
          "A probe crashed before producing evidence; the cause cannot be determined.",
        );
  }

  const entity = entityOf(step.action);
  const entityKnown =
    entity !== undefined &&
    !blockedPathSegments.has(entity) &&
    graph.domain.entities.some((candidate) => candidate.key === entity);

  switch (step.failureCode) {
    case "preview_artifact_failed":
      return runtime(
        "runtime.preview_artifact_failed",
        "The isolated preview artifacts could not be verified or materialized before Docker startup. Recreate them from the same immutable Compilation; no Graph change is proposed.",
        ["/metadata"],
      );
    case "preview_compose_up_failed":
      return runtime(
        "runtime.preview_compose_up_failed",
        "Docker Compose failed while building or starting the isolated services, including bootstrap migration. Reproduce that stage with the same immutable artifacts; no Graph change is proposed.",
        ["/metadata"],
      );
    case "preview_port_discovery_failed":
      return runtime(
        "runtime.preview_port_discovery_failed",
        "The isolated services started, but Docker Compose did not return valid loopback web and API ports. Verify the generated port publication contract; no Graph change is proposed.",
        ["/metadata"],
      );
    case "preview_start_timeout":
      return runtime(
        "runtime.preview_start_timeout",
        "Preview startup exceeded the existing operation deadline. Reproduce the failure before changing any timeout; no Graph change is proposed.",
        ["/metadata"],
      );
    case "preview_start_cancelled":
      return runtime(
        "runtime.preview_start_cancelled",
        "Preview startup was cancelled before completion. Verify the caller and cleanup transition before retrying from a clean resource state; no Graph change is proposed.",
        ["/metadata"],
      );
    case "preview_readiness_failed":
    case "preview_health_check_failed":
      return runtime(
        "runtime.preview_readiness_failed",
        "The isolated services published ports, but the generated web service did not become ready within the existing readiness window. Reproduce readiness against the same artifacts; no Graph change is proposed.",
        ["/metadata"],
      );
    case "preview_start_failed":
      return runtime(
        "runtime.preview_start_failed",
        "The isolated preview failed to start; the cause is not determined by this diagnosis.",
        ["/metadata"],
      );
    case "probe.timeout":
      return runtime(
        "runtime.probe_timeout",
        "A required verification probe exceeded its operation deadline; this is an environment failure, not a Graph defect.",
        ["/metadata"],
      );
    case "migration.failed":
      return runtime(
        "runtime.migration_failed",
        "The generated database schema is not applied; this is an environment failure, not a Graph defect.",
        ["/domain"],
      );
    case "health.failed":
      return runtime(
        "runtime.health_failed",
        "The health endpoint did not return 200; this is an environment failure, not a Graph defect.",
        ["/metadata"],
      );
    case "health.unreachable":
    case "api.unreachable":
    case "role-journey.unreachable":
    case "authorization.unreachable":
    case "idempotency.unreachable":
      return runtime(
        "runtime.unreachable",
        "The isolated preview runtime did not respond; this is an environment failure, not a Graph defect.",
        entityKnown ? [`/domain/${entity}`] : ["/metadata"],
      );
    case "probe.crashed":
      return unknown(
        "unknown.probe_crashed",
        "A probe crashed before producing evidence; the cause cannot be determined.",
      );
    case "api.unexpected_status":
    case "role-journey.unexpected_status":
    case "idempotency.first_request_unexpected":
      if (entity === undefined) {
        return unknown(
          "unknown.missing_identity",
          "The failing step carries no action identity; the cause cannot be attributed to a Graph path.",
        );
      }
      return entityKnown
        ? bindingStatusMismatch(entity)
        : graphUnknown(
            "The failing journey targets a domain entity the Graph does not define or cannot address.",
          );
    case "authorization.denial_mismatch":
      if (entity === undefined) {
        return unknown(
          "unknown.missing_identity",
          "The failing step carries no action identity; the cause cannot be attributed to a Graph path.",
        );
      }
      return entityKnown
        ? denial(graph, baseGraphHash, entity, lock)
        : graphUnknown(
            "The failing journey targets a domain entity the Graph does not define or cannot address.",
          );
    case "idempotency.replay_not_rejected":
      if (entity === undefined) {
        return unknown(
          "unknown.missing_identity",
          "The failing step carries no action identity; the cause cannot be attributed to a Graph path.",
        );
      }
      return entityKnown
        ? idempotency(graph, baseGraphHash, entity)
        : graphUnknown(
            "The failing journey targets a domain entity the Graph does not define or cannot address.",
          );
    default:
      return unknown(
        "unknown.unmapped_failure",
        "The failure code is not recognized; no Graph change is proposed.",
      );
  }
}
