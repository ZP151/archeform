import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  hashApplicationGraph,
  parseDiagnosis,
  parseDraftDiff,
  VerificationContractError,
  type ApplicationGraphV1,
  type DraftDiffV1,
  type VerificationEvidenceV1,
  type VerificationStepV1,
} from "../src/index.js";
import { diagnoseVerification } from "../src/diagnosis.js";

const runId = "verify-01h3k6f";
const completedAt = "2026-08-06T12:00:00.000Z";

function digestOf(label: string): string {
  return `sha256:${createHash("sha256").update(label).digest("hex")}`;
}

function expenseGraph(): ApplicationGraphV1 {
  return {
    apiVersion: "factory.application-graph/v1",
    metadata: {
      id: "expense-approval",
      workspaceId: "local-workspace",
      name: "Expense approval",
    },
    page: {
      pages: [
        {
          id: "expense-list",
          route: "/expenses",
          title: "Expenses",
          blocks: [
            { id: "expense-table", type: "data-table", entity: "expense" },
          ],
        },
      ],
      navigation: [
        { id: "expenses", label: "Expenses", pageId: "expense-list" },
      ],
    },
    domain: {
      entities: [
        {
          key: "expense",
          label: "Expense",
          fields: [
            { key: "amount", type: "decimal", required: true },
            { key: "status", type: "enum", required: true },
          ],
          indexes: [{ fields: ["status"] }],
        },
      ],
      relations: [],
    },
    policy: {
      roles: ["employee", "manager"],
      permissions: [
        { role: "employee", resource: "expense", actions: ["create", "read"] },
        { role: "manager", resource: "expense", actions: ["read", "approve"] },
      ],
    },
    flow: {
      flows: [
        {
          id: "expense-approval",
          entity: "expense",
          initialState: "draft",
          states: ["draft", "submitted", "approved", "rejected"],
          events: ["submit", "approve", "reject"],
          transitions: [
            { from: "draft", event: "submit", to: "submitted" },
            {
              from: "submitted",
              event: "approve",
              to: "approved",
              roles: ["manager"],
            },
          ],
        },
      ],
    },
    integration: { providers: [], capabilities: [] },
    experience: {
      theme: { mode: "light", tokens: {} },
      locales: ["en"],
    },
  };
}

type IdempotencyField =
  | { readonly variant: "absent" }
  | { readonly variant: "wrong-type" }
  | { readonly variant: "not-unique" }
  | { readonly variant: "not-required" }
  | { readonly variant: "correct" };

function orderGraph(
  idempotency: IdempotencyField,
  graphId: string = "order-tracking",
  entityKey: string = "order",
): ApplicationGraphV1 {
  const graph = expenseGraph();
  const fields = [
    { key: "amount", type: "decimal" as const, required: true },
    { key: "status", type: "enum" as const, required: true },
  ];
  if (idempotency.variant !== "absent") {
    const key = {
      "wrong-type": { type: "text" as const, required: true },
      "not-unique": { type: "string" as const, required: true },
      "not-required": {
        type: "string" as const,
        unique: true,
        required: false,
      },
      correct: { type: "string" as const, required: true, unique: true },
    }[idempotency.variant];
    fields.push({ key: "idempotencyKey", ...key });
  }
  return {
    ...graph,
    metadata: { ...graph.metadata, id: graphId },
    // Every other section must agree with the renamed entity, or semantic
    // validation rejects the graph as a whole.
    page: { pages: [], navigation: [] },
    domain: {
      entities: [
        {
          key: entityKey,
          label: "Order",
          fields,
          indexes: [],
        },
      ],
      relations: [],
    },
    policy: {
      roles: ["customer"],
      permissions: [
        { role: "customer", resource: entityKey, actions: ["place"] },
      ],
    },
    flow: { flows: [] },
  };
}

function failedStep(
  stepId: string,
  kind: VerificationStepV1["kind"],
  failureCode: string | undefined,
  facts: Partial<VerificationStepV1> = {},
): VerificationStepV1 {
  return {
    stepId,
    kind,
    status: "failed",
    summary: "Bounded probe summary.",
    failureCode,
    durationMs: 50,
    ...facts,
  };
}

