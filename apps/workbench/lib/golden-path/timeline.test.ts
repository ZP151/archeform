import { describe, expect, it } from "vitest";

import {
  appendTimelineEvent,
  createTimeline,
  latestTimelineEvent,
  timelineEventsByKind,
  timelineSummary,
  type TimelineEvent,
} from "./timeline";

const compileEvent: TimelineEvent = {
  kind: "compile",
  status: "succeeded",
  durationMs: 1240,
  title: "Compilation completed",
  detail: "Expense Approval application compiled from the Published Graph.",
  links: ["artifacts/compilation-result.json"],
};

describe("createTimeline", () => {
  it("starts empty and deterministic", () => {
    const first = createTimeline();
    const second = createTimeline();
    expect(first).toEqual(second);
    expect(first.kind).toBe("timeline");
    expect(first.events).toEqual([]);
  });

  it("rejects an unsafe timeline title", () => {
    expect(() =>
      createTimeline("Visit https://evil.example for secrets"),
    ).toThrow(/Timeline title/);
    expect(() => createTimeline("../../etc/passwd")).toThrow(/Timeline title/);
  });
});

describe("appendTimelineEvent", () => {
  it("appends events with sequential deterministic order", () => {
    const timeline = createTimeline();
    const first = appendTimelineEvent(timeline, compileEvent);
    const second = appendTimelineEvent(first, {
      kind: "authorization-denial",
      status: "failed",
      durationMs: 12,
      reason: "policy-denied",
    });

    expect(second.events).toHaveLength(2);
    expect(second.events[0]).toMatchObject({ at: 0, kind: "compile" });
    expect(second.events[1]).toMatchObject({
      at: 1,
      kind: "authorization-denial",
      status: "failed",
      reason: "policy-denied",
    });
    expect(first.events).toHaveLength(1);
    expect(timeline.events).toEqual([]);
  });

  it("accepts every bounded event kind", () => {
    const kinds = [
      "discuss",
      "plan",
      "build",
      "simulate",
      "publish",
      "compile",
      "boot",
      "migrate",
      "health",
      "api",
      "journey",
      "authorization-denial",
      "idempotency",
      "cleanup",
      "diagnosis",
      "preview",
    ] as const;
    let timeline = createTimeline();
    for (const [index, kind] of kinds.entries()) {
      timeline = appendTimelineEvent(timeline, {
        kind,
        status: "succeeded",
        durationMs: 0,
      });
      expect(timeline.events).toHaveLength(index + 1);
    }
  });

  it("rejects deployment events: the timeline never presents a deployment", () => {
    const timeline = createTimeline();
    expect(() =>
      appendTimelineEvent(timeline, {
        kind: "deploy" as never,
        status: "succeeded",
        durationMs: 1,
      }),
    ).toThrow(/kind/i);
    expect(() =>
      appendTimelineEvent(timeline, {
        kind: "production" as never,
        status: "succeeded",
        durationMs: 1,
      }),
    ).toThrow(/kind/i);
  });

  it("bounds status values", () => {
    const timeline = createTimeline();
    for (const status of [
      "running",
      "succeeded",
      "failed",
      "skipped",
    ] as const) {
      expect(
        appendTimelineEvent(timeline, {
          kind: "health",
          status,
          durationMs: 1,
        }).events.at(-1)?.status,
      ).toBe(status);
    }
    expect(() =>
      appendTimelineEvent(timeline, {
        kind: "health",
        status: "pending" as never,
        durationMs: 1,
      }),
    ).toThrow(/status/i);
  });

  it("bounds durations and rejects unbounded or negative values", () => {
    const timeline = createTimeline();
    expect(() =>
      appendTimelineEvent(timeline, {
        kind: "compile",
        status: "running",
        durationMs: -1,
      }),
    ).toThrow(/duration/i);
    expect(() =>
      appendTimelineEvent(timeline, {
        kind: "compile",
        status: "running",
        durationMs: 600001,
      }),
    ).toThrow(/duration/i);
    expect(() =>
      appendTimelineEvent(timeline, {
        kind: "compile",
        status: "running",
        durationMs: Number.NaN,
      }),
    ).toThrow(/duration/i);
  });

  it("accepts only safe bounded reason codes", () => {
    const timeline = createTimeline();
    for (const reason of [
      "policy-denied",
      "flow-state",
      "health.unavailable",
    ]) {
      expect(
        appendTimelineEvent(timeline, {
          kind: "diagnosis",
          status: "failed",
          durationMs: 5,
          reason,
        }).events.at(-1)?.reason,
      ).toBe(reason);
    }
    expect(() =>
      appendTimelineEvent(timeline, {
        kind: "diagnosis",
        status: "failed",
        durationMs: 5,
        reason: "Database connection string leaked",
      }),
    ).toThrow(/reason/i);
    expect(() =>
      appendTimelineEvent(timeline, {
        kind: "diagnosis",
        status: "failed",
        durationMs: 5,
        reason: "SELECT * FROM users WHERE token='abc'",
      }),
    ).toThrow(/reason/i);
  });

  it("accepts only app-relative artifact links", () => {
    const timeline = createTimeline();
    for (const link of [
      "artifacts/verification-report.json",
      "preview/expense-approval",
      "journeys/employee-submit/evidence.json",
    ]) {
      expect(
        appendTimelineEvent(timeline, {
          kind: "preview",
          status: "succeeded",
          durationMs: 1,
          links: [link],
        }).events.at(-1)?.links,
      ).toEqual([link]);
    }
    for (const link of [
      "https://evil.example/steal",
      "file:///etc/passwd",
      "C:\\Users\\me\\secrets",
      "../secrets.env",
      "/etc/passwd",
      "/preview/expense-approval",
      "preview?host=db:5432",
      "preview/../../etc/passwd",
    ]) {
      expect(() =>
        appendTimelineEvent(timeline, {
          kind: "preview",
          status: "succeeded",
          durationMs: 1,
          links: [link],
        }),
      ).toThrow(/link/i);
    }
  });

  it("rejects raw prompt, provider response, body, and log material", () => {
    const timeline = createTimeline();
    for (const event of [
      {
        kind: "diagnosis",
        status: "failed",
        durationMs: 1,
        body: "raw request body",
      },
      {
        kind: "diagnosis",
        status: "failed",
        durationMs: 1,
        log: "unbounded log output",
      },
      {
        kind: "diagnosis",
        status: "failed",
        durationMs: 1,
        prompt: "system: ...",
      },
      {
        kind: "diagnosis",
        status: "failed",
        durationMs: 1,
        response: "provider response",
      },
      {
        kind: "diagnosis",
        status: "failed",
        durationMs: 1,
        secret: "api-key-123",
      },
    ]) {
      expect(() =>
        appendTimelineEvent(timeline, event as TimelineEvent),
      ).toThrow(/shape/i);
    }
  });

  it("is deterministic: identical append sequences produce identical timelines", () => {
    const build = () => {
      let timeline = createTimeline("Expense Approval evidence");
      timeline = appendTimelineEvent(timeline, compileEvent);
      timeline = appendTimelineEvent(timeline, {
        kind: "journey",
        status: "succeeded",
        durationMs: 42,
        title: "Employee submits an expense",
      });
      timeline = appendTimelineEvent(timeline, {
        kind: "cleanup",
        status: "succeeded",
        durationMs: 3,
      });
      return timeline;
    };
    expect(build()).toEqual(build());
  });
});

