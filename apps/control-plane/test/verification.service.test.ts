import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createCapabilityCompositionLock } from "@factory/capabilities";
import { hashApplicationGraph } from "@factory/graph";

import type { ApplicationGraphV1 } from "@factory/graph";
import type { PrismaService } from "../src/prisma.service.js";
import type { VerificationRunQueue } from "../src/verification-run-queue.js";
import { VerificationService } from "../src/verification/verification.service.js";
import { localApplicationGraph } from "./application-graph.fixture.js";

const graph: ApplicationGraphV1 = {
  ...localApplicationGraph,
  metadata: { ...localApplicationGraph.metadata, id: "expense-approval" },
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
};

function digestOf(label: string): string {
  return `sha256:${createHash("sha256").update(label).digest("hex")}`;
}

function prismaMock() {
  const prisma = {
    workspace: { upsert: vi.fn() },
    applicationGraph: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    draftRevision: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
    publishedRevision: {
      count: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    compilation: {
      count: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    artifact: { createMany: vi.fn(), findFirst: vi.fn() },
    previewRun: {
      count: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    verificationRun: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  };
  return {
    ...prisma,
    $transaction: vi.fn(
      async (operation: (transaction: typeof prisma) => Promise<unknown>) =>
        operation(prisma),
    ),
  };
}

const graphHash = hashApplicationGraph(graph);

const compositionLock = createCapabilityCompositionLock({
  graphChecksum: graphHash,
  selections: [],
});

const artifactRow = {
  id: "artifact-1",
  compilationId: "compilation-1",
  kind: "compiled",
  path: "docker-compose.yml",
  digest: digestOf("compose"),
  mediaType: "text/yaml",
  sizeBytes: 512,
  metadata: {},
  createdAt: new Date("2026-08-07T00:00:00.000Z"),
};

const compilation = {
  id: "compilation-1",
  publishedRevisionId: "published-1",
  sequence: 1,
  target: "application-bundle",
  inputGraphHash: graphHash,
  compilerVersion: "0.1.0",
  result: { status: "succeeded" },
  compiledAt: new Date("2026-08-07T00:00:00.000Z"),
  publishedRevision: {
    id: "published-1",
    applicationGraphId: "graph-1",
    sourceDraftRevisionId: "draft-cuid-0",
    revisionNumber: 1,
    graph,
    graphHash,
    compositionLock,
    compositionLockHash: compositionLock.lockDigest,
    publishedAt: new Date("2026-08-07T00:00:00.000Z"),
  },
  artifacts: [artifactRow],
};

// Standalone published revision used by the approval tests; the lock is not
// needed there, so it is kept null to prove the approval path never reads it.
const publishedRevision = {
  id: "published-1",
  applicationGraphId: "graph-1",
  sourceDraftRevisionId: "draft-cuid-0",
  revisionNumber: 1,
  graph,
  graphHash,
  compositionLock: null,
  compositionLockHash: null,
  publishedAt: new Date("2026-08-07T00:00:00.000Z"),
};

const latestDraft = {
  id: "draft-cuid-1",
  applicationGraphId: "graph-1",
  revisionNumber: 5,
  graph,
};

const runRow = {
  id: "run-cuid-1",
  verificationRunId: "verify-01h3k6f",
  compilationId: "compilation-1",
  profileKey: "expense-approval",
  status: "pending",
  startedAt: null,
  completedAt: null,
  stepIds: [],
  evidenceDigest: null,
  evidence: null,
  diagnosis: null,
  draftDiff: null,
  createdAt: new Date("2026-08-07T00:00:00.000Z"),
  updatedAt: new Date("2026-08-07T00:00:00.000Z"),
};

function evidenceInput(overrides: Record<string, unknown> = {}) {
  return {
    apiVersion: "factory.verification-evidence/v1",
    verificationRunId: "verify-01h3k6f",
    compilationDigest: digestOf("compilation"),
    steps: [
      {
        stepId: "health",
        kind: "health",
        status: "passed",
        summary: "Health endpoint returned 200.",
        durationMs: 30,
      },
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
    completedAt: "2026-08-07T00:00:00.000Z",
    ...overrides,
  };
}

function failedEvidenceInput() {
  const input = evidenceInput();
  input.steps = [
    {
      stepId: "authorization-denial",
      kind: "authorization-denial",
      status: "failed",
      failureCode: "authorization.denial_mismatch",
      summary: "Declared denial did not match the observed response.",
      httpStatus: 403,
      action: "expense.approve",
      durationMs: 40,
    },
    ...input.steps,
  ];
  return input;
}

const unprocessable = (promise: Promise<unknown>, code: string) =>
  expect(promise).rejects.toSatisfy(
    (error: unknown) =>
      error instanceof UnprocessableEntityException &&
      (error.getResponse() as { code?: string }).code === code,
  );

function queueMock() {
  return { enqueue: vi.fn().mockResolvedValue(undefined) };
}

function verificationService(
  prisma: ReturnType<typeof prismaMock>,
  queue = queueMock(),
) {
  return new VerificationService(
    prisma as unknown as PrismaService,
    queue as unknown as VerificationRunQueue,
  );
}

describe("VerificationService", () => {
  it("rejects a create run request with unknown or missing fields", async () => {
    const prisma = prismaMock();
    const service = verificationService(prisma);

    await expect(
      service.createRun("compilation-1", { verificationRunId: "x" }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.createRun("compilation-1", {
        verificationRunId: "verify-01h3k6f",
        profileKey: "expense-approval",
        evidence: { raw: "unexpected" },
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("binds a verification run to a succeeded compilation identity", async () => {
    const prisma = prismaMock();
    prisma.compilation.findUnique.mockResolvedValue(compilation);
    prisma.verificationRun.create.mockResolvedValue(runRow);
    const service = verificationService(prisma);

    await expect(
      service.createRun("compilation-missing", {
        verificationRunId: "verify-01h3k6f",
        profileKey: "expense-approval",
      }),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.verificationRun.create).not.toHaveBeenCalled();

    const result = await service.createRun("compilation-1", {
      verificationRunId: "verify-01h3k6f",
      profileKey: "expense-approval",
    });
    expect(result).toEqual(runRow);
    expect(prisma.verificationRun.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        verificationRunId: "verify-01h3k6f",
        compilationId: "compilation-1",
        profileKey: "expense-approval",
        status: "pending",
      }),
    });
  });

  it("rejects a run against a compilation that never succeeded", async () => {
    const prisma = prismaMock();
    prisma.compilation.findUnique.mockResolvedValue({
      ...compilation,
      result: { status: "queued" },
    });
    const service = verificationService(prisma);

    await expect(
      service.createRun("compilation-1", {
        verificationRunId: "verify-01h3k6f",
        profileKey: "expense-approval",
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it("is idempotent on retry with the same run identity and compilation", async () => {
    const prisma = prismaMock();
    prisma.compilation.findUnique.mockResolvedValue(compilation);
    prisma.verificationRun.findUnique.mockResolvedValue(runRow);
    const service = verificationService(prisma);

    const result = await service.createRun("compilation-1", {
      verificationRunId: "verify-01h3k6f",
      profileKey: "expense-approval",
    });
    expect(result).toEqual(runRow);
    expect(prisma.verificationRun.create).not.toHaveBeenCalled();
  });

  it("rejects a conflicting retry identity on a different compilation", async () => {
    const prisma = prismaMock();
    prisma.compilation.findUnique.mockResolvedValue({
      ...compilation,
      id: "compilation-2",
    });
    prisma.verificationRun.findUnique.mockResolvedValue({
      ...runRow,
      compilationId: "compilation-2",
    });
    const service = verificationService(prisma);

    await expect(
      service.createRun("compilation-1", {
        verificationRunId: "verify-01h3k6f",
        profileKey: "expense-approval",
      }),
    ).rejects.toThrow(ConflictException);
  });

  it("rejects a malformed run identity and profile key", async () => {
    const prisma = prismaMock();
    prisma.compilation.findUnique.mockResolvedValue(compilation);
    const service = verificationService(prisma);

    await expect(
      service.createRun("compilation-1", {
        verificationRunId: "Bad ID!",
        profileKey: "expense-approval",
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.createRun("compilation-1", {
        verificationRunId: "verify-01h3k6f",
        profileKey: "Bad Key!",
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("reports evidence and marks a fully passing run succeeded", async () => {
    const prisma = prismaMock();
    prisma.verificationRun.findUnique.mockResolvedValue(runRow);
    prisma.verificationRun.update.mockResolvedValue({
      ...runRow,
      status: "succeeded",
    });
    const service = verificationService(prisma);

    const result = await service.reportEvidence("verify-01h3k6f", {
      evidence: evidenceInput(),
    });
    expect(result.status).toBe("succeeded");
    const update = prisma.verificationRun.update.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(update.data.evidenceDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(update.data.status).toBe("succeeded");
    expect(update.data.stepIds).toEqual(["health", "cleanup"]);
    expect(update.data.startedAt).toBeInstanceOf(Date);
    expect(update.data.completedAt).toBeInstanceOf(Date);
  });

  it("marks a run failed when evidence contains a failed step", async () => {
    const prisma = prismaMock();
    prisma.verificationRun.findUnique.mockResolvedValue(runRow);
    prisma.verificationRun.update.mockResolvedValue({
      ...runRow,
      status: "failed",
    });
    const service = verificationService(prisma);

    const result = await service.reportEvidence("verify-01h3k6f", {
      evidence: failedEvidenceInput(),
    });
    expect(result.status).toBe("failed");
  });

  it("rejects evidence whose run identity does not match the addressed run", async () => {
    const prisma = prismaMock();
    prisma.verificationRun.findUnique.mockResolvedValue(runRow);
    const service = verificationService(prisma);

    await expect(
      service.reportEvidence("verify-other-run", {
        evidence: evidenceInput(),
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.verificationRun.update).not.toHaveBeenCalled();
  });

  it("rejects evidence that is not contract-shaped or leaks secrets", async () => {
    const prisma = prismaMock();
    prisma.verificationRun.findUnique.mockResolvedValue(runRow);
    const service = verificationService(prisma);

    await expect(
      service.reportEvidence("verify-01h3k6f", {
        evidence: { apiVersion: "factory.verification-evidence/v1" },
      }),
    ).rejects.toThrow();
    await expect(
      service.reportEvidence("verify-01h3k6f", {
        evidence: evidenceInput({
          steps: [
            {
              stepId: "health",
              kind: "health",
              status: "passed",
              summary: "api_key=secret leaked from a response body",
              durationMs: 30,
            },
            ...evidenceInput().steps,
          ],
        }),
      }),
    ).rejects.toThrow();
    expect(prisma.verificationRun.update).not.toHaveBeenCalled();
  });

  it("rejects an illegal status transition with a different evidence digest", async () => {
    const prisma = prismaMock();
    const completed = {
      ...runRow,
      status: "failed",
      startedAt: new Date("2026-08-07T00:00:00.000Z"),
      completedAt: new Date("2026-08-07T00:00:00.000Z"),
      evidenceDigest: digestOf("other-evidence"),
      stepIds: ["authorization-denial", "health", "cleanup"],
    };
    prisma.verificationRun.findUnique.mockResolvedValue(completed);
    const service = verificationService(prisma);

    await expect(
      service.reportEvidence("verify-01h3k6f", {
        evidence: failedEvidenceInput(),
      }),
    ).rejects.toThrow(ConflictException);
    expect(prisma.verificationRun.update).not.toHaveBeenCalled();
  });

  it("accepts an identical digest re-report as an idempotent retry", async () => {
    const prisma = prismaMock();
    prisma.verificationRun.findUnique.mockResolvedValue(runRow);
    prisma.verificationRun.update.mockResolvedValue({
      ...runRow,
      status: "failed",
    });
    const service = verificationService(prisma);
    await service.reportEvidence("verify-01h3k6f", {
      evidence: failedEvidenceInput(),
    });

    const firstDigest = (
      prisma.verificationRun.update.mock.calls[0][0] as {
        data: { evidenceDigest: string };
      }
    ).data.evidenceDigest;
    const terminal = {
      ...runRow,
      status: "failed",
      evidenceDigest: firstDigest,
    };
    prisma.verificationRun.findUnique.mockResolvedValue(terminal);

    const result = await service.reportEvidence("verify-01h3k6f", {
      evidence: failedEvidenceInput(),
    });
    expect(result).toEqual(terminal);
    expect(prisma.verificationRun.update).toHaveBeenCalledTimes(1);
  });

  it("rejects an approval for an unknown verification run", async () => {
    const prisma = prismaMock();
    prisma.verificationRun.findUnique.mockResolvedValue(null);
    const service = verificationService(prisma);

    await expect(
      service.approveDraftDiff("verify-01h3k6f", {
        draftDiff: {
          apiVersion: "factory.draft-diff/v1",
          baseDraftRevisionId: "draft-expense-approval",
          baseGraphHash: graphHash,
          operations: [
            {
              op: "change-constraint",
              entity: "expense",
              field: "idempotencyKey",
              constraint: "unique",
              value: true,
            },
          ],
          affectedPaths: ["/domain/expense"],
          rationaleCode: "capability.idempotency-field-not-unique",
          summary: "Make the idempotencyKey field unique.",
        },
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it("approves a change-constraint draft diff into the latest mutable draft", async () => {
    const prisma = prismaMock();
    prisma.verificationRun.findUnique.mockResolvedValue({
      ...runRow,
      status: "failed",
    });
    prisma.compilation.findUnique.mockResolvedValue({
      ...compilation,
      publishedRevision,
    });
    prisma.draftRevision.findFirst.mockResolvedValue(latestDraft);
    prisma.draftRevision.create.mockResolvedValue({
      ...latestDraft,
      revisionNumber: 6,
    });
    const service = verificationService(prisma);

    const result = await service.approveDraftDiff("verify-01h3k6f", {
      draftDiff: {
        apiVersion: "factory.draft-diff/v1",
        baseDraftRevisionId: "draft-expense-approval",
        baseGraphHash: graphHash,
        operations: [
          {
            op: "change-constraint",
            entity: "expense",
            field: "amount",
            constraint: "unique",
            value: true,
          },
        ],
        affectedPaths: ["/domain/expense"],
        rationaleCode: "capability.idempotency-field-not-unique",
        summary: "Make the amount field unique.",
      },
    });

    expect(result.draftRevision).toEqual({ ...latestDraft, revisionNumber: 6 });
    expect(prisma.draftRevision.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        applicationGraphId: "graph-1",
        revisionNumber: 6,
      }),
    });
  });

  it("refuses an approval whose draft base is stale or mismatched", async () => {
    const prisma = prismaMock();
    prisma.verificationRun.findUnique.mockResolvedValue({
      ...runRow,
      status: "failed",
    });
    prisma.compilation.findUnique.mockResolvedValue({
      ...compilation,
      publishedRevision,
    });
    prisma.draftRevision.findFirst.mockResolvedValue({
      ...latestDraft,
      graph: {
        ...graph,
        domain: {
          ...graph.domain,
          entities: [
            {
              ...graph.domain.entities[0],
              fields: [
                ...graph.domain.entities[0].fields,
                { key: "note", type: "string", required: false },
              ],
            },
          ],
        },
      },
    });
    const service = verificationService(prisma);

    const diff = {
      apiVersion: "factory.draft-diff/v1",
      baseDraftRevisionId: "draft-expense-approval",
      baseGraphHash: graphHash,
      operations: [
        {
          op: "change-constraint",
          entity: "expense",
          field: "amount",
          constraint: "unique",
          value: true,
        },
      ],
      affectedPaths: ["/domain/expense"],
      rationaleCode: "capability.idempotency-field-not-unique",
      summary: "Make the amount field unique.",
    };
    await unprocessable(
      service.approveDraftDiff("verify-01h3k6f", { draftDiff: diff }),
      "draft_diff_stale",
    );
    await unprocessable(
      service.approveDraftDiff("verify-01h3k6f", {
        draftDiff: { ...diff, baseDraftRevisionId: "draft-other-graph" },
      }),
      "draft_diff_mismatch",
    );
    expect(prisma.draftRevision.create).not.toHaveBeenCalled();
  });

  it("refuses draft diffs that cannot be applied deterministically", async () => {
    const prisma = prismaMock();
    prisma.verificationRun.findUnique.mockResolvedValue({
      ...runRow,
      status: "failed",
    });
    prisma.compilation.findUnique.mockResolvedValue({
      ...compilation,
      publishedRevision,
    });
    prisma.draftRevision.findFirst.mockResolvedValue(latestDraft);
    const service = verificationService(prisma);

    const base = {
      apiVersion: "factory.draft-diff/v1",
      baseDraftRevisionId: "draft-expense-approval",
      baseGraphHash: graphHash,
      affectedPaths: ["/domain/expense"],
      rationaleCode: "binding.denial-policy-not-bound",
      summary: "Bind the identity policy capability.",
    };

    await unprocessable(
      service.approveDraftDiff("verify-01h3k6f", {
        draftDiff: {
          ...base,
          operations: [
            {
              op: "add-binding",
              capability: "core.identity-policy",
              graphSymbol: "graph.domain.expense",
            },
          ],
        },
      }),
      "draft_diff_not_approvable",
    );
    await unprocessable(
      service.approveDraftDiff("verify-01h3k6f", {
        draftDiff: {
          ...base,
          operations: [
            {
              op: "change-constraint",
              entity: "unknown-entity",
              field: "amount",
              constraint: "unique",
              value: true,
            },
          ],
        },
      }),
      "draft_diff_not_approvable",
    );
    await unprocessable(
      service.approveDraftDiff("verify-01h3k6f", {
        draftDiff: {
          ...base,
          operations: [
            {
              op: "change-constraint",
              entity: "expense",
              field: "note",
              constraint: "unique",
              value: true,
            },
          ],
        },
      }),
      "draft_diff_not_approvable",
    );
    expect(prisma.draftRevision.create).not.toHaveBeenCalled();
  });

  it("rejects a change-constraint that would make the graph invalid", async () => {
    const prisma = prismaMock();
    prisma.verificationRun.findUnique.mockResolvedValue({
      ...runRow,
      status: "failed",
    });
    prisma.compilation.findUnique.mockResolvedValue({
      ...compilation,
      publishedRevision,
    });
    prisma.draftRevision.findFirst.mockResolvedValue(latestDraft);
    const service = verificationService(prisma);

    await unprocessable(
      service.approveDraftDiff("verify-01h3k6f", {
        draftDiff: {
          apiVersion: "factory.draft-diff/v1",
          baseDraftRevisionId: "draft-expense-approval",
          baseGraphHash: graphHash,
          operations: [
            {
              op: "change-constraint",
              entity: "expense",
              field: "amount",
              constraint: "unique",
              value: "not-a-boolean",
            },
          ],
          affectedPaths: ["/domain/expense"],
          rationaleCode: "capability.idempotency-field-not-unique",
          summary: "Make the amount field unique.",
        },
      }),
      "draft_diff_rejected",
    );
    expect(prisma.draftRevision.create).not.toHaveBeenCalled();
  });

  it("enqueues one immutable verification job for a newly created run", async () => {
    const prisma = prismaMock();
    const queue = queueMock();
    prisma.compilation.findUnique.mockResolvedValue(compilation);
    prisma.verificationRun.create.mockResolvedValue(runRow);
    const service = verificationService(prisma, queue);

    const result = await service.createRun("compilation-1", {
      verificationRunId: "verify-01h3k6f",
      profileKey: "expense-approval",
    });

    expect(result).toEqual(runRow);
    expect(queue.enqueue).toHaveBeenCalledTimes(1);
    expect(queue.enqueue).toHaveBeenCalledWith({
      verificationRunId: "verify-01h3k6f",
      compilationId: "compilation-1",
      profileKey: "expense-approval",
      publishedRevisionId: "published-1",
      graph,
      compositionLock,
      artifacts: [
        {
          path: "docker-compose.yml",
          digest: digestOf("compose"),
          sizeBytes: 512,
        },
      ],
    });
  });

  it("does not re-enqueue when an existing run is retried", async () => {
    const prisma = prismaMock();
    const queue = queueMock();
    prisma.compilation.findUnique.mockResolvedValue(compilation);
    prisma.verificationRun.findUnique.mockResolvedValue(runRow);
    const service = verificationService(prisma, queue);

    await service.createRun("compilation-1", {
      verificationRunId: "verify-01h3k6f",
      profileKey: "expense-approval",
    });

    expect(prisma.verificationRun.create).not.toHaveBeenCalled();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it("refuses to enqueue a run whose compilation carries no composition lock", async () => {
    const prisma = prismaMock();
    const queue = queueMock();
    prisma.compilation.findUnique.mockResolvedValue({
      ...compilation,
      publishedRevision: {
        ...compilation.publishedRevision,
        compositionLock: null,
        compositionLockHash: null,
      },
    });
    const service = verificationService(prisma, queue);

    await expect(
      service.createRun("compilation-1", {
        verificationRunId: "verify-01h3k6f",
        profileKey: "expense-approval",
      }),
    ).rejects.toThrow(ConflictException);
    expect(prisma.verificationRun.create).not.toHaveBeenCalled();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it("refuses to enqueue when the published graph hash diverges from the stored hash", async () => {
    const prisma = prismaMock();
    const queue = queueMock();
    prisma.compilation.findUnique.mockResolvedValue({
      ...compilation,
      publishedRevision: {
        ...compilation.publishedRevision,
        graphHash: digestOf("other"),
      },
    });
    const service = verificationService(prisma, queue);

    await expect(
      service.createRun("compilation-1", {
        verificationRunId: "verify-01h3k6f",
        profileKey: "expense-approval",
      }),
    ).rejects.toThrow(ConflictException);
    expect(prisma.verificationRun.create).not.toHaveBeenCalled();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });
});
