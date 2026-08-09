// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
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
  result: { status: "succeeded" },
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
  rationaleCode: "binding-missing-identity-policy",
  summary: "Bind the identity policy so role journeys are session-scoped.",
};

describe("useReleaseJourney", () => {
  let container: HTMLDivElement;
  let root: Root;
  let onApproved: ReturnType<typeof vi.fn>;

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

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function mount(
    target: ReleaseTarget | null = TARGET,
    overrides: { controlPlaneUrl?: string } = {},
  ) {
    act(() => {
      root.render(
        <Harness
          controlPlaneUrl={
            overrides.controlPlaneUrl ?? "http://control-plane.test"
          }
          target={target}
          onApproved={(draft) => onApproved(draft)}
        />,
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
    expect(live().release?.phase).toBe("compiling");
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
        code: "binding.missing_identity_policy",
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
    expect(live().release?.diagnosis).toBe("binding.missing_identity_policy");
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
      diagnosis: { code: "binding.missing_identity_policy" },
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

  it("resets a failed release back to the publishing phase", async () => {
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
    expect(live().release?.phase).toBe("publishing");
    expect(live().release?.diagnosis).toBeUndefined();
    expect(live().release?.proposedDraftDiff).toBeUndefined();
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
});
