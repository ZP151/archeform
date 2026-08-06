import { describe, expect, it } from "vitest";

import {
  VerificationContractError,
  assertConsistentVerificationRetry,
  parseDiagnosis,
  parseDraftDiff,
  parseVerificationEvidence,
  parseVerificationRun,
  type DiagnosisV1,
  type DraftDiffV1,
  type VerificationEvidenceV1,
  type VerificationRunV1,
  type VerificationStepV1,
} from "../src/index.js";

const runId = "verify-01h3k6f";
const compilationDigest =
  "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const startedAt = "2026-08-06T12:00:00.000Z";

function validRun(): VerificationRunV1 {
  return {
    apiVersion: "factory.verification-run/v1",
    verificationRunId: runId,
    compilationDigest,
    profileKey: "expense-approval",
    status: "running",
    startedAt,
    stepIds: ["migration", "health"],
  };
}

function validStep(
  overrides: Partial<VerificationStepV1> = {},
): VerificationStepV1 {
  return {
    stepId: "migration",
    kind: "migration",
    status: "passed",
    summary: "Applied 1 migration.",
    durationMs: 1200,
    ...overrides,
  };
}

function validEvidence(): VerificationEvidenceV1 {
  return {
    apiVersion: "factory.verification-evidence/v1",
    verificationRunId: runId,
    compilationDigest,
    steps: [validStep(), validStep({ stepId: "health", kind: "health" })],
    cleanup: {
      succeeded: true,
      summary: "Stopped the preview and removed its resources.",
    },
    artifactDigests: [
      { path: "docker-compose.yml", digest: compilationDigest },
    ],
    completedAt: "2026-08-06T12:05:00.000Z",
  };
}

function validDraftDiff(): DraftDiffV1 {
  return {
    apiVersion: "factory.draft-diff/v1",
    baseDraftRevisionId: "draft-expense-approval",
    baseGraphHash: compilationDigest,
    operations: [
      {
        op: "replace-input",
        entity: "expense",
        field: "status",
        value: "submitted",
      },
      {
        op: "add-binding",
        capability: "core.crud",
        graphSymbol: "graph.domain.expense",
      },
      {
        op: "remove-binding",
        capability: "core.audit",
        graphSymbol: "graph.domain.expense",
      },
      {
        op: "change-constraint",
        entity: "expense",
        field: "amount",
        constraint: "required",
        value: true,
      },
    ],
    affectedPaths: ["/domain/entities/0/fields/0"],
    rationaleCode: "migration.missing-column",
    summary: "Require amount so the migration emits a NOT NULL column.",
  };
}

function validDiagnosis(): DiagnosisV1 {
  return {
    apiVersion: "factory.verification-diagnosis/v1",
    diagnosisId: "diagnosis-01h3k6f",
    verificationRunId: runId,
    category: "target",
    code: "migration.apply_failed",
    summary: "Initial migration failed to apply.",
    affectedPaths: ["/domain/entities/0/fields/0"],
    draftDiff: validDraftDiff(),
  };
}

describe("VerificationRunV1", () => {
  it("accepts a valid verification run record", () => {
    expect(parseVerificationRun(validRun())).toEqual(validRun());
  });

  it("rejects an unknown run status", () => {
    expect(() =>
      parseVerificationRun({ ...validRun(), status: "exploded" }),
    ).toThrow(VerificationContractError);
  });

  it("rejects a compilation digest that is not sha256", () => {
    expect(() =>
      parseVerificationRun({ ...validRun(), compilationDigest: "md5:abcd" }),
    ).toThrow(VerificationContractError);
  });

  it("rejects duplicate ordered step IDs", () => {
    expect(() =>
      parseVerificationRun({
        ...validRun(),
        stepIds: ["migration", "migration"],
      }),
    ).toThrow(/duplicate step/i);
  });
});

