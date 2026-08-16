import { describe, expect, it } from "vitest";

import { normalizeReleaseDiagnosisCode } from "./release-diagnosis";

describe("normalizeReleaseDiagnosisCode", () => {
  it.each([
    "release.rejected",
    "release.not_found",
    "release.conflict",
    "release.unavailable",
    "release.failed",
    "approval.failed",
    "compilation.failed",
    "compilation.timeout",
    "preview.failed",
    "cleanup.failed",
    "runtime.preview_artifact_failed",
    "runtime.preview_compose_up_failed",
    "runtime.preview_port_discovery_failed",
    "runtime.preview_start_timeout",
    "runtime.preview_start_cancelled",
    "runtime.preview_readiness_failed",
    "runtime.preview_start_failed",
    "runtime.cleanup_failed",
    "runtime.probe_timeout",
    "runtime.migration_failed",
    "runtime.health_failed",
    "runtime.unreachable",
    "target.graph_lock_mismatch",
    "graph.unknown_entity",
    "binding.status_mismatch",
    "binding.denial_policy_not_bound",
    "binding.denial_not_enforced",
    "capability.idempotency_field_missing",
    "capability.idempotency_field_wrong_type",
    "capability.idempotency_field_not_unique",
    "capability.idempotency_field_not_required",
    "capability.idempotency_not_enforced",
    "unknown.probe_crashed",
    "unknown.missing_identity",
    "unknown.unmapped_failure",
    "verification.evidence_missing",
    "verification.cancelled",
    "verification.timeout",
    "verification.failed",
  ])("retains the exact allowlisted diagnosis %s", (code) => {
    expect(normalizeReleaseDiagnosisCode(code)).toBe(code);
  });

  it.each([
    "runtime.preview_not_allowlisted",
    "binding.missing_identity_policy",
    "provider.secret",
    "runtime.preview_start_failed adjacent text",
    "RUNTIME.PREVIEW_START_FAILED",
    null,
  ])("collapses unknown or hostile diagnosis input %j", (value) => {
    expect(normalizeReleaseDiagnosisCode(value)).toBe("verification.failed");
  });
});
