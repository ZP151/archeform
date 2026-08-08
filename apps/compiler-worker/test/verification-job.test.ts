import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { PublishedGraphInput } from "@factory/compiler";
import { createCapabilityCompositionLock } from "@factory/capabilities";
import {
  hashApplicationGraph,
  parseVerificationEvidence,
} from "@factory/graph";

import type { VerificationReporter } from "../src/verification-reporter.js";
import { deriveCompilationDigest } from "../src/verifier/verification-lifecycle.js";
import { executeQueuedVerificationRun } from "../src/verifier/verification-job.js";
import {
  acceptanceCompilation,
  acceptanceManifest,
  acceptanceProfileKey,
} from "./fixtures/expense-approval.js";
import { expenseApprovalGraph, graphLock } from "./fixtures/graph-products.js";

function digestOf(label: string): string {
  return `sha256:${createHash("sha256").update(label).digest("hex")}`;
}

function jobInput() {
  const { graph, compositionLock, publishedRevisionId } =
    acceptanceCompilation();
  return {
    verificationRunId: "verify-01h3k6f",
    compilationId: "compilation-1",
    profileKey: acceptanceProfileKey,
    publishedRevisionId,
    graph,
    compositionLock,
    artifacts: acceptanceManifest(),
  };
}

/**
 * A bounded fake of the isolated API: each request key
 * `METHOD /path session` cycles a declared status sequence, so the same job
 * input replays identically (deterministic across retries and runs).
 */
function fakeApi(
  routes: Record<string, readonly number[]>,
  fallbackStatus = 500,
) {
  const counters = new Map<string, number>();
  return vi.fn(async (url: string | URL, init?: RequestInit) => {
    const requestUrl = new URL(String(url));
    const method = init?.method ?? "GET";
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const session = headers["x-factory-fixture-session"] ?? "none";
    const key = `${method} ${requestUrl.pathname} ${session}`;
    const statuses = routes[key];
    if (statuses === undefined) {
      return new Response("{}", { status: fallbackStatus });
    }
    const index = counters.get(key) ?? 0;
    counters.set(key, index + 1);
    return new Response("{}", { status: statuses[index % statuses.length] });
  });
}

const healthyRoutes: Record<string, readonly number[]> = {
  "GET /health none": [200],
  "POST /api/expense fixture-session-employee": [201],
  "POST /api/expense/expense-fixture-01/events/submit fixture-session-employee":
    [201, 403],
  "POST /api/expense/expense-fixture-01/events/approve fixture-session-manager":
    [201],
  "POST /api/expense/expense-fixture-01/events/approve fixture-session-employee":
    [403],
};

function collaborators(
  routes: Record<string, readonly number[]> = healthyRoutes,
) {
  const executeCompilation = vi.fn(
    async (_artifactRoot: string, input: PublishedGraphInput) => ({
      graphHash: hashApplicationGraph(input.graph),
      rootDirectory: "expense-published-1",
      artifacts: [...acceptanceManifest()],
    }),
  );
  const startPreviewRun = vi.fn(async () => ({
    webPort: 3000,
    apiPort: 3001,
    previewUrl: "http://127.0.0.1:3000",
  }));
  const stopPreviewRun = vi.fn(async () => undefined);
  const processRunner = vi.fn(async () => undefined);
  const fetch = fakeApi(routes);
  const reporter: VerificationReporter = {
    report: vi.fn().mockResolvedValue(undefined),
  };
  const dependencies = {
    operationTimeoutMs: 1_000,
    executeCompilation,
    startPreviewRun,
    stopPreviewRun,
    processRunner,
    fetch: fetch as unknown as typeof fetch,
    // A declared clock: identical job inputs must produce byte-identical
    // evidence (the control plane compares evidence digests for idempotency).
    now: () => "2026-08-07T00:00:00.000Z",
    nowMs: () => 1_000,
  };
  return {
    executeCompilation,
    startPreviewRun,
    stopPreviewRun,
    fetch,
    reporter,
    dependencies,
  };
}

function stepIdsOf(evidence: { steps: readonly { stepId: string }[] }) {
  return evidence.steps.map((step) => step.stepId);
}

