import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

import type { PublishedGraphInput } from "@factory/compiler";
import {
  parseVerificationEvidence,
  parseVerificationRun,
  type VerificationStepV1,
} from "@factory/graph";

import {
  VerificationLifecycleError,
  deriveCompilationDigest,
  runVerificationLifecycle,
  type VerificationLifecycleDependencies,
  type VerificationLifecycleInput,
} from "../src/verifier/verification-lifecycle.js";
import {
  VerificationEnvironment,
  type BoundedRequestResult,
} from "../src/verifier/verification-environment.js";
import { runHealthProbe } from "../src/verifier/probes.js";

const runId = "verify-01h3k6f";
const profileKey = "expense-approval";
const startedAt = "2026-08-06T12:00:00.000Z";

function digestOf(label: string): string {
  return `sha256:${createHash("sha256").update(label).digest("hex")}`;
}

const graphHash = digestOf("graph");
const otherDigest = digestOf("other");

function artifact(path: string, seed: string) {
  return { path, digest: digestOf(`${seed}:${path}`), sizeBytes: 5 };
}

function fixtureManifest() {
  return [
    artifact("docker-compose.yml", "compose"),
    artifact("api/package.json", "api"),
  ];
}

function compilationDigest() {
  return deriveCompilationDigest(graphHash, fixtureManifest());
}

function publishedGraph(): PublishedGraphInput {
  return {
    publishedRevisionId: "published-expense-approval",
    graph: {
      apiVersion: "factory.graph/v1",
      metadata: { id: "expense-approval", title: "Expense approval" },
      page: [],
      domain: [],
      policy: [],
      flow: [],
      integration: [],
      experience: [],
    },
    compositionLock: {
      apiVersion: "factory.composition-lock/v1",
      applicationGraphChecksum: graphHash,
      packages: [],
      resolvedContributionDigests: {},
      providedAndRequiredInterfaces: {},
      targetRuntimeInterfaceVersions: {},
      resolvedDependencyOrder: [],
      lockDigest: digestOf("lock"),
    },
  };
}

function validInput(
  overrides: Partial<VerificationLifecycleInput> = {},
): VerificationLifecycleInput {
  return {
    verificationRunId: runId,
    profileKey,
    compilation: publishedGraph(),
    expectedCompilationDigest: compilationDigest(),
    stepPlan: [
      { stepId: "migration", kind: "migration" },
      { stepId: "health", kind: "health" },
    ],
    ...overrides,
  };
}

function passedStep(
  stepId: string,
  kind: VerificationStepV1["kind"],
): VerificationStepV1 {
  return {
    stepId,
    kind,
    status: "passed",
    summary: "Applied 1 migration.",
    durationMs: 100,
  };
}

function dependencies(
  overrides: Partial<VerificationLifecycleDependencies> = {},
): VerificationLifecycleDependencies {
  const startPreviewRun = vi.fn(async () => ({
    webPort: 3000,
    apiPort: 3001,
    previewUrl: "http://127.0.0.1:3000",
  }));
  const stopPreviewRun = vi.fn(async () => undefined);
  return {
    artifactRoot: "generated",
    operationTimeoutMs: 1_000,
    processRunner: vi.fn(async () => undefined),
    fetch: (async () =>
      new Response("{}", { status: 200 })) as unknown as typeof fetch,
    executeCompilation: vi.fn(async () => ({
      rootDirectory: "expense-approval-published-expense-approval",
      graphHash,
      artifacts: fixtureManifest(),
    })),
    startPreviewRun,
    stopPreviewRun,
    runProbe: vi.fn(async (entry) => passedStep(entry.stepId, entry.kind)),
    now: () => startedAt,
    ...overrides,
  };
}