describe("VerificationEvidenceV1", () => {
  it("accepts valid evidence with ordered steps and cleanup facts", () => {
    expect(parseVerificationEvidence(validEvidence())).toEqual(validEvidence());
  });

  it("rejects evidence whose steps disagree with the run step IDs", () => {
    expect(() =>
      parseVerificationEvidence(validEvidence(), {
        ...validRun(),
        stepIds: ["health"],
      }),
    ).toThrow(/step/i);
  });

  it("rejects duplicate step IDs in the evidence", () => {
    const evidence = validEvidence();
    evidence.steps = [
      validStep(),
      validStep({ stepId: "health", kind: "health" }),
      validStep(),
    ];
    expect(() => parseVerificationEvidence(evidence)).toThrow(
      /duplicate step/i,
    );
  });

  it("rejects raw model prompt or response fields fail closed", () => {
    expect(() =>
      parseVerificationEvidence({
        ...validEvidence(),
        steps: [
          validStep({
            summary: "Applied 1 migration.",
            // @ts-expect-error hostile unknown evidence key
            modelPrompt: "create the migration",
          }),
        ],
      }),
    ).toThrow(VerificationContractError);
    expect(() =>
      parseVerificationEvidence({
        ...validEvidence(),
        steps: [
          validStep({
            summary: "Applied 1 migration.",
            // @ts-expect-error hostile unknown evidence key
            rawResponse: '{"kind":"api:Expense"}',
          }),
        ],
      }),
    ).toThrow(VerificationContractError);
  });

  it("rejects a summary containing a credential-like assignment", () => {
    expect(() =>
      parseVerificationEvidence({
        ...validEvidence(),
        steps: [
          validStep({
            summary: "authorization: Bearer abc.def.ghi",
          }),
        ],
      }),
    ).toThrow(/redact/i);
    expect(() =>
      parseVerificationEvidence({
        ...validEvidence(),
        steps: [
          validStep({
            summary: "api_key=sk-live-1234",
          }),
        ],
      }),
    ).toThrow(/redact/i);
  });

  it("rejects env-style compound credential keys fail closed", () => {
    for (const summary of [
      "secret_key=sk-live-1234",
      "Secret_Access_Key=AKIA123",
      "AWS_SECRET_ACCESS_KEY=AKIA123",
      "database password=generated",
    ]) {
      expect(() =>
        parseVerificationEvidence({
          ...validEvidence(),
          steps: [validStep({ summary })],
        }),
      ).toThrow(/redact/i);
    }
  });

  it("rejects separator-less bearer credential forms fail closed", () => {
    for (const summary of [
      "Bearer xyz",
      "Authorization Bearer xyz",
      "sent bearer token directly",
    ]) {
      expect(() =>
        parseVerificationEvidence({
          ...validEvidence(),
          steps: [validStep({ summary })],
        }),
      ).toThrow(/redact/i);
    }
  });

  it("rejects bare Basic auth credentials fail closed", () => {
    for (const summary of [
      "Basic dXNlcjpwYXNz",
      "Authorization: Basic dXNlcjpwYXNz",
    ]) {
      expect(() =>
        parseVerificationEvidence({
          ...validEvidence(),
          steps: [validStep({ summary })],
        }),
      ).toThrow(/redact/i);
    }
  });

  it("rejects keyword-bearing assignment tokens fail closed, even benign-looking", () => {
    // The compound-key backstop cannot distinguish `monkey=` from `secret_key=`
    // and is deliberately conservative: evidence is allowlisted prose with no
    // assignment forms, so any keyword-bearing key-like token fails closed.
    for (const summary of ["monkey=banana", "hockey=2"]) {
      expect(() =>
        parseVerificationEvidence({
          ...validEvidence(),
          steps: [validStep({ summary })],
        }),
      ).toThrow(/redact/i);
    }
  });

  it("accepts benign prose without credential shape", () => {
    for (const summary of [
      "basic health check returned 200",
      "Basic requirements passed.",
      "Status: ok",
    ]) {
      expect(() =>
        parseVerificationEvidence({
          ...validEvidence(),
          steps: [validStep({ summary })],
        }),
      ).not.toThrow();
    }
  });

  it("still accepts allowlisted authorization-denial vocabulary", () => {
    expect(() =>
      parseVerificationEvidence({
        ...validEvidence(),
        steps: [
          validStep({
            stepId: "authorization-denial",
            kind: "authorization-denial",
            role: "merchant",
            action: "fulfill",
            httpStatus: 403,
            summary: "Authorization denial returned 403 for role merchant.",
          }),
        ],
      }),
    ).not.toThrow();
  });

  it("rejects an unknown step kind", () => {
    expect(() =>
      parseVerificationEvidence({
        ...validEvidence(),
        steps: [validStep({ kind: "hack" as VerificationStepV1["kind"] })],
      }),
    ).toThrow(VerificationContractError);
  });

  it("rejects an unknown step status", () => {
    expect(() =>
      parseVerificationEvidence({
        ...validEvidence(),
        steps: [
          validStep({ status: "exploded" as VerificationStepV1["status"] }),
        ],
      }),
    ).toThrow(VerificationContractError);
  });

  it("rejects a step HTTP status outside the bounded status range", () => {
    expect(() =>
      parseVerificationEvidence({
        ...validEvidence(),
        steps: [validStep({ httpStatus: 600 })],
      }),
    ).toThrow(VerificationContractError);
  });

  it("rejects a step artifact digest that is not sha256", () => {
    expect(() =>
      parseVerificationEvidence({
        ...validEvidence(),
        steps: [validStep({ digest: "sha1:abc" })],
      }),
    ).toThrow(VerificationContractError);
  });

  it("rejects an unbounded summary", () => {
    expect(() =>
      parseVerificationEvidence({
        ...validEvidence(),
        steps: [validStep({ summary: "x".repeat(10_000) })],
      }),
    ).toThrow(VerificationContractError);
  });

  it("requires cleanup facts in every evidence bundle", () => {
    const evidence = validEvidence();
    delete (evidence as Partial<VerificationEvidenceV1>).cleanup;
    expect(() => parseVerificationEvidence(evidence)).toThrow(
      VerificationContractError,
    );
  });

  it("rejects an artifact path that escapes the generated bundle", () => {
    expect(() =>
      parseVerificationEvidence({
        ...validEvidence(),
        artifactDigests: [
          { path: "../../etc/passwd", digest: compilationDigest },
        ],
      }),
    ).toThrow(VerificationContractError);
  });
});