describe("queued verification run", () => {
  it("compiles, boots, probes, and cleans up, reporting one evidence bundle", async () => {
    const {
      executeCompilation,
      stopPreviewRun,
      fetch,
      reporter,
      dependencies,
    } = collaborators();
    const input = jobInput();
    const evidence = await executeQueuedVerificationRun(
      "generated",
      input,
      reporter,
      dependencies,
    );

    expect(executeCompilation).toHaveBeenCalledTimes(1);
    expect(stopPreviewRun).toHaveBeenCalledTimes(1);
    expect(stepIdsOf(evidence)).toEqual([
      "migration",
      "health",
      "employee-creates-expense",
      "employee-submits-expense",
      "manager-approves-expense",
      "employee-denied-approval",
      "cleanup",
    ]);
    expect(evidence.steps.every((step) => step.status === "passed")).toBe(true);
    expect(evidence.cleanup.succeeded).toBe(true);
    expect(evidence.compilationDigest).toBe(
      deriveCompilationDigest(
        hashApplicationGraph(input.graph),
        input.artifacts,
      ),
    );
    // The session-bound API saw exactly the declared fixture-session headers.
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/expense/expense-fixture-01/events/approve"),
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-factory-fixture-session": "fixture-session-employee",
        }),
      }),
    );
    // One safe evidence bundle, no diagnosis on a fully passing run.
    expect(reporter.report).toHaveBeenCalledTimes(1);
    expect(reporter.report).toHaveBeenCalledWith({
      evidence,
      diagnosis: undefined,
    });
  });

  it("passes the authorization denial journey with the declared 403", async () => {
    const { reporter, dependencies } = collaborators();
    const evidence = await executeQueuedVerificationRun(
      "generated",
      jobInput(),
      reporter,
      dependencies,
    );
    const denial = evidence.steps.find(
      (step) => step.stepId === "employee-denied-approval",
    );
    expect(denial?.status).toBe("passed");
    expect(denial?.httpStatus).toBe(403);
    expect(denial?.action).toBe("expense.approve");
  });

  it("passes the idempotency journey when the replay is rejected", async () => {
    const { reporter, dependencies } = collaborators();
    const evidence = await executeQueuedVerificationRun(
      "generated",
      jobInput(),
      reporter,
      dependencies,
    );
    const idempotency = evidence.steps.find(
      (step) => step.stepId === "employee-submits-expense",
    );
    expect(idempotency?.status).toBe("passed");
    expect(idempotency?.httpStatus).toBe(403);
    expect(idempotency?.action).toBe("expense.submit");
  });

  it("derives the verification plan from the Published Graph when no profile key is declared", async () => {
    const graph = expenseApprovalGraph();
    const input = {
      verificationRunId: "verify-graph-derived",
      compilationId: "compilation-1",
      publishedRevisionId: "rev-graph-derived",
      graph,
      compositionLock: graphLock([{ key: "core.identity-policy" }]),
      artifacts: acceptanceManifest(),
    };
    const routes: Record<string, readonly number[]> = {
      "GET /health none": [200],
      "POST /api/expense fixture-session-employee": [201],
      "GET /api/expense/sample-expense fixture-session-employee": [200],
      "POST /api/expense/sample-expense/events/submit fixture-session-employee":
        [201, 403],
      "POST /api/expense/sample-expense/events/approve fixture-session-manager":
        [201],
      "POST /api/expense/sample-expense/events/reject fixture-session-manager":
        [201],
      "POST /api/expense/sample-expense/events/submit fixture-session-manager":
        [403],
    };
    const { reporter, dependencies, fetch, stopPreviewRun } =
      collaborators(routes);
    const evidence = await executeQueuedVerificationRun(
      "generated",
      input,
      reporter,
      dependencies,
    );

    // The graph-derived plan drove the run: its own journey IDs and sessions,
    // not the static acceptance profile's.
    expect(stepIdsOf(evidence)).toEqual([
      "migration",
      "health",
      "expense-create",
      "expense-read",
      "expense-submit",
      "expense-approve",
      "expense-reject",
      "expense-denied-submit",
      "cleanup",
    ]);
    expect(evidence.steps.every((step) => step.status === "passed")).toBe(true);
    expect(evidence.cleanup.succeeded).toBe(true);
    expect(stopPreviewRun).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/expense/sample-expense/events/approve"),
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-factory-fixture-session": "fixture-session-manager",
        }),
      }),
    );
    expect(reporter.report).toHaveBeenCalledTimes(1);
    const [report] = (reporter.report as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(report.diagnosis).toBeUndefined();
    expect(evidence.verificationRunId).toBe("verify-graph-derived");
  });

  it("reports a reviewable diagnosis with a Draft Diff proposal on failure", async () => {
    const { graph, compositionLock } = acceptanceCompilation();
    // A lock that never bound the identity policy: a missed denial must
    // propose the add-binding Draft Diff instead of failing silently.
    const input = {
      ...jobInput(),
      compositionLock: createCapabilityCompositionLock({
        graphChecksum: hashApplicationGraph(graph),
        selections: [],
      }),
    };
    const routes = {
      ...healthyRoutes,
      "POST /api/expense/expense-fixture-01/events/approve fixture-session-employee":
        [200],
    };
    const { reporter, dependencies, stopPreviewRun } = collaborators(routes);
    const evidence = await executeQueuedVerificationRun(
      "generated",
      input,
      reporter,
      dependencies,
    );

    expect(evidence.steps.some((step) => step.status === "failed")).toBe(true);
    // Cleanup still ran and was reported truthfully.
    expect(evidence.cleanup.succeeded).toBe(true);
    expect(stopPreviewRun).toHaveBeenCalledTimes(1);
    expect(reporter.report).toHaveBeenCalledTimes(1);
    const [report] = (reporter.report as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(report.diagnosis).toBeDefined();
    expect(report.diagnosis.category).toBe("binding");
    expect(report.diagnosis.verificationRunId).toBe("verify-01h3k6f");
    const diff = report.diagnosis.draftDiff;
    expect(diff).not.toBeNull();
    expect(diff.baseDraftRevisionId).toBe("draft-expense-approval");
    expect(diff.baseGraphHash).toBe(hashApplicationGraph(graph));
    expect(diff.operations[0].op).toBe("add-binding");
    expect(diff.operations[0].capability).toBe("core.identity-policy");
    expect(diff.operations[0].graphSymbol).toBe("graph.domain.expense");
  });

  it("reports a diagnosis without a diff for a bound-policy status mismatch", async () => {
    const routes = {
      ...healthyRoutes,
      "POST /api/expense/expense-fixture-01/events/approve fixture-session-manager":
        [500],
    };
    const { reporter, dependencies } = collaborators(routes);
    const evidence = await executeQueuedVerificationRun(
      "generated",
      jobInput(),
      reporter,
      dependencies,
    );
    const [report] = (reporter.report as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(evidence.steps.some((step) => step.status === "failed")).toBe(true);
    expect(report.diagnosis.category).toBe("binding");
    expect(report.diagnosis.code).toBe("binding.status_mismatch");
    expect(report.diagnosis.affectedPaths).toEqual(["/domain/expense"]);
    expect(report.diagnosis.draftDiff).toBeNull();
  });

  it("snapshots identical immutable evidence across repeated identical jobs", async () => {
    const { reporter, dependencies } = collaborators();
    const input = jobInput();
    const first = await executeQueuedVerificationRun(
      "generated",
      input,
      reporter,
      dependencies,
    );
    const second = await executeQueuedVerificationRun(
      "generated",
      input,
      reporter,
      dependencies,
    );
    expect(first).toEqual(second);
    expect(reporter.report).toHaveBeenCalledTimes(2);
    expect(
      (reporter.report as ReturnType<typeof vi.fn>).mock.calls[0][0],
    ).toEqual((reporter.report as ReturnType<typeof vi.fn>).mock.calls[1][0]);
  });

  it("refuses to compile a draft-envelope payload and reports a bounded failure", async () => {
    const { reporter, dependencies, executeCompilation } = collaborators();
    const input = jobInput();
    const draftEnvelope = {
      ...input,
      graph: {
        ...input.graph,
        status: "draft",
        revision: { number: 1 },
      } as unknown as typeof input.graph,
    };
    const evidence = await executeQueuedVerificationRun(
      "generated",
      draftEnvelope,
      reporter,
      dependencies,
    );
    // The draft-shaped Graph is refused before compilation, and the boundary
    // records a terminal failure evidence instead of stranding the run.
    expect(executeCompilation).not.toHaveBeenCalled();
    expect(evidence.steps[0]).toMatchObject({
      status: "failed",
      failureCode: "job.contract_violation",
    });
    expect(reporter.report).toHaveBeenCalledTimes(1);
  });

  it("fails closed on a non-record payload without fabricating a report", async () => {
    const { reporter, dependencies } = collaborators();
    await expect(
      executeQueuedVerificationRun("generated", null, reporter, dependencies),
    ).rejects.toThrow();
    expect(reporter.report).not.toHaveBeenCalled();
  });

  describe("terminal failure boundary", () => {
    it("reports one safe terminal failure evidence when a dependency throws after run creation", async () => {
      const { reporter, dependencies, executeCompilation } = collaborators();
      executeCompilation.mockRejectedValue(new Error("compile failed"));
      const input = jobInput();
      const evidence = await executeQueuedVerificationRun(
        "generated",
        input,
        reporter,
        dependencies,
      );
      expect(evidence.steps).toHaveLength(1);
      expect(evidence.steps[0]).toMatchObject({
        stepId: "verification",
        kind: "immutable-snapshot",
        status: "failed",
        failureCode: "job.unmapped_failure",
      });
      expect(evidence.cleanup.succeeded).toBe(false);
      expect(evidence.verificationRunId).toBe(input.verificationRunId);
      expect(evidence.compilationDigest).toBe(
        deriveCompilationDigest(
          hashApplicationGraph(input.graph),
          input.artifacts,
        ),
      );
      expect(reporter.report).toHaveBeenCalledTimes(1);
      const [report] = (reporter.report as ReturnType<typeof vi.fn>).mock
        .calls[0];
      expect(report.diagnosis).toBeUndefined();
      expect(parseVerificationEvidence(report.evidence)).toEqual(
        report.evidence,
      );
    });

    it("maps a lifecycle digest mismatch to its bounded allowlisted code", async () => {
      // A format-valid but wrong digest cannot be distinguished from declared
      // fixture data before compilation, so the job compiles honestly; the
      // lifecycle then rejects and the boundary maps the exact lifecycle code.
      const { reporter, dependencies, executeCompilation } = collaborators();
      const input = {
        ...jobInput(),
        artifacts: [
          { ...jobInput().artifacts[0], digest: digestOf("tampered") },
        ],
      };
      const evidence = await executeQueuedVerificationRun(
        "generated",
        input,
        reporter,
        dependencies,
      );
      expect(executeCompilation).toHaveBeenCalledTimes(1);
      expect(evidence.steps[0].failureCode).toBe("compilation_digest_mismatch");
      expect(reporter.report).toHaveBeenCalledTimes(1);
    });

    it("reports a bounded contract violation for payload-shape mutations", async () => {
      const { reporter, dependencies, executeCompilation } = collaborators();
      const input = jobInput();
      const missingKey = { ...input } as Record<string, unknown>;
      delete missingKey.compilationId;
      const candidates: unknown[] = [
        { ...input, extraKey: "x" },
        { ...input, profileKey: "unknown-profile" },
        { ...input, artifacts: [] },
        { ...input, artifacts: [{ ...input.artifacts[0], sizeBytes: -1 }] },
        missingKey,
      ];
      for (const candidate of candidates) {
        const evidence = await executeQueuedVerificationRun(
          "generated",
          candidate,
          reporter,
          dependencies,
        );
        expect(evidence.steps[0].status).toBe("failed");
        expect(evidence.steps[0].failureCode).toMatch(/^[a-z][a-z0-9._-]*$/);
      }
      expect(executeCompilation).not.toHaveBeenCalled();
      expect(reporter.report).toHaveBeenCalledTimes(candidates.length);
    });

    it("keeps the run terminal when the real bundle carries Next.js dynamic-route artifacts", async () => {
      // The real compiled bundle contains `web/app/[...path]/page.tsx`
      // catch-all routes. Regression: the artifact-path contract rejected
      // brackets, so the boundary's own failure evidence failed its parser,
      // the report was silently skipped, and the run stranded at `pending`.
      const { reporter, dependencies, executeCompilation } = collaborators();
      executeCompilation.mockRejectedValue(new Error("compile failed"));
      const evidence = await executeQueuedVerificationRun(
        "generated",
        jobInput(),
        reporter,
        dependencies,
      );
      expect(evidence.steps[0]).toMatchObject({
        status: "failed",
        failureCode: "job.unmapped_failure",
      });
      expect(reporter.report).toHaveBeenCalledTimes(1);
      const [report] = (reporter.report as ReturnType<typeof vi.fn>).mock
        .calls[0];
      expect(parseVerificationEvidence(report.evidence)).toEqual(
        report.evidence,
      );
    });

    it("records contract-valid boot-failure evidence over the real bundle manifest", async () => {
      // Boot failure with the real manifest: every probe is skipped, cleanup
      // is still reported truthfully, and the evidence must parse as
      // contract-valid instead of stranding the run at `pending`.
      const { reporter, dependencies, startPreviewRun } = collaborators();
      startPreviewRun.mockRejectedValue(new Error("preview boot failed"));
      const evidence = await executeQueuedVerificationRun(
        "generated",
        jobInput(),
        reporter,
        dependencies,
      );
      expect(
        evidence.steps.every(
          (step) => step.status === "skipped" || step.stepId === "cleanup",
        ),
      ).toBe(true);
      expect(evidence.steps.at(-1)).toMatchObject({ stepId: "cleanup" });
      expect(reporter.report).toHaveBeenCalledTimes(1);
    });
  });
});