describe("timelineSummary", () => {
  it("counts events by status and totals durations", () => {
    let timeline = createTimeline();
    timeline = appendTimelineEvent(timeline, {
      kind: "compile",
      status: "succeeded",
      durationMs: 1000,
    });
    timeline = appendTimelineEvent(timeline, {
      kind: "boot",
      status: "succeeded",
      durationMs: 500,
    });
    timeline = appendTimelineEvent(timeline, {
      kind: "authorization-denial",
      status: "failed",
      durationMs: 20,
    });
    timeline = appendTimelineEvent(timeline, {
      kind: "migrate",
      status: "skipped",
      durationMs: 0,
    });

    expect(timelineSummary(timeline)).toEqual({
      total: 4,
      byStatus: { succeeded: 2, failed: 1, skipped: 1, running: 0 },
      totalDurationMs: 1520,
    });
    expect(timelineSummary(createTimeline())).toEqual({
      total: 0,
      byStatus: { succeeded: 0, failed: 0, skipped: 0, running: 0 },
      totalDurationMs: 0,
    });
  });
});

describe("timelineEventsByKind and latestTimelineEvent", () => {
  it("filters by kind and returns the latest event", () => {
    let timeline = createTimeline();
    timeline = appendTimelineEvent(timeline, {
      kind: "health",
      status: "succeeded",
      durationMs: 10,
    });
    timeline = appendTimelineEvent(timeline, {
      kind: "journey",
      status: "succeeded",
      durationMs: 30,
    });
    timeline = appendTimelineEvent(timeline, {
      kind: "health",
      status: "failed",
      durationMs: 5,
      reason: "health.dependency_unavailable",
    });

    expect(timelineEventsByKind(timeline, "health")).toHaveLength(2);
    expect(timelineEventsByKind(timeline, "compile")).toEqual([]);
    expect(latestTimelineEvent(timeline)).toMatchObject({ kind: "health" });
    expect(latestTimelineEvent(createTimeline())).toBeUndefined();
  });
});
