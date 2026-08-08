import { safeBusinessTextSchema } from "@factory/graph";

/**
 * One bounded activity/evidence timeline for a product release. Events render
 * compilation, isolated boot, migration, health, API, journey,
 * authorization-denial, idempotency, cleanup, preview, and safe-diagnosis
 * outcomes with a bounded status, duration, safe reason codes, and
 * app-relative artifact links. The timeline never carries raw prompts,
 * provider responses, secrets, request bodies, or unbounded logs: every
 * field is validated, unknown shapes are rejected, and a deployment is not
 * an event kind — the timeline never presents a deployment.
 *
 * Pure and deterministic: every append returns a new timeline; `at` is the
 * sequential append index, so identical append sequences produce identical
 * timelines.
 */

export type TimelineEventKind =
  | "discuss"
  | "plan"
  | "build"
  | "simulate"
  | "publish"
  | "compile"
  | "verify"
  | "boot"
  | "migrate"
  | "health"
  | "api"
  | "journey"
  | "authorization-denial"
  | "idempotency"
  | "cleanup"
  | "diagnosis"
  | "preview";

export type TimelineEventStatus =
  "running" | "succeeded" | "failed" | "skipped";

export interface TimelineEvent {
  readonly kind: TimelineEventKind;
  readonly status: TimelineEventStatus;
  readonly durationMs: number;
  readonly reason?: string;
  readonly title?: string;
  readonly detail?: string;
  readonly links?: readonly string[];
}

export interface TimelineEntry extends TimelineEvent {
  readonly at: number;
}

export interface TimelineState {
  readonly kind: "timeline";
  readonly title: string;
  readonly events: readonly TimelineEntry[];
}

const TIMELINE_EVENT_KINDS: readonly string[] = [
  "discuss",
  "plan",
  "build",
  "simulate",
  "publish",
  "compile",
  "verify",
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
];

const TIMELINE_EVENT_STATUSES: readonly string[] = [
  "running",
  "succeeded",
  "failed",
  "skipped",
];

const MAX_DURATION_MS = 600_000;

const safeReasonCode = /^[a-z][a-z0-9._-]*$/;

/**
 * App-relative artifact link: one or more plain segments without a leading
 * slash (the UI resolves them against the app base URL). No schemes, drive
 * letters, backslashes, traversal segments, query strings, or fragments —
 * a leading `/` would also admit absolute path material.
 */
const safeArtifactLink = /^(?:[a-zA-Z0-9._~-]+\/)*[a-zA-Z0-9._~-]+$/;

export class TimelineError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "TimelineError";
  }
}

function assertSafeText(label: string, value: string | undefined): void {
  if (value === undefined) return;
  const result = safeBusinessTextSchema.safeParse(value);
  if (!result.success) {
    throw new TimelineError(
      `${label} must be safe business text; it cannot contain URLs, absolute paths, traversal segments, or prototype-key material.`,
    );
  }
}

function assertSafeLink(label: string, value: string): void {
  if (
    !safeArtifactLink.test(value) ||
    value.split("/").includes("..") ||
    value.includes("\\")
  ) {
    throw new TimelineError(
      `${label} must be an app-relative link without schemes, absolute paths, or traversal segments.`,
    );
  }
}

function assertTimelineEventShape(event: TimelineEvent): void {
  if (
    typeof event !== "object" ||
    event === null ||
    Array.isArray(event) ||
    Object.keys(event).length === 0
  ) {
    throw new TimelineError("Timeline event must be a plain object.");
  }
  const allowedKeys = new Set([
    "kind",
    "status",
    "durationMs",
    "reason",
    "title",
    "detail",
    "links",
  ]);
  for (const key of Object.keys(event)) {
    if (!allowedKeys.has(key)) {
      throw new TimelineError(
        `Timeline event shape is bounded; '${key}' is not a supported field.`,
      );
    }
  }
  if (!TIMELINE_EVENT_KINDS.includes(event.kind)) {
    throw new TimelineError(
      `Timeline event kind '${event.kind}' is not supported; a deployment is never an event.`,
    );
  }
  if (!TIMELINE_EVENT_STATUSES.includes(event.status)) {
    throw new TimelineError(
      `Timeline event status '${event.status}' is not supported.`,
    );
  }
  if (
    typeof event.durationMs !== "number" ||
    !Number.isFinite(event.durationMs) ||
    event.durationMs < 0 ||
    event.durationMs > MAX_DURATION_MS
  ) {
    throw new TimelineError(
      `Timeline event duration must be between 0 and ${MAX_DURATION_MS} ms.`,
    );
  }
  if (
    event.reason !== undefined &&
    (typeof event.reason !== "string" || !safeReasonCode.test(event.reason))
  ) {
    throw new TimelineError(
      "Timeline event reason must be a bounded safe reason code.",
    );
  }
  assertSafeText("Timeline event title", event.title);
  assertSafeText("Timeline event detail", event.detail);
  if (event.links !== undefined) {
    if (!Array.isArray(event.links) || event.links.length === 0) {
      throw new TimelineError(
        "Timeline event links must be a non-empty array.",
      );
    }
    for (const link of event.links) {
      assertSafeLink("Timeline event link", link);
    }
  }
}

export function createTimeline(
  title = "Release activity and evidence",
): TimelineState {
  assertSafeText("Timeline title", title);
  return { kind: "timeline", title, events: [] };
}

export function appendTimelineEvent(
  timeline: TimelineState,
  event: TimelineEvent,
): TimelineState {
  assertTimelineEventShape(event);
  return {
    ...timeline,
    events: [...timeline.events, { ...event, at: timeline.events.length }],
  };
}

export function timelineSummary(timeline: TimelineState): {
  readonly total: number;
  readonly byStatus: Readonly<Record<TimelineEventStatus, number>>;
  readonly totalDurationMs: number;
} {
  const byStatus: Record<TimelineEventStatus, number> = {
    running: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
  };
  let totalDurationMs = 0;
  for (const event of timeline.events) {
    byStatus[event.status] += 1;
    totalDurationMs += event.durationMs;
  }
  return {
    total: timeline.events.length,
    byStatus,
    totalDurationMs,
  };
}

export function timelineEventsByKind(
  timeline: TimelineState,
  kind: TimelineEventKind,
): readonly TimelineEntry[] {
  return timeline.events.filter((event) => event.kind === kind);
}

export function latestTimelineEvent(
  timeline: TimelineState,
): TimelineEntry | undefined {
  return timeline.events.at(-1);
}