function evidence(
  steps: readonly VerificationStepV1[],
  verificationRunId: string = runId,
): VerificationEvidenceV1 {
  return {
    apiVersion: "factory.verification-evidence/v1",
    verificationRunId,
    compilationDigest: digestOf("compilation"),
    steps: [
      ...steps,
      {
        stepId: "cleanup",
        kind: "cleanup",
        status: "passed",
        summary: "Stopped the preview and removed its resources.",
        durationMs: 25,
      },
    ],
    cleanup: {
      succeeded: true,
      summary: "Stopped the preview and removed its resources.",
    },
    artifactDigests: [
      { path: "docker-compose.yml", digest: digestOf("compose") },
    ],
    completedAt,
  };
}

function lockFixture(
  graphChecksum: string,
  identityPolicyBound: boolean,
): unknown {
  return {
    apiVersion: "factory.composition/v1",
    applicationGraphChecksum: graphChecksum,
    packages: identityPolicyBound
      ? [
          {
            lock: {
              key: "core.identity-policy",
              version: "1.2.3",
              packageRoot: "packages/core/identity-policy",
              manifestDigest: digestOf("identity-policy"),
              lifecycle: "golden",
            },
            bindings: {},
          },
        ]
      : [],
    resolvedContributionDigests: [],
    providedAndRequiredInterfaces: [],
    targetRuntimeInterfaceVersions: [],
    resolvedDependencyOrder: [],
    lockDigest: digestOf("lock"),
  };
}