describe("runVerificationLifecycle", () => {
  it("runs probes in declared order, appends cleanup last, and returns evidence bound to the derived run", async () => {
    const deps = dependencies();
    const evidence = await runVerificationLifecycle(validInput(), deps);

    expect(evidence.steps.map((step) => step.stepId)).toEqual([
      "migration",
      "health",
      "cleanup",
    ]);
    expect(evidence.cleanup.succeeded).toBe(true);
    expect(evidence.compilationDigest).toBe(compilationDigest());
    // The evidence digest manifest is path + digest only, by contract.
    expect(evidence.artifactDigests).toEqual(
      fixtureManifest().map(({ path, digest }) => ({ path, digest })),
    );
    expect(evidence.completedAt).toBe(startedAt);

    const run = parseVerificationRun({
      apiVersion: "factory.verification-run/v1",
      verificationRunId: runId,
      compilationDigest: compilationDigest(),
      profileKey,
      status: "running",
      startedAt,
      stepIds: ["migration", "health", "cleanup"],
    });
    // The evidence must bind to the run identity, digest, and ordered step IDs.
    expect(parseVerificationEvidence(evidence, run)).toEqual(evidence);
    expect(deps.executeCompilation).toHaveBeenCalledTimes(1);
    expect(deps.startPreviewRun).toHaveBeenCalledTimes(1);
    expect(deps.stopPreviewRun).toHaveBeenCalledTimes(1);
  });

  it("rejects a mismatched compilation digest before Docker starts", async () => {
    const deps = dependencies();
    await expect(
      runVerificationLifecycle(
        validInput({ expectedCompilationDigest: otherDigest }),
        deps,
      ),
    ).rejects.toThrow(VerificationLifecycleError);
    await expect(
      runVerificationLifecycle(
        validInput({ expectedCompilationDigest: otherDigest }),
        deps,
      ),
    ).rejects.toThrow(/digest/i);
    expect(deps.startPreviewRun).not.toHaveBeenCalled();
    expect(deps.stopPreviewRun).not.toHaveBeenCalled();
  });

  it("rejects an untrusted artifact path before Docker starts", async () => {
    const hostileArtifact = {
      path: "../../etc/passwd",
      digest: digestOf("escape"),
      sizeBytes: 5,
    };
    const deps = dependencies({
      executeCompilation: vi.fn(async () => ({
        rootDirectory: "expense-approval-published-expense-approval",
        graphHash,
        artifacts: [...fixtureManifest(), hostileArtifact],
      })),
    });
    // The digest is derived from the manifest the mock actually returns, so
    // the lifecycle reaches the artifact-manifest gate rather than tripping
    // the digest gate first.
    await expect(
      runVerificationLifecycle(
        validInput({
          expectedCompilationDigest: deriveCompilationDigest(graphHash, [
            ...fixtureManifest(),
            hostileArtifact,
          ]),
        }),
        deps,
      ),
    ).rejects.toThrow(/artifact manifest/i);
    expect(deps.startPreviewRun).not.toHaveBeenCalled();
    expect(deps.stopPreviewRun).not.toHaveBeenCalled();
  });

  it("rejects mutable draft-shaped input before compiling", async () => {
    const deps = dependencies();
    const draft = {
      draftRevisionId: "draft-expense-approval",
      graph: publishedGraph().graph,
      compositionLock: publishedGraph().compositionLock,
    };
    await expect(
      runVerificationLifecycle(
        validInput({ compilation: draft as unknown as PublishedGraphInput }),
        deps,
      ),
    ).rejects.toThrow(VerificationLifecycleError);
    expect(deps.executeCompilation).not.toHaveBeenCalled();
  });

  it("rejects an unbounded or out-of-range timeout before compiling", async () => {
    for (const operationTimeoutMs of [0, -1, 1, 3_600_001, Number.NaN]) {
      const deps = dependencies({ operationTimeoutMs });
      await expect(
        runVerificationLifecycle(validInput(), deps),
      ).rejects.toThrow(VerificationLifecycleError);
      expect(deps.executeCompilation).not.toHaveBeenCalled();
    }
  });

  it("rejects a step plan with duplicate or unknown step IDs before compiling", async () => {
    const deps = dependencies();
    await expect(
      runVerificationLifecycle(
        validInput({
          stepPlan: [
            { stepId: "migration", kind: "migration" },
            { stepId: "migration", kind: "migration" },
          ],
        }),
        deps,
      ),
    ).rejects.toThrow(VerificationLifecycleError);
    await expect(
      runVerificationLifecycle(
        validInput({ stepPlan: [{ stepId: "hack", kind: "hack" as never }] }),
        deps,
      ),
    ).rejects.toThrow(VerificationLifecycleError);
    expect(deps.executeCompilation).not.toHaveBeenCalled();
  });

  it("always cleans up when a probe crashes, records the crash, and skips later probes", async () => {
    const deps = dependencies({
      runProbe: vi.fn(async (entry) => {
        if (entry.stepId === "health") {
          throw new Error("probe blew up");
        }
        return passedStep(entry.stepId, entry.kind);
      }),
    });
    const evidence = await runVerificationLifecycle(
      validInput({
        stepPlan: [
          { stepId: "migration", kind: "migration" },
          { stepId: "health", kind: "health" },
          { stepId: "api", kind: "api" },
        ],
      }),
      deps,
    );

    expect(deps.stopPreviewRun).toHaveBeenCalledTimes(1);
    expect(evidence.steps.map((step) => step.stepId)).toEqual([
      "migration",
      "health",
      "api",
      "cleanup",
    ]);
    const crashed = evidence.steps[1];
    expect(crashed.status).toBe("failed");
    expect(crashed.failureCode).toBe("probe.crashed");
    // Later probes are skipped after a crash — not after a plain failure —
    // and the skip summary says so.
    const skipped = evidence.steps[2];
    expect(skipped.status).toBe("skipped");
    expect(skipped.summary).toMatch(/crashed/i);
    expect(evidence.cleanup.succeeded).toBe(true);
  });

  it("forwards the injected process runner and HTTP client into the probe environment", async () => {
    const processRunner = vi.fn(async () => undefined);
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    const deps = dependencies({
      processRunner,
      fetch: fetchMock as unknown as typeof fetch,
      runProbe: vi.fn(async (entry, environment) => {
        if (entry.kind === "migration") {
          const migrated = await environment.migrate([
            "npx",
            "prisma",
            "migrate",
            "status",
          ]);
          expect(migrated.succeeded).toBe(true);
        } else {
          const status = await environment.request("GET", "/expenses");
          expect(status.status).toBe(200);
        }
        return passedStep(entry.stepId, entry.kind);
      }),
    });
    const evidence = await runVerificationLifecycle(validInput(), deps);

    expect(evidence.steps.map((step) => step.stepId)).toEqual([
      "migration",
      "health",
      "cleanup",
    ]);
    expect(evidence.cleanup.succeeded).toBe(true);
    // The migration must run through the injected runner, pinned to the
    // fixed compose exec shape — never a silent no-op.
    expect(processRunner).toHaveBeenCalledWith(
      expect.objectContaining({
        file: "docker",
        args: expect.arrayContaining([
          "compose",
          "exec",
          "-T",
          "migrate",
          "npx",
          "prisma",
          "migrate",
          "status",
        ]),
      }),
      expect.any(AbortSignal),
    );
    // The HTTP probe must hit the isolated API through the injected client.
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:3001/expenses",
      expect.anything(),
    );
  });

  it("records a bounded unreachable-endpoint failure instead of crashing the probe", async () => {
    const deps = dependencies({
      fetch: (async () => {
        throw new TypeError("fetch failed");
      }) as unknown as typeof fetch,
      runProbe: async (entry, environment) => {
        if (entry.kind === "health") {
          return runHealthProbe({
            entry,
            environment,
            signal: new AbortController().signal,
          });
        }
        return passedStep(entry.stepId, entry.kind);
      },
    });
    const evidence = await runVerificationLifecycle(validInput(), deps);

    const health = evidence.steps[1];
    expect(health.status).toBe("failed");
    expect(health.failureCode).toBe("health.unreachable");
    expect(health.summary).toMatch(/did not respond/i);
    expect(evidence.cleanup.succeeded).toBe(true);
    expect(parseVerificationEvidence(evidence)).toEqual(evidence);
  });

  it("aborts a hanging probe at the lifecycle timeout, skips it, and still cleans up", async () => {
    const deps = dependencies({
      runProbe: vi.fn(async () => {
        await new Promise<void>(() => undefined);
        return passedStep("migration", "migration");
      }),
    });
    const evidence = await runVerificationLifecycle(validInput(), deps);

    expect(deps.stopPreviewRun).toHaveBeenCalledTimes(1);
    const skipped = evidence.steps[0];
    expect(skipped.status).toBe("skipped");
    expect(skipped.summary).toMatch(/timeout/i);
    expect(evidence.steps.map((step) => step.stepId)).toEqual([
      "migration",
      "health",
      "cleanup",
    ]);
    expect(evidence.cleanup.succeeded).toBe(true);
  });

  it("records a boot failure without fabricating probe results, and still cleans up", async () => {
    const deps = dependencies({
      startPreviewRun: vi.fn(async () => {
        throw new Error("docker exploded");
      }),
    });
    const evidence = await runVerificationLifecycle(validInput(), deps);

    expect(deps.stopPreviewRun).toHaveBeenCalledTimes(1);
    expect(evidence.steps.map((step) => step.stepId)).toEqual([
      "migration",
      "health",
      "cleanup",
    ]);
    for (const step of evidence.steps.slice(0, 2)) {
      expect(step.status).toBe("skipped");
      expect(step.summary).toMatch(/did not start/i);
    }
    expect(evidence.cleanup.succeeded).toBe(true);
  });

  it("reports a cleanup failure truthfully instead of crashing the evidence", async () => {
    const deps = dependencies({
      stopPreviewRun: vi.fn(async () => {
        throw new Error("compose down failed");
      }),
    });
    const evidence = await runVerificationLifecycle(validInput(), deps);

    expect(evidence.cleanup.succeeded).toBe(false);
    expect(evidence.cleanup.summary).toMatch(/cleanup failed/i);
    const cleanupStep = evidence.steps[2];
    expect(cleanupStep.status).toBe("failed");
    expect(cleanupStep.summary).toMatch(/cleanup failed/i);
    expect(parseVerificationEvidence(evidence)).toEqual(evidence);
  });
});

