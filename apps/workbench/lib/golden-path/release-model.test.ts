import { describe, expect, it } from "vitest";

import type { DraftRevisionV1 } from "@factory/graph";

import {
  assertReleaseEligibility,
  beginRelease,
  compilationStarted,
  compilationSucceeded,
  evidenceSummaryOf,
  previewStarted,
  previewStopped,
  publishingSucceeded,
  releaseFailed,
  verificationStarted,
  verificationSucceeded,
} from "./release-model";
import { appendTimelineEvent, createTimeline } from "./timeline";

function publishedDraft(): DraftRevisionV1 {
  return {
    id: "draft-1",
    status: "published",
    revision: 3,
    graph: {} as never,
  };
}

function happyPath() {
  let release = beginRelease({
    applicationGraphId: "graph-1",
    draftRevisionId: "draft-1",
  });
  release = publishingSucceeded(release, "published-1");
  release = compilationStarted(release, "compilation-1");
  release = compilationSucceeded(release, "compilation-1");
  release = verificationStarted(release, "verification-run-1");
  release = verificationSucceeded(release, [
    { stepId: "isolated-boot", status: "succeeded" },
    { stepId: "employee-submit", status: "succeeded" },
    { stepId: "manager-approval", status: "succeeded" },
  ]);
  release = previewStarted(release, "preview-1", "http://127.0.0.1:43101");
  release = previewStopped(release);
  return release;
}

describe("assertReleaseEligibility", () => {
  it("accepts only a Published Draft", () => {
    expect(() => assertReleaseEligibility(publishedDraft())).not.toThrow();
    expect(() =>
      assertReleaseEligibility({ ...publishedDraft(), status: "draft" }),
    ).toThrow(/published/i);
  });
});

describe("beginRelease", () => {
  it("starts the release state machine labelled as never a deployment", () => {
    const release = beginRelease({
      applicationGraphId: "graph-1",
      draftRevisionId: "draft-1",
    });
    expect(release.kind).toBe("release");
    expect(release.phase).toBe("publishing");
    expect(release.label).toMatch(/not a deployment/i);
    expect(release.label).not.toMatch(/production/i);
    expect(release.timeline.kind).toBe("timeline");
    expect(release.timeline.events).toHaveLength(1);
    expect(release.timeline.events[0]).toMatchObject({
      kind: "publish",
      status: "running",
    });
  });
});

describe("the one-action release journey", () => {
  it("advances publish -> compile -> verify -> preview -> cleanup", () => {
    const release = happyPath();
    expect(release.phase).toBe("cleaned-up");
    expect(release.publishedRevisionId).toBe("published-1");
    expect(release.compilationId).toBe("compilation-1");
    expect(release.verificationRunId).toBe("verification-run-1");
    expect(release.previewRunId).toBe("preview-1");
    expect(release.evidenceSummary).toEqual({ steps: 3, passed: 3, failed: 0 });
    expect(
      release.timeline.events.map((event) => [event.kind, event.status]),
    ).toEqual([
      ["publish", "running"],
      ["publish", "succeeded"],
      ["compile", "running"],
      ["compile", "succeeded"],
      ["verify", "running"],
      ["verify", "succeeded"],
      ["boot", "succeeded"],
      ["cleanup", "succeeded"],
    ]);
  });

  it("never puts the runtime preview URL into the timeline", () => {
    let release = beginRelease({
      applicationGraphId: "graph-1",
      draftRevisionId: "draft-1",
    });
    release = publishingSucceeded(release, "published-1");
    release = compilationStarted(release, "compilation-1");
    release = compilationSucceeded(release, "compilation-1");
    release = verificationStarted(release, "verification-run-1");
    release = verificationSucceeded(release, [
      { stepId: "boot", status: "succeeded" },
    ]);
    release = previewStarted(release, "preview-1", "http://127.0.0.1:43101");

    expect(release.previewUrl).toBe("http://127.0.0.1:43101");
    for (const event of release.timeline.events) {
      expect(event.links).toBeUndefined();
    }
  });

  it("is deterministic: identical event sequences produce identical releases", () => {
    expect(happyPath()).toEqual(happyPath());
  });
});