describe("DraftDiffV1", () => {
  it("accepts a constrained reviewable Draft Diff", () => {
    expect(parseDraftDiff(validDraftDiff())).toEqual(validDraftDiff());
  });

  it("rejects an unknown diff operation", () => {
    expect(() =>
      parseDraftDiff({
        ...validDraftDiff(),
        operations: [{ op: "replace", path: "/domain/entities/0", value: {} }],
      }),
    ).toThrow(VerificationContractError);
  });

  it("rejects an operation carrying an arbitrary JSON value", () => {
    expect(() =>
      parseDraftDiff({
        ...validDraftDiff(),
        operations: [
          {
            op: "replace-input",
            entity: "expense",
            field: "status",
            value: { nested: { prompt: "raw" } },
          },
        ],
      }),
    ).toThrow(VerificationContractError);
  });

  it("rejects a source path or URL in the affected paths", () => {
    expect(() =>
      parseDraftDiff({
        ...validDraftDiff(),
        affectedPaths: ["../api/src/record-store.ts"],
      }),
    ).toThrow(VerificationContractError);
    expect(() =>
      parseDraftDiff({
        ...validDraftDiff(),
        affectedPaths: ["https://example.com/expense"],
      }),
    ).toThrow(VerificationContractError);
  });

  it("rejects a diff with no operations", () => {
    expect(() =>
      parseDraftDiff({ ...validDraftDiff(), operations: [] }),
    ).toThrow(VerificationContractError);
  });

  it("rejects a summary carrying a credential-like assignment", () => {
    expect(() =>
      parseDraftDiff({
        ...validDraftDiff(),
        summary: "password=hunter2 in the seed",
      }),
    ).toThrow(/redact/i);
  });
});

describe("DiagnosisV1", () => {
  it("accepts a diagnosis with a constrained Draft Diff", () => {
    expect(parseDiagnosis(validDiagnosis())).toEqual(validDiagnosis());
  });

  it("accepts a diagnosis with no proposed diff", () => {
    const diagnosis = { ...validDiagnosis(), draftDiff: null };
    expect(parseDiagnosis(diagnosis)).toEqual(diagnosis);
  });

  it("rejects an unknown diagnosis category", () => {
    expect(() =>
      parseDiagnosis({
        ...validDiagnosis(),
        category: "infrastructure" as DiagnosisV1["category"],
      }),
    ).toThrow(VerificationContractError);
  });

  it("rejects a diagnosis that names a non-Graph affected path", () => {
    expect(() =>
      parseDiagnosis({
        ...validDiagnosis(),
        affectedPaths: ["/generated/api/src/main.ts"],
      }),
    ).toThrow(VerificationContractError);
  });
});

describe("verification retry identity", () => {
  it("accepts an idempotent retry with the same run identity", () => {
    expect(() =>
      assertConsistentVerificationRetry(
        { verificationRunId: runId, compilationDigest },
        { verificationRunId: runId, compilationDigest },
      ),
    ).not.toThrow();
  });

  it("rejects a conflicting retry identity fail closed", () => {
    const otherDigest =
      "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    expect(() =>
      assertConsistentVerificationRetry(
        { verificationRunId: runId, compilationDigest },
        { verificationRunId: runId, compilationDigest: otherDigest },
      ),
    ).toThrow(/conflicting retry/i);
  });

  it("accepts distinct run identities", () => {
    expect(() =>
      assertConsistentVerificationRetry(
        { verificationRunId: runId, compilationDigest },
        { verificationRunId: "verify-other", compilationDigest },
      ),
    ).not.toThrow();
  });
});
