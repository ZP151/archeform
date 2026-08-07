import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { PublishedGraphInput } from "@factory/compiler";
import { createCapabilityCompositionLock } from "@factory/capabilities";
import { hashApplicationGraph } from "@factory/graph";

import type { VerificationReporter } from "../src/verification-reporter.js";
import { deriveCompilationDigest } from "../src/verifier/verification-lifecycle.js";
import { executeQueuedVerificationRun } from "../src/verifier/verification-job.js";
import {
  acceptanceCompilation,
  acceptanceManifest,
  acceptanceProfileKey,
} from "./fixtures/expense-approval.js";

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

  it("fails closed on payload-shape mutations before compilation starts", async () => {
    const { reporter, dependencies, executeCompilation } = collaborators();
    const input = jobInput();

    const preflightMutations = [
      { ...input, extraKey: "x" },
      { ...input, profileKey: "unknown-profile" },
      { ...input, artifacts: [] },
      { ...input, artifacts: [{ ...input.artifacts[0], sizeBytes: -1 }] },
      {
        ...input,
        graph: {
          ...input.graph,
          status: "draft",
          revision: { number: 1 },
        } as unknown as typeof input.graph,
      },
    ];
    for (const candidate of preflightMutations) {
      await expect(
        executeQueuedVerificationRun(
          "generated",
          candidate,
          reporter,
          dependencies,
        ),
      ).rejects.toThrow();
    }
    expect(executeCompilation).not.toHaveBeenCalled();
    expect(reporter.report).not.toHaveBeenCalled();
  });

  it("rejects a tampered artifact digest against the real compilation output", async () => {
    // A format-valid but wrong digest cannot be distinguished from declared
    // fixture data before compilation, so the job compiles honestly and the
    // lifecycle rejects when the compiled manifest does not match the
    // immutable digest — and no evidence is ever reported.
    const { reporter, dependencies, executeCompilation } = collaborators();
    const input = {
      ...jobInput(),
      artifacts: [{ ...jobInput().artifacts[0], digest: digestOf("tampered") }],
    };
    await expect(
      executeQueuedVerificationRun("generated", input, reporter, dependencies),
    ).rejects.toThrow();
    expect(executeCompilation).toHaveBeenCalledTimes(1);
    expect(reporter.report).not.toHaveBeenCalled();
  });

  it("fails closed on an unknown or missing job key", async () => {
    const { reporter, dependencies } = collaborators();
    const input = jobInput();
    const missing = { ...input } as Record<string, unknown>;
    delete missing.compilationId;
    await expect(
      executeQueuedVerificationRun(
        "generated",
        missing,
        reporter,
        dependencies,
      ),
    ).rejects.toThrow();
    await expect(
      executeQueuedVerificationRun("generated", null, reporter, dependencies),
    ).rejects.toThrow();
    expect(reporter.report).not.toHaveBeenCalled();
  });
});
