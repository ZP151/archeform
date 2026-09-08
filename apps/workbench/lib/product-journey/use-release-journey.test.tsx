// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  isLoopbackPreviewUrl,
  useReleaseJourney,
  type ReleaseJourneyController,
  type ReleaseTarget,
} from "./use-release-journey";

declare global {
  // eslint-disable-next-line no-var
  var __release: ReleaseJourneyController | undefined;
}

const TARGET: ReleaseTarget = {
  applicationGraphId: "expense-approval",
  draftRevisionId: "draft-expense-approval",
};

const evidenceSteps = [
  { stepId: "expense-create", status: "passed" },
  { stepId: "expense-read", status: "passed" },
  { stepId: "expense-submit", status: "passed" },
  { stepId: "expense-approve", status: "passed" },
  { stepId: "expense-reject", status: "passed" },
  { stepId: "expense-denied-submit", status: "failed" },
];

const succeededRun = {
  verificationRunId: "verify-1",
  compilationId: "compilation-1",
  profileKey: null,
  status: "succeeded",
  stepIds: evidenceSteps.map((step) => step.stepId),
  evidenceDigest: "sha256:" + "e".repeat(64),
  evidence: { steps: evidenceSteps },
  diagnosis: null,
  draftDiff: null,
};

const pendingRun = { ...succeededRun, status: "pending", evidence: null };

const pendingCompilation = {
  id: "compilation-1",
  publishedRevisionId: "published-1",
  target: "application-bundle",
  result: { status: "queued" },
  artifacts: [],
};

const succeededCompilation = {
  ...pendingCompilation,
  result: {
    status: "succeeded",
    artifactCount: 0,
    completedAt: "2026-08-10T12:00:00.000Z",
  },
};

const failedCompilation = {
  ...pendingCompilation,
  result: {
    status: "failed",
    failureCode: "compilation.failed",
    completedAt: "2026-08-10T12:00:00.000Z",
  },
};

const publishedRevision = {
  id: "published-1",
  revisionNumber: 1,
  sourceDraftRevisionId: "draft-expense-approval",
  graphHash: "sha256:" + "a".repeat(64),
};

const previewReady = {
  id: "preview-1",
  compilationId: "compilation-1",
  status: "ready",
  previewUrl: "http://127.0.0.1:3000",
  webPort: 3000,
  apiPort: 3001,
  diagnostic: null,
  createdAt: "2026-08-09T00:00:00.000Z",
};

const previewStarting = {
  ...previewReady,
  status: "starting",
  previewUrl: null,
};

const previewStopping = {
  ...previewReady,
  status: "stopping",
  previewUrl: null,
};

const previewStopped = {
  ...previewReady,
  status: "stopped",
  previewUrl: null,
};

function Harness({
  controlPlaneUrl,
  target,
  onApproved,
}: {
  controlPlaneUrl: string;
  target: ReleaseTarget | null;
  onApproved: (draft: unknown) => void;
}) {
  const controller = useReleaseJourney(controlPlaneUrl, target, onApproved);
  globalThis.__release = controller;
  return null;
}

/**
 * Routes the stubbed fetch by `METHOD path`, cycling declared bodies per key.
 * The client resolves global fetch at request time, so stubbing the global
 * transport exercises the real client path.
 */
function stubTransport(routes: Record<string, readonly unknown[]>) {
  const counters = new Map<string, number>();
  const calls: { path: string; init?: RequestInit }[] = [];
  const fetcher = vi.fn(async (url: string | URL, init?: RequestInit) => {
    const requestUrl = new URL(String(url));
    const method = init?.method ?? "GET";
    const key = `${method} ${requestUrl.pathname}`;
    calls.push({ path: key, init });
    const bodies = routes[key];
    if (bodies === undefined) {
      return new Response(JSON.stringify({ error: "not stubbed" }), {
        status: 404,
      });
    }
    const index = counters.get(key) ?? 0;
    counters.set(key, index + 1);
    const body = bodies[index % bodies.length];
    return new Response(JSON.stringify(body), {
      status: typeof body === "number" ? body : 200,
    });
  });
  vi.stubGlobal("fetch", fetcher);
  return { fetcher, calls };
}

function approvedDraftPayload() {
  return {
    draftRevision: {
      id: "draft-expense-approval-r2",
      applicationGraphId: "expense-approval",
      revisionNumber: 2,
      graph: { metadata: { id: "expense-approval" } },
    },
    draftDiff: { apiVersion: "factory.draft-diff/v1" },
  };
}

const addBindingDiff = {
  apiVersion: "factory.draft-diff/v1",
  baseDraftRevisionId: "draft-expense-approval",
  baseGraphHash: "sha256:" + "a".repeat(64),
  operations: [
    {
      op: "add-binding",
      capability: "core.identity-policy",
      graphSymbol: "graph.domain.expense",
    },
  ],
  affectedPaths: ["/domain/expense"],
  rationaleCode: "binding.denial-policy-not-bound",
  summary: "Bind the identity policy so declared denials are enforced.",
};