describe("fail-closed guards", () => {
  it("rejects mismatched or out-of-order progress events", () => {
    const started = beginRelease({
      applicationGraphId: "graph-1",
      draftRevisionId: "draft-1",
    });
    const publishing = publishingSucceeded(started, "published-1");
    const compiling = compilationStarted(publishing, "compilation-1");
    expect(() => compilationSucceeded(compiling, "compilation-2")).toThrow(
      /compilation/,
    );
    expect(() => compilationSucceeded(started, "compilation-1")).toThrow(
      /phase/i,
    );
    expect(() =>
      previewStarted(started, "preview-1", "http://127.0.0.1:43101"),
    ).toThrow(/phase/i);
  });

  it("requires a preview run before cleanup", () => {
    let release = beginRelease({
      applicationGraphId: "graph-1",
      draftRevisionId: "draft-1",
    });
    release = publishingSucceeded(release, "published-1");
    release = compilationStarted(release, "compilation-1");
    release = compilationSucceeded(release, "compilation-1");
    release = verificationStarted(release, "verification-run-1");
    release = verificationSucceeded(release, [
      { stepId: "boot", status: "succeeded" },
    ]);
    expect(() => previewStopped(release)).toThrow(/preview/i);
  });

  it("terminal phases reject further progress", () => {
    let release = beginRelease({
      applicationGraphId: "graph-1",
      draftRevisionId: "draft-1",
    });
    release = releaseFailed(release, "publish.rejected");
    expect(release.phase).toBe("failed");
    expect(() => publishingSucceeded(release, "published-1")).toThrow(/phase/i);

    const cleaned = happyPath();
    expect(cleaned.phase).toBe("cleaned-up");
    expect(() => previewStopped(cleaned)).toThrow(/phase/i);
  });
});

describe("failure and safe diagnosis", () => {
  it("fails closed on compile failure with a safe reason code", () => {
    let release = beginRelease({
      applicationGraphId: "graph-1",
      draftRevisionId: "draft-1",
    });
    release = publishingSucceeded(release, "published-1");
    release = compilationStarted(release, "compilation-1");
    release = releaseFailed(release, "compile.timeout");

    expect(release.phase).toBe("failed");
    expect(release.diagnosis).toBe("compile.timeout");
    expect(release.timeline.events.at(-1)).toMatchObject({
      kind: "diagnosis",
      status: "failed",
      reason: "compile.timeout",
    });
  });

  it("rejects free-text or unsafe diagnosis material", () => {
    const release = beginRelease({
      applicationGraphId: "graph-1",
      draftRevisionId: "draft-1",
    });
    expect(() =>
      releaseFailed(release, "Timeout with stack trace: /usr/lib/secret"),
    ).toThrow(/diagnosis/i);
  });

  it("carries a failed verification's reviewable Draft Diff without applying it", () => {
    const proposedDraftDiff = {
      apiVersion: "factory.draft-diff/v1" as const,
      baseDraftRevisionId: "draft-1",
      baseGraphHash: "sha256:" + "a".repeat(64),
      operations: [
        {
          op: "change-constraint" as const,
          entity: "expense",
          field: "amount",
          constraint: "maxValue",
          value: 5000,
        },
      ],
    };
    let release = beginRelease({
      applicationGraphId: "graph-1",
      draftRevisionId: "draft-1",
    });
    release = publishingSucceeded(release, "published-1");
    release = compilationStarted(release, "compilation-1");
    release = compilationSucceeded(release, "compilation-1");
    release = verificationStarted(release, "verification-run-1");
    release = releaseFailed(release, "verify.expense_threshold_exceeded");

    expect(release.phase).toBe("failed");
    expect(release.diagnosis).toBe("verify.expense_threshold_exceeded");
    expect(release.proposedDraftDiff).toBeUndefined();
    // The model carries only identifiers and safe summaries; it exposes no
    // apply surface and never patches a Published Graph, Compilation, or
    // running state.
    expect(release).not.toHaveProperty("apply");
  });
});

describe("evidenceSummaryOf", () => {
  it("counts bounded evidence steps", () => {
    expect(
      evidenceSummaryOf([
        { stepId: "a", status: "succeeded" },
        { stepId: "b", status: "succeeded" },
        { stepId: "c", status: "failed" },
        { stepId: "d", status: "skipped" },
      ]),
    ).toEqual({ steps: 4, passed: 2, failed: 1 });
    expect(evidenceSummaryOf([])).toEqual({ steps: 0, passed: 0, failed: 0 });
  });
});

describe("timeline integration", () => {
  it("rejects events that would smuggle deployment material", () => {
    const timeline = createTimeline();
    expect(() =>
      appendTimelineEvent(timeline, {
        kind: "deploy" as never,
        status: "succeeded",
        durationMs: 1,
      }),
    ).toThrow(/kind/i);
  });
});