describe("deriveCompilationDigest", () => {
  it("is deterministic and binds the graph hash and every artifact", () => {
    const first = deriveCompilationDigest(graphHash, fixtureManifest());
    const second = deriveCompilationDigest(graphHash, fixtureManifest());
    expect(first).toBe(second);
    expect(first).toMatch(/^sha256:[a-f0-9]{64}$/);

    const reordered = deriveCompilationDigest(
      graphHash,
      [...fixtureManifest()].reverse(),
    );
    expect(reordered).toBe(first);

    const changedGraph = deriveCompilationDigest(
      otherDigest,
      fixtureManifest(),
    );
    const changedArtifact = deriveCompilationDigest(graphHash, [
      ...fixtureManifest(),
      artifact("api/src/main.ts", "extra"),
    ]);
    expect(changedGraph).not.toBe(first);
    expect(changedArtifact).not.toBe(first);
  });
});

describe("VerificationEnvironment", () => {
  function environment(
    overrides: Partial<
      Parameters<typeof VerificationEnvironment.prototype.constructor>[0]
    > = {},
  ) {
    const fetchMock = vi.fn(
      async () => new Response('{"status":"ok"}', { status: 200 }),
    );
    const processRunner = vi.fn(async () => undefined);
    return {
      fetchMock,
      processRunner,
      env: new VerificationEnvironment({
        artifactRoot: "generated",
        previewRunId: "preview-verify-01h3k6f",
        rootDirectory: "expense-approval-published-expense-approval",
        composeProjectName: "factory-preview-preview-verify-01h3k6f",
        artifacts: fixtureManifest(),
        operationTimeoutMs: 50,
        startPreviewRun: vi.fn(async () => ({
          webPort: 3000,
          apiPort: 3001,
          previewUrl: "http://127.0.0.1:3000",
        })),
        stopPreviewRun: vi.fn(async () => undefined),
        fetch: fetchMock as unknown as typeof fetch,
        processRunner: processRunner as never,
        ...overrides,
      }),
    };
  }

  it("boots and cleans up through the preview runner delegates", async () => {
    const { env } = environment();
    await expect(env.boot()).resolves.toEqual({
      webPort: 3000,
      apiPort: 3001,
      previewUrl: "http://127.0.0.1:3000",
    });
    await expect(env.cleanup()).resolves.toBeUndefined();
  });

  it("runs a migration through a bounded docker compose exec command", async () => {
    const { env, processRunner } = environment();
    await env.boot();
    const result = await env.migrate(["npx", "prisma", "migrate", "status"]);
    expect(result.succeeded).toBe(true);
    expect(processRunner).toHaveBeenCalledWith(
      expect.objectContaining({
        file: "docker",
        args: expect.arrayContaining([
          "compose",
          "--project-name",
          "factory-preview-preview-verify-01h3k6f",
          "exec",
          "-T",
          "migrate",
          "npx",
          "prisma",
          "migrate",
          "status",
        ]),
      }),
      expect.any(AbortSignal),
    );
  });

  it("rejects migration commands with untrusted tokens", async () => {
    const { env, processRunner } = environment();
    await env.boot();
    await expect(env.migrate(["sh", "-c", "curl evil"])).rejects.toThrow(
      VerificationLifecycleError,
    );
    expect(processRunner).not.toHaveBeenCalled();
  });

  it("reports bounded health and request statuses through the injected fetch", async () => {
    const { env, fetchMock } = environment();
    await env.boot();
    const health: BoundedRequestResult = await env.health();
    expect(health.status).toBe(200);
    expect(health.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:3000/health",
      expect.objectContaining({ method: "GET" }),
    );

    fetchMock.mockResolvedValueOnce(new Response("nope", { status: 403 }));
    const denied = await env.request("POST", "/expenses");
    expect(denied.status).toBe(403);
    expect(denied.ok).toBe(false);
  });

  it("rejects request paths that escape the allowlisted route shape", async () => {
    const { env, fetchMock } = environment();
    await env.boot();
    await expect(env.request("GET", "/../etc/passwd")).rejects.toThrow(
      VerificationLifecycleError,
    );
    await expect(env.request("GET", "/expenses?secret=1")).rejects.toThrow(
      VerificationLifecycleError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails closed when the migration runner is not configured", async () => {
    const { env } = environment({ processRunner: undefined });
    await env.boot();
    await expect(
      env.migrate(["npx", "prisma", "migrate", "status"]),
    ).rejects.toThrow(VerificationLifecycleError);
  });

  it("fails closed when the HTTP client is not configured", async () => {
    const { env } = environment({ fetch: undefined });
    await env.boot();
    await expect(env.health()).rejects.toThrow(VerificationLifecycleError);
  });
});