describe("useReleaseJourney", () => {
  let container: HTMLDivElement;
  let root: Root;
  let onApproved: ReturnType<typeof vi.fn>;

  it("accepts only credential-free exact loopback preview URLs", () => {
    expect(isLoopbackPreviewUrl("http://127.0.0.1:3000")).toBe(true);
    expect(isLoopbackPreviewUrl("https://localhost:3443")).toBe(true);
    expect(isLoopbackPreviewUrl("http://[::1]:3000")).toBe(true);
    expect(isLoopbackPreviewUrl("http://user:pass@127.0.0.1:3000")).toBe(false);
    expect(isLoopbackPreviewUrl("http://127.0.0.1.evil.test:3000")).toBe(false);
    expect(isLoopbackPreviewUrl("file:///tmp/app")).toBe(false);
  });

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    vi.stubGlobal("React", React);
    // The release run identifier is `verify-${uuid}`; a fixed uuid keeps the
    // stubbed transport's route keys deterministic.
    vi.stubGlobal("crypto", {
      ...globalThis.crypto,
      randomUUID: () => "1",
    });
    vi.useFakeTimers();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    onApproved = vi.fn();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
      await vi.advanceTimersByTimeAsync(0);
    });
    container.remove();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function mount(
    target: ReleaseTarget | null = TARGET,
    overrides: { controlPlaneUrl?: string; strict?: boolean } = {},
  ) {
    const harness = (
      <Harness
        controlPlaneUrl={
          overrides.controlPlaneUrl ?? "http://control-plane.test"
        }
        target={target}
        onApproved={(draft) => onApproved(draft)}
      />
    );
    act(() => {
      root.render(
        overrides.strict ? (
          <React.StrictMode>{harness}</React.StrictMode>
        ) : (
          harness
        ),
      );
    });
    const controller = globalThis.__release;
    if (controller === undefined) throw new Error("controller not mounted");
    return controller;
  }

  it("seeds a publishing release for the target and gates every action", () => {
    const controller = mount();
    const live = (): ReleaseJourneyController =>
      globalThis.__release as ReleaseJourneyController;

    expect(live().release?.phase).toBe("publishing");
    expect(live().release?.timeline.events[0].kind).toBe("publish");
    expect(live().canPublish).toBe(true);
    expect(live().canCompile).toBe(false);
    expect(live().canVerify).toBe(false);
    expect(live().canPreview).toBe(false);
    expect(live().canCleanup).toBe(false);
    expect(live().canApproveDraftDiff).toBe(false);
  });

  it("publishes the Draft, compiles, and verifies without a profile key, deriving the plan from the Published Graph", async () => {
    const { calls } = stubTransport({
      "POST /application-graphs/expense-approval/published-revisions": [
        publishedRevision,
      ],
      "POST /compilations": [pendingCompilation],
      "GET /compilations/compilation-1": [
        { ...pendingCompilation, result: { status: "running" } },
        succeededCompilation,
      ],
      "POST /compilations/compilation-1/verification-runs": [pendingRun],
      "GET /verification-runs/verify-1": [
        pendingRun,
        { ...succeededRun, status: "succeeded" },
      ],
    });
    const controller = mount();
    const live = (): ReleaseJourneyController =>
      globalThis.__release as ReleaseJourneyController;

    await act(async () => {
      controller.publishRelease();
    });
    expect(globalThis.__release?.release?.phase).toBe("compiling");
    expect(live().release?.publishedRevisionId).toBe("published-1");

    await act(async () => {
      controller.compileRelease();
      await vi.advanceTimersByTimeAsync(1_500);
    });
    expect(live().release?.phase).toBe("verifying");
    expect(live().release?.compilationId).toBe("compilation-1");

    await act(async () => {
      controller.verifyRelease();
      await vi.advanceTimersByTimeAsync(1_500);
    });
    expect(live().release?.phase).toBe("starting-preview");
    expect(live().release?.evidenceSummary).toEqual({
      steps: 6,
      passed: 5,
      failed: 1,
    });
    // The verification run carried no profile key: the worker derives the
    // plan from the Published Graph itself.
    const createRun = calls.find(
      (call) =>
        call.path === "POST /compilations/compilation-1/verification-runs",
    );
    expect(createRun?.init?.body).toBe(
      JSON.stringify({ verificationRunId: "verify-1" }),
    );
  });

  it("completes publish, compile, verify, and preview under StrictMode", async () => {
    stubTransport({
      "POST /application-graphs/expense-approval/published-revisions": [
        publishedRevision,
      ],
      "POST /compilations": [pendingCompilation],
      "GET /compilations/compilation-1": [succeededCompilation],
      "POST /compilations/compilation-1/verification-runs": [pendingRun],
      "GET /verification-runs/verify-1": [succeededRun],
      "POST /compilations/compilation-1/preview-runs": [previewStarting],
      "GET /compilations/compilation-1/preview-runs/current": [previewReady],
    });
    const controller = mount(TARGET, { strict: true });
    const live = (): ReleaseJourneyController =>
      globalThis.__release as ReleaseJourneyController;

    await act(async () => controller.publishRelease());
    await act(async () => controller.compileRelease());
    await act(async () => controller.verifyRelease());
    await act(async () => controller.previewRelease());

    expect(live().release?.phase).toBe("preview");
    expect(live().release?.previewUrl).toBe("http://127.0.0.1:3000");
  });

  it("fails a compilation that remains pending at its elapsed deadline", async () => {
    stubTransport({
      "POST /application-graphs/expense-approval/published-revisions": [
        publishedRevision,
      ],
      "POST /compilations": [pendingCompilation],
      "GET /compilations/compilation-1": [pendingCompilation],
    });
    const controller = mount();
    const live = (): ReleaseJourneyController =>
      globalThis.__release as ReleaseJourneyController;

    await act(async () => controller.publishRelease());
    await act(async () => {
      controller.compileRelease();
      await vi.advanceTimersByTimeAsync(300_000);
    });

    expect(live().release?.phase).toBe("failed");
    expect(live().release?.diagnosis).toBe("compilation.timeout");
    expect(live().busy).toBe(false);
  });

  it("immediately maps terminal compilation failure to its fixed failure code", async () => {
    stubTransport({
      "POST /application-graphs/expense-approval/published-revisions": [
        publishedRevision,
      ],
      "POST /compilations": [pendingCompilation],
      "GET /compilations/compilation-1": [failedCompilation],
    });
    const controller = mount();
    const live = (): ReleaseJourneyController =>
      globalThis.__release as ReleaseJourneyController;

    await act(async () => controller.publishRelease());
    await act(async () => controller.compileRelease());

    expect(live().release?.phase).toBe("failed");
    expect(live().release?.diagnosis).toBe("compilation.failed");
    expect(live().busy).toBe(false);
  });

  it("allows verification through 300 seconds and times out at 900 seconds", async () => {
    stubTransport({
      "POST /application-graphs/expense-approval/published-revisions": [
        publishedRevision,
      ],
      "POST /compilations": [pendingCompilation],
      "GET /compilations/compilation-1": [succeededCompilation],
      "POST /compilations/compilation-1/verification-runs": [pendingRun],
      "GET /verification-runs/verify-1": [pendingRun],
    });
    const controller = mount();
    const live = (): ReleaseJourneyController =>
      globalThis.__release as ReleaseJourneyController;

    await act(async () => controller.publishRelease());
    await act(async () => controller.compileRelease());
    await act(async () => {
      controller.verifyRelease();
      await vi.advanceTimersByTimeAsync(300_000);
    });

    expect(live().release?.phase).toBe("verifying");
    expect(live().busy).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600_000);
    });

    expect(live().release?.phase).toBe("failed");
    expect(live().release?.diagnosis).toBe("verification.timeout");
    expect(live().busy).toBe(false);
  });

  it("fails closed when a succeeded run reports no evidence steps", async () => {
    stubTransport({
      "POST /application-graphs/expense-approval/published-revisions": [
        publishedRevision,
      ],
      "POST /compilations": [pendingCompilation],
      "GET /compilations/compilation-1": [succeededCompilation],
      "POST /compilations/compilation-1/verification-runs": [pendingRun],
      "GET /verification-runs/verify-1": [
        pendingRun,
        { ...succeededRun, status: "succeeded", evidence: { steps: [] } },
      ],
    });
    const controller = mount();
    const live = (): ReleaseJourneyController =>
      globalThis.__release as ReleaseJourneyController;

    await act(async () => {
      controller.publishRelease();
    });
    await act(async () => {
      controller.compileRelease();
      await vi.advanceTimersByTimeAsync(1_500);
    });
    await act(async () => {
      controller.verifyRelease();
      await vi.advanceTimersByTimeAsync(1_500);
    });

    expect(live().release?.phase).toBe("failed");
    expect(live().release?.diagnosis).toBe("verification.evidence_missing");
    expect(live().release?.evidenceSummary).toBeUndefined();
  });

  it("carries the worker diagnosis and a reviewable Draft Diff into the failed state, and approves it", async () => {
    const failedRun = {
      ...succeededRun,
      status: "failed",
      evidence: { steps: [...evidenceSteps] },
      diagnosis: {
        apiVersion: "factory.verification-diagnosis/v1",
        diagnosisId: "diagnosis-1",
        verificationRunId: "verify-1",
        category: "binding",
        code: "binding.denial_policy_not_bound",
        affectedPaths: ["/domain/expense"],
      },
      draftDiff: addBindingDiff,
    };
    stubTransport({
      "POST /application-graphs/expense-approval/published-revisions": [
        publishedRevision,
      ],
      "POST /compilations": [pendingCompilation],
      "GET /compilations/compilation-1": [succeededCompilation],
      "POST /compilations/compilation-1/verification-runs": [pendingRun],
      "GET /verification-runs/verify-1": [pendingRun, failedRun],
      "POST /verification-runs/verify-1/approve": [approvedDraftPayload()],
    });
    const controller = mount();
    const live = (): ReleaseJourneyController =>
      globalThis.__release as ReleaseJourneyController;

    await act(async () => {
      controller.publishRelease();
    });
    await act(async () => {
      controller.compileRelease();
      await vi.advanceTimersByTimeAsync(1_500);
    });
    await act(async () => {
      controller.verifyRelease();
      await vi.advanceTimersByTimeAsync(1_500);
    });

    expect(live().release?.phase).toBe("failed");
    expect(live().release?.diagnosis).toBe("binding.denial_policy_not_bound");
    expect(live().release?.proposedDraftDiff?.operations[0]).toEqual({
      op: "add-binding",
      capability: "core.identity-policy",
      graphSymbol: "graph.domain.expense",
    });
    expect(live().canApproveDraftDiff).toBe(true);

    await act(async () => {
      controller.approveDraftDiff();
    });
    expect(onApproved).toHaveBeenCalledTimes(1);
    expect(onApproved.mock.calls[0][0]).toMatchObject({
      applicationGraphId: "expense-approval",
      draftRevisionId: "draft-expense-approval-r2",
    });
    expect(live().approvalError).toBeNull();
  });

  it("surfaces a bounded approval error when the review boundary refuses the diff", async () => {
    const failedRun = {
      ...succeededRun,
      status: "failed",
      evidence: { steps: [...evidenceSteps] },
      diagnosis: { code: "binding.denial_policy_not_bound" },
      draftDiff: addBindingDiff,
    };
    stubTransport({
      "POST /application-graphs/expense-approval/published-revisions": [
        publishedRevision,
      ],
      "POST /compilations": [pendingCompilation],
      "GET /compilations/compilation-1": [succeededCompilation],
      "POST /compilations/compilation-1/verification-runs": [pendingRun],
      "GET /verification-runs/verify-1": [pendingRun, failedRun],
      "POST /verification-runs/verify-1/approve": [409],
    });
    const controller = mount();
    const live = (): ReleaseJourneyController =>
      globalThis.__release as ReleaseJourneyController;

    await act(async () => {
      controller.publishRelease();
    });
    await act(async () => {
      controller.compileRelease();
      await vi.advanceTimersByTimeAsync(1_500);
    });
    await act(async () => {
      controller.verifyRelease();
      await vi.advanceTimersByTimeAsync(1_500);
    });
    await act(async () => {
      controller.approveDraftDiff();
    });

    expect(onApproved).not.toHaveBeenCalled();
    expect(live().approvalError).toBe("release.conflict");
  });

  it("collapses an unknown safe-shaped worker diagnosis", async () => {
    const failedRun = {
      ...succeededRun,
      status: "failed",
      evidence: { steps: [...evidenceSteps] },
      diagnosis: { code: "runtime.preview_not_allowlisted" },
      draftDiff: null,
    };
    stubTransport({
      "POST /application-graphs/expense-approval/published-revisions": [
        publishedRevision,
      ],
      "POST /compilations": [pendingCompilation],
      "GET /compilations/compilation-1": [succeededCompilation],
      "POST /compilations/compilation-1/verification-runs": [pendingRun],
      "GET /verification-runs/verify-1": [pendingRun, failedRun],
    });
    const controller = mount();
    const live = (): ReleaseJourneyController =>
      globalThis.__release as ReleaseJourneyController;

    await act(async () => controller.publishRelease());
    await act(async () => {
      controller.compileRelease();
      await vi.advanceTimersByTimeAsync(1_500);
    });
    await act(async () => {
      controller.verifyRelease();
      await vi.advanceTimersByTimeAsync(1_500);
    });

    expect(live().release?.diagnosis).toBe("verification.failed");
  });

  it("starts the preview and cleans it up to a terminal phase", async () => {
    stubTransport({
      "POST /application-graphs/expense-approval/published-revisions": [
        publishedRevision,
      ],
      "POST /compilations": [pendingCompilation],
      "GET /compilations/compilation-1": [succeededCompilation],
      "POST /compilations/compilation-1/verification-runs": [pendingRun],
      "GET /verification-runs/verify-1": [succeededRun],
      "POST /compilations/compilation-1/preview-runs": [previewStarting],
      "GET /compilations/compilation-1/preview-runs/current": [
        previewStarting,
        previewReady,
        previewStopping,
        previewStopped,
      ],
      "POST /preview-runs/preview-1/stop": [previewStopping],
    });
    const controller = mount();
    const live = (): ReleaseJourneyController =>
      globalThis.__release as ReleaseJourneyController;

    await act(async () => {
      controller.publishRelease();
    });
    await act(async () => {
      controller.compileRelease();
      await vi.advanceTimersByTimeAsync(1_500);
    });
    await act(async () => {
      controller.verifyRelease();
      await vi.advanceTimersByTimeAsync(1_500);
    });
    await act(async () => {
      controller.previewRelease();
      await vi.advanceTimersByTimeAsync(1_500);
    });
    expect(live().release?.phase).toBe("preview");
    expect(live().release?.previewUrl).toBe("http://127.0.0.1:3000");
    expect(live().canCleanup).toBe(true);

    await act(async () => {
      controller.cleanupRelease();
      await vi.advanceTimersByTimeAsync(1_500);
    });
    expect(live().release?.phase).toBe("cleaned-up");
    expect(live().canReset).toBe(true);
  });

  it("stops the exact preview run after readiness polling times out", async () => {
    let stopCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(String(input));
        const method = init?.method ?? "GET";
        const response = (body: unknown) =>
          new Response(JSON.stringify(body), { status: 200 });
        if (
          method === "POST" &&
          url.pathname.endsWith("/published-revisions")
        ) {
          return response(publishedRevision);
        }
        if (method === "POST" && url.pathname === "/compilations") {
          return response(pendingCompilation);
        }
        if (
          method === "GET" &&
          url.pathname === "/compilations/compilation-1"
        ) {
          return response(succeededCompilation);
        }
        if (method === "POST" && url.pathname.endsWith("/verification-runs")) {
          return response(pendingRun);
        }
        if (
          method === "GET" &&
          url.pathname === "/verification-runs/verify-1"
        ) {
          return response(succeededRun);
        }
        if (method === "POST" && url.pathname.endsWith("/preview-runs")) {
          return response(previewStarting);
        }
        if (
          method === "POST" &&
          url.pathname === "/preview-runs/preview-1/stop"
        ) {
          stopCalls += 1;
          return response(previewStopping);
        }
        if (
          method === "GET" &&
          url.pathname.endsWith("/preview-runs/current")
        ) {
          return response(stopCalls === 0 ? previewStarting : previewStopped);
        }
        return new Response(null, { status: 404 });
      }),
    );
    const controller = mount();
    const live = (): ReleaseJourneyController =>
      globalThis.__release as ReleaseJourneyController;

    await act(async () => controller.publishRelease());
    await act(async () => controller.compileRelease());
    await act(async () => controller.verifyRelease());
    await act(async () => {
      controller.previewRelease();
      await vi.advanceTimersByTimeAsync(300_000);
    });

    expect(stopCalls).toBe(1);
    expect(live().release).toMatchObject({
      phase: "failed",
      diagnosis: "preview.failed",
    });
    expect(live().canReset).toBe(true);
  });

  it("waits for a late preview start and exact teardown before restarting", async () => {
    const transport = stubTransport({
      "POST /application-graphs/expense-approval/published-revisions": [
        publishedRevision,
      ],
      "POST /compilations": [pendingCompilation],
      "GET /compilations/compilation-1": [succeededCompilation],
      "POST /compilations/compilation-1/verification-runs": [pendingRun],
      "GET /verification-runs/verify-1": [succeededRun],
      "POST /preview-runs/preview-1/stop": [previewStopping],
      "GET /compilations/compilation-1/preview-runs/current": [previewStopped],
    });
    let resolveStart!: (response: Response) => void;
    vi.stubGlobal("fetch", (url: string | URL, init?: RequestInit) => {
      if (
        init?.method === "POST" &&
        new URL(String(url)).pathname ===
          "/compilations/compilation-1/preview-runs"
      ) {
        return new Promise<Response>((resolve) => {
          resolveStart = resolve;
        });
      }
      return transport.fetcher(url, init);
    });
    const controller = mount();
    await act(async () => controller.publishRelease());
    await act(async () => controller.compileRelease());
    await act(async () => controller.verifyRelease());
    await act(async () => {
      controller.previewRelease();
      await vi.advanceTimersByTimeAsync(300_000);
    });
    await act(async () => {
      void controller.resetRelease();
    });
    expect(globalThis.__release?.release?.phase).toBe("failed");
    await act(async () => {
      resolveStart(
        new Response(JSON.stringify(previewStarting), { status: 200 }),
      );
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(
      transport.calls.filter(
        (call) => call.path === "POST /preview-runs/preview-1/stop",
      ),
    ).toHaveLength(1);
    expect(globalThis.__release?.release?.phase).toBe("starting-preview");
  });

  it("refuses a different current preview and stops only the run it started", async () => {
    const transport = stubTransport({
      "POST /application-graphs/expense-approval/published-revisions": [
        publishedRevision,
      ],
      "POST /compilations": [pendingCompilation],
      "GET /compilations/compilation-1": [succeededCompilation],
      "POST /compilations/compilation-1/verification-runs": [pendingRun],
      "GET /verification-runs/verify-1": [succeededRun],
      "POST /compilations/compilation-1/preview-runs": [previewStarting],
      "GET /compilations/compilation-1/preview-runs/current": [
        { ...previewReady, id: "unowned-preview" },
        previewStopped,
      ],
      "POST /preview-runs/preview-1/stop": [previewStopping],
    });
    const controller = mount();
    await act(async () => controller.publishRelease());
    await act(async () => controller.compileRelease());
    await act(async () => controller.verifyRelease());
    await act(async () => controller.previewRelease());
    expect(globalThis.__release?.release?.phase).toBe("failed");
    expect(
      transport.calls.filter(
        (call) => call.path === "POST /preview-runs/preview-1/stop",
      ),
    ).toHaveLength(1);
    expect(
      transport.calls.some((call) => call.path.includes("unowned-preview")),
    ).toBe(false);
  });

  it("does not overwrite a newer target after rejected-preview cleanup completes", async () => {
    const transport = stubTransport({
      "POST /application-graphs/expense-approval/published-revisions": [
        publishedRevision,
      ],
      "POST /compilations": [pendingCompilation],
      "GET /compilations/compilation-1": [succeededCompilation],
      "POST /compilations/compilation-1/verification-runs": [pendingRun],
      "GET /verification-runs/verify-1": [succeededRun],
      "POST /compilations/compilation-1/preview-runs": [previewStarting],
      "GET /compilations/compilation-1/preview-runs/current": [
        { ...previewReady, previewUrl: "https://outside.example.test" },
        previewStopped,
      ],
    });
    let resolveStop!: (response: Response) => void;
    let stops = 0;
    vi.stubGlobal("fetch", (url: string | URL, init?: RequestInit) => {
      if (new URL(String(url)).pathname === "/preview-runs/preview-1/stop") {
        stops += 1;
        return new Promise<Response>((resolve) => {
          resolveStop = resolve;
        });
      }
      return transport.fetcher(url, init);
    });
    const controller = mount();
    await act(async () => controller.publishRelease());
    await act(async () => controller.compileRelease());
    await act(async () => controller.verifyRelease());
    await act(async () => controller.previewRelease());
    mount({ applicationGraphId: "other", draftRevisionId: "other-draft" });
    await act(async () => {
      resolveStop(
        new Response(JSON.stringify(previewStopping), { status: 200 }),
      );
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(stops).toBe(1);
    expect(globalThis.__release?.release).toMatchObject({
      applicationGraphId: "other",
      phase: "publishing",
    });
  });

  it("keeps restart blocked when exact preview teardown remains unconfirmed", async () => {
    const transport = stubTransport({
      "POST /application-graphs/expense-approval/published-revisions": [
        publishedRevision,
      ],
      "POST /compilations": [pendingCompilation],
      "GET /compilations/compilation-1": [succeededCompilation],
      "POST /compilations/compilation-1/verification-runs": [pendingRun],
      "GET /verification-runs/verify-1": [succeededRun],
      "POST /compilations/compilation-1/preview-runs": [previewStarting],
      "GET /compilations/compilation-1/preview-runs/current": [
        previewReady,
        { ...previewStopped, status: "failed" },
        { ...previewStopped, status: "failed" },
      ],
      "POST /preview-runs/preview-1/stop": [previewStopping],
    });
    const controller = mount();
    await act(async () => controller.publishRelease());
    await act(async () => controller.compileRelease());
    await act(async () => controller.verifyRelease());
    await act(async () => controller.previewRelease());
    await act(async () => controller.cleanupRelease());
    await act(async () => {
      void controller.resetRelease();
    });
    expect(globalThis.__release?.release).toMatchObject({
      phase: "failed",
      diagnosis: "cleanup.failed",
    });
    expect(globalThis.__release?.canPublish).toBe(false);
    expect(
      transport.calls.filter(
        (call) => call.path === "POST /preview-runs/preview-1/stop",
      ),
    ).toHaveLength(2);
  });

  it("refuses a non-loopback preview URL even after authoritative verification", async () => {
    stubTransport({
      "POST /application-graphs/expense-approval/published-revisions": [
        publishedRevision,
      ],
      "POST /compilations": [pendingCompilation],
      "GET /compilations/compilation-1": [succeededCompilation],
      "POST /compilations/compilation-1/verification-runs": [pendingRun],
      "GET /verification-runs/verify-1": [succeededRun],
      "POST /compilations/compilation-1/preview-runs": [previewStarting],
      "GET /compilations/compilation-1/preview-runs/current": [
        { ...previewReady, previewUrl: "https://example.test/app" },
        previewStopped,
      ],
      "POST /preview-runs/preview-1/stop": [previewStopping],
    });
    const controller = mount();
    const live = (): ReleaseJourneyController =>
      globalThis.__release as ReleaseJourneyController;

    await act(async () => controller.publishRelease());
    await act(async () => controller.compileRelease());
    await act(async () => controller.verifyRelease());
    await act(async () => controller.previewRelease());

    expect(live().release?.phase).toBe("failed");
    expect(live().release?.diagnosis).toBe("runtime.preview_readiness_failed");
  });

  it("fails closed when the worker reports the cleanup failed", async () => {
    // The worker reports its stop failed: the preview-run row flips to
    // failed while the journey is still awaiting the confirmation, so the
    // journey must never claim a cleaned-up preview.
    const failedPreview = { ...previewStopping, status: "failed" };
    stubTransport({
      "POST /application-graphs/expense-approval/published-revisions": [
        publishedRevision,
      ],
      "POST /compilations": [pendingCompilation],
      "GET /compilations/compilation-1": [succeededCompilation],
      "POST /compilations/compilation-1/verification-runs": [pendingRun],
      "GET /verification-runs/verify-1": [succeededRun],
      "POST /compilations/compilation-1/preview-runs": [previewStarting],
      "GET /compilations/compilation-1/preview-runs/current": [
        previewStarting,
        previewReady,
        previewStopping,
        failedPreview,
      ],
      "POST /preview-runs/preview-1/stop": [previewStopping],
    });
    const controller = mount();
    const live = (): ReleaseJourneyController =>
      globalThis.__release as ReleaseJourneyController;

    await act(async () => {
      controller.publishRelease();
    });
    await act(async () => {
      controller.compileRelease();
      await vi.advanceTimersByTimeAsync(1_500);
    });
    await act(async () => {
      controller.verifyRelease();
      await vi.advanceTimersByTimeAsync(1_500);
    });
    await act(async () => {
      controller.previewRelease();
      await vi.advanceTimersByTimeAsync(1_500);
    });
    await act(async () => {
      controller.cleanupRelease();
      await vi.advanceTimersByTimeAsync(1_500);
    });
    expect(live().release?.phase).toBe("failed");
    expect(live().release?.diagnosis).toBe("cleanup.failed");
    expect(live().canReset).toBe(true);
  });

  it("resumes failed verification from the existing immutable compilation", async () => {
    const failedRun = {
      ...succeededRun,
      status: "failed",
      evidence: { steps: [...evidenceSteps] },
      diagnosis: { code: "verification.failed" },
      draftDiff: null,
    };
    stubTransport({
      "POST /application-graphs/expense-approval/published-revisions": [
        publishedRevision,
      ],
      "POST /compilations": [pendingCompilation],
      "GET /compilations/compilation-1": [succeededCompilation],
      "POST /compilations/compilation-1/verification-runs": [pendingRun],
      "GET /verification-runs/verify-1": [pendingRun, failedRun],
    });
    const controller = mount();
    const live = (): ReleaseJourneyController =>
      globalThis.__release as ReleaseJourneyController;

    await act(async () => {
      controller.publishRelease();
    });
    await act(async () => {
      controller.compileRelease();
      await vi.advanceTimersByTimeAsync(1_500);
    });
    await act(async () => {
      controller.verifyRelease();
      await vi.advanceTimersByTimeAsync(1_500);
    });
    expect(live().release?.phase).toBe("failed");

    await act(async () => {
      controller.resetRelease();
    });
    expect(live().release?.phase).toBe("verifying");
    expect(live().release?.publishedRevisionId).toBe("published-1");
    expect(live().release?.compilationId).toBe("compilation-1");
    expect(live().release?.diagnosis).toBeUndefined();
    expect(live().release?.proposedDraftDiff).toBeUndefined();
  });

  it.each(["publish", "compile"] as const)(
    "retains a late %s identity and resumes without a duplicate POST",
    async (phase) => {
      let settle: ((response: Response) => void) | undefined;
      const pending = new Promise<Response>((resolve) => {
        settle = resolve;
      });
      const calls: string[] = [];
      vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
          const path = `${init?.method ?? "GET"} ${new URL(String(input)).pathname}`;
          calls.push(path);
          if (path.endsWith("/published-revisions")) {
            return phase === "publish"
              ? pending
              : new Response(JSON.stringify(publishedRevision));
          }
          if (path === "POST /compilations") return pending;
          if (path === "GET /compilations/compilation-1")
            return new Response(JSON.stringify(succeededCompilation));
          return new Response("{}", { status: 404 });
        }),
      );
      const controller = mount();
      await act(async () => controller.publishRelease());
      if (phase === "compile")
        await act(async () => controller.compileRelease());
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300_000);
      });
      expect(globalThis.__release?.release?.phase).toBe("failed");
      await act(async () => {
        void controller.resetRelease();
      });
      expect(globalThis.__release?.busy).toBe(true);
      await act(async () => {
        settle?.(
          new Response(
            JSON.stringify(
              phase === "publish" ? publishedRevision : pendingCompilation,
            ),
          ),
        );
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(globalThis.__release?.release?.phase).toBe("compiling");
      expect(globalThis.__release?.release?.publishedRevisionId).toBe(
        "published-1",
      );
      if (phase === "compile") {
        expect(globalThis.__release?.release?.compilationId).toBe(
          "compilation-1",
        );
        await act(async () => controller.compileRelease());
        expect(globalThis.__release?.release?.phase).toBe("verifying");
        expect(
          calls.filter((path) => path === "POST /compilations"),
        ).toHaveLength(1);
      }
      expect(
        calls.filter((path) => path.endsWith("/published-revisions")),
      ).toHaveLength(1);
    },
  );

  it("retains a late verification identity across recovery", async () => {
    let settle: ((response: Response) => void) | undefined;
    const pending = new Promise<Response>((resolve) => {
      settle = resolve;
    });
    const { fetcher, calls } = stubTransport({
      "POST /application-graphs/expense-approval/published-revisions": [
        publishedRevision,
      ],
      "POST /compilations": [pendingCompilation],
      "GET /compilations/compilation-1": [succeededCompilation],
      "GET /verification-runs/verify-1": [succeededRun],
    });
    const baseFetch = fetcher.getMockImplementation()!;
    fetcher.mockImplementation(async (url, init) => {
      if (
        init?.method === "POST" &&
        String(url).endsWith("/verification-runs")
      ) {
        calls.push({ path: "POST verification", init });
        return pending;
      }
      return baseFetch(url, init);
    });
    const controller = mount();
    await act(async () => controller.publishRelease());
    await act(async () => controller.compileRelease());
    await act(async () => controller.verifyRelease());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900_000);
    });
    expect(globalThis.__release?.release?.phase).toBe("failed");
    await act(async () => {
      void controller.resetRelease();
    });
    expect(globalThis.__release?.busy).toBe(true);
    await act(async () => {
      settle?.(new Response(JSON.stringify(pendingRun)));
      await vi.advanceTimersByTimeAsync(0);
    });
    await act(async () => controller.verifyRelease());
    expect(globalThis.__release?.release?.phase).toBe("starting-preview");
    expect(globalThis.__release?.release?.verificationRunId).toBe("verify-1");
    expect(
      calls.filter((call) => call.path === "POST verification"),
    ).toHaveLength(1);
  });

  it("offers start over after an unknown creation rejection without replaying it", async () => {
    const { calls } = stubTransport({
      "POST /application-graphs/expense-approval/published-revisions": [503],
    });
    const controller = mount();
    await act(async () => controller.publishRelease());
    let outcome: unknown;
    await act(async () => {
      outcome = await controller.resetRelease();
    });
    expect(outcome).toBe("start-over");
    expect(calls).toHaveLength(1);
    expect(globalThis.__release?.release?.phase).toBe("failed");
  });

  it("reseeds the release when the Draft revision changes", async () => {
    stubTransport({
      "POST /application-graphs/expense-approval/published-revisions": [
        publishedRevision,
      ],
    });
    const controller = mount();
    const live = (): ReleaseJourneyController =>
      globalThis.__release as ReleaseJourneyController;
    await act(async () => {
      controller.publishRelease();
    });
    expect(live().release?.phase).toBe("compiling");

    mount(
      {
        applicationGraphId: "expense-approval",
        draftRevisionId: "draft-expense-approval-r2",
      },
      { controlPlaneUrl: "http://control-plane.test" },
    );
    expect(globalThis.__release?.release?.phase).toBe("publishing");
    expect(globalThis.__release?.release?.draftRevisionId).toBe(
      "draft-expense-approval-r2",
    );
  });

  it("discards a deferred publish response after the release target changes", async () => {
    let resolvePublished: ((value: Response) => void) | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolvePublished = resolve;
          }),
      ),
    );
    const controller = mount();
    await act(async () => controller.publishRelease());
    await act(async () => {
      mount({
        applicationGraphId: "restaurant-ordering",
        draftRevisionId: "draft-restaurant-r2",
      });
      await Promise.resolve();
    });
    await act(async () => {
      resolvePublished?.(
        new Response(JSON.stringify(publishedRevision), { status: 200 }),
      );
      await Promise.resolve();
    });

    expect(globalThis.__release?.release?.applicationGraphId).toBe(
      "restaurant-ordering",
    );
    expect(globalThis.__release?.release?.phase).toBe("publishing");
  });

  it("discards a deferred compilation response after the release target changes", async () => {
    let resolveCompilation: ((value: Response) => void) | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = new URL(String(input));
        if (url.pathname.endsWith("/published-revisions")) {
          return Promise.resolve(
            new Response(JSON.stringify(publishedRevision), { status: 200 }),
          );
        }
        if (url.pathname === "/compilations") {
          return new Promise<Response>((resolve) => {
            resolveCompilation = resolve;
          });
        }
        return Promise.resolve(new Response(null, { status: 404 }));
      }),
    );
    const controller = mount();
    await act(async () => controller.publishRelease());
    expect(globalThis.__release?.release?.phase).toBe("compiling");

    act(() => controller.compileRelease());
    await act(async () => {
      await Promise.resolve();
      mount({
        applicationGraphId: "restaurant-ordering",
        draftRevisionId: "draft-restaurant-r2",
      });
    });
    await act(async () => {
      resolveCompilation?.(
        new Response(JSON.stringify(pendingCompilation), { status: 200 }),
      );
      await Promise.resolve();
    });

    expect(globalThis.__release?.release).toMatchObject({
      applicationGraphId: "restaurant-ordering",
      draftRevisionId: "draft-restaurant-r2",
      phase: "publishing",
    });
  });
});