describe("diagnoseVerification", () => {
  it("maps a no-response health probe to the runtime category with no diff", () => {
    const graph = expenseGraph();
    const diagnosis = diagnoseVerification(
      evidence([
        failedStep("health", "health", "health.unreachable", {
          httpStatus: undefined,
        }),
      ]),
      graph,
      lockFixture(hashApplicationGraph(graph), true),
    );

    expect(diagnosis.category).toBe("runtime");
    expect(diagnosis.code).toBe("runtime.unreachable");
    expect(diagnosis.affectedPaths).toEqual(["/metadata"]);
    expect(diagnosis.draftDiff).toBeNull();
    expect(diagnosis.verificationRunId).toBe(runId);
    expect(diagnosis.diagnosisId).toBe(`diagnosis-${runId}`);
    expect(parseDiagnosis(diagnosis)).toEqual(diagnosis);
  });

  it("maps a migration failure to the runtime category pointing at the domain root", () => {
    const graph = expenseGraph();
    const diagnosis = diagnoseVerification(
      evidence([failedStep("migration", "migration", "migration.failed")]),
      graph,
      lockFixture(hashApplicationGraph(graph), true),
    );

    expect(diagnosis.category).toBe("runtime");
    expect(diagnosis.code).toBe("runtime.migration_failed");
    expect(diagnosis.affectedPaths).toEqual(["/domain"]);
    expect(diagnosis.draftDiff).toBeNull();
  });

  it("maps an unreachable API probe to the journey entity path", () => {
    const graph = expenseGraph();
    const diagnosis = diagnoseVerification(
      evidence([
        failedStep("api", "api", "api.unreachable", {
          action: "expense.create",
        }),
      ]),
      graph,
      lockFixture(hashApplicationGraph(graph), true),
    );

    expect(diagnosis.category).toBe("runtime");
    expect(diagnosis.affectedPaths).toEqual(["/domain/expense"]);
    expect(diagnosis.draftDiff).toBeNull();
  });

  it("maps a declared status mismatch to the binding category with no diff", () => {
    const graph = expenseGraph();
    const diagnosis = diagnoseVerification(
      evidence([
        failedStep(
          "role-journey",
          "role-journey",
          "role-journey.unexpected_status",
          {
            httpStatus: 400,
            role: "manager",
            action: "expense.approve",
          },
        ),
      ]),
      graph,
      lockFixture(hashApplicationGraph(graph), true),
    );

    expect(diagnosis.category).toBe("binding");
    expect(diagnosis.code).toBe("binding.status_mismatch");
    expect(diagnosis.affectedPaths).toEqual(["/domain/expense"]);
    expect(diagnosis.draftDiff).toBeNull();
  });

  it("proposes an add-binding diff when a declared denial is not enforced because identity-policy is unbound", () => {
    const graph = expenseGraph();
    const diagnosis = diagnoseVerification(
      evidence([
        failedStep(
          "authorization-denial",
          "authorization-denial",
          "authorization.denial_mismatch",
          { httpStatus: 200, role: "employee", action: "expense.approve" },
        ),
      ]),
      graph,
      lockFixture(hashApplicationGraph(graph), false),
    );

    expect(diagnosis.category).toBe("binding");
    expect(diagnosis.code).toBe("binding.denial_policy_not_bound");
    expect(diagnosis.affectedPaths).toEqual(["/domain/expense"]);

    const diff = diagnosis.draftDiff;
    expect(diff).not.toBeNull();
    expect(parseDraftDiff(diff as DraftDiffV1)).toEqual(diff);
    expect(diff?.apiVersion).toBe("factory.draft-diff/v1");
    expect(diff?.baseDraftRevisionId).toBe("draft-expense-approval");
    expect(diff?.baseGraphHash).toBe(hashApplicationGraph(graph));
    expect(diff?.affectedPaths).toEqual(["/domain/expense"]);
    expect(diff?.operations).toEqual([
      {
        op: "add-binding",
        capability: "core.identity-policy",
        graphSymbol: "graph.domain.expense",
      },
    ]);
    // The rationale code is a deterministic, underscore-free stable code.
    expect(diff?.rationaleCode).toBe("binding.denial-policy-not-bound");
  });

  it("emits no diff when the denial is not enforced despite identity-policy being bound", () => {
    const graph = expenseGraph();
    const diagnosis = diagnoseVerification(
      evidence([
        failedStep(
          "authorization-denial",
          "authorization-denial",
          "authorization.denial_mismatch",
          { httpStatus: 200, role: "employee", action: "expense.approve" },
        ),
      ]),
      graph,
      lockFixture(hashApplicationGraph(graph), true),
    );

    expect(diagnosis.category).toBe("binding");
    expect(diagnosis.code).toBe("binding.denial_not_enforced");
    expect(diagnosis.draftDiff).toBeNull();
  });

  it("proposes a unique-constraint change when the entity's idempotencyKey field is not unique", () => {
    const graph = orderGraph({ variant: "not-unique" });
    const diagnosis = diagnoseVerification(
      evidence([
        failedStep(
          "idempotency",
          "idempotency",
          "idempotency.replay_not_rejected",
          {
            httpStatus: 200,
            role: "customer",
            action: "order.place",
          },
        ),
      ]),
      graph,
      lockFixture(hashApplicationGraph(graph), true),
    );

    expect(diagnosis.category).toBe("capability");
    expect(diagnosis.code).toBe("capability.idempotency_field_not_unique");
    expect(diagnosis.draftDiff?.operations).toEqual([
      {
        op: "change-constraint",
        entity: "order",
        field: "idempotencyKey",
        constraint: "unique",
        value: true,
      },
    ]);
    expect(diagnosis.draftDiff?.baseDraftRevisionId).toBe(
      "draft-order-tracking",
    );
    expect(diagnosis.draftDiff?.rationaleCode).toBe(
      "capability.idempotency-field-not-unique",
    );
  });

  it("proposes a type change when the idempotencyKey field has the wrong type", () => {
    const graph = orderGraph({ variant: "wrong-type" });
    const diagnosis = diagnoseVerification(
      evidence([
        failedStep(
          "idempotency",
          "idempotency",
          "idempotency.replay_not_rejected",
          {
            httpStatus: 200,
            action: "order.place",
          },
        ),
      ]),
      graph,
      lockFixture(hashApplicationGraph(graph), true),
    );

    expect(diagnosis.code).toBe("capability.idempotency_field_wrong_type");
    expect(diagnosis.draftDiff?.operations).toEqual([
      {
        op: "change-constraint",
        entity: "order",
        field: "idempotencyKey",
        constraint: "type",
        value: "string",
      },
    ]);
  });

  it("proposes a required change when the idempotencyKey field is optional", () => {
    const graph = orderGraph({ variant: "not-required" });
    const diagnosis = diagnoseVerification(
      evidence([
        failedStep(
          "idempotency",
          "idempotency",
          "idempotency.replay_not_rejected",
          {
            httpStatus: 200,
            action: "order.place",
          },
        ),
      ]),
      graph,
      lockFixture(hashApplicationGraph(graph), true),
    );

    expect(diagnosis.code).toBe("capability.idempotency_field_not_required");
    expect(diagnosis.draftDiff?.operations).toEqual([
      {
        op: "change-constraint",
        entity: "order",
        field: "idempotencyKey",
        constraint: "required",
        value: true,
      },
    ]);
  });

  it("emits no diff when the idempotencyKey field is absent", () => {
    const graph = orderGraph({ variant: "absent" });
    const diagnosis = diagnoseVerification(
      evidence([
        failedStep(
          "idempotency",
          "idempotency",
          "idempotency.replay_not_rejected",
          {
            httpStatus: 200,
            action: "order.place",
          },
        ),
      ]),
      graph,
      lockFixture(hashApplicationGraph(graph), true),
    );

    expect(diagnosis.category).toBe("capability");
    expect(diagnosis.code).toBe("capability.idempotency_field_missing");
    expect(diagnosis.draftDiff).toBeNull();
  });

  it("emits no diff when the idempotencyKey field is correct but replays are still accepted", () => {
    const graph = orderGraph({ variant: "correct" });
    const diagnosis = diagnoseVerification(
      evidence([
        failedStep(
          "idempotency",
          "idempotency",
          "idempotency.replay_not_rejected",
          {
            httpStatus: 200,
            action: "order.place",
          },
        ),
      ]),
      graph,
      lockFixture(hashApplicationGraph(graph), true),
    );

    expect(diagnosis.code).toBe("capability.idempotency_not_enforced");
    expect(diagnosis.draftDiff).toBeNull();
  });

  it("reports a missing domain entity as a graph defect with no diff", () => {
    const graph = expenseGraph();
    const diagnosis = diagnoseVerification(
      evidence([
        failedStep("api", "api", "api.unexpected_status", {
          httpStatus: 404,
          action: "warehouse.create",
        }),
      ]),
      graph,
      lockFixture(hashApplicationGraph(graph), true),
    );

    expect(diagnosis.category).toBe("graph");
    expect(diagnosis.code).toBe("graph.unknown_entity");
    expect(diagnosis.affectedPaths).toEqual(["/domain"]);
    expect(diagnosis.draftDiff).toBeNull();
  });

  it("reports a composition lock that does not match the graph checksum as a target defect", () => {
    const graph = expenseGraph();
    const diagnosis = diagnoseVerification(
      evidence([
        failedStep("health", "health", "health.failed", { httpStatus: 503 }),
      ]),
      graph,
      lockFixture(digestOf("other-graph"), true),
    );

    expect(diagnosis.category).toBe("target");
    expect(diagnosis.code).toBe("target.graph_lock_mismatch");
    expect(diagnosis.affectedPaths).toEqual(["/metadata"]);
    expect(diagnosis.draftDiff).toBeNull();
  });

  it("maps a crashed probe to an unknown category with no diff", () => {
    const graph = expenseGraph();
    const diagnosis = diagnoseVerification(
      evidence([failedStep("api", "api", "probe.crashed")]),
      graph,
      lockFixture(hashApplicationGraph(graph), true),
    );

    expect(diagnosis.category).toBe("unknown");
    expect(diagnosis.code).toBe("unknown.probe_crashed");
    expect(diagnosis.affectedPaths).toEqual(["/metadata"]);
    expect(diagnosis.draftDiff).toBeNull();
  });

  it("maps a failed step without a failure code (cleanup) to a runtime failure", () => {
    const graph = expenseGraph();
    // The real lifecycle's cleanup step is the only failure-code-less step:
    // stepId "cleanup", kind "cleanup", status failed, no failureCode.
    const cleanupEvidence: VerificationEvidenceV1 = {
      ...evidence([]),
      steps: [
        {
          stepId: "cleanup",
          kind: "cleanup",
          status: "failed",
          summary: "Preview cleanup failed: compose down failed.",
          durationMs: 30,
        },
      ],
      cleanup: {
        succeeded: false,
        summary: "Preview cleanup failed: compose down failed.",
      },
    };
    const diagnosis = diagnoseVerification(
      cleanupEvidence,
      graph,
      lockFixture(hashApplicationGraph(graph), true),
    );

    expect(diagnosis.category).toBe("runtime");
    expect(diagnosis.code).toBe("runtime.cleanup_failed");
    expect(diagnosis.draftDiff).toBeNull();
  });

  it("diagnoses only the first failed step in evidence order", () => {
    const graph = expenseGraph();
    const diagnosis = diagnoseVerification(
      evidence([
        failedStep("health", "health", "health.unreachable"),
        failedStep("api", "api", "api.unexpected_status", {
          httpStatus: 404,
          action: "expense.create",
        }),
      ]),
      graph,
      lockFixture(hashApplicationGraph(graph), true),
    );

    expect(diagnosis.code).toBe("runtime.unreachable");
  });

  it("is deterministic: identical inputs produce identical diagnoses", () => {
    const graph = expenseGraph();
    const input = [
      evidence([
        failedStep("api", "api", "api.unexpected_status", {
          httpStatus: 404,
          action: "expense.create",
        }),
      ]),
      graph,
      lockFixture(hashApplicationGraph(graph), true),
    ] as const;
    expect(diagnoseVerification(...input)).toEqual(
      diagnoseVerification(...input),
    );
  });

  it("never copies hostile evidence fields into the diagnosis", () => {
    const graph = expenseGraph();
    // Schema-legal but hostile content: the mapper must never propagate it.
    const hostileSummary = "token value 12345 leaked from a response body";
    const diagnosis = diagnoseVerification(
      evidence([
        failedStep("api", "api", "api.unexpected_status", {
          httpStatus: 404,
          summary: hostileSummary,
          action: "expense.create",
        }),
      ]),
      graph,
      lockFixture(hashApplicationGraph(graph), true),
    );

    expect(diagnosis.summary).not.toContain("12345");
    expect(diagnosis.summary).not.toContain("token");
    expect(diagnosis.affectedPaths).toEqual(["/domain/expense"]);
    expect(parseDiagnosis(diagnosis)).toEqual(diagnosis);
  });

  it("fails closed on an unrecognized failure code with no diff", () => {
    const graph = expenseGraph();
    const diagnosis = diagnoseVerification(
      evidence([
        failedStep("api", "api", "mystery.failure", {
          httpStatus: 500,
          action: "expense.create",
        }),
      ]),
      graph,
      lockFixture(hashApplicationGraph(graph), true),
    );

    expect(diagnosis.category).toBe("unknown");
    expect(diagnosis.code).toBe("unknown.unmapped_failure");
    expect(diagnosis.draftDiff).toBeNull();
    expect(parseDiagnosis(diagnosis)).toEqual(diagnosis);
  });

  it("fails closed on a hostile action that cannot resolve to a graph path", () => {
    const graph = expenseGraph();
    const diagnosis = diagnoseVerification(
      evidence([
        failedStep("api", "api", "api.unexpected_status", {
          httpStatus: 404,
          action: "..",
        }),
      ]),
      graph,
      lockFixture(hashApplicationGraph(graph), true),
    );

    expect(diagnosis.category).toBe("graph");
    expect(diagnosis.affectedPaths).toEqual(["/domain"]);
    expect(diagnosis.draftDiff).toBeNull();
  });

  it("fails closed when the journey entity key is a blocked graph path segment", () => {
    // The entity-key schema permits "constructor", but graphEvidencePath
    // rejects it as a path segment; the diagnosis must never carry a path
    // the contract itself refuses, so the entity is not addressable.
    const graph = orderGraph(
      { variant: "correct" },
      "constructor-graph",
      "constructor",
    );
    const diagnosis = diagnoseVerification(
      evidence([
        failedStep("api", "api", "api.unexpected_status", {
          httpStatus: 404,
          action: "constructor.create",
        }),
      ]),
      graph,
      lockFixture(hashApplicationGraph(graph), true),
    );

    expect(diagnosis.category).toBe("graph");
    expect(diagnosis.code).toBe("graph.unknown_entity");
    expect(diagnosis.affectedPaths).toEqual(["/domain"]);
    expect(diagnosis.draftDiff).toBeNull();
    expect(parseDiagnosis(diagnosis)).toEqual(diagnosis);
  });

  it("fails closed for denial mismatch on a blocked-segment entity", () => {
    const graph = orderGraph(
      { variant: "correct" },
      "prototype-graph",
      "prototype",
    );
    const diagnosis = diagnoseVerification(
      evidence([
        failedStep(
          "authorization",
          "authorization-denial",
          "authorization.denial_mismatch",
          {
            httpStatus: 403,
            action: "prototype.approve",
          },
        ),
      ]),
      graph,
      lockFixture(hashApplicationGraph(graph), false),
    );

    expect(diagnosis.category).toBe("graph");
    expect(diagnosis.code).toBe("graph.unknown_entity");
    expect(diagnosis.affectedPaths).toEqual(["/domain"]);
    expect(diagnosis.draftDiff).toBeNull();
    expect(parseDiagnosis(diagnosis)).toEqual(diagnosis);
  });

  it("fails closed for idempotency replay on a blocked-segment entity", () => {
    const graph = orderGraph(
      { variant: "correct" },
      "constructor-graph",
      "constructor",
    );
    const diagnosis = diagnoseVerification(
      evidence([
        failedStep(
          "idempotency",
          "idempotency",
          "idempotency.replay_not_rejected",
          {
            httpStatus: 200,
            action: "constructor.place",
          },
        ),
      ]),
      graph,
      lockFixture(hashApplicationGraph(graph), true),
    );

    expect(diagnosis.category).toBe("graph");
    expect(diagnosis.code).toBe("graph.unknown_entity");
    expect(diagnosis.affectedPaths).toEqual(["/domain"]);
    expect(diagnosis.draftDiff).toBeNull();
    expect(parseDiagnosis(diagnosis)).toEqual(diagnosis);
  });

  it("never emits a blocked-segment entity path for runtime unreachable codes", () => {
    const graph = orderGraph(
      { variant: "correct" },
      "constructor-graph",
      "constructor",
    );
    const diagnosis = diagnoseVerification(
      evidence([
        failedStep("api", "api", "api.unreachable", {
          action: "constructor.create",
        }),
      ]),
      graph,
      lockFixture(hashApplicationGraph(graph), true),
    );

    expect(diagnosis.category).toBe("runtime");
    expect(diagnosis.code).toBe("runtime.unreachable");
    expect(diagnosis.affectedPaths).toEqual(["/metadata"]);
    expect(parseDiagnosis(diagnosis)).toEqual(diagnosis);
  });

  it("fails closed on a missing action identity for entity-derived codes", () => {
    const graph = expenseGraph();
    const diagnosis = diagnoseVerification(
      evidence([
        failedStep(
          "idempotency",
          "idempotency",
          "idempotency.replay_not_rejected",
          {
            httpStatus: 200,
          },
        ),
      ]),
      graph,
      lockFixture(hashApplicationGraph(graph), true),
    );

    expect(diagnosis.category).toBe("unknown");
    expect(diagnosis.code).toBe("unknown.missing_identity");
    expect(diagnosis.draftDiff).toBeNull();
  });

  it("rejects evidence with no failed steps", () => {
    const graph = expenseGraph();
    const passing: VerificationEvidenceV1 = {
      ...evidence([]),
      steps: [
        {
          stepId: "health",
          kind: "health",
          status: "passed",
          summary: "Health endpoint returned 200.",
          durationMs: 20,
        },
      ],
    };
    expect(() =>
      diagnoseVerification(
        passing,
        graph,
        lockFixture(hashApplicationGraph(graph), true),
      ),
    ).toThrow(VerificationContractError);
  });

  it("protects the immutable Published Graph from draft and exchange envelopes", () => {
    const graph = expenseGraph();
    const checksum = hashApplicationGraph(graph);
    const lock = lockFixture(checksum, true);

    // A mutable Draft revision envelope is not a Published Graph.
    expect(() =>
      diagnoseVerification(
        evidence([failedStep("health", "health", "health.unreachable")]),
        {
          id: "draft-expense-approval",
          status: "draft",
          revision: 1,
          graph,
        },
        lock,
      ),
    ).toThrow(/Published Graph/i);

    // A published-graph exchange envelope is not a bare Published Graph either.
    expect(() =>
      diagnoseVerification(
        evidence([failedStep("health", "health", "health.unreachable")]),
        {
          apiVersion: "factory.published-graph-exchange/v1",
          kind: "published-application-graph",
          publishedRevision: { revisionNumber: 3, graphHash: checksum },
          graph,
        },
        lock,
      ),
    ).toThrow(/Published Graph/i);
  });

  it("binds every proposed diff to a draft base, never to the immutable graph", () => {
    const graph = orderGraph({ variant: "not-unique" });
    const diagnosis = diagnoseVerification(
      evidence([
        failedStep(
          "idempotency",
          "idempotency",
          "idempotency.replay_not_rejected",
          {
            httpStatus: 200,
            action: "order.place",
          },
        ),
      ]),
      graph,
      lockFixture(hashApplicationGraph(graph), true),
    );

    const diff = diagnosis.draftDiff as DraftDiffV1;
    expect(diff.baseDraftRevisionId).toMatch(/^draft-[a-z0-9-]+$/);
    // The base hash preserves only the immutable snapshot's content hash.
    expect(diff.baseGraphHash).toBe(hashApplicationGraph(graph));
    // Operations never carry source paths, URLs, or credentials.
    for (const operation of diff.operations) {
      expect(JSON.stringify(operation)).not.toMatch(
        /https?:|\.\.\/|Bearer|Basic /,
      );
    }
  });

  it("rejects a composition lock that is not contract-shaped", () => {
    const graph = expenseGraph();
    expect(() =>
      diagnoseVerification(
        evidence([failedStep("health", "health", "health.unreachable")]),
        graph,
        { apiVersion: "factory.composition/v1", packages: "hostile" },
      ),
    ).toThrow(VerificationContractError);
  });

  it("rejects evidence that is not contract-shaped", () => {
    const graph = expenseGraph();
    expect(() =>
      diagnoseVerification(
        { steps: [{ status: "failed" }] } as unknown as VerificationEvidenceV1,
        graph,
        lockFixture(hashApplicationGraph(graph), true),
      ),
    ).toThrow(VerificationContractError);
  });

  it("bounds a schema-extreme run identity so the derived diagnosis id stays contract-shaped", () => {
    const graph = expenseGraph();
    // 128 characters is the factoryId maximum; the derived id must not exceed it.
    const extremeRunId = `verify-${"a".repeat(121)}`;
    const diagnosis = diagnoseVerification(
      evidence(
        [failedStep("health", "health", "health.unreachable")],
        extremeRunId,
      ),
      graph,
      lockFixture(hashApplicationGraph(graph), true),
    );

    expect(diagnosis.diagnosisId.startsWith("diagnosis-")).toBe(true);
    expect(diagnosis.diagnosisId.length).toBeLessThanOrEqual(128);
    expect(parseDiagnosis(diagnosis)).toEqual(diagnosis);
  });

  it("bounds a schema-extreme graph id so the derived draft base id stays contract-shaped", () => {
    const graph = orderGraph({ variant: "not-unique" }, "a".repeat(128));
    const diagnosis = diagnoseVerification(
      evidence([
        failedStep(
          "idempotency",
          "idempotency",
          "idempotency.replay_not_rejected",
          {
            httpStatus: 200,
            action: "order.place",
          },
        ),
      ]),
      graph,
      lockFixture(hashApplicationGraph(graph), true),
    );

    const diff = diagnosis.draftDiff as DraftDiffV1;
    expect(diff.baseDraftRevisionId.startsWith("draft-")).toBe(true);
    expect(diff.baseDraftRevisionId.length).toBeLessThanOrEqual(128);
    expect(parseDraftDiff(diff)).toEqual(diff);
    expect(parseDiagnosis(diagnosis)).toEqual(diagnosis);
  });
});
